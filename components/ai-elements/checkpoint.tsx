"use client";

import type { HTMLAttributes } from "react";
import { BookmarkIcon, type LucideProps } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type CheckpointProps = HTMLAttributes<HTMLDivElement>;

export const Checkpoint = ({ className, children, ...props }: CheckpointProps) => (
  <div
    className={cn("flex items-center gap-2 overflow-hidden text-muted-foreground", className)}
    {...props}
  >
    {children}
    <Separator className="min-w-8 flex-1" />
  </div>
);

export type CheckpointIconProps = LucideProps;

export const CheckpointIcon = ({ className, children, ...props }: CheckpointIconProps) =>
  children ?? <BookmarkIcon className={cn("size-4 shrink-0", className)} {...props} />;

