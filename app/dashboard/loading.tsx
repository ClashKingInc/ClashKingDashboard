import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardRouteLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8" aria-busy="true" aria-label="Loading dashboard page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 max-w-[70vw] rounded-xl" />
        <Skeleton className="h-4 w-[32rem] max-w-full rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40 rounded-[24px]" />
        <Skeleton className="h-40 rounded-[24px]" />
        <Skeleton className="h-40 rounded-[24px]" />
      </div>
      <Skeleton className="h-64 rounded-[24px]" />
    </div>
  );
}
