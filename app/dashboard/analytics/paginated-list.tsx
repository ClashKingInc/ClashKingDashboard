"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { pageWindow } from "./analytics-model";

export function PaginatedList({ count, children }: { count: number; children: (offset: number, limit: number) => ReactNode }) {
  const t = useTranslations("Common");
  const [requestedPage, setPage] = useState(0);
  const { page, pages, offset, limit } = pageWindow(count, requestedPage);
  return <div className="space-y-4">
    {children(offset, limit)}
    {pages > 1 && <div className="flex items-center justify-end gap-3">
      <Button variant="ghost" size="sm" className="rounded-xl bg-muted/40" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("previous")}</Button>
      <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{page + 1} / {pages}</span>
      <Button variant="ghost" size="sm" className="rounded-xl bg-muted/40" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t("next")}</Button>
    </div>}
  </div>;
}
