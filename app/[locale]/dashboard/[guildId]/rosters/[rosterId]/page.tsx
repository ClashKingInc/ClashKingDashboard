"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, ArrowLeft, Settings as SettingsIcon, Users, Zap, FolderTree,
  RefreshCw, UserPlus, X, Search, Shield, TrendingUp, Target, Star, Eye
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RosterMember {
  name: string;
  tag: string;
  townhall: number;
  discord?: string;
  current_clan?: string;
  current_clan_tag?: string;
  war_pref?: boolean;
  trophies?: number;
  signup_group?: string;
  hitrate?: number;
  last_online?: number;
  current_league?: string;
  hero_lvs?: number;
  sub?: boolean;
  is_in_family?: boolean;
  member_status?: string;
  added_at?: number;
}

interface Roster {
  custom_id: string;
  alias: string;
  description?: string;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag?: string;
  clan_name?: string;
  clan_badge?: string;
  server_id: number;
  group_id?: string;
  roster_size?: number;
  max_accounts_per_user?: number;
  min_th?: number;
  max_th?: number;
  th_restriction?: string;
  allowed_signup_categories?: string[];
  members?: RosterMember[];
  columns?: string[];
  sort?: string[];
  created_at?: string;
  updated_at?: string;
  event_start_time?: number;
}

interface Clan {
  tag: string;
  name: string;
  badge?: string;
}

interface ClanMember {
  tag: string;
  name: string;
  townhall: number;
  clan_name: string;
  clan_tag: string;
}

