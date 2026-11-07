import { ReserveAIStepEndpoint, SettleAIStepEndpoint } from "@clashking/api-contracts";
import { executeAssistantEndpoint, AssistantApiError } from "./api-client";
import type { NormalizedAIUsage } from "./usage-reporting";

type Call = { step: number; receipt?: NormalizedAIUsage; providerResponseId?: string };
const zero: NormalizedAIUsage = {inputTokens:0,outputTokens:0,cachedInputTokens:0,cacheWriteTokens:0,reasoningTokens:0};

/** Account at the provider boundary, independently of tool/UI stream success.
 * Never replay inference to repair accounting: only retry the idempotent write. */
export function usageMetering(env: RosterAssistantRuntimeEnv, requestId: string, ctx: ExecutionContext) {
  let nextStep=0;
  let active: Call | undefined;
  const headers={"x-clashking-ai-metering":env.AI_USAGE_SECRET};
  async function record(call: Call, usage: NormalizedAIUsage, outcome: "completed"|"rejected"|"unknown", failureCode?: string) {
    for(let attempt=0;attempt<4;attempt++) {
      try {
        await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN,undefined,SettleAIStepEndpoint,
          {path:{},query:{},body:{requestId,step:call.step,...usage,outcome,...(call.providerResponseId?{providerResponseId:call.providerResponseId}:{}),...(failureCode?{failureCode}:{})}},
          AbortSignal.timeout(5000),{headers});
        if(outcome!=="unknown")call.receipt=usage;
        return;
      } catch(error) {
        if(attempt<3 && !(error instanceof AssistantApiError && error.status<500)) {
          await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
          continue;
        }
        // Numeric receipts permit accounting recovery without logging prompts,
        // model output, credentials or any tool/player payload.
        console.error(JSON.stringify({event:"roster_usage_record_failed",requestId,step:call.step,
          providerResponseId:call.providerResponseId,outcome,usage,failureCode}));
        throw error;
      }
    }
  }
  async function observe(body: ReadableStream<Uint8Array>, call: Call) {
    const reader=body.getReader(), decoder=new TextDecoder();
    let pending="", terminal=false;
    const event=async(frame:string)=>{
      const data=frame.split(/\r?\n/u).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n");
      if(!data||data==="[DONE]")return;
      const value=JSON.parse(data) as {type?:string;response?:{id?:string;usage?:{input_tokens:number;output_tokens:number;input_tokens_details?:{cached_tokens?:number;cache_write_tokens?:number};output_tokens_details?:{reasoning_tokens?:number}}}};
      if(value.response?.id)call.providerResponseId=value.response.id;
      if(!["response.completed","response.incomplete","response.failed"].includes(value.type??""))return;
      const usage=value.response?.usage;
      if(usage && Number.isSafeInteger(usage.input_tokens) && Number.isSafeInteger(usage.output_tokens)) {
        await record(call,{inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,
          cachedInputTokens:usage.input_tokens_details?.cached_tokens??0,cacheWriteTokens:usage.input_tokens_details?.cache_write_tokens??0,
          reasoningTokens:usage.output_tokens_details?.reasoning_tokens??0},"completed");
        terminal=true;
      }
    };
    try {
      for(;;) {
        const {value,done}=await reader.read();
        pending+=decoder.decode(value,{stream:!done});
        let match: RegExpExecArray|null;
        while((match=/\r?\n\r?\n/u.exec(pending))!==null) {
          const frame=pending.slice(0,match.index);pending=pending.slice(match.index+match[0].length);
          await event(frame);
        }
        if(pending.length>8*1024*1024)throw new Error("Provider event exceeds accounting buffer");
        if(done){if(pending.trim())await event(pending);break;}
      }
    } catch {
      if(!terminal && !call.receipt)await record(call,zero,"unknown","provider_stream_interrupted");
      return;
    } finally {reader.releaseLock();}
    if(!terminal && !call.receipt)await record(call,zero,"unknown","provider_usage_missing");
  }
  return {
    fetch: async(input: RequestInfo|URL, init?:RequestInit): Promise<Response>=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      if(url.hostname!=="api.openai.com"||!url.pathname.endsWith("/responses")||typeof init?.body!=="string")throw new Error("Unsupported AI transport");
      init.signal?.throwIfAborted();
      const payload=JSON.parse(init.body) as Record<string,unknown>;
      if(payload.previous_response_id||payload.conversation||payload.context_management)throw new Error("Provider-side conversation storage is disabled");
      if(Array.isArray(payload.tools)&&payload.tools.some((tool:{type?:string})=>tool.type!=="function"))throw new Error("Unsupported provider tool");
      const call:Call={step:nextStep++};
      await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN,undefined,ReserveAIStepEndpoint,
        {path:{},query:{},body:{requestId,step:call.step,inputTokenLimit:1000000,outputTokenLimit:64000}},
        init.signal??undefined,{headers});
      active=call;
      // An already-started call continues to its usage receipt after a browser
      // disconnect. Request cancellation still prevents starting another call.
      let response:Response;
      try {response=await fetch(input,{...init,signal:AbortSignal.timeout(180000)});}
      catch(error){await record(call,zero,"unknown","provider_transport_failed");throw error;}
      if(!response.ok){
        const rejected=[400,401,403,404,422,429].includes(response.status);
        await record(call,zero,rejected?"rejected":"unknown",`provider_http_${response.status}`);
        return response;
      }
      if(!response.body){await record(call,zero,"unknown","provider_body_missing");return response;}
      const [consumer,accounting]=response.body.tee();
      ctx.waitUntil(observe(accounting,call).catch(()=>{}));
      return new Response(consumer,{status:response.status,statusText:response.statusText,headers:response.headers});
    },
    settle: async(usage:NormalizedAIUsage)=>{
      const call=active;
      if(!call||call.receipt||usage.inputTokens+usage.outputTokens===0)return;
      await record(call,usage,"completed");
    },
  };
}
