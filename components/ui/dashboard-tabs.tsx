"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

const DashboardTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList> & {
    overflow?: "wrap" | "scroll"
  }
>(({ className, overflow = "scroll", ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "grid h-auto w-full gap-1 rounded-2xl border-0 bg-muted/55 p-1.5",
      overflow === "scroll" && "flex snap-x snap-mandatory justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      overflow === "wrap" && "flex flex-wrap",
      className,
    )}
    {...props}
  />
))
DashboardTabsList.displayName = "DashboardTabsList"

interface DashboardTabTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsTrigger> {
  artwork?: React.ReactNode
  count?: React.ReactNode
}

const DashboardTabTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  DashboardTabTriggerProps
>(({ artwork, children, className, count, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "group relative h-10 justify-center gap-2 rounded-xl px-3 pb-2.5 text-xs font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:shadow-black/10 sm:text-sm",
      "min-w-max snap-start",
      className,
    )}
    {...props}
  >
    {artwork && (
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center opacity-60 saturate-75 transition-[filter,opacity] duration-150 group-data-[state=active]:opacity-100 group-data-[state=active]:saturate-100 [&_img]:h-[22px] [&_img]:w-[22px] [&_img]:object-contain [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {artwork}
      </span>
    )}
    <span className="whitespace-nowrap">{children}</span>
    {count !== undefined && (
      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold leading-none text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
        {count}
      </span>
    )}
    <span className="absolute inset-x-0 bottom-1 mx-auto h-0.5 w-5 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
  </TabsTrigger>
))
DashboardTabTrigger.displayName = "DashboardTabTrigger"

export { DashboardTabsList, DashboardTabTrigger }
