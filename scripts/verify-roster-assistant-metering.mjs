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
  let status=429; let streamMode=false; let failSettlement=false; let providerCalls=0; let terminalType="response.completed"; let cwlToolMode=false; let observedToolOutput;
  provider=createServer(async (req,res)=>{providerCalls++;
   let requestBody='';for await(const chunk of req)requestBody+=chunk;
   const input=JSON.parse(requestBody).input??[];
   if(cwlToolMode){
    const output=input.find(item=>item.type==='function_call_output');
    if(output)observedToolOutput=JSON.parse(output.output);
    const item=output?{id:'msg_fixture',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:'Published.',annotations:[]}]}:{id:'fc_fixture',type:'function_call',status:'completed',name:'codemode',call_id:'call_cwl',arguments:JSON.stringify({code:'async () => await codemode.publishCwlPerformanceView({windowMonths:3,familyOnly:true})'})};
    const response={id:'resp_fixture',object:'response',created_at:0,model:'gpt-6-luna',status:'completed',output:[item],usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}};
    res.writeHead(200,{'content-type':'text/event-stream'});
    const emit=(type,extra)=>res.write('data: '+JSON.stringify({type,...extra})+'\n\n');
    emit('response.created',{response:{...response,status:'in_progress',output:[],usage:null},sequence_number:0});
    emit('response.output_item.added',{item:{...item,arguments:'',status:'in_progress'},output_index:0,sequence_number:1});
    if(output)emit('response.output_text.delta',{item_id:item.id,output_index:0,content_index:0,delta:'Published.',sequence_number:2});
    else emit('response.function_call_arguments.delta',{item_id:item.id,output_index:0,delta:item.arguments,sequence_number:2});
    emit('response.output_item.done',{item,output_index:0,sequence_number:3});
    emit('response.completed',{response,sequence_number:4});res.end();return;
   }
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
  // Replay the production-generated CWL view through the real dynamic Worker,
  // API authorization and SQL. An unobserved player remains visible as unknown.
  const cwlModule=join(temp,'cwl-view.mjs');
  await build({entryPoints:[resolve('workers/roster-assistant/cwl-performance-view.ts')],bundle:true,platform:'node',format:'esm',outfile:cwlModule});
  const {cwlPerformanceViewSource}=await import('file://'+cwlModule);
  const roster=randomUUID();
  await db.query("INSERT INTO rosters(id,server_id,alias,roster_type,signup_scope) VALUES($1,$2,'CWL replay','family','family-only')",[roster,server]);
  await db.query("INSERT INTO roster_members(roster_id,tag,name,townhall) VALUES($1,'#PYLQCVVV','Unknown history',18)",[roster]);
  const family='#PYLQCCCU', enemy='#PYLQCCCY', known=['#PYLQCVVY','#PYLQCVVR'];
  await db.query("INSERT INTO basic_clan(tag,name,public_war_log,war_wins,member_count,badge_token,troops_donated,troops_received) VALUES($1,'Fixture family',true,0,2,'local',0,0)",[family]);
  await db.query('INSERT INTO server_clans(server_id,tag) VALUES($1,$2)',[server,family]);
  for(const tag of known)await db.query("INSERT INTO roster_members(roster_id,tag,name,townhall) VALUES($1,$2,$2,18)",[roster,tag]);
  const ended=new Date(Date.now()-1000),started=new Date(ended.valueOf()-86400000),prepared=new Date(started.valueOf()-86400000),warTag='#LOCALCWL',group='LOCALCWL0001';
  const id=(await db.query("INSERT INTO wars(clan_tag,opponent_tag,prep_time,start_time,end_time,size,attacks_per_member,war_type,state,war_tag) VALUES($1,$2,$3,$4,$5,2,1,'cwl','warEnded',$6) RETURNING war_id",[family,enemy,prepared,started,ended,warTag])).rows[0].war_id;
  const side=(tag,members)=>({tag,name:tag,badgeToken:'local',clanLevel:1,attacks:0,stars:0,destructionPercentage:0,members});
  await db.query('INSERT INTO war_archive_pending(war_id,end_time,payload) VALUES($1,$2,$3)',[id,ended,JSON.stringify({warTag,state:'warEnded',battleModifier:'none',teamSize:2,attacksPerMember:1,preparationStartTime:prepared.toISOString(),startTime:started.toISOString(),endTime:ended.toISOString(),clan:side(family,known.map((tag,index)=>({tag,name:tag,townhallLevel:18,mapPosition:index+1,attacks:[{defenderTag:enemy,stars:2,destructionPercentage:index?95:85,order:index+1,duration:100}]}))),opponent:side(enemy,[])})]);
  for(const tag of known)await db.query('INSERT INTO player_war_history(player_tag,war_ids) VALUES($1,$2)',[tag,[id]]);
  await db.query("INSERT INTO cwl_groups(cwl_id,season,state,rounds) VALUES($1,$2,'ended',$3)",[group,ended.toISOString().slice(0,7),JSON.stringify([[warTag]])]);
  await db.query('INSERT INTO cwl_group_clans(cwl_id,clan_tag) VALUES($1,$2)',[group,family]);
  const replay=await runtime.dispatchFetch('http://localhost/chat',{method:'POST',headers:{authorization:'Bearer '+tokens.manage,'content-type':'application/json'},body:JSON.stringify({...body,rosterIds:[roster],sourceCode:cwlPerformanceViewSource(6,{windowMonths:3,familyOnly:true}),sourceVersion:1})});
  const replayText=await replay.text();
  assert.equal(replay.status,200,replayText);
  const replayEvents=replayText.split('\n').filter(line=>line.startsWith('data: {')).map(line=>JSON.parse(line.slice(6)));
  assert(!replayEvents.some(event=>event.type==='error'),replayText);
  const view=replayEvents.find(event=>event.type==='data-viewResult');
  assert(view,replayText);
  const unknownPlayer=view.data.rows.find(row=>row.playerTag==='#PYLQCVVV');
  assert.equal(unknownPlayer.values.stars_per_war,null);
  assert.equal(unknownPlayer.values.destruction,null);
  assert.equal(unknownPlayer.values.wars,0);
  assert.deepEqual(view.data.rows.filter(row=>known.includes(row.playerTag)).map(row=>row.playerTag),[known[1],known[0]]);
  assert.equal(view.data.rows.find(row=>row.playerTag===known[1]).values.destruction,95);
  assert.equal(view.data.rows.find(row=>row.playerTag===known[1]).values.stars,2);
  const draft=replayEvents.find(event=>event.type==='data-viewDraft');
  assert.deepEqual(draft.data.spec.sort.map(item=>[item.columnId,item.direction]),[['stars_per_war','desc'],['attacks','desc'],['stars','desc'],['destruction','desc']]);
  console.log('PASS generated CWL view replay: actual dynamic Worker/API/SQL, calendar/family parameters accepted, unknown player retained, no paid model calls');

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
  cwlToolMode=true;
  const toolRun=await runtime.dispatchFetch('http://localhost/chat',{method:'POST',headers:{authorization:'Bearer '+tokens.manage,'content-type':'application/json'},body:JSON.stringify({...body,mode:'chat',rosterIds:[roster]})});
  const toolText=await toolRun.text();
  assert.equal(toolRun.status,200,toolText);
  assert(observedToolOutput,toolText);
  const outputResult=observedToolOutput.result??observedToolOutput;
  assert(outputResult.rows,JSON.stringify(outputResult));
  assert.equal(outputResult.rows.find(row=>row.playerTag===known[1]).totalDestruction,95);
  assert.equal(outputResult.rows.find(row=>row.playerTag===known[1]).totalStars,2);
  assert.deepEqual(outputResult.sort.map(item=>[item.columnId,item.direction]),[['stars_per_war','desc'],['attacks','desc'],['stars','desc'],['destruction','desc']]);
  console.log('PASS model-facing tool response: actual SDK function call receives per-player total destruction and stars plus all four sort keys');
  console.log('PASS real Worker/SDK/API/SQL: 429 rejected, 500 unknown and retryable; fragmented terminal usage persisted once despite SDK callback; transient settlement 503 retried; browser disconnect retains receipt; failed/incomplete responses retain reported usage; missing terminal usage explicitly unknown; no external model calls');

 }

} finally {
 try {await runtime?.dispose();} catch {}
 if(provider)await new Promise(r=>provider.close(r));
 for(const child of children.reverse())child.kill('SIGTERM');
 await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,5000);})));
 await db.end();await rm(temp,{recursive:true,force:true});
}
