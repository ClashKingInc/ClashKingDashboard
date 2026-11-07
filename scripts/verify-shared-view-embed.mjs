import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Exercise the built edge Worker and actual static assets against the running
// disposable API. This never publishes a link or contacts Discord.
export async function verifySharedViewEmbed({apiOrigin,shareId,name,description}) {
  assert.equal(process.env.CLASHKING_DISPOSABLE_TIMESCALE,'1');
  const root=fileURLToPath(new URL('../',import.meta.url));
  const origin='http://127.0.0.1:8843';
  const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/clashking_dashboard/wrangler.json','--local','--ip','127.0.0.1','--port','8843','--var',`SHARED_VIEW_API_ORIGIN:${apiOrigin}`],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',data=>logs+=data);child.stderr.on('data',data=>logs+=data);
  try {
    let ready=false;
    for(let i=0;i<100;i++){
      if(child.exitCode!==null)throw Error(logs.slice(-3000));
      try{ready=(await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok;}catch{}
      if(ready)break;
      await new Promise(resolve=>setTimeout(resolve,300));
    }
    assert(ready,logs.slice(-3000));
    const response=await fetch(`${origin}/view?share=${shareId}`,{headers:{'user-agent':'Discordbot/2.0'}});
    const html=await response.text();
    await new Promise(resolve=>setTimeout(resolve,300));
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store',JSON.stringify({shareId,url:response.url,html:html.slice(0,300),logs}));
    assert(html.includes(`property="og:title" content="${name}"`),html.slice(0,2000));
    assert(html.includes(description));assert(html.includes('Saved to 1 server'));
    assert(html.includes('name="twitter:card" content="summary_large_image"'));
    assert(html.includes('id="root"'),'Keep the real application shell');
    assert.equal((html.match(/property="og:title"/g)??[]).length,1);
    const image=await fetch(`${origin}/view/share-image/${shareId}.png`);
    assert.equal(image.status,200,logs);assert.equal(image.headers.get('content-type'),'image/png');
    const png=Buffer.from(await image.arrayBuffer());
    assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
    const {writeFile}=await import('node:fs/promises');await writeFile('/tmp/ck-share-social-preview.png',png);
    const invalid=await fetch(`${origin}/view?share=UnknownToken1234`).then(response=>response.text());
    assert(!invalid.includes(name),'Unknown links must not reuse another preview');
    console.log('PASS actual built Dashboard edge + API: Discord crawler receives view title, description and distinct-server count before JavaScript; application shell retained and unknown tokens isolated');
  }finally{child.kill('SIGTERM');}
}
