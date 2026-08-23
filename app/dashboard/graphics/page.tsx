"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { MonitorUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

const GraphicEditor = lazy(() => import("./graphic-editor").then((module) => ({ default: module.GraphicEditor })));

function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function DesktopRequired() {
  const t = useTranslations("GraphicsPage");

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MonitorUp className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-balance text-2xl font-semibold text-foreground">{t("desktopOnlyTitle")}</h1>
        <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">{t("desktopOnlyDescription")}</p>
      </div>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="flex h-full min-h-[calc(100dvh-4.5rem)] flex-col gap-3 p-4 md:p-6" aria-busy="true">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="min-h-0 flex-1 rounded-xl" />
    </div>
  );
}

export default function GraphicsPage() {
  const isDesktop = useDesktopViewport();

  if (isDesktop === null) return <EditorLoading />;
  if (!isDesktop) return <DesktopRequired />;

  return (
    <Suspense fallback={<EditorLoading />}>
      <GraphicEditor />
    </Suspense>
  );
}
