"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { townHallImageUrl } from "@/lib/theme";
import { DEFAULT_WAR_SIZE, GRAPHIC_PROJECT_TYPES, WAR_SIZES, type GraphicProjectRecord } from "./graphic-projects";
import type { GraphicProjectKind, GraphicWarSize } from "./graphic-document";

const TYPE_ART: Record<GraphicProjectKind, string> = {
  player: townHallImageUrl(17),
  clan: "https://assets.clashk.ing/icons/Icon_HV_Shield.png",
  war: "https://assets.clashk.ing/icons/Icon_HV_Clan_War.png",
};

export function GraphicProjectHub({ projects, onCreate, onOpen, onDelete }: {
  projects: GraphicProjectRecord[];
  onCreate: (kind: GraphicProjectKind, warSize?: number) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState<GraphicProjectKind>("player");
  const [warSize, setWarSize] = useState<GraphicWarSize>(DEFAULT_WAR_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<GraphicProjectRecord | null>(null);

  const create = () => {
    onCreate(kind, kind === "war" ? warSize : undefined);
    setCreateOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-bold md:text-3xl">Graphics</h1><p className="mt-1 text-muted-foreground">Create reusable player, clan, and war graphics from structured data.</p></div>
          <Button onClick={() => setCreateOpen(true)}><Plus />New graphic</Button>
        </div>

        {projects.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="group relative rounded-3xl bg-card p-4 shadow-sm shadow-black/5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="absolute right-6 top-6 z-10 h-9 w-9 rounded-full border-0 bg-card/90 shadow-md backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" aria-label={`Actions for ${project.document.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-xl"><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget(project)}><Trash2 className="mr-2 h-4 w-4" />Delete graphic</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
                <button type="button" onClick={() => onOpen(project.id)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-muted/45">
                    <Image src={TYPE_ART[project.kind]} alt="" width={112} height={112} unoptimized className="h-28 w-28 object-contain transition-transform duration-150 group-hover:scale-105" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{project.document.name}</h2><p className="text-xs text-muted-foreground">{project.kind === "war" ? `${project.document.warSize}v${project.document.warSize} war` : project.kind} · {project.document.canvas.width} × {project.document.canvas.height}</p></div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl bg-muted/40 px-6 py-14 text-center"><p className="font-semibold">No graphics yet</p><p className="mt-1 text-sm text-muted-foreground">Choose a project type to start with sensible bindings and layout.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus />Create your first graphic</Button></div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent variant="form" className="border-0 bg-card shadow-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create a graphic</DialogTitle><DialogDescription>Choose the data shape first. You can resize and redesign the canvas afterward.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {GRAPHIC_PROJECT_TYPES.map((type) => (
              <button key={type.kind} type="button" onClick={() => setKind(type.kind)} className={cn("rounded-2xl bg-muted/45 p-4 text-left shadow-sm transition-colors", kind === type.kind ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted") }>
                <Image src={TYPE_ART[type.kind]} alt="" width={64} height={64} unoptimized className="mb-3 h-16 w-16 object-contain" />
                <span className="block font-semibold">{type.label}</span><span className="mt-1 block text-xs text-muted-foreground">{type.description}</span>
              </button>
            ))}
          </div>
          {kind === "war" && <div className="rounded-2xl bg-muted/45 p-4"><p className="mb-2 text-sm font-semibold">War size</p><Select value={String(warSize)} onValueChange={(value) => setWarSize(Number(value) as GraphicWarSize)}><SelectTrigger className="border-0 bg-background/70 shadow-sm"><SelectValue /></SelectTrigger><SelectContent>{WAR_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size} vs {size}</SelectItem>)}</SelectContent></Select><p className="mt-2 text-xs text-muted-foreground">Member elements are generated for both sides and grouped so you can style a whole roster or customize one member.</p></div>}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create}><Plus />Create</Button></div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this graphic?</AlertDialogTitle><AlertDialogDescription>{deleteTarget ? `“${deleteTarget.document.name}” will be permanently removed from this browser.` : "This graphic will be permanently removed."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) onDelete(deleteTarget.id); setDeleteTarget(null); }}>Delete graphic</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
