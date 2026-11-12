"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionNotice {title?:ReactNode;description?:ReactNode;variant?:"default"|"destructive"}
/** Feedback belongs to a form or record, never to a global queue. Independent
 * scopes keep an error in one dialog from replacing another row's result. */
export function useActionFeedback(owner:string){
  // A response started on another server must not paint this server as saved
  // or failed. Clear owner state even if the new server has produced no notice.
  const activeOwner=useRef(owner);
  const [state,setState]=useState<{owner:string;notices:Record<string,ActionNotice|undefined>}>({owner,notices:{}});
  useEffect(()=>{activeOwner.current=owner;setState(current=>current.owner===owner?current:{owner,notices:{}});return()=>{activeOwner.current="";};},[owner]);
  const report=useCallback((scope:string,notice:ActionNotice)=>{
    if(activeOwner.current!==owner)return;
    setState(current=>({owner,notices:{...(current.owner===owner?current.notices:{}),[scope]:notice}}));
  },[owner]);
  const clear=useCallback((scope:string)=>{
    if(activeOwner.current!==owner)return;
    setState(current=>current.owner===owner&&current.notices[scope]===undefined?current:{owner,notices:{...(current.owner===owner?current.notices:{}),[scope]:undefined}});
  },[owner]);
  return {notices:state.owner===owner?state.notices:{},report,clear};
}

export function ActionFeedback({notice,className,reserve=false,compact=false}:{notice?:ActionNotice;className?:string;reserve?:boolean;compact?:boolean}){
  const error=notice?.variant==="destructive";
  return <div role={error?"alert":"status"} aria-live={error?"assertive":"polite"} aria-atomic="true"
    className={cn("flex items-start gap-1.5 text-sm",reserve&&"min-h-5",error?"text-destructive":"text-emerald-600 dark:text-emerald-400",className)}>
    {notice && <>{error?<AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />:<Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}<span className={cn("min-w-0 break-words",compact&&!error&&"sr-only")}>{notice.description??notice.title}</span></>}
  </div>;
}