export default function RosterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const guildId = params.guildId as string;
  const rosterId = params.rosterId as string;
  const locale = params.locale as string;

  const [roster, setRoster] = useState<Roster | null>(null);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add members dialog
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [bulkTags, setBulkTags] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");

  // Settings form
  const [editRosterData, setEditRosterData] = useState({
    alias: "",
    description: "",
    min_th: "",
    max_th: "",
    roster_size: "",
    columns: [] as string[],
    sort: [] as string[],
  });

  // Drag & Drop state
  const [draggedMember, setDraggedMember] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Load roster data
  useEffect(() => {
    loadRoster();
    loadClans();
  }, [rosterId]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load roster");
      }

      const data = await response.json();
      const rosterData = data.roster || data;
      setRoster(rosterData);

      // Update edit form - convert internal names to display labels
      setEditRosterData({
        alias: rosterData.alias,
        description: rosterData.description || "",
        min_th: rosterData.min_th?.toString() || "",
        max_th: rosterData.max_th?.toString() || "",
        roster_size: rosterData.roster_size?.toString() || "",
        columns: (rosterData.columns || []).map((col: string) => getColumnDisplayLabel(col)),
        sort: (rosterData.sort || []).map((field: string) => getSortDisplayLabel(field)),
      });

      // Load clan members if clan roster
      if (rosterData.clan_tag) {
        loadClanMembers(rosterData.clan_tag);
      }
    } catch (error) {
      console.error("Error loading roster:", error);
      toast({
        title: "Error",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClans = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/clans?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClans(data.items || data || []);
      }
    } catch (error) {
      console.error("Error loading clans:", error);
    }
  };

  const loadClanMembers = async (clanTag: string) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/clan/${encodeURIComponent(clanTag)}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClanMembers(data.members || data || []);
      }
    } catch (error) {
      console.error("Error loading clan members:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/refresh?roster_id=${rosterId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to refresh roster");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: "Roster data refreshed successfully!",
      });
    } catch (error) {
      console.error("Error refreshing roster:", error);
      toast({
        title: "Error",
        description: "Failed to refresh roster data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddMembers = async () => {
    if (!roster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      // Parse bulk tags
      const tags = bulkTags
        .split(/[\n,]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Combine with selected members
      const allTags = [...new Set([...tags, ...Array.from(selectedMembers)])];

      if (allTags.length === 0) {
        toast({
          title: "Error",
          description: "Please select or enter at least one member",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/v2/roster/${rosterId}/members?server_id=${guildId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ add: allTags })
      });

      if (!response.ok) {
        throw new Error("Failed to add members");
      }

      await loadRoster();
      setAddMembersDialogOpen(false);
      setBulkTags("");
      setSelectedMembers(new Set());
      toast({
        title: "Success",
        description: `Added ${allTags.length} member(s) to roster`,
      });
    } catch (error) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description: "Failed to add members. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberTag: string) => {
    if (!roster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/${rosterId}/members?server_id=${guildId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ remove: [memberTag] })
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: "Member removed from roster",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubstitute = async (memberTag: string, currentSub: boolean) => {
    if (!roster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}?server_id=${guildId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ sub: !currentSub })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update member");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: `Member ${!currentSub ? 'marked' : 'unmarked'} as substitute`,
      });
    } catch (error) {
      console.error("Error updating member:", error);
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, memberTag: string) => {
    setDraggedMember(memberTag);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", memberTag);

    // Add visual feedback
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedMember(null);
    setDragOverCategory(null);
    e.currentTarget.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (!draggedMember || !roster) return;

    // Find the dragged member's current category
    const member = roster.members?.find(m => m.tag === draggedMember);
    if (!member) return;

    const currentCategory = member.signup_group || "";

    // Don't do anything if dropping in the same category
    if (currentCategory === targetCategoryId) {
      setDraggedMember(null);
      return;
    }

    // Update member's signup_group
    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/v2/roster/${rosterId}/members/${encodeURIComponent(draggedMember)}?server_id=${guildId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            signup_group: targetCategoryId === "" ? null : targetCategoryId
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update member category");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: `Member moved to ${targetCategoryId || 'Uncategorized'}`,
      });
    } catch (error) {
      console.error("Error moving member:", error);
      toast({
        title: "Error",
        description: "Failed to move member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setDraggedMember(null);
    }
  };

  const handleUpdateSettings = async () => {
    if (!roster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      // Convert display labels back to internal names
      const updates = {
        alias: editRosterData.alias,
        description: editRosterData.description || null,
        min_th: editRosterData.min_th ? parseInt(editRosterData.min_th) : null,
        max_th: editRosterData.max_th ? parseInt(editRosterData.max_th) : null,
        roster_size: editRosterData.roster_size ? parseInt(editRosterData.roster_size) : null,
        columns: editRosterData.columns.length > 0
          ? editRosterData.columns.map(col => getInternalColumnName(col))
          : null,
        sort: editRosterData.sort.length > 0
          ? editRosterData.sort.map(field => getInternalSortField(field))
          : null,
      };

      const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${guildId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error("Failed to update roster");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: "Roster settings updated successfully!",
      });
    } catch (error) {
      console.error("Error updating roster:", error);
      toast({
        title: "Error",
        description: "Failed to update roster settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper functions
  const getColumnDisplayName = (col: string): string => {
    const columnNames: Record<string, string> = {
      'name': 'Name',
      'townhall': 'TH',
      'tag': 'Tag',
      'hitrate': 'Hitrate',
      'current_clan_tag': 'Clan',
      'discord': 'Discord',
      'hero_lvs': 'Heroes',
      'war_pref': 'War',
      'trophies': 'Trophies'
    };
    return columnNames[col] || col;
  };

  // Convert internal column names to display labels for settings form
  const getColumnDisplayLabel = (col: string): string => {
    const columnLabels: Record<string, string> = {
      'name': 'Name',
      'townhall': 'Townhall Level',
      'tag': 'Tag',
      'hitrate': '30 Day Hitrate',
      'current_clan_tag': 'Clan Tag',
      'discord': 'Discord',
      'hero_lvs': 'Heroes',
      'war_pref': 'War Opt',
      'trophies': 'Trophies'
    };
    return columnLabels[col] || col;
  };

  // Convert display labels to internal column names
  const getInternalColumnName = (label: string): string => {
    const internalNames: Record<string, string> = {
      'Name': 'name',
      'Townhall Level': 'townhall',
      'Tag': 'tag',
      '30 Day Hitrate': 'hitrate',
      'Clan Tag': 'current_clan_tag',
      'Discord': 'discord',
      'Heroes': 'hero_lvs',
      'War Opt': 'war_pref',
      'Trophies': 'trophies'
    };
    return internalNames[label] || label;
  };

  // Convert internal sort field names to display labels
  const getSortDisplayLabel = (field: string): string => {
    const sortLabels: Record<string, string> = {
      'townhall': 'Townhall Level',
      'name': 'Name',
      'tag': 'Tag',
      'hero_lvs': 'Heroes',
      'trophies': 'Trophies',
      'hitrate': '30 Day Hitrate',
      'current_clan_tag': 'Clan Tag',
      'added_at': 'Added At'
    };
    return sortLabels[field] || field;
  };

  // Convert display labels to internal sort field names
  const getInternalSortField = (label: string): string => {
    const internalFields: Record<string, string> = {
      'Townhall Level': 'townhall',
      'Name': 'name',
      'Tag': 'tag',
      'Heroes': 'hero_lvs',
      'Trophies': 'trophies',
      '30 Day Hitrate': 'hitrate',
      'Clan Tag': 'current_clan_tag',
      'Added At': 'added_at'
    };
    return internalFields[label] || label;
  };

  const getDisplayColumns = (rosterData: Roster): string[] => {
    if (!rosterData.columns || rosterData.columns.length === 0) {
      return ['name', 'townhall', 'discord', 'trophies'];
    }

    const reverseColumnMapping: Record<string, string> = {
      'Name': 'name',
      'Townhall Level': 'townhall',
      'Tag': 'tag',
      '30 Day Hitrate': 'hitrate',
      'Clan Tag': 'current_clan_tag',
      'Discord': 'discord',
      'Heroes': 'hero_lvs',
      'War Opt': 'war_pref',
      'Trophies': 'trophies'
    };

    return rosterData.columns.map(col => reverseColumnMapping[col] || col);
  };

  const getSortConfig = (rosterData: Roster): string[] => {
    if (!rosterData.sort || rosterData.sort.length === 0) {
      return ['townhall', 'hitrate', 'hero_lvs', 'added_at'];
    }

    const reverseSortMapping: Record<string, string> = {
      'Townhall Level': 'townhall',
      'Name': 'name',
      'Tag': 'tag',
      'Heroes': 'hero_lvs',
      'Trophies': 'trophies',
      '30 Day Hitrate': 'hitrate',
      'Clan Tag': 'current_clan_tag',
      'Added At': 'added_at'
    };

    return rosterData.sort.map(field => reverseSortMapping[field] || field);
  };

  const sortMembers = (members: RosterMember[], sortConfig: string[]): RosterMember[] => {
    return [...members].sort((a, b) => {
      for (const field of sortConfig) {
        if (!field) continue;

        let valueA = a[field as keyof RosterMember];
        let valueB = b[field as keyof RosterMember];

        if (valueA == null && valueB == null) continue;
        if (valueA == null) return 1;
        if (valueB == null) return -1;

        const isDateField = field === 'added_at' || field.includes('date') || field.includes('time');

        if (typeof valueA === 'string' && typeof valueB === 'string') {
          const comparison = isDateField
            ? valueA.toLowerCase().localeCompare(valueB.toLowerCase())
            : valueB.toLowerCase().localeCompare(valueA.toLowerCase());
          if (comparison !== 0) return comparison;
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          if (valueA !== valueB) {
            return isDateField ? valueA - valueB : valueB - valueA;
          }
        } else {
          const strA = String(valueA).toLowerCase();
          const strB = String(valueB).toLowerCase();
          const comparison = isDateField
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
          if (comparison !== 0) return comparison;
        }
      }
      return 0;
    });
  };

  const groupMembersByCategory = (members: RosterMember[]) => {
    const grouped: Record<string, RosterMember[]> = {};
    const uncategorized: RosterMember[] = [];

    members.forEach(member => {
      if (!member.signup_group) {
        uncategorized.push(member);
      } else {
        if (!grouped[member.signup_group]) {
          grouped[member.signup_group] = [];
        }
        grouped[member.signup_group].push(member);
      }
    });

    return { grouped, uncategorized };
  };

  const getRosterStats = (rosterData: Roster) => {
    const members = rosterData.members || [];
    const memberCount = members.length;

    if (memberCount === 0) {
      return {
        avgTownhall: 0,
        avgHitrate: 0,
        clanCount: 0,
        familyCount: 0,
        externalCount: 0,
      };
    }

    const avgTownhall = Math.round(
      members.reduce((sum, m) => sum + (m.townhall || 0), 0) / memberCount * 10
    ) / 10;

    const membersWithHitrate = members.filter(m => m.hitrate !== null && m.hitrate !== undefined);
    const avgHitrate = membersWithHitrate.length > 0
      ? Math.round(membersWithHitrate.reduce((sum, m) => sum + (m.hitrate || 0), 0) / membersWithHitrate.length)
      : 0;

    const clanCount = rosterData.clan_tag
      ? members.filter(m => m.current_clan_tag === rosterData.clan_tag).length
      : 0;

    const familyCount = members.filter(m => {
      if (!m.current_clan_tag || m.current_clan_tag === "#") return false;
      if (rosterData.clan_tag && m.current_clan_tag === rosterData.clan_tag) return false;
      return clans.some(clan => clan.tag === m.current_clan_tag);
    }).length;

    const externalCount = memberCount - clanCount - familyCount;

    return {
      avgTownhall,
      avgHitrate,
      clanCount,
      familyCount,
      externalCount,
    };
  };

  const getTownhallRestrictionText = (rosterData: Roster) => {
    const { min_th, max_th } = rosterData;

    if (min_th && max_th) {
      if (min_th === max_th) {
        return `TH${min_th} only`;
      }
      return `TH${min_th}-${max_th}`;
    } else if (min_th) {
      return `TH${min_th}+`;
    } else if (max_th) {
      return `TH1-${max_th}`;
    }
    return "No restriction";
  };

  const filteredClanMembers = clanMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.tag.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const renderCell = (member: RosterMember, column: string) => {
    switch (column) {
      case 'townhall':
        return <span className="text-orange-400 font-medium">TH{member.townhall}</span>;
      case 'name':
        return (
          <span className="font-medium text-foreground">
            {member.name}
            {member.sub && <span className="text-xs text-yellow-600 ml-1">(Sub)</span>}
          </span>
        );
      case 'tag':
        return <span className="font-mono text-muted-foreground text-xs">{member.tag}</span>;
      case 'hitrate':
        if (member.hitrate !== null && member.hitrate !== undefined) {
          const hitColor = member.hitrate >= 80 ? 'text-green-400' : member.hitrate >= 60 ? 'text-yellow-400' : 'text-red-400';
          return <span className={`${hitColor} font-medium`}>{member.hitrate}%</span>;
        }
        return <span className="text-muted-foreground">-</span>;
      case 'current_clan_tag':
        if (member.current_clan_tag && member.current_clan_tag !== '#') {
          let colorClass = 'text-red-400';
          if (roster?.clan_tag && member.current_clan_tag === roster.clan_tag) {
            colorClass = 'text-green-400';
          } else if (clans.some(clan => clan.tag === member.current_clan_tag)) {
            colorClass = 'text-yellow-400';
          }
          return <span className={`${colorClass} font-mono text-xs`}>{member.current_clan_tag}</span>;
        }
        return <span className="text-muted-foreground">-</span>;
      case 'discord':
        if (member.discord) {
          return <span className="text-blue-400 text-xs">@{member.discord}</span>;
        }
        return <span className="text-muted-foreground">-</span>;
      case 'hero_lvs':
        return <span className="text-purple-400">{member.hero_lvs || '-'}</span>;
      case 'war_pref':
        const warStatus = member.war_pref ? '⚔️ In' : '🚫 Out';
        const warColor = member.war_pref ? 'text-green-400' : 'text-red-400';
        return <span className={`${warColor} text-xs`}>{warStatus}</span>;
      case 'trophies':
        return <span className="text-yellow-400">{member.trophies || '-'} 🏆</span>;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground mb-4">Roster not found</p>
        <Button onClick={() => router.push(`/${locale}/dashboard/${guildId}/rosters`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rosters
        </Button>
      </div>
    );
  }

  const displayColumns = getDisplayColumns(roster);
  const sortConfig = getSortConfig(roster);
  const sortedMembers = roster.members ? sortMembers(roster.members, sortConfig) : [];
  const { grouped, uncategorized } = groupMembersByCategory(sortedMembers);
  const stats = getRosterStats(roster);
  const thRestriction = getTownhallRestrictionText(roster);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${locale}/dashboard/${guildId}/rosters`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{roster.alias}</h1>
              <p className="text-sm text-muted-foreground">
                {roster.clan_name && `${roster.clan_name} • `}
                {roster.members?.length || 0} members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={roster.roster_type === "clan" ? "default" : "secondary"}
              className={`${
                roster.roster_type === "clan"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0"
              }`}
            >
              {roster.roster_type.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-border"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Roster Info Card */}
            <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-border">
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Members Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Users className="w-4 h-4" />
                      <span>Members</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        {roster.members?.length || 0}
                      </span>
                      {roster.roster_size && (
                        <span className="text-muted-foreground">/ {roster.roster_size}</span>
                      )}
                    </div>
                    {roster.roster_size && (
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ((roster.members?.length || 0) / roster.roster_size) >= 0.9
                              ? "bg-gradient-to-r from-green-500 to-emerald-500"
                              : ((roster.members?.length || 0) / roster.roster_size) >= 0.5
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : "bg-gradient-to-r from-red-500 to-pink-500"
                          }`}
                          style={{ width: `${Math.min(((roster.members?.length || 0) / roster.roster_size) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Performance Stats */}
                  {roster.members && roster.members.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded-md border border-orange-500/20">
                        <span className="text-sm text-muted-foreground">Avg TH</span>
                        <span className="font-bold text-orange-400">TH{stats.avgTownhall}</span>
                      </div>
                      {stats.avgHitrate > 0 && (
                        <div className={`flex items-center justify-between p-2 rounded-md border ${
                          stats.avgHitrate >= 80
                            ? "bg-green-500/10 border-green-500/20"
                            : stats.avgHitrate >= 60
                            ? "bg-yellow-500/10 border-yellow-500/20"
                            : "bg-red-500/10 border-red-500/20"
                        }`}>
                          <span className="text-sm text-muted-foreground">Avg Hitrate</span>
                          <span className={`font-bold ${
                            stats.avgHitrate >= 80 ? "text-green-400" :
                            stats.avgHitrate >= 60 ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {stats.avgHitrate}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Distribution & Info */}
                  <div className="space-y-3">
                    {roster.members && roster.members.length > 0 && (
                      <div className="flex items-center gap-2">
                        {roster.clan_tag && (
                          <div className="flex-1 text-center p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                            <div className="text-xs text-muted-foreground">Clan</div>
                            <div className="text-lg font-bold text-blue-400">{stats.clanCount}</div>
                          </div>
                        )}
                        <div className="flex-1 text-center p-2 bg-green-500/10 rounded-md border border-green-500/20">
                          <div className="text-xs text-muted-foreground">Family</div>
                          <div className="text-lg font-bold text-green-400">{stats.familyCount}</div>
                        </div>
                        <div className="flex-1 text-center p-2 bg-red-500/10 rounded-md border border-red-500/20">
                          <div className="text-xs text-muted-foreground">External</div>
                          <div className="text-lg font-bold text-red-400">{stats.externalCount}</div>
                        </div>
                      </div>
                    )}

                    {roster.description && (
                      <div className="p-2 bg-secondary/30 rounded-md border border-border">
                        <p className="text-xs text-muted-foreground italic">{roster.description}</p>
                      </div>
                    )}

                    {thRestriction !== "No restriction" && (
                      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/10">
                        <span className="text-xs text-muted-foreground">TH Restriction</span>
                        <span className="font-bold text-primary text-xs">{thRestriction}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAddMembersDialogOpen(true)}
                className="border-border"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Members
              </Button>
            </div>

            {/* Members Table */}
            {(!roster.members || roster.members.length === 0) ? (
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No members in this roster yet</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Members ({roster.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            {displayColumns.map(col => (
                              <th key={col} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {getColumnDisplayName(col)}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Uncategorized members */}
                          {uncategorized.length > 0 && (
                            <>
                              <tr className="bg-muted/30 border-y border-border">
                                <td colSpan={displayColumns.length + 1} className="px-3 py-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">Uncategorized</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {uncategorized.length} member{uncategorized.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {uncategorized.map((member) => (
                                <tr
                                  key={member.tag}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, member.tag)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOver(e, "")}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, "")}
                                  className={`hover:bg-accent/50 transition-colors border-b border-border cursor-move ${
                                    draggedMember === member.tag ? 'opacity-50' : ''
                                  } ${
                                    dragOverCategory === "" ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                                  }`}
                                >
                                  {displayColumns.map(col => (
                                    <td key={col} className="px-3 py-2 text-center text-xs">
                                      {renderCell(member, col)}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant={member.sub ? "default" : "outline"}
                                        onClick={() => handleToggleSubstitute(member.tag, member.sub || false)}
                                        disabled={saving}
                                        className="text-xs h-7 px-2"
                                      >
                                        SUB
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveMember(member.tag)}
                                        disabled={saving}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}

                          {/* Categorized members */}
                          {Object.entries(grouped).map(([categoryId, categoryMembers]) => (
                            <React.Fragment key={categoryId}>
                              <tr className="bg-muted/30 border-y border-border">
                                <td colSpan={displayColumns.length + 1} className="px-3 py-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm capitalize">{categoryId}</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {categoryMembers.length} member{categoryMembers.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {categoryMembers.map((member) => (
                                <tr
                                  key={member.tag}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, member.tag)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOver(e, categoryId)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, categoryId)}
                                  className={`hover:bg-accent/50 transition-colors border-b border-border cursor-move ${
                                    draggedMember === member.tag ? 'opacity-50' : ''
                                  } ${
                                    dragOverCategory === categoryId ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                                  }`}
                                >
                                  {displayColumns.map(col => (
                                    <td key={col} className="px-3 py-2 text-center text-xs">
                                      {renderCell(member, col)}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant={member.sub ? "default" : "outline"}
                                        onClick={() => handleToggleSubstitute(member.tag, member.sub || false)}
                                        disabled={saving}
                                        className="text-xs h-7 px-2"
                                      >
                                        SUB
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveMember(member.tag)}
                                        disabled={saving}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Roster Settings</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure roster properties, columns, and sort order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alias" className="text-foreground">Roster Name</Label>
                  <Input
                    id="alias"
                    value={editRosterData.alias}
                    onChange={(e) => setEditRosterData({ ...editRosterData, alias: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    value={editRosterData.description}
                    onChange={(e) => setEditRosterData({ ...editRosterData, description: e.target.value })}
                    className="bg-background border-border text-foreground"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-th" className="text-foreground">Min TH</Label>
                    <Input
                      id="min-th"
                      type="number"
                      min="1"
                      max="17"
                      value={editRosterData.min_th}
                      onChange={(e) => setEditRosterData({ ...editRosterData, min_th: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-th" className="text-foreground">Max TH</Label>
                    <Input
                      id="max-th"
                      type="number"
                      min="1"
                      max="17"
                      value={editRosterData.max_th}
                      onChange={(e) => setEditRosterData({ ...editRosterData, max_th: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roster-size" className="text-foreground">Roster Size</Label>
                  <Input
                    id="roster-size"
                    type="number"
                    min="1"
                    value={editRosterData.roster_size}
                    onChange={(e) => setEditRosterData({ ...editRosterData, roster_size: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                {/* Display Columns Configuration */}
                <div className="space-y-3">
                  <Label className="text-foreground">Display Columns (choose up to 4)</Label>
                  <p className="text-xs text-muted-foreground">Select which columns to show in the members table</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Name', 'Townhall Level', 'Tag', '30 Day Hitrate', 'Clan Tag', 'Discord', 'Heroes', 'War Opt', 'Trophies'].map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`column-${column}`}
                          checked={editRosterData.columns.includes(column)}
                          onChange={(e) => {
                            const newColumns = e.target.checked
                              ? [...editRosterData.columns, column]
                              : editRosterData.columns.filter(c => c !== column);
                            setEditRosterData({ ...editRosterData, columns: newColumns.slice(0, 4) });
                          }}
                          disabled={editRosterData.columns.length >= 4 && !editRosterData.columns.includes(column)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor={`column-${column}`}
                          className={`text-sm ${
                            editRosterData.columns.length >= 4 && !editRosterData.columns.includes(column)
                              ? 'text-muted-foreground cursor-not-allowed'
                              : 'text-foreground cursor-pointer'
                          }`}
                        >
                          {column}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editRosterData.columns.length}/4 columns selected
                  </p>
                </div>

                {/* Sort Configuration */}
                <div className="space-y-3">
                  <Label className="text-foreground">Sort Order (choose up to 4)</Label>
                  <p className="text-xs text-muted-foreground">Define the sort priority for members</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Townhall Level', 'Name', 'Tag', 'Heroes', 'Trophies', '30 Day Hitrate', 'Clan Tag', 'Added At'].map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`sort-${field}`}
                          checked={editRosterData.sort.includes(field)}
                          onChange={(e) => {
                            const newSort = e.target.checked
                              ? [...editRosterData.sort, field]
                              : editRosterData.sort.filter(s => s !== field);
                            setEditRosterData({ ...editRosterData, sort: newSort.slice(0, 4) });
                          }}
                          disabled={editRosterData.sort.length >= 4 && !editRosterData.sort.includes(field)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor={`sort-${field}`}
                          className={`text-sm ${
                            editRosterData.sort.length >= 4 && !editRosterData.sort.includes(field)
                              ? 'text-muted-foreground cursor-not-allowed'
                              : 'text-foreground cursor-pointer'
                          }`}
                        >
                          {field}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editRosterData.sort.length}/4 sort fields selected
                    {editRosterData.sort.length > 0 && (
                      <span className="ml-2">
                        • Order: {editRosterData.sort.map((s, i) => (
                          <span key={s} className="text-primary">
                            {i > 0 && ' → '}
                            {s}
                          </span>
                        ))}
                      </span>
                    )}
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleUpdateSettings}
                    disabled={saving || !editRosterData.alias}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Automation</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up automated reminders and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Automation coming in a future update...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Groups & Categories</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage signup groups and member categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Groups management coming in a future update...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Members Dialog */}
      <Dialog open={addMembersDialogOpen} onOpenChange={setAddMembersDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Members to Roster</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select members from your clans or enter player tags
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bulk tags textarea */}
            <div className="space-y-2">
              <Label htmlFor="bulk-tags" className="text-foreground">
                Player Tags (one per line or comma-separated)
              </Label>
              <Textarea
                id="bulk-tags"
                placeholder="#ABC123, #DEF456&#10;#GHI789"
                value={bulkTags}
                onChange={(e) => setBulkTags(e.target.value)}
                className="bg-background border-border text-foreground font-mono text-sm"
                rows={4}
              />
            </div>

            {/* Clan members selection */}
            {clanMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-foreground">Or Select from Clan Members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="bg-background border-border text-foreground pl-9"
                  />
                </div>
                <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                  {filteredClanMembers.map((member) => (
                    <div
                      key={member.tag}
                      className={`flex items-center justify-between p-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        selectedMembers.has(member.tag) ? "bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedMembers);
                        if (newSelected.has(member.tag)) {
                          newSelected.delete(member.tag);
                        } else {
                          newSelected.add(member.tag);
                        }
                        setSelectedMembers(newSelected);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{member.townhall}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.tag} • {member.clan_name}
                          </p>
                        </div>
                      </div>
                      {selectedMembers.has(member.tag) && (
                        <Badge variant="default" className="bg-primary">
                          Selected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedMembers.size} member(s) selected
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddMembersDialogOpen(false);
                setBulkTags("");
                setSelectedMembers(new Set());
              }}
              disabled={saving}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Members"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
