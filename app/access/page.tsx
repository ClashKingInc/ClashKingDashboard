import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import { Loader2 } from 'lucide-react';
import { getAccessToken, setAccessToken } from '@/lib/auth/session';
import { embeddedServerId } from '@/lib/auth/embedded';
import { getDefaultBaseUrl } from '@/lib/api/client';
import { useRouter } from '@/lib/navigation';
import { useAuthSession } from '@/components/auth-session-provider';

// React StrictMode can restart an effect while a one-use exchange is in flight.
// Share that request so the second effect can install its result instead of
// submitting the consumed code again. A successful active effect clears it.
let pendingExchange: { key:string; promise:Promise<{access_token:string;serverId:string}> } | undefined;
const rosterPattern=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;

export default function DashboardAccessPage() {
 const t=useTranslations('Common'),router=useRouter(),[failed,setFailed]=useState(false),{status}=useAuthSession();
 const bootstrapMode=embeddedServerId()?'embedded':status;
 useEffect(()=>{let active=true,exchanging=false;
  const exchange=async(input:{code:string;codeVerifier?:string},rosterId?:string)=>{
   if(exchanging)return;exchanging=true;
   try{
    const requestKey=JSON.stringify(input);
    if(pendingExchange?.key!==requestKey){
     pendingExchange={key:requestKey,promise:(async()=>{
      const token=getAccessToken();const response=await fetch(`${getDefaultBaseUrl()}/v2/auth/server-dashboard/exchange`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(input)});
      if(!response.ok)throw Error('Grant rejected');const data=await response.json();
      if(typeof data.access_token!=='string'||!/^\d+$/.test(data.serverId))throw Error('Invalid grant response');
      return data as {access_token:string;serverId:string};
     })()};
    }
    const data=await pendingExchange.promise;
    if(!active)return;
    sessionStorage.removeItem('ck_pending_dashboard_grant');sessionStorage.removeItem('ck_pending_dashboard_roster');pendingExchange=undefined;
    sessionStorage.setItem('ck_scoped_server',data.serverId);setAccessToken(data.access_token,false);
    // Only a roster UUID is accepted, never an arbitrary redirect URL. The
    // authenticated grant supplies guildId even if the fragment was modified.
    const target=rosterId&&rosterPattern.test(rosterId)
     ? `/dashboard/rosters/detail?guildId=${data.serverId}&rosterId=${encodeURIComponent(rosterId)}&embedded=1`
     : `/dashboard/general?guildId=${data.serverId}&embedded=1`;
    router.replace(target);
   }catch{if(active){pendingExchange=undefined;setFailed(true);}}finally{exchanging=false;}
  };
  const target=window as Window&{__clashkingDashboardHandoff?:(value:{code:string;codeVerifier:string})=>void;ReactNativeWebView?:{postMessage:(value:string)=>void}};
  target.__clashkingDashboardHandoff=value=>{if(value&&typeof value.code==='string'&&typeof value.codeVerifier==='string')void exchange(value);};
  const listener=(event:MessageEvent)=>{if(event.source!==window.parent||!['https://app.clashk.ing','https://dev-app.clashk.ing','http://localhost:7357'].includes(event.origin)||event.data?.type!=='dashboard-handoff')return;target.__clashkingDashboardHandoff?.(event.data);};
  window.addEventListener('message',listener);
  const fragment=new URLSearchParams(window.location.hash.slice(1));
  const incomingCode=fragment.get('code');
  if(incomingCode){
   sessionStorage.setItem('ck_pending_dashboard_grant',incomingCode);
   const roster=fragment.get('roster');
   if(roster&&rosterPattern.test(roster))sessionStorage.setItem('ck_pending_dashboard_roster',roster);
   else sessionStorage.removeItem('ck_pending_dashboard_roster');
   history.replaceState(null,'',window.location.pathname+window.location.search);
  }
  const code=sessionStorage.getItem('ck_pending_dashboard_grant');
  const rosterId=sessionStorage.getItem('ck_pending_dashboard_roster')??undefined;
  if(code){if(getAccessToken())void exchange({code},rosterId);else if(status==='anonymous'){sessionStorage.setItem('auth_return_to','/access');router.replace('/login');}}

  if(embeddedServerId()){target.ReactNativeWebView?.postMessage(JSON.stringify({type:'dashboard-ready'}));if(window.parent!==window)window.parent.postMessage({type:'dashboard-ready'},'*');}
  return()=>{active=false;delete target.__clashkingDashboardHandoff;window.removeEventListener('message',listener);};
 },[router,bootstrapMode]);
 return <main className="flex min-h-dvh items-center justify-center gap-3 bg-background p-6 text-foreground">{failed?t('error'):<><Loader2 className="h-5 w-5 animate-spin"/>{t('loading')}</>}</main>;
}
