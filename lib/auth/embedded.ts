export function embeddedServerId(): string | undefined {
  if(typeof window==='undefined')return undefined;
  const query=new URLSearchParams(window.location.search);
  const requested=query.get('embedded')==='1'?query.get('guildId'):null;
  if(requested&&/^\d+$/.test(requested)){sessionStorage.setItem('ck_scoped_server',requested);return requested;}
  const stored=sessionStorage.getItem('ck_scoped_server');return stored&&/^\d+$/.test(stored)?stored:undefined;
}
export function notifyNativeSessionExpired() {
  if(!embeddedServerId())return;
  if(window.location.pathname.replace(/\/$/,'')==='/access')return;
  const message={type:'dashboard-session-expired'};
  (window as Window&{ReactNativeWebView?:{postMessage:(value:string)=>void}}).ReactNativeWebView?.postMessage(JSON.stringify(message));
  // Contains no token or private data. Parent validates origin and source.
  if(window.parent!==window)window.parent.postMessage(message,'*');
}
