"use client";
import { useCallback, useEffect, useState } from "react";
import { AI_NOTICE_VERSION, AiNoticeAcceptEndpoint, AiNoticeGetEndpoint } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** The API stores the version against the person, so changing servers or
 * devices does not silently transfer or unnecessarily repeat acknowledgement. */
export function useAiNotice(userId: string | undefined, onDecline: () => void) {
  const [result, setResult] = useState<{userId:string; accepted:boolean}>();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setChecked(false); setError(undefined);
    if (!userId) return;
    void executeSharedEndpoint(AiNoticeGetEndpoint,{path:{},query:{},body:{}})
      .then(value => { if(active)setResult({userId,accepted:value.acknowledged&&value.version===AI_NOTICE_VERSION}); })
      .catch(() => { if(active)setError("We could not load your AI notice preference. Try again before using the assistant."); });
    return () => { active=false; };
  },[userId,attempt]);
  const accepted=Boolean(userId&&result?.userId===userId&&result.accepted);
  const accept=useCallback(async()=>{
    if(!checked||!userId||saving)return;
    setSaving(true);setError(undefined);
    try{
      const value=await executeSharedEndpoint(AiNoticeAcceptEndpoint,{path:{},query:{},body:{version:AI_NOTICE_VERSION}});
      setResult({userId,accepted:value.acknowledged&&value.version===AI_NOTICE_VERSION});
    }catch{setError("We could not save your preference. Nothing has been sent to the AI provider.");}
    finally{setSaving(false);}
  },[checked,userId,saving]);
  const notice=<AlertDialog open={Boolean(userId&&!accepted)}>
    <AlertDialogContent className="sm:max-w-lg">
      <AlertDialogHeader>
        <AlertDialogTitle>Before you use the AI assistant</AlertDialogTitle>
        <AlertDialogDescription asChild><div className="space-y-3">
          <p>Your messages and relevant clan, roster and player data are sent to OpenAI to generate responses. Avoid sharing passwords or sensitive personal information.</p>
          <p>Chat history is saved in this browser. Saved views, approved changes and usage records are stored by ClashKing. AI responses can be wrong—review them before applying changes.</p>
          <p><a href="/privacy" target="_blank" rel="noreferrer" className="text-primary underline">Read our privacy policy</a> for details about providers and retention.</p>
        </div></AlertDialogDescription>
      </AlertDialogHeader>
      {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={checked} disabled={saving||result?.userId!==userId} onCheckedChange={value=>setChecked(value===true)} /><span>I understand and want to use the AI assistant.</span></label>
      <AlertDialogFooter>
        <Button variant="ghost" disabled={saving} onClick={onDecline}>Back to rosters</Button>
        {error?<Button variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Retry</Button>:null}
        <Button disabled={!checked||saving||result?.userId!==userId} onClick={()=>void accept()}>{saving?"Saving…":"Continue"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return {accepted,notice};
}
