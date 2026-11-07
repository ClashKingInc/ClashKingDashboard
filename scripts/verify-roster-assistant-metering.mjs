// Real assistant HTTP -> real API authorization -> disposable canonical SQL.
// Includes real Worker/SDK stream accounting against a loopback provider.
// Run with the canonical with-test-integration.sh fixture and
// CLASHKING_E2E_API_REPO plus CLASHKING_E2E_STATIC_ASSETS_ROOT set.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { AI_NOTICE_VERSION } from '@clashking/api-contracts';

assert.equal(process.env.CLASHKING_DISPOSABLE_TIMESCALE,'1');
const dsn=new URL(process.env.TEST_DATABASE_URL);
assert.equal(dsn.hostname,'127.0.0.1');
const apiRepo=process.env.CLASHKING_E2E_API_REPO;
assert(apiRepo,'Set CLASHKING_E2E_API_REPO to the real local API checkout');
const require=createRequire(join(apiRepo,'package.json'));
const pg=require('pg');
const {SignJWT}=await import(require.resolve('jose'));
const db=new pg.Client({connectionString:dsn.href});await db.connect();
const temp=await mkdtemp(join(tmpdir(),'ck-roster-access-'));
const children=[];let logs='';let runtime,provider;
const start=(script,env,cwd)=>{const child=spawn(process.execPath,[script],{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});children.push(child);child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);return child;};
const ready=async(url,child)=>{for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs.slice(-2500));try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error(logs.slice(-2500));};
const signingKey=randomBytes(32).toString('base64url');
const meteringKey=randomBytes(32).toString('base64url');
const origin='http://127.0.0.1:8818',assistant='http://127.0.0.1:8819';
const actor='999999999999993201',server='999999999999993202',foreign='999999999999993203';
try {
 await db.query("INSERT INTO auth_users(user_id,provider) VALUES($1,'discord')",[actor]);
 for(const id of [server,foreign])await db.query("INSERT INTO servers(id,name) VALUES($1,'Assistant access fixture')",[id]);
 const applicationId='999999999999999999', generation=randomUUID();
 await db.query(`INSERT INTO discord_cache.gateway_shards(application_id,shard_id,shard_count,generation,healthy,heartbeat_at) VALUES($1,0,1,$2,true,now())`,[applicationId,generation]);
 for(const id of [server,foreign])await db.query(`INSERT INTO discord_cache.guilds(id,data,application_id,shard_id,generation,available,metadata_complete,members_complete) VALUES($1,$2,$3,0,$4,true,true,true)`,[id,{owner_id:actor},applicationId,generation]);

 const tokens={};
 for(const level of ['view','manage']) {
  const permissions={manager:false,sections:{rosters:level}};
  const grant=(await db.query("INSERT INTO dashboard_access_grants(token_hash,user_id,server_id,source,permissions) VALUES($1,$2,$3,'bot',$4) RETURNING id",[randomUUID(),actor,server,permissions])).rows[0].id;
  const session=(await db.query("INSERT INTO dashboard_scoped_sessions(grant_id,user_id,server_id,permissions,refresh_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 hour') RETURNING id",[grant,actor,server,permissions,randomUUID()])).rows[0].id;
  tokens[level]=await new SignJWT({dashboard_session:session}).setProtectedHeader({alg:'HS256'}).setSubject(actor).setAudience('clashking-server-dashboard').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(signingKey));
 }
 const api=start('scripts/start-local-rewrite-api.mjs',{CLASHKING_LOCAL_API_PORT:'8818',CLASHKING_LOCAL_ARCHIVE_BRIDGE:'0',CLASHKING_LOCAL_PRODUCTION_READS:'0',CLASHKING_E2E_JWT_ACCESS_SECRET:signingKey,CLASHKING_E2E_AI_USAGE_SECRET:meteringKey,CLASHKING_E2E_API_BOT_TOKEN:randomBytes(32).toString('base64url'),CLASHKING_LOCAL_STATIC_ASSETS_ROOT:process.env.CLASHKING_E2E_STATIC_ASSETS_ROOT,CLASHKING_LOCAL_DISCORD_CLIENT_ID:'999999999999999999',CLASHKING_LOCAL_DISCORD_CLIENT_SECRET:'local-only'},apiRepo);
 await ready(origin+'/v2/health',api);
 const vars=join(temp,'assistant.vars');await writeFile(vars,'OPENAI_API_KEY="local-never-used"\nAI_USAGE_SECRET="'+meteringKey+'"\n',{mode:0o600});
 const ai=start('scripts/start-local-roster-assistant.mjs',{CLASHKING_ASSISTANT_PORT:'8819',CLASHKING_ASSISTANT_INSPECTOR_PORT:'9249',CLASHKING_API_ORIGIN:origin,CLASHKING_ASSISTANT_ENV_FILE:vars},resolve('.'));
 await ready(assistant+'/health',ai);
 const body={serverId:server,rosterIds:[],mode:'replay',messages:[{id:'fixture',role:'user',parts:[{type:'text',text:'Open the saved roster view'}]}]};
 const call=async(token,payload=body)=>{const response=await fetch(assistant+'/chat',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(payload)});return {status:response.status,body:await response.json()};};
 assert.equal((await call()).status,401);
 const notice=await call(tokens.manage);assert.equal(notice.status,403,JSON.stringify(notice.body));assert.match(notice.body.error,/notice/i);
 const accepted=await fetch(origin+'/v2/users/me/ai-notice',{method:'POST',headers:{authorization:'Bearer '+tokens.manage,'content-type':'application/json'},body:JSON.stringify({version:AI_NOTICE_VERSION})});assert.equal(accepted.status,200);
 assert.equal((await call(tokens.view)).status,403);
 assert.equal((await call(tokens.manage,{...body,serverId:foreign})).status,403);
 const admitted=await call(tokens.manage);assert.equal(admitted.status,400);assert.match(admitted.body.error,/sourceCode is required/);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0].n,1);
 console.log('PASS real assistant/API: nondeveloper roster manager admitted, anonymous/view-only/foreign server denied, consent required; no AI provider calls');
 {
  await db.query('DELETE FROM roster_ai_usage WHERE discord_user_id=$1',[actor]);
  let status=429; let streamMode=false; let failSettlement=false; let providerCalls=0; let terminalType="response.completed";
  provider=createServer((req,res)=>{providerCalls++;req.resume();
   if(!streamMode){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:status===429?'You have no credits remaining.':'upstream failed',type:'server_error',code:'server_error'}}));return;}
   res.writeHead(200,{'content-type':'text/event-stream'});
   const response={id:'resp_local_accounting',object:'response',created_at:0,model:'gpt-6-luna',status:'completed',output:[],usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:25},output_tokens_details:{reasoning_tokens:5}}};
   res.write('event: response.created\ndata: '+JSON.stringify({type:'response.created',sequence_number:0,response:{...response,status:'in_progress',usage:null}})+'\n\n');
   setTimeout(()=>{
    if(status===502){res.end();return;}
    const frame='event: '+terminalType+'\ndata: '+JSON.stringify({type:terminalType,sequence_number:1,response})+'\n\n';
    res.write(frame.slice(0,42));setTimeout(()=>res.end(frame.slice(42)),30);
   },120);
  });
  await new Promise(r=>provider.listen(0,'127.0.0.1',r));
  const {build}=require('esbuild');const wranglerRequire=createRequire(createRequire(import.meta.url).resolve('wrangler/package.json'));const {Miniflare,convertV4MiniflareOptions}=wranglerRequire('miniflare');
  const file=join(temp,'assistant.mjs');
  await build({entryPoints:[resolve('workers/roster-assistant/index.ts')],bundle:true,platform:'node',conditions:['workerd'],format:'esm',target:'es2022',external:['cloudflare:*'],banner:{js:'import { createRequire } from "node:module"; const require = createRequire("/assistant/index.js");'},outfile:file});
  runtime=new Miniflare(convertV4MiniflareOptions({modulesRoot:"/assistant",modules:[{type:"ESModule",path:"/assistant/index.js",contents:await readFile(file,"utf8")}],compatibilityDate:'2026-08-10',compatibilityFlags:['nodejs_compat','enable_request_signal'],port:8820,workerLoaders:{LOADER:{}},bindings:{CLASHKING_API_ORIGIN:origin,OPENAI_API_KEY:'local-never-used',AI_USAGE_SECRET:meteringKey},outboundService:async request=>{
   const url=new URL(request.url);
   const init={method:request.method,headers:Object.fromEntries(request.headers),...(!['GET','HEAD'].includes(request.method)?{body:new Uint8Array(await request.arrayBuffer())}:{})};
   if(url.hostname==='api.openai.com')return fetch('http://127.0.0.1:'+provider.address().port+url.pathname,init);
   assert.equal(url.origin,origin,'external network blocked');if(failSettlement && url.pathname.endsWith('/settle')){failSettlement=false;return new Response('temporary accounting outage',{status:503});}return fetch(request.url,init);
  }}));
  await runtime.ready;
  const run=async()=>{const response=await runtime.dispatchFetch('http://localhost/chat',{method:'POST',headers:{authorization:'Bearer '+tokens.manage,'content-type':'application/json'},body:JSON.stringify({...body,mode:'chat'})});return {status:response.status,text:await response.text()};};
  for(let n=0;n<2;n++){
   const result=await run();assert.equal(result.status,200,result.text);assert.match(result.text,/out of provider credits/);assert.doesNotMatch(result.text,/An error occurred/);
   const rows=(await db.query('SELECT b.actual_usd,b.settled_at FROM roster_ai_step_budgets b JOIN roster_ai_usage u ON u.id=b.usage_id WHERE u.discord_user_id=$1',[actor])).rows;
   assert.equal(rows.length,n+1);assert(rows.every(row=>Number(row.actual_usd)===0&&row.settled_at));
  }
  status=500;await run();
  assert.equal((await run()).status,200,'unknown provider outcomes must not block retries');
  let unknown=(await db.query("SELECT count(*)::int AS n FROM roster_ai_step_budgets b JOIN roster_ai_usage u ON u.id=b.usage_id WHERE u.discord_user_id=$1 AND b.outcome='unknown'",[actor])).rows[0].n;
  assert.equal(unknown,2);
  streamMode=true;status=200;failSettlement=true;
  await run();
  const waitFor=async(check)=>{for(let n=0;n<100;n++){if(await check())return;await new Promise(r=>setTimeout(r,100));}assert.fail('accounting did not reach expected state');};
  await waitFor(async()=>Number((await db.query('SELECT sum(total_tokens) AS n FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0].n)===120);
  let usage=(await db.query('SELECT sum(input_tokens)::int AS input,sum(output_tokens)::int AS output,sum(reasoning_tokens)::int AS reasoning FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0];
  assert.deepEqual(usage,{input:100,output:20,reasoning:5});
  // Cancel the browser body before the provider's terminal usage frame.
  const beforeCancel=providerCalls;
  const cancelled=await runtime.dispatchFetch('http://localhost/chat',{method:'POST',headers:{authorization:'Bearer '+tokens.manage,'content-type':'application/json'},body:JSON.stringify({...body,mode:'chat'})});
  await waitFor(async()=>providerCalls>beforeCancel);
  await cancelled.body.cancel();
  await waitFor(async()=>Number((await db.query('SELECT sum(total_tokens) AS n FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0].n)===240);
  for(const type of ['response.incomplete','response.failed']) {
   terminalType=type;await run();
  }
  await waitFor(async()=>Number((await db.query('SELECT sum(total_tokens) AS n FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0].n)===480);
  status=502;await run();
  await waitFor(async()=>Number((await db.query("SELECT count(*) AS n FROM roster_ai_step_budgets b JOIN roster_ai_usage u ON u.id=b.usage_id WHERE u.discord_user_id=$1 AND b.outcome='unknown'",[actor])).rows[0].n)===3);
  usage=(await db.query('SELECT sum(total_tokens)::int AS tokens,sum(reasoning_tokens)::int AS reasoning FROM roster_ai_usage WHERE discord_user_id=$1',[actor])).rows[0];
  assert.deepEqual(usage,{tokens:480,reasoning:20});
  console.log('PASS real Worker/SDK/API/SQL: 429 rejected, 500 unknown and retryable; fragmented terminal usage persisted once despite SDK callback; transient settlement 503 retried; browser disconnect retains receipt; failed/incomplete responses retain reported usage; missing terminal usage explicitly unknown; no external model calls');

 }

} finally {
 try {await runtime?.dispose();} catch {}
 if(provider)await new Promise(r=>provider.close(r));
 for(const child of children.reverse())child.kill('SIGTERM');
 await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,5000);})));
 await db.end();await rm(temp,{recursive:true,force:true});
}
