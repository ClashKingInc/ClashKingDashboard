"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  GripVertical,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import {
  isClanCategoriesResponse,
  isClanCategoryDeletePreview,
  isClanCategoryDeleteResponse,
  isClanCategoryMutationResponse,
  type ClanCategory,
  type ClanCategoryDeletePreview,
} from "@/lib/api/types/clan-categories";

const MAX_CATEGORY_NAME_RUNES = 64;

export function normalizeClanCategoryName(value: string): string {
  return value.trim().replaceAll(/\s+/gu, " ");
}

export function validateClanCategoryName(value: string): boolean {
  const normalized = normalizeClanCategoryName(value);
  return normalized.length > 0
    && !/\p{Cc}/u.test(normalized)
    && Array.from(normalized).length <= MAX_CATEGORY_NAME_RUNES;
}

export function moveClanCategory(
  categories: ClanCategory[],
  activeId: string,
  overId: string,
): ClanCategory[] {
  const oldIndex = categories.findIndex(({ id }) => id === activeId);
  const newIndex = categories.findIndex(({ id }) => id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return categories;
  return arrayMove(categories, oldIndex, newIndex).map((category, position) => ({
    ...category,
    position,
  }));
}

interface ClanCategoryManagerProps {
  serverId: string;
  refreshVersion: number;
  onCategoriesChange: (categories: ClanCategory[]) => void;
  onRefreshClans: () => Promise<void>;
}

interface DeleteSuccess {
  name: string;
  uncategorizedClanCount: number;
}

interface SortableCategoryRowProps {
  readonly category: ClanCategory;
  readonly disabled: boolean;
  readonly previewing: boolean;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

function SortableCategoryRow({
  category,
  disabled,
  previewing,
  onRename,
  onDelete,
}: SortableCategoryRowProps) {
  const t = useTranslations("ClansPage.categories");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center justify-between gap-2 rounded-[20px] bg-muted/45 px-2.5 py-2.5 transition-[opacity,transform,box-shadow]",
        isDragging && "relative z-10 opacity-60 shadow-lg",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="touch-none cursor-grab rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 active:cursor-grabbing"
        aria-label={t("reorderAction", { name: category.name })}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="secondary" className="border-0 bg-background/70 shadow-none">
          {t("clanCount", { count: category.clanCount })}
        </Badge>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 border-0 bg-background/70 shadow-none"
          aria-label={t("renameAction", { name: category.name })}
          onClick={onRename}
          disabled={disabled}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          aria-label={t("deleteAction", { name: category.name })}
          onClick={onDelete}
          disabled={disabled}
        >
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function ClanCategoryManager({
  serverId,
  refreshVersion,
  onCategoriesChange,
  onRefreshClans,
}: Readonly<ClanCategoryManagerProps>) {
  const t = useTranslations("ClansPage.categories");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [categories, setCategories] = useState<ClanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ClanCategory | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deletePreview, setDeletePreview] = useState<ClanCategoryDeletePreview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<DeleteSuccess | null>(null);
  const [reordering, setReordering] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    const response = await apiClient.clanCategories.list(serverId);
    if (!isClanCategoriesResponse(response.data)) {
      setError(response.error || t("errors.load"));
      setLoading(false);
      return;
    }
    setCategories(response.data.items);
    onCategoriesChange(response.data.items);
    setLoading(false);
  };

  useEffect(() => {
    void loadCategories();
    // loadCategories intentionally reruns only for a server or explicit parent refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, refreshVersion]);

  const refreshAfterMutation = async () => {
    await Promise.all([loadCategories(), onRefreshClans()]);
  };

  const showError = (message: string) => {
    toast({
      title: tCommon("error"),
      description: message,
      variant: "destructive",
    });
  };

  const createCategory = async () => {
    if (creating) return;
    if (!validateClanCategoryName(createName)) {
      showError(t("errors.invalidName"));
      return;
    }
    setCreating(true);
    const response = await apiClient.clanCategories.create(serverId, createName);
    if (!isClanCategoryMutationResponse(response.data)) {
      showError(response.error || t("errors.create"));
      setCreating(false);
      return;
    }
    setCreateName("");
    try {
      await refreshAfterMutation();
      toast({
        title: tCommon("success"),
        description: t("created", { name: response.data.category.name }),
      });
    } catch {
      showError(t("errors.refresh"));
    } finally {
      setCreating(false);
    }
  };

  const openRename = (category: ClanCategory) => {
    setRenameTarget(category);
    setRenameName(category.name);
  };

  const renameCategory = async () => {
    if (renaming) return;
    if (!renameTarget || !validateClanCategoryName(renameName)) {
      showError(t("errors.invalidName"));
      return;
    }
    setRenaming(true);
    const response = await apiClient.clanCategories.rename(
      serverId,
      renameTarget.id,
      renameName,
    );
    if (!isClanCategoryMutationResponse(response.data)) {
      showError(response.error || t("errors.rename"));
      setRenaming(false);
      return;
    }
    setRenameTarget(null);
    try {
      await refreshAfterMutation();
      toast({
        title: tCommon("success"),
        description: t("renamed", { name: response.data.category.name }),
      });
    } catch {
      showError(t("errors.refresh"));
    } finally {
      setRenaming(false);
    }
  };

  const previewDelete = async (category: ClanCategory) => {
    setPreviewingId(category.id);
    const response = await apiClient.clanCategories.previewDelete(serverId, category.id);
    if (!isClanCategoryDeletePreview(response.data)) {
      showError(response.error || t("errors.preview"));
      setPreviewingId(null);
      return;
    }
    setDeletePreview(response.data);
    setPreviewingId(null);
  };

  const deleteCategory = async () => {
    if (!deletePreview) return;
    setDeleting(true);
    const response = await apiClient.clanCategories.delete(
      serverId,
      deletePreview.category.id,
    );
    if (!isClanCategoryDeleteResponse(response.data)) {
      showError(response.error || t("errors.delete"));
      setDeleting(false);
      return;
    }
    setDeletePreview(null);
    setDeleteSuccess({
      name: response.data.name,
      uncategorizedClanCount: response.data.uncategorizedClanCount,
    });
    try {
      await refreshAfterMutation();
    } catch {
      showError(t("errors.refresh"));
    } finally {
      setDeleting(false);
    }
  };

  const reorderCategories = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || reordering) return;
    const previous = categories;
    const next = moveClanCategory(previous, String(active.id), String(over.id));
    if (next === previous) return;

    setCategories(next);
    onCategoriesChange(next);
    setReordering(true);
    const response = await apiClient.clanCategories.reorder(serverId, next.map(({ id }) => id));
    if (!isClanCategoriesResponse(response.data)) {
      setCategories(previous);
      onCategoriesChange(previous);
      showError(response.error || t("errors.reorder"));
      setReordering(false);
      return;
    }
    setCategories(response.data.items);
    onCategoriesChange(response.data.items);
    toast({ title: tCommon("success"), description: t("reordered") });
    setReordering(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-clan-category">{t("createLabel")}</Label>
            <Input
              id="new-clan-category"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={creating}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createCategory();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("nameHelp", {
                count: Array.from(normalizeClanCategoryName(createName)).length,
                max: MAX_CATEGORY_NAME_RUNES,
              })}
            </p>
          </div>
          <Button
            className="sm:mt-[26px]"
            onClick={() => void createCategory()}
            disabled={creating}
          >
            {creating ? <Loader2 className="animate-spin" /> : <Plus />}
            {t("create")}
          </Button>
        </div>

        {deleteSuccess && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>{t("deleteSuccessTitle", { name: deleteSuccess.name })}</AlertTitle>
            <AlertDescription>
              {t("deleteSuccessDescription", {
                count: deleteSuccess.uncategorizedClanCount,
              })}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t("errors.title")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-[20px] bg-muted/45 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void reorderCategories(event)}>
            <SortableContext items={categories.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategoryRow
                    key={category.id}
                    category={category}
                    disabled={reordering || previewingId !== null}
                    previewing={previewingId === category.id}
                    onRename={() => openRename(category)}
                    onDelete={() => void previewDelete(category)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null);
        }}
      >
        <DialogContent variant="form">
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
            <DialogDescription>{t("renameDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-clan-category">{t("name")}</Label>
            <Input
              id="rename-clan-category"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              disabled={renaming}
              onKeyDown={(event) => {
                if (event.key === "Enter") void renameCategory();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={() => void renameCategory()} disabled={renaming}>
              {renaming ? <Loader2 className="animate-spin" /> : <Pencil />}
              {t("saveRename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletePreview !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletePreview(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              {t("deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletePreview
                ? t("deleteWarning", {
                  name: deletePreview.category.name,
                  count: deletePreview.affectedClanCount,
                })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t("deleteCountMayChange")}</AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tCommon("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void deleteCategory()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {t("confirmDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
