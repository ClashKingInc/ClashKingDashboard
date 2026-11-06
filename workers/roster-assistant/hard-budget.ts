import { ReserveAIStepEndpoint, SettleAIStepEndpoint } from "@clashking/api-contracts";
import { executeAssistantEndpoint } from "./api-client";
import type { NormalizedAIUsage } from "./usage-reporting";

/** Reserve against the actual serialized provider request, including tools and
 * prior tool results. UTF-8 bytes are a conservative token bound; double them
 * and add framing headroom. Never retry a potentially charged provider call. */
export function hardBudget(env: RosterAssistantRuntimeEnv, requestId: string) {
  let nextStep=0;
  let priorContextTokens=0;
  let historyKnown=true;
  let active: number | undefined;
  const headers={"x-clashking-ai-metering":env.AI_USAGE_SECRET};
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      if(url.hostname!=="api.openai.com"||!url.pathname.endsWith("/responses")||typeof init?.body!=="string") throw new Error("Unbudgeted AI transport is disabled");
      init.signal?.throwIfAborted();
      const payload=JSON.parse(init.body) as Record<string,unknown>;
      if(payload.previous_response_id || payload.conversation || payload.context_management)
        throw new Error("Unbounded provider-side context is disabled");
      if(Array.isArray(payload.tools) && payload.tools.some((tool: {type?:string})=>tool.type!=="function"))
        throw new Error("Unbudgeted provider tools are disabled");
      const items=Array.isArray(payload.input)?payload.input:[];
      const opaque=items.filter((item:{type?:string})=>item.type==="reasoning" || item.type==="compaction").length;
      if(opaque && !historyKnown)throw new Error("Previous AI usage is unknown; start a new request");
      // Encrypted reasoning can expand beyond its serialized bytes. Include
      // all reported prior input/output for every opaque item, not just its
      // ciphertext size. Initial browser input is sanitized to user text.
      const inputTokenLimit=new TextEncoder().encode(init.body).byteLength*2+8192+opaque*priorContextTokens;
      if(inputTokenLimit>1000000)throw new Error("AI context exceeds the budgetable input size");
      const step=nextStep++;
      const reservation=await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN,undefined,ReserveAIStepEndpoint,
        {path:{},query:{},body:{requestId,step,inputTokenLimit,outputTokenLimit:64000}},init.signal??undefined,{headers});
      active=step;
      payload.max_output_tokens=reservation.maxOutputTokens;
      // A transport failure or 5xx may have incurred spend and stays reserved.
      // A complete structured 4xx rejection occurred before inference, so it
      // can settle at zero instead of consuming the server's entire allowance.
      const response = await fetch(input,{...init,body:JSON.stringify(payload)});
      if ([400,401,403,404,422,429].includes(response.status)) {
        const rejected = await response.clone().json().catch(() => null) as {error?:{message?:unknown}} | null;
        if (typeof rejected?.error?.message === "string") {
          try {
            await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN,undefined,SettleAIStepEndpoint,
              {path:{},query:{},body:{requestId,step,inputTokens:0,outputTokens:0}},
              AbortSignal.timeout(5000),{headers});
            active = undefined;
          } catch {
            console.error(JSON.stringify({event:"roster_rejection_settlement_failed",requestId,step}));
          }
        }
      }
      return response;
    },
    settle: async (usage: NormalizedAIUsage) => {
      if(active===undefined)return;
      if(usage.inputTokens+usage.outputTokens===0){historyKnown=false;return;}
      priorContextTokens+=usage.inputTokens+usage.outputTokens;
      const step=active;
      await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN,undefined,SettleAIStepEndpoint,
        {path:{},query:{},body:{requestId,step,inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,
          cachedInputTokens:usage.cachedInputTokens,cacheWriteTokens:usage.cacheWriteTokens}},undefined,{headers});
      active=undefined;
    },
  };
}
