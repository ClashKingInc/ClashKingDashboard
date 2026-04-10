"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  GripVertical,
  RefreshCw,
  Loader2,
  GitCompare,
  Tag,
  Copy,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import * as api from "../_lib/api";
import type { Roster, RosterMember, SignupCategory } from "../_lib/types";

// Draggable member item
interface DraggableMemberProps {
  readonly member: RosterMember;
  readonly rosterId: string;
  readonly isDuplicate?: boolean;
}

function DraggableMember({ member, rosterId, isDuplicate }: DraggableMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${rosterId}:${member.tag}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-background rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg scale-105",
        isDuplicate
          ? "border-yellow-500/60 bg-yellow-500/5 hover:border-yellow-500 hover:shadow-sm"
          : "border-border/50 hover:border-border hover:shadow-sm"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="text-orange-400 font-medium text-sm w-8">
        TH{member.townhall}
      </span>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground truncate flex items-center gap-1 text-sm">
          {member.name}
          {isDuplicate && (
            <Copy className="w-3 h-3 text-yellow-500 shrink-0" />
          )}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {member.tag}
        </span>
      </div>
    </div>
  );
}

// Category drop zone within a roster
interface CategoryDropZoneProps {
  readonly rosterId: string;
  readonly categoryId: string | null;
  readonly categoryName: string;
  readonly members: RosterMember[];
  readonly isOver: boolean;
  readonly color?: string;
  readonly duplicateTags?: Set<string>;
}

