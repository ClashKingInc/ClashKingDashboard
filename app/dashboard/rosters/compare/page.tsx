"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Copy, GripVertical, Loader2, Users } from "lucide-react";

import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getDefaultBaseUrl } from "@/lib/api/client";
import { useGuildId } from "@/lib/dashboard-route";
import { townHallImageUrl } from "@/lib/theme";
import { cn } from "@/lib/utils";
import * as api from "../_lib/api";
import type { Roster, RosterMember } from "../_lib/types";

type MemberPlacement = "clan" | "family" | "external";

function normalizeTag(tag?: string | null): string {
  return tag?.replace(/^#/, "").toUpperCase() ?? "";
}

function memberPlacement(member: RosterMember, roster: Roster): MemberPlacement {
  const currentClanTag = normalizeTag(member.current_clan_tag);
  const rosterClanTag = normalizeTag(roster.clan_tag);
  if (currentClanTag && rosterClanTag && currentClanTag === rosterClanTag) return "clan";
  if (member.is_in_family) return "family";
  return "external";
}

function rosterBadgeUrl(roster: Roster): string | undefined {
  if (roster.clan_tag) {
    return `${getDefaultBaseUrl()}/v2/clan/${encodeURIComponent(roster.clan_tag)}/badge`;
  }
  return roster.clan_badge ?? undefined;
}

interface DraggableMemberProps {
  readonly member: RosterMember;
  readonly roster: Roster;
  readonly isDuplicate?: boolean;
}

function DraggableMember({ member, roster, isDuplicate }: DraggableMemberProps) {
  const t = useTranslations("RostersPage.compare");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${roster.id}:${member.tag}` });
  const placement = memberPlacement(member, roster);
  const currentClan = member.current_clan || member.current_clan_tag;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-[86px] items-center gap-2.5 rounded-[20px] bg-card p-3 shadow-sm shadow-black/5 transition-[opacity,transform,box-shadow]",
        isDragging && "scale-[1.02] opacity-45 shadow-lg",
        isDuplicate && "ring-2 ring-amber-500/35",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing"
        aria-label={t("dragPlayer", { name: member.name })}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Image
        src={townHallImageUrl(member.townhall)}
        alt={t("townHallAlt", { level: member.townhall })}
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 object-contain"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{member.name}</span>
          {isDuplicate && <Copy className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label={t("duplicate")} />}
        </div>
        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{member.tag}</span>

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
            placement === "clan" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            placement === "family" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            placement === "external" && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}>
            {t(`status.${placement}`)}
          </span>
          {currentClan && <span className="max-w-28 truncate text-[10px] text-muted-foreground" title={currentClan}>{currentClan}</span>}
          {(member.discord || member.discord_username) && (
            <DiscordUserDisplay
              rawDiscordValue={member.discord}
              username={member.discord_username}
              avatarUrl={member.discord_avatar_url}
              size="sm"
              showPopover={false}
              className="max-w-32"
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface RosterColumnProps {
  readonly roster: Roster;
  readonly members: RosterMember[];
  readonly isOver: boolean;
  readonly duplicateTags: Set<string>;
}

function RosterColumn({ roster, members, isOver, duplicateTags }: RosterColumnProps) {
  const t = useTranslations("RostersPage.compare");
  const { setNodeRef } = useDroppable({ id: roster.id });
  const badgeUrl = rosterBadgeUrl(roster);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-0 snap-start flex-col rounded-[28px] bg-muted/30 p-3 transition-[background-color,box-shadow]",
        isOver && "bg-primary/8 ring-2 ring-primary/45",
      )}
    >
      <header className="flex items-center gap-3 px-1 pb-3">
        {badgeUrl ? (
          <Image src={badgeUrl} alt={roster.clan_name ? `${roster.clan_name} badge` : ""} width={48} height={48} unoptimized className="h-12 w-12 shrink-0 object-contain" />
        ) : (
          <Users className="h-10 w-10 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-foreground">{roster.alias}</h2>
          {roster.clan_name && <p className="mt-0.5 truncate text-xs text-muted-foreground">{roster.clan_name}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm shadow-black/5">
          {t("memberCount", { count: members.length })}
        </span>
      </header>

      <SortableContext items={members.map((member) => `${roster.id}:${member.tag}`)} strategy={verticalListSortingStrategy}>
        <div className="min-h-28 flex-1 space-y-2 overflow-y-auto pr-1">
          {members.map((member) => (
            <DraggableMember
              key={member.tag}
              member={member}
              roster={roster}
              isDuplicate={duplicateTags.has(member.tag)}
            />
          ))}
          {members.length === 0 && (
            <div className="flex min-h-28 items-center justify-center rounded-[20px] bg-card/60 px-4 text-center text-sm text-muted-foreground">
              {t("dropHere")}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export default function CompareRostersPage() {
  const guildId = useGuildId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const t = useTranslations("RostersPage.compare");

  const rosterIdsFromUrl = useMemo(() => {
    const ids = searchParams.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  }, [searchParams]);
  const groupId = searchParams.get("groupId");

  const [rosters, setRosters] = useState<Record<string, Roster>>({});
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overRosterId, setOverRosterId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadRosters = useCallback(async () => {
    setLoading(true);
    try {
      let loadedRosters: Roster[] = [];
      if (groupId) {
        loadedRosters = await api.fetchRosters(guildId, groupId);
        if (loadedRosters[0]?.group_id) {
          const groups = await api.fetchGroups(guildId);
          setGroupName(groups.find((group) => group.group_id === groupId)?.alias || null);
        }
      } else if (rosterIdsFromUrl.length > 0) {
        loadedRosters = await Promise.all(rosterIdsFromUrl.map((id) => api.fetchRoster(id, guildId)));
      } else {
        setLoading(false);
        return;
      }

      setRosters(Object.fromEntries(loadedRosters.map((roster) => [roster.id, roster])));
      setRosterIds(loadedRosters.map((roster) => roster.id));
    } catch (error) {
      toast({
        title: t("loadError"),
        description: error instanceof Error ? error.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, guildId, rosterIdsFromUrl, t, toast]);

  useEffect(() => {
    void loadRosters();
  }, [loadRosters]);

  const duplicateTags = useMemo(() => {
    const counts = new Map<string, number>();
    rosterIds.forEach((rosterId) => rosters[rosterId]?.members?.forEach((member) => {
      counts.set(member.tag, (counts.get(member.tag) ?? 0) + 1);
    }));
    return new Set([...counts].filter(([, count]) => count > 1).map(([tag]) => tag));
  }, [rosterIds, rosters]);

  const activeMember = useMemo(() => {
    if (!activeId) return null;
    const [rosterId, memberTag] = activeId.split(":");
    return rosters[rosterId]?.members?.find((member) => member.tag === memberTag) ?? null;
  }, [activeId, rosters]);

  const targetRosterId = (overId: string): string | null => {
    if (rosterIds.includes(overId)) return overId;
    const [candidate] = overId.split(":");
    return rosterIds.includes(candidate) ? candidate : null;
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    setOverRosterId(event.over ? targetRosterId(event.over.id as string) : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => { // NOSONAR — dnd-kit handler branches on framework identifiers
    const { active, over } = event;
    setActiveId(null);
    setOverRosterId(null);
    if (!over) return;

    const [sourceRosterId, memberTag] = (active.id as string).split(":");
    const destinationRosterId = targetRosterId(over.id as string);
    if (!sourceRosterId || !memberTag || !destinationRosterId || sourceRosterId === destinationRosterId) return;

    const sourceMember = rosters[sourceRosterId]?.members?.find((member) => member.tag === memberTag);
    if (!sourceMember) return;

    setMoving(true);
    try {
      await api.removeRosterMember(sourceRosterId, guildId, memberTag);
      await api.addRosterMembers(destinationRosterId, guildId, [memberTag]);
      setRosters((current) => ({
        ...current,
        [sourceRosterId]: {
          ...current[sourceRosterId],
          members: current[sourceRosterId]?.members?.filter((member) => member.tag !== memberTag) ?? [],
        },
        [destinationRosterId]: {
          ...current[destinationRosterId],
          members: [...(current[destinationRosterId]?.members ?? []), sourceMember],
        },
      }));
      toast({
        title: t("memberMoved"),
        description: t("memberMovedDesc", {
          name: sourceMember.name,
          from: rosters[sourceRosterId]?.alias || sourceRosterId,
          to: rosters[destinationRosterId]?.alias || destinationRosterId,
        }),
      });
    } catch (error) {
      toast({
        title: t("moveError"),
        description: error instanceof Error ? error.message : t("unknownError"),
        variant: "destructive",
      });
      void loadRosters();
    } finally {
      setMoving(false);
    }
  };

  if (loading) {
    const count = Math.max(rosterIdsFromUrl.length, 2);
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto max-w-full space-y-5">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${count}, minmax(290px, 1fr))` }}>
            {Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-[620px] rounded-[28px]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (rosterIds.length < 2) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto flex h-64 max-w-7xl flex-col items-center justify-center gap-4 rounded-[24px] bg-muted/35">
          <p className="text-muted-foreground">{t("selectAtLeast2")}</p>
          <Button onClick={() => router.back()} variant="secondary" className="rounded-xl border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-full space-y-4">
        <header className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={t("back")} onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              {groupName ? `${t("title")} — ${groupName}` : t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          {moving && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("moving")}
            </span>
          )}
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="scrollbar-custom grid h-[calc(100dvh-14rem)] min-h-[28rem] snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 md:h-[calc(100dvh-10rem)] md:min-h-[32rem]"
            style={{ gridTemplateColumns: `repeat(${rosterIds.length}, minmax(290px, 1fr))` }}
          >
            {rosterIds.map((rosterId) => {
              const roster = rosters[rosterId];
              if (!roster) return null;
              return (
                <RosterColumn
                  key={rosterId}
                  roster={roster}
                  members={roster.members ?? []}
                  isOver={overRosterId === rosterId}
                  duplicateTags={duplicateTags}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeMember && (
              <div className="flex items-center gap-2.5 rounded-[20px] bg-card p-3 shadow-xl ring-2 ring-primary/45">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Image src={townHallImageUrl(activeMember.townhall)} alt="" width={38} height={38} unoptimized className="h-9 w-9 object-contain" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeMember.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{activeMember.tag}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
