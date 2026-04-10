"use client";

import React, { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { PlayerProfilePopover } from "@/components/ui/player-profile-popover";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RosterMember, SignupCategory, Clan } from "../_lib/types";

interface MembersByCategoryProps {
  members: RosterMember[];
  categories: SignupCategory[];
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  onRemoveMember: (tag: string) => void;
  onUpdateMemberCategory: (memberTag: string, categoryId: string | null) => Promise<void>;
  removingMember?: string | null;
  t: (key: string) => string;
}

interface DraggableMemberProps {
  member: RosterMember;
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  familyClanTags: string[];
  onRemove: () => void;
  isRemoving: boolean;
}

function DraggableMember({
  member,
  columns,
  rosterClanTag,
  familyClans,
  familyClanTags,
  onRemove,
  isRemoving,
}: DraggableMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.tag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getClanColor = () => {
    if (!member.current_clan_tag || member.current_clan_tag === "#") return "text-muted-foreground";
    if (rosterClanTag && member.current_clan_tag === rosterClanTag) return "text-green-400";
    if (familyClanTags.includes(member.current_clan_tag)) return "text-yellow-400";
    return "text-red-400";
  };

  const clanBadgeUrl = useMemo(() => {
    if (!member.current_clan_tag) return null;
    const clan = familyClans.find((c) => c.tag === member.current_clan_tag);
    return clan?.badge_url || clan?.badge || null;
  }, [member.current_clan_tag, familyClans]);

  const withPlayerPopover = (content: React.ReactNode) => (
    <PlayerProfilePopover
      playerName={member.name || member.tag}
      playerTag={member.tag}
      clanName={member.current_clan}
      townhallLevel={member.townhall}
      trophies={member.trophies}
      warPreference={member.war_pref}
      signupGroup={member.signup_group}
      heroLevels={member.hero_lvs}
      hitrate={member.hitrate}
      showTagInTrigger={false}
      triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity"
    >
      {content}
    </PlayerProfilePopover>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50 transition-all",
        isDragging && "opacity-50 shadow-lg scale-105",
        "hover:border-border hover:shadow-sm"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 flex items-center gap-4 min-w-0">
        {/* TH — always shown */}
        {columns.includes('townhall') && (
          withPlayerPopover(
            <span className="text-orange-400 font-medium text-sm w-10 shrink-0">
              TH{member.townhall}
            </span>
          )
        )}

        {/* Name — always shown */}
        <div className="flex-1 min-w-0">
          <PlayerProfilePopover
            playerName={member.name || member.tag}
            playerTag={member.tag}
            clanName={member.current_clan}
            townhallLevel={member.townhall}
            trophies={member.trophies}
            warPreference={member.war_pref}
            signupGroup={member.signup_group}
            heroLevels={member.hero_lvs}
            hitrate={member.hitrate}
            showTagInTrigger={false}
            triggerClassName="font-medium text-foreground truncate block text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="font-medium text-foreground truncate block">
              {member.name || member.tag}
            </span>
          </PlayerProfilePopover>
          {columns.includes('tag') && (
            <PlayerProfilePopover
              playerName={member.name || member.tag}
              playerTag={member.tag}
              clanName={member.current_clan}
              townhallLevel={member.townhall}
              trophies={member.trophies}
              warPreference={member.war_pref}
              signupGroup={member.signup_group}
              heroLevels={member.hero_lvs}
              hitrate={member.hitrate}
              showTagInTrigger={false}
              triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-xs text-muted-foreground font-mono">
                {member.tag}
              </span>
            </PlayerProfilePopover>
          )}
        </div>

        {/* Clan Name */}
        {columns.includes('current_clan') && member.current_clan_tag && member.current_clan_tag !== "#" && (
          <ClanProfilePopover
            clanName={member.current_clan || member.current_clan_tag}
            clanTag={member.current_clan_tag}
            clanBadgeUrl={clanBadgeUrl}
            showTagInTrigger={false}
            triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity max-w-[160px] shrink-0"
          >
            <span className={cn("font-medium truncate", getClanColor())}>
              {member.current_clan || member.current_clan_tag}
            </span>
          </ClanProfilePopover>
        )}

        {/* Clan Tag */}
        {columns.includes('current_clan_tag') && member.current_clan_tag && member.current_clan_tag !== "#" && (
          <ClanProfilePopover
            clanName={member.current_clan || member.current_clan_tag}
            clanTag={member.current_clan_tag}
            clanBadgeUrl={clanBadgeUrl}
            showTagInTrigger={false}
            triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity shrink-0"
          >
            <span className={cn("text-xs font-mono shrink-0", getClanColor())}>
              {member.current_clan_tag}
            </span>
          </ClanProfilePopover>
        )}

        {/* Discord */}
        {columns.includes('discord') && (
          <div className="hidden md:block shrink-0">
            <DiscordUserDisplay
              username={member.discord_username}
              avatarUrl={member.discord_avatar_url}
              rawDiscordValue={member.discord}
              size="sm"
            />
          </div>
        )}

        {/* Hitrate */}
        {columns.includes('hitrate') && member.hitrate !== null && member.hitrate !== undefined && (
          withPlayerPopover(
            <span
              className={cn(
                "text-sm font-medium w-12 text-right shrink-0",
                member.hitrate >= 80
                  ? "text-green-400"
                  : member.hitrate >= 60
                  ? "text-yellow-400"
                  : "text-red-400"
              )}
            >
              {member.hitrate}%
            </span>
          )
        )}

        {/* Trophies */}
        {columns.includes('trophies') && member.trophies != null && (
          withPlayerPopover(
            <span className="text-yellow-400 text-sm shrink-0">
              {member.trophies.toLocaleString()}
            </span>
          )
        )}

        {/* Hero Levels */}
        {columns.includes('hero_lvs') && member.hero_lvs != null && (
          withPlayerPopover(
            <span className="text-purple-400 text-sm shrink-0">
              {member.hero_lvs}
            </span>
          )
        )}

        {/* War Preference */}
        {columns.includes('war_pref') && (
          withPlayerPopover(
            member.war_pref ? (
              <Badge variant="default" className="bg-green-600 text-xs shrink-0">In</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs shrink-0">Out</Badge>
            )
          )
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={isRemoving}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface CategorySectionProps {
  categoryId: string | null;
  categoryName: string;
  members: RosterMember[];
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  familyClanTags: string[];
  onRemoveMember: (tag: string) => void;
  removingMember?: string | null;
  isOver: boolean;
  t: (key: string) => string;
}

function CategorySection({
  categoryId,
  categoryName,
  members,
  columns,
  rosterClanTag,
  familyClans,
  familyClanTags,
  onRemoveMember,
  removingMember,
  isOver,
  t,
}: CategorySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef } = useDroppable({
    id: categoryId || "__unassigned__",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border transition-all",
        isOver
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border/50 bg-card"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <div
          className={cn(
            "p-1.5 rounded",
            categoryId ? "bg-purple-500/10" : "bg-muted"
          )}
        >
          {categoryId ? (
            <Tag className="w-4 h-4 text-purple-500" />
          ) : (
            <Users className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <span className="font-medium flex-1 text-left">{categoryName}</span>
        <Badge variant="secondary" className="text-xs">
          {members.length}
        </Badge>
      </button>

      {/* Members */}
      {!isCollapsed && (
        <div className="p-2 pt-0 space-y-2">
          <SortableContext
            items={members.map((m) => m.tag)}
            strategy={verticalListSortingStrategy}
          >
            {members.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <p>{t("members.dragHere")}</p>
              </div>
            ) : (
              members.map((member) => (
                <DraggableMember
                  key={member.tag}
                  member={member}
                  columns={columns}
                  rosterClanTag={rosterClanTag}
                  familyClans={familyClans}
                  familyClanTags={familyClanTags}
                  onRemove={() => onRemoveMember(member.tag)}
                  isRemoving={removingMember === member.tag}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

export function MembersByCategory({
  members,
  categories,
  columns,
  rosterClanTag,
  familyClans,
  onRemoveMember,
  onUpdateMemberCategory,
  removingMember,
  t,
}: MembersByCategoryProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const familyClanTags = familyClans.map((c) => c.tag);

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

  // Group members by category
  const membersByCategory = useMemo(() => {
    const groups: Record<string, RosterMember[]> = {
      __unassigned__: [],
    };

    // Initialize groups for each category
    categories.forEach((cat) => {
      groups[cat.custom_id] = [];
    });

    // Sort members into groups
    members.forEach((member) => {
      const categoryId = member.signup_group || "__unassigned__";
      if (groups[categoryId]) {
        groups[categoryId].push(member);
      } else {
        groups.__unassigned__.push(member);
      }
    });

    return groups;
  }, [members, categories]);

  const activeMember = activeId
    ? members.find((m) => m.tag === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Check if we're over a category container or another member
      const overId = over.id as string;
      // If overId is a category ID or __unassigned__, use it directly
      if (overId === "__unassigned__" || categories.some((c) => c.custom_id === overId)) {
        setOverId(overId);
      } else {
        // We're over a member, find their category
        const overMember = members.find((m) => m.tag === overId);
        if (overMember) {
          setOverId(overMember.signup_group || "__unassigned__");
        }
      }
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeTag = active.id as string;
    const activeMember = members.find((m) => m.tag === activeTag);
    if (!activeMember) return;

    // Determine the target category
    let targetCategoryId: string | null = null;
    const overId = over.id as string;

    if (overId !== "__unassigned__" && categories.some((c) => c.custom_id === overId)) {
      targetCategoryId = overId;
    } else {
      // Dropped on a member, use their category
      const overMember = members.find((m) => m.tag === overId);
      if (overMember) {
        targetCategoryId = overMember.signup_group || null;
      }
    }

    // Check if category actually changed
    const currentCategory = activeMember.signup_group || null;
    if (currentCategory === targetCategoryId) return;

    // Update via API
    await onUpdateMemberCategory(activeTag, targetCategoryId);
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("members.noMembers")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("members.noMembersHint")}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Categories */}
        {categories.map((category) => (
          <CategorySection
            key={category.custom_id}
            categoryId={category.custom_id}
            categoryName={category.alias}
            members={membersByCategory[category.custom_id] || []}
            columns={columns}
            rosterClanTag={rosterClanTag}
            familyClans={familyClans}
            familyClanTags={familyClanTags}
            onRemoveMember={onRemoveMember}
            removingMember={removingMember}
            isOver={overId === category.custom_id}
            t={t}
          />
        ))}

        {/* Unassigned */}
        <CategorySection
          categoryId={null}
          categoryName={t("members.unassigned")}
          members={membersByCategory.__unassigned__ || []}
          columns={columns}
          rosterClanTag={rosterClanTag}
          familyClans={familyClans}
          familyClanTags={familyClanTags}
          onRemoveMember={onRemoveMember}
          removingMember={removingMember}
          isOver={overId === "__unassigned__"}
          t={t}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeMember && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary shadow-xl">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <span className="text-orange-400 font-medium text-sm">
              TH{activeMember.townhall}
            </span>
            <span className="font-medium">{activeMember.name}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {activeMember.tag}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
