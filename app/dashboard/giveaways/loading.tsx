import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function GiveawaysLoadingPage() {
  const t = await getTranslations("GiveawaysPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-[24px]" />)}
        </div>
      </div>
    </div>
  );
}
