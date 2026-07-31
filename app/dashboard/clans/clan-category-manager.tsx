"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </div>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadCategories()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          {t("refresh")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{category.id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="secondary">
                    {t("clanCount", { count: category.clanCount })}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={t("renameAction", { name: category.name })}
                    onClick={() => openRename(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("deleteAction", { name: category.name })}
                    onClick={() => void previewDelete(category)}
                    disabled={previewingId !== null}
                  >
                    {previewingId === category.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null);
        }}
      >
        <DialogContent>
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
    </Card>
  );
}