function CategoryDropZone({
  rosterId,
  categoryId,
  categoryName,
  members,
  isOver,
  color,
  duplicateTags,
}: CategoryDropZoneProps) {
  const dropId = `${rosterId}:category:${categoryId || "uncategorized"}`;
  const { setNodeRef } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 border-dashed p-2 transition-all min-h-[60px]",
        isOver
          ? "border-primary bg-primary/10"
          : "border-border/50 bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-3 h-3 text-muted-foreground" />
        <span
          className="text-xs font-medium"
          style={{ color: color || "inherit" }}
        >
          {categoryName}
        </span>
        <Badge variant="outline" className="text-xs ml-auto">
          {members.length}
        </Badge>
      </div>

      <SortableContext
        items={members.map((m) => `${rosterId}:${m.tag}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {members.map((member) => (
            <DraggableMember
              key={member.tag}
              member={member}
              rosterId={rosterId}
              isDuplicate={duplicateTags?.has(member.tag)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// Roster column with categories
interface RosterColumnProps {
  readonly roster: Roster;
  readonly members: RosterMember[];
  readonly categories: SignupCategory[];
  readonly overCategoryId: string | null;
  readonly isLoading: boolean;
  readonly duplicateTags?: Set<string>;
  readonly t: (key: string) => string;
}

function RosterColumn({
  roster,
  members,
  categories,
  overCategoryId,
  isLoading,
  duplicateTags,
  t,
}: RosterColumnProps) {
  const { setNodeRef } = useDroppable({
    id: roster.custom_id,
  });

  const avgTh =
    members.length > 0
      ? (
          members.reduce((sum, m) => sum + (m.townhall || 0), 0) / members.length
        ).toFixed(1)
      : "-";

  // Group members by category
  const membersByCategory = useMemo(() => {
    const grouped: Record<string, RosterMember[]> = {
      uncategorized: [],
    };

    // Initialize all categories
    categories.forEach((cat) => {
      grouped[cat.custom_id] = [];
    });

    // Group members
    members.forEach((member) => {
      const catId = member.signup_group || "uncategorized";
      if (grouped[catId]) {
        grouped[catId].push(member);
      } else {
        grouped.uncategorized.push(member);
      }
    });

    return grouped;
  }, [members, categories]);

  // Get categories that have members or are allowed for this roster
  const relevantCategories = useMemo(() => {
    const allowedIds = new Set(roster.allowed_signup_categories || []);
    return categories.filter(
      (cat) =>
        membersByCategory[cat.custom_id]?.length > 0 ||
        allowedIds.size === 0 ||
        allowedIds.has(cat.custom_id)
    );
  }, [categories, membersByCategory, roster.allowed_signup_categories]);

  return (
    <Card ref={setNodeRef} className="flex flex-col h-full transition-all">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          {roster.clan_badge ? (
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={roster.clan_badge}
                alt={roster.clan_name || ""}
              />
              <AvatarFallback>{roster.alias.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{roster.alias}</CardTitle>
            {roster.clan_name && (
              <p className="text-xs text-muted-foreground truncate">
                {roster.clan_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{members.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Avg TH:</span>
            <span className="font-medium text-orange-400">{avgTh}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-full overflow-y-auto space-y-3 pr-2">
            {/* Categories with members */}
            {relevantCategories.map((category) => (
              <CategoryDropZone
                key={category.custom_id}
                rosterId={roster.custom_id}
                categoryId={category.custom_id}
                categoryName={category.alias}
                members={membersByCategory[category.custom_id] || []}
                isOver={
                  overCategoryId ===
                  `${roster.custom_id}:category:${category.custom_id}`
                }
                duplicateTags={duplicateTags}
              />
            ))}

            {/* Uncategorized members */}
            <CategoryDropZone
              rosterId={roster.custom_id}
              categoryId={null}
              categoryName={t("compare.uncategorized")}
              members={membersByCategory.uncategorized || []}
              isOver={
                overCategoryId ===
                `${roster.custom_id}:category:uncategorized`
              }
              color="#888"
              duplicateTags={duplicateTags}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CompareRostersPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const guildId = params.guildId as string;
  const t = useTranslations("RostersPage");

  // Parse roster IDs or group ID from URL
  const rosterIdsFromUrl = useMemo(() => {
    const ids = searchParams.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const groupId = searchParams.get("groupId");

  // State
  const [rosters, setRosters] = useState<Record<string, Roster>>({});
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<SignupCategory[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<string | null>(null);

  // Sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load rosters and categories
  const loadRosters = useCallback(async () => {
    setLoading(true);
    try {
      let loadedRosters: Roster[] = [];

      // Fetch categories first
      const loadedCategories = await api.fetchCategories(guildId);
      setCategories(loadedCategories);

      if (groupId) {
        // Load all rosters in the group
        loadedRosters = await api.fetchRosters(guildId, groupId);
        if (loadedRosters.length > 0 && loadedRosters[0].group_id) {
          const groups = await api.fetchGroups(guildId);
          const group = groups.find((g) => g.group_id === groupId);
          setGroupName(group?.alias || null);
        }
      } else if (rosterIdsFromUrl.length > 0) {
        const rosterPromises = rosterIdsFromUrl.map((id) =>
          api.fetchRoster(id, guildId)
        );
        loadedRosters = await Promise.all(rosterPromises);
      } else {
        setLoading(false);
        return;
      }

      const rostersMap: Record<string, Roster> = {};
      const ids: string[] = [];
      loadedRosters.forEach((roster) => {
        rostersMap[roster.custom_id] = roster;
        ids.push(roster.custom_id);
      });
      setRosters(rostersMap);
      setRosterIds(ids);
    } catch (err) {
      toast({
        title: t("compare.loadError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, rosterIdsFromUrl, guildId, toast, t]);

  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  // Compute tags that appear in more than one roster
  const duplicateTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    for (const rosterId of rosterIds) {
      for (const member of rosters[rosterId]?.members ?? []) {
        tagCount[member.tag] = (tagCount[member.tag] ?? 0) + 1;
      }
    }
    return new Set(Object.keys(tagCount).filter((tag) => tagCount[tag] > 1));
  }, [rosterIds, rosters]);

  // Get active member for drag overlay
  const activeMember = useMemo(() => {
    if (!activeId) return null;
    const [rosterId, memberTag] = activeId.split(":");
    const roster = rosters[rosterId];
    return roster?.members?.find((m) => m.tag === memberTag) || null;
  }, [activeId, rosters]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      // Check if over a category drop zone
      if (overId.includes(":category:")) {
        setOverCategoryId(overId);
      } else if (rosterIds.includes(overId)) {
        // Over a roster directly (not a category)
        setOverCategoryId(`${overId}:category:uncategorized`);
      } else if (overId.includes(":")) {
        // Over a member, get their roster
        const [targetRosterId] = overId.split(":");
        setOverCategoryId(`${targetRosterId}:category:uncategorized`);
      }
    } else {
      setOverCategoryId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => { // NOSONAR — dnd-kit drag handler, structural complexity from framework pattern
    const { active, over } = event;
    setActiveId(null);
    setOverCategoryId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Parse source roster and member
    const [sourceRosterId, memberTag] = activeIdStr.split(":");
    if (!sourceRosterId || !memberTag) return;

    // Determine target roster and category
    let targetRosterId: string;
    let targetCategoryId: string | null = null;

    if (overIdStr.includes(":category:")) {
      // Dropping on a category
      const parts = overIdStr.split(":category:");
      targetRosterId = parts[0];
      targetCategoryId = parts[1] === "uncategorized" ? null : parts[1];
    } else if (rosterIds.includes(overIdStr)) {
      targetRosterId = overIdStr;
    } else if (overIdStr.includes(":")) {
      [targetRosterId] = overIdStr.split(":");
    } else {
      return;
    }

    // Get member data
    const sourceMember = rosters[sourceRosterId]?.members?.find(
      (m) => m.tag === memberTag
    );
    if (!sourceMember) return;

    const sameRoster = sourceRosterId === targetRosterId;
    const sameCategory = sourceMember.signup_group === targetCategoryId;

    // No change needed
    if (sameRoster && sameCategory) return;

    setMoving(true);
    try {
      if (sameRoster) {
        // Just update category within the same roster
        await api.updateMemberCategory(
          sourceRosterId,
          guildId,
          memberTag,
          targetCategoryId
        );

        // Update local state
        setRosters((prev) => {
          const newState = { ...prev };
          const members = [...(newState[sourceRosterId].members || [])];
          const memberIndex = members.findIndex((m) => m.tag === memberTag);
          if (memberIndex !== -1) {
            members[memberIndex] = {
              ...members[memberIndex],
              signup_group: targetCategoryId,
            };
          }
          newState[sourceRosterId] = {
            ...newState[sourceRosterId],
            members,
          };
          return newState;
        });

        const categoryName =
          categories.find((c) => c.custom_id === targetCategoryId)?.alias ||
          t("compare.uncategorized");
        toast({
          title: t("compare.categoryChanged"),
          description: t("compare.categoryChangedDesc", {
            name: sourceMember.name,
            category: categoryName,
          }),
        });
      } else {
        // Move to different roster
        await api.removeRosterMember(sourceRosterId, guildId, memberTag);
        await api.addRosterMembers(targetRosterId, guildId, [memberTag]);

        // Update category if specified
        if (targetCategoryId !== null) {
          await api.updateMemberCategory(
            targetRosterId,
            guildId,
            memberTag,
            targetCategoryId
          );
        }

        // Update local state
        setRosters((prev) => {
          const newState = { ...prev };

          // Remove from source
          if (newState[sourceRosterId]?.members) {
            newState[sourceRosterId] = {
              ...newState[sourceRosterId],
              members: newState[sourceRosterId].members!.filter(
                (m) => m.tag !== memberTag
              ),
            };
          }

          // Add to target with new category
          if (newState[targetRosterId]) {
            const updatedMember = {
              ...sourceMember,
              signup_group: targetCategoryId,
            };
            newState[targetRosterId] = {
              ...newState[targetRosterId],
              members: [
                ...(newState[targetRosterId].members || []),
                updatedMember,
              ],
            };
          }

          return newState;
        });

        toast({
          title: t("compare.memberMoved"),
          description: t("compare.memberMovedDesc", {
            name: sourceMember.name,
            from: rosters[sourceRosterId]?.alias || sourceRosterId,
            to: rosters[targetRosterId]?.alias || targetRosterId,
          }),
        });
      }
    } catch (err) {
      toast({
        title: t("compare.moveError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      loadRosters();
    } finally {
      setMoving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-full mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.max(rosterIdsFromUrl.length, 2)}, 1fr)`,
            }}
          >
            {Array.from({ length: Math.max(rosterIdsFromUrl.length, 2) }).map((_, i) => (
              <Skeleton key={i} className="h-[600px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No rosters selected
  if (rosterIds.length < 2) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">{t("compare.selectAtLeast2")}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GitCompare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {groupName
                    ? `${t("compare.title")} - ${groupName}`
                    : t("compare.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("compare.dragToMoveCategory")}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={loadRosters}
            variant="outline"
            disabled={loading || moving}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
        </div>

        {/* Moving indicator */}
        {moving && (
          <div className="flex items-center justify-center gap-2 py-2 bg-primary/10 rounded-lg text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">{t("compare.moving")}</span>
          </div>
        )}

        {/* Roster columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${rosterIds.length}, 1fr)`,
              height: "calc(100vh - 180px)",
            }}
          >
            {rosterIds.map((rosterId) => {
              const roster = rosters[rosterId];
              if (!roster) return null;
              return (
                <RosterColumn
                  key={rosterId}
                  roster={roster}
                  members={roster.members || []}
                  categories={categories}
                  overCategoryId={overCategoryId}
                  isLoading={false}
                  duplicateTags={duplicateTags}
                  t={t}
                />
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeMember && (
              <div className="flex items-center gap-2 p-2 bg-background rounded-lg border border-primary shadow-xl">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-orange-400 font-medium text-sm">
                  TH{activeMember.townhall}
                </span>
                <span className="font-medium text-sm">{activeMember.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {activeMember.tag}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
