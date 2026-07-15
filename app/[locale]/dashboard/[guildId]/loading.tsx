import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic loading skeleton for every dashboard section.
 * Sections with a more specific skeleton (e.g. giveaways) define their own
 * loading.tsx, which takes precedence over this one.
 */
export default function DashboardSectionLoading() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["stat-a", "stat-b", "stat-c", "stat-d"].map((key) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {["row-a", "row-b", "row-c", "row-d", "row-e"].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
