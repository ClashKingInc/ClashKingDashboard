import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import { Loader2 } from 'lucide-react';
import { getAccessToken, setAccessToken } from '@/lib/auth/session';
import { embeddedServerId } from '@/lib/auth/embedded';
import { getDefaultBaseUrl } from '@/lib/api/client';
import { useRouter } from '@/lib/navigation';
import { useAuthSession } from '@/components/auth-session-provider';

export default function DashboardAccessPage() {
 const t=useTranslations('Common'),router=useRouter(),[failed,setFailed]=useState(false),{status}=useAuthSession();
 const bootstrapMode=embeddedServerId()?'embedded':status;
 useEffect(()=>{let active=true,exchanging=false;
  const exchange=async(input:{code:string;codeVerifier?:string})=>{
   if(exchanging)return;exchanging=true;
   try{const token=getAccessToken();const response=await fetch(`${getDefaultBaseUrl()}/v2/auth/server-dashboard/exchange`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(input)});
    if(!response.ok)throw Error('Grant rejected');const data=await response.json();
    if(!active||typeof data.access_token!=='string'||!/^\d+$/.test(data.serverId))return;
    sessionStorage.setItem('ck_scoped_server',data.serverId);setAccessToken(data.access_token,false);
    router.replace(`/dashboard/general?guildId=${data.serverId}&embedded=1`);
   }catch{if(active)setFailed(true);}finally{exchanging=false;}
  };
  const target=window as Window&{__clashkingDashboardHandoff?:(value:{code:string;codeVerifier:string})=>void;ReactNativeWebView?:{postMessage:(value:string)=>void}};
  target.__clashkingDashboardHandoff=value=>{if(value&&typeof value.code==='string'&&typeof value.codeVerifier==='string')void exchange(value);};
  const listener=(event:MessageEvent)=>{if(event.source!==window.parent||!['https://app.clashk.ing','https://dev-app.clashk.ing','http://localhost:7357'].includes(event.origin)||event.data?.type!=='dashboard-handoff')return;target.__clashkingDashboardHandoff?.(event.data);};
  window.addEventListener('message',listener);
  const code=new URLSearchParams(window.location.hash.slice(1)).get('code')??sessionStorage.getItem('ck_pending_dashboard_grant');
  if(code){history.replaceState(null,'',window.location.pathname+window.location.search);sessionStorage.setItem('ck_pending_dashboard_grant',code);if(getAccessToken()){sessionStorage.removeItem('ck_pending_dashboard_grant');void exchange({code});}else if(status==='anonymous'){sessionStorage.setItem('auth_return_to','/access');router.replace('/login');}}
  if(embeddedServerId()){target.ReactNativeWebView?.postMessage(JSON.stringify({type:'dashboard-ready'}));if(window.parent!==window)window.parent.postMessage({type:'dashboard-ready'},'*');}
  return()=>{active=false;delete target.__clashkingDashboardHandoff;window.removeEventListener('message',listener);};
 },[router,bootstrapMode]);
 return <main className="flex min-h-dvh items-center justify-center gap-3 bg-background p-6 text-foreground">{failed?t('error'):<><Loader2 className="h-5 w-5 animate-spin"/>{t('loading')}</>}</main>;
}
