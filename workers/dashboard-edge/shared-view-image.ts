import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasm from "@resvg/resvg-wasm/index_bg.wasm";

const ready = initWasm(wasm);
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]!);
function wrap(value: string, width: number, limit: number): string[] {
  const words = value.replace(/\s+/g," ").trim().split(" ");
  const lines: string[] = []; let line = "";
  for (const word of words) {
    for (const part of word.match(new RegExp(`.{1,${width}}`, "gu")) ?? []) {
      if ([...`${line} ${part}`].length > width && line) { lines.push(line); line = ""; }
      line += `${line ? " " : ""}${part}`;
    }
  }
  if(line)lines.push(line);
  if(lines.length>limit)lines[limit-1]=`${lines[limit-1]!.slice(0,-1)}…`;
  return lines.slice(0,limit);
}
export async function sharedViewImage(data: {name:string;description:string;savedServerCount:number}, assets: Pick<Fetcher,"fetch">): Promise<Response> {
  await ready;
  const [font,logo] = await Promise.all([
    assets.fetch(new Request("https://dash.clashk.ing/landing/bricolage.ttf")),
    assets.fetch(new Request("https://dash.clashk.ing/logos/bot-app-logo.png")),
  ]);
  if(!font.ok || !logo.ok)throw new Error("Share card assets unavailable");
  const fontBytes=new Uint8Array(await font.arrayBuffer());
  const fontOptions={fontBuffers:[fontBytes],defaultFontFamily:"Bricolage Grotesque"};
  const lineSvg=(line:string,y:number,size:number,color:string,weight:number)=>{
    // Measure actual glyphs so long names and wide characters stay inside the
    // card. Character-count wrapping alone is not a safe width constraint.
    const measured=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="150"><text font-family="Bricolage Grotesque" font-size="${size}" font-weight="${weight}" y="80">${escape(line)}</text></svg>`,{font:fontOptions});
    const box=measured.getBBox();const width=box?.width??0;box?.free();measured.free();
    return `<g transform="translate(64 ${y}) scale(${Math.min(1,1072/Math.max(1,width))} 1)"><text fill="${color}" font-size="${size}" font-weight="${weight}">${escape(line)}</text></g>`;
  };
  const title=wrap(data.name,35,3);
  const description=wrap(data.description,76,4);
  const descriptionY=184+title.length*58+28;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><clipPath id="logo"><circle cx="92" cy="78" r="30"/></clipPath><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#19191d"/><stop offset="1" stop-color="#0b0b0e"/></linearGradient><radialGradient id="glow"><stop stop-color="#802b28" stop-opacity=".28"/><stop offset="1" stop-color="#802b28" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/><ellipse cx="1150" cy="70" rx="560" ry="420" fill="url(#glow)"/>
    <rect x="0" y="0" width="1200" height="7" fill="#e82727"/>
    <image clip-path="url(#logo)" x="62" y="48" width="60" height="60" href="data:image/png;base64,${btoa(Array.from(new Uint8Array(await logo.arrayBuffer()), byte => String.fromCharCode(byte)).join(""))}"/>
    <g font-family="Bricolage Grotesque, sans-serif"><text x="140" y="87" fill="#fafafa" font-size="32" font-weight="700">ClashKing</text><text x="1136" y="84" text-anchor="end" fill="#b3afb5" font-size="24">Shared roster view</text>
    ${title.map((line,index)=>lineSvg(line,184+index*58,52,"#fafafa",700)).join("")}
    ${description.map((line,index)=>lineSvg(line,descriptionY+index*32,26,"#bdbac2",400)).join("")}
    <line x1="64" y1="534" x2="1136" y2="534" stroke="#353239"/>
    <circle cx="77" cy="575" r="5" fill="#ee4b46"/><text x="96" y="584" fill="#dedbe1" font-size="24">Saved to ${data.savedServerCount} ${data.savedServerCount===1?"server":"servers"}</text>
    <text x="1136" y="584" text-anchor="end" fill="#aaa6b0" font-size="24">dash.clashk.ing</text></g></svg>`;
  const renderer=new Resvg(svg,{font:fontOptions});
  try {
    const rendered=renderer.render();
    try { return new Response(new Uint8Array(rendered.asPng()),{headers:{"Content-Type":"image/png","Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}}); }
    finally{rendered.free();}
  }finally{renderer.free();}
}
