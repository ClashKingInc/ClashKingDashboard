// Real assistant HTTP -> real API authorization -> disposable canonical SQL.
// Replay validation stops before any model or dynamic-worker execution.
// Run with the canonical with-test-integration.sh fixture and
// CLASHKING_E2E_API_REPO plus CLASHKING_E2E_STATIC_ASSETS_ROOT set.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { createRequire } from 'node:module';
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
const children=[];let logs='';
const start=(script,env,cwd)=>{const child=spawn(process.execPath,[script],{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});children.push(child);child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);return child;};
const ready=async(url,child)=>{for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs.slice(-2500));try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error(logs.slice(-2500));};
const signingKey=randomBytes(32).toString('base64url');
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
 const api=start('scripts/start-local-rewrite-api.mjs',{CLASHKING_LOCAL_API_PORT:'8818',CLASHKING_LOCAL_ARCHIVE_BRIDGE:'0',CLASHKING_LOCAL_PRODUCTION_READS:'0',CLASHKING_E2E_JWT_ACCESS_SECRET:signingKey,CLASHKING_E2E_API_BOT_TOKEN:randomBytes(32).toString('base64url'),CLASHKING_LOCAL_STATIC_ASSETS_ROOT:process.env.CLASHKING_E2E_STATIC_ASSETS_ROOT,CLASHKING_LOCAL_DISCORD_CLIENT_ID:'999999999999999999',CLASHKING_LOCAL_DISCORD_CLIENT_SECRET:'local-only'},apiRepo);
 await ready(origin+'/v2/health',api);
 const vars=join(temp,'assistant.vars');await writeFile(vars,'OPENAI_API_KEY="local-never-used"\nAI_USAGE_SECRET="local-never-used"\n',{mode:0o600});
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
} finally {
 for(const child of children.reverse())child.kill('SIGTERM');
 await new Promise(r=>setTimeout(r,300));
 await db.end();await rm(temp,{recursive:true,force:true});
}
