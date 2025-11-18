"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus, Users, Trash2, Edit, Shield, Calendar, UserPlus, Search, RefreshCw, X, Filter, Eye, TrendingUp, Target, Star, GitCompare, CheckSquare, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Type definitions based on ClashKingAPI models
interface RosterMember {
  name: string;
  tag: string;
  hero_lvs: number;
  townhall: number;
  discord: string;
  current_clan: string;
  current_clan_tag: string;
  war_pref: boolean;
  trophies: number;
  sub: boolean;
  signup_group?: string | null;
  hitrate?: number | null;
  last_online?: number | null;
  current_league?: string | null;
  added_at?: number | null;
  last_updated?: number | null;
  member_status: string;
  error_details?: string | null;
}

interface Roster {
  custom_id: string;
  server_id: number;
  alias: string;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag?: string | null;
  clan_name?: string | null;
  clan_badge?: string | null;
  members: RosterMember[];
  min_th?: number | null;
  max_th?: number | null;
  description?: string | null;
  roster_size?: number | null;
  min_signups?: number | null;
  columns?: string[];
  image?: string | null;
  group_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClanMember {
  tag: string;
  name: string;
  townhall: number;
  clan_tag: string;
  clan_name: string;
}

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
}

export default function RostersPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params?.guildId as string;

  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New roster form state
  const [newRosterData, setNewRosterData] = useState({
    alias: "",
    roster_type: "clan" as "clan" | "family",
    signup_scope: "clan-only" as "clan-only" | "family-wide",
    clan_tag: "",
  });

  // Edit roster form state
  const [editRosterData, setEditRosterData] = useState({
    alias: "",
    description: "",
    min_th: "",
    max_th: "",
    roster_size: "",
    columns: [] as string[],
    sort: [] as string[],
  });

  // Add members state
  const [bulkTags, setBulkTags] = useState("");
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");

  // Filter and search state
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterTypeFilter, setRosterTypeFilter] = useState<"all" | "clan" | "family">("all");
  const [refreshing, setRefreshing] = useState(false);

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Fetch rosters and clans
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push("/login");
          return;
        }

        // Fetch rosters and clans in parallel
        const [rostersRes, clansRes] = await Promise.all([
          fetch(`/api/v2/roster/${guildId}/list`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`/api/v2/server/${guildId}/clans`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
        ]);

        if (!rostersRes.ok) {
          if (rostersRes.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch rosters");
        }

        const rostersData = await rostersRes.json();
        setRosters(rostersData.items || rostersData.rosters || rostersData || []);

        if (clansRes.ok) {
          const clansData = await clansRes.json();
          setClans(clansData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load rosters. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId, router, toast]);

  // Fetch clan members when opening add members dialog
  const handleOpenAddMembers = async (roster: Roster) => {
    setSelectedRoster(roster);
    setAddMembersDialogOpen(true);
    setSelectedMembers(new Set());

    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/server/${guildId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClanMembers(data.members || data || []);
      }
    } catch (error) {
      console.error("Error fetching clan members:", error);
      toast({
        title: "Error",
        description: "Failed to load clan members.",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoster = async () => {
    setCreating(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      const rosterData = {
        ...newRosterData,
        clan_tag: newRosterData.roster_type === "clan" ? newRosterData.clan_tag : undefined,
      };

      const response = await fetch(`/api/v2/roster?server_id=${guildId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(rosterData)
      });

      if (!response.ok) {
        throw new Error("Failed to create roster");
      }

      // Refresh rosters list
      const refreshResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setRosters(data.items || data.rosters || data || []);
      }

      toast({
        title: "Success",
        description: "Roster created successfully!",
      });

      setCreateDialogOpen(false);
      setNewRosterData({
        alias: "",
        roster_type: "clan",
        signup_scope: "clan-only",
        clan_tag: "",
      });
    } catch (error) {
      console.error("Error creating roster:", error);
      toast({
        title: "Error",
        description: "Failed to create roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRoster = async () => {
    if (!selectedRoster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      const updates = {
        alias: editRosterData.alias,
        description: editRosterData.description || null,
        min_th: editRosterData.min_th ? parseInt(editRosterData.min_th) : null,
        max_th: editRosterData.max_th ? parseInt(editRosterData.max_th) : null,
        roster_size: editRosterData.roster_size ? parseInt(editRosterData.roster_size) : null,
        columns: editRosterData.columns.length > 0 ? editRosterData.columns : null,
        sort: editRosterData.sort.length > 0 ? editRosterData.sort : null,
      };

      const response = await fetch(`/api/v2/roster/${selectedRoster.custom_id}?server_id=${guildId}`, {
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

      // Refresh rosters list
      const refreshResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setRosters(data.items || data.rosters || data || []);
      }

      toast({
        title: "Success",
        description: "Roster updated successfully!",
      });

      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating roster:", error);
      toast({
        title: "Error",
        description: "Failed to update roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    setDeleting(rosterId);
    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`/api/v2/roster/${rosterId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete roster");
      }

      // Refresh rosters list
      const refreshResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setRosters(data.items || data.rosters || data || []);
      }

      toast({
        title: "Success",
        description: "Roster deleted successfully!",
      });

      if (selectedRoster?.custom_id === rosterId) {
        setDetailsDialogOpen(false);
        setSelectedRoster(null);
      }
    } catch (error) {
      console.error("Error deleting roster:", error);
      toast({
        title: "Error",
        description: "Failed to delete roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleViewRoster = async (roster: Roster) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/${roster.custom_id}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { roster: {...} } so we need to extract the roster object
        const fullRoster = data.roster || data;
        setSelectedRoster(fullRoster);
        setDetailsDialogOpen(true);
      } else {
        console.error("Failed to fetch roster:", response.status, await response.text());
        setSelectedRoster(roster);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching roster details:", error);
      setSelectedRoster(roster);
      setDetailsDialogOpen(true);
    }
  };

  const handleOpenEdit = (roster: Roster) => {
    setSelectedRoster(roster);
    setEditRosterData({
      alias: roster.alias,
      description: roster.description || "",
      min_th: roster.min_th?.toString() || "",
      max_th: roster.max_th?.toString() || "",
      roster_size: roster.roster_size?.toString() || "",
      columns: roster.columns || [],
      sort: roster.sort || [],
    });
    setEditDialogOpen(true);
  };

  const handleAddMembers = async () => {
    if (!selectedRoster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      // Parse bulk tags from textarea
      const tagsFromTextarea = bulkTags
        .split(/[\n,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.startsWith("#"));

      // Combine with selected members
      const allTags = [
        ...tagsFromTextarea,
        ...Array.from(selectedMembers)
      ];

      if (allTags.length === 0) {
        toast({
          title: "No members selected",
          description: "Please select members or enter player tags.",
          variant: "destructive",
        });
        return;
      }

      const membersToAdd = allTags.map(tag => ({ tag }));

      const response = await fetch(`/api/v2/roster/${selectedRoster.custom_id}/members?server_id=${guildId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ add: membersToAdd })
      });

      if (!response.ok) {
        throw new Error("Failed to add members");
      }

      // Refresh roster details
      const refreshResponse = await fetch(`/api/v2/roster/${selectedRoster.custom_id}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const updatedRoster = data.roster || data;
        setSelectedRoster(updatedRoster);

        // Also refresh rosters list
        const listResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (listResponse.ok) {
          const data = await listResponse.json();
          setRosters(data.items || data.rosters || data || []);
        }
      }

      toast({
        title: "Success",
        description: `Added ${allTags.length} member(s) to roster!`,
      });

      setAddMembersDialogOpen(false);
      setBulkTags("");
      setSelectedMembers(new Set());
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
    if (!selectedRoster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`/api/v2/roster/${selectedRoster.custom_id}/members?server_id=${guildId}`, {
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

      // Refresh roster details
      const refreshResponse = await fetch(`/api/v2/roster/${selectedRoster.custom_id}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const updatedRoster = data.roster || data;
        setSelectedRoster(updatedRoster);

        // Also refresh rosters list
        const listResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (listResponse.ok) {
          const data = await listResponse.json();
          setRosters(data.items || data.rosters || data || []);
        }
      }

      toast({
        title: "Success",
        description: "Member removed from roster!",
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
    if (!selectedRoster) return;

    setSaving(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(
        `/api/v2/roster/${selectedRoster.custom_id}/members/${encodeURIComponent(memberTag)}?server_id=${guildId}`,
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

      // Refresh roster details
      const refreshResponse = await fetch(`/api/v2/roster/${selectedRoster.custom_id}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const updatedRoster = data.roster || data;
        setSelectedRoster(updatedRoster);

        // Also refresh rosters list
        const listResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (listResponse.ok) {
          const data = await listResponse.json();
          setRosters(data.items || data.rosters || data || []);
        }
      }

      toast({
        title: "Success",
        description: `Member ${!currentSub ? "marked" : "unmarked"} as substitute!`,
      });
    } catch (error) {
      console.error("Error toggling substitute:", error);
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshRoster = async (rosterId?: string) => {
    setRefreshing(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      // Build query params - refresh specific roster or all server rosters
      const queryParams = rosterId
        ? `roster_id=${rosterId}`
        : `server_id=${guildId}`;

      const response = await fetch(`/api/v2/roster/refresh?${queryParams}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to refresh roster data");
      }

      const result = await response.json();

      // Refresh rosters list
      const listResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (listResponse.ok) {
        const data = await listResponse.json();
        setRosters(data.rosters || data || []);
      }

      // If a specific roster is selected, refresh its details
      if (selectedRoster && rosterId === selectedRoster.custom_id) {
        const detailsResponse = await fetch(`/api/v2/roster/${selectedRoster.custom_id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (detailsResponse.ok) {
          const updatedRoster = await detailsResponse.json();
          setSelectedRoster(updatedRoster);
        }
      }

      toast({
        title: "Success",
        description: result.message || "Roster data refreshed successfully!",
      });
    } catch (error) {
      console.error("Error refreshing roster:", error);
      toast({
        title: "Error",
        description: "Failed to refresh roster data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Comparison mode functions
  const handleToggleRosterSelection = (rosterId: string) => {
    const newSelection = new Set(selectedRosterIds);
    if (newSelection.has(rosterId)) {
      newSelection.delete(rosterId);
    } else {
      if (newSelection.size >= 3) {
        toast({
          title: "Maximum reached",
          description: "You can compare up to 3 rosters at a time",
          variant: "destructive",
        });
        return;
      }
      newSelection.add(rosterId);
    }
    setSelectedRosterIds(newSelection);
  };

  const handleStartComparison = async () => {
    if (selectedRosterIds.size < 2) {
      toast({
        title: "Select rosters",
        description: "Please select at least 2 rosters to compare",
        variant: "destructive",
      });
      return;
    }

    setCompareDialogOpen(true);
  };

  const handleExitComparisonMode = () => {
    setComparisonMode(false);
    setSelectedRosterIds(new Set());
  };

  // Get rosters for comparison with full data
  const getComparisonRosters = () => {
    return Array.from(selectedRosterIds)
      .map(id => rosters.find(r => r.custom_id === id))
      .filter((r): r is Roster => r !== undefined);
  };

  // Find duplicate members across selected rosters
  const findDuplicateMembers = (rostersToCompare: Roster[]) => {
    const memberTags = new Map<string, Set<string>>(); // tag -> set of roster IDs

    rostersToCompare.forEach(roster => {
      roster.members?.forEach(member => {
        if (!memberTags.has(member.tag)) {
          memberTags.set(member.tag, new Set());
        }
        memberTags.get(member.tag)!.add(roster.custom_id);
      });
    });

    // Return tags that appear in multiple rosters
    const duplicates = new Set<string>();
    memberTags.forEach((rosterIds, tag) => {
      if (rosterIds.size > 1) {
        duplicates.add(tag);
      }
    });

    return duplicates;
  };

  // Calculate roster statistics
  const getRosterStats = (roster: Roster) => {
    const members = roster.members || [];
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

    const clanCount = roster.clan_tag
      ? members.filter(m => m.current_clan_tag === roster.clan_tag).length
      : 0;

    const familyCount = members.filter(m => {
      if (!m.current_clan_tag || m.current_clan_tag === "#") return false;
      if (roster.clan_tag && m.current_clan_tag === roster.clan_tag) return false;
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

  // Get townhall restriction text
  const getTownhallRestrictionText = (roster: Roster) => {
    const { min_th, max_th } = roster;

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

  // Helper: Get column display name
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

  // Helper: Get display columns from roster config
  const getDisplayColumns = (roster: Roster): string[] => {
    if (!roster.columns || roster.columns.length === 0) {
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

    return roster.columns.map(col => reverseColumnMapping[col] || col);
  };

  // Helper: Get sort configuration
  const getSortConfig = (roster: Roster): string[] => {
    if (!roster.sort || roster.sort.length === 0) {
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

    return roster.sort.map(field => reverseSortMapping[field] || field);
  };

  // Helper: Sort members based on configuration
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

  // Helper: Group members by signup category
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

  // Filter clan members by search
  const filteredClanMembers = clanMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.tag.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Filter rosters by search and type
  const filteredRosters = Array.isArray(rosters) ? rosters.filter(roster => {
    const matchesSearch = roster.alias.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      roster.clan_name?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      roster.clan_tag?.toLowerCase().includes(rosterSearch.toLowerCase());

    const matchesType = rosterTypeFilter === "all" || roster.roster_type === rosterTypeFilter;

    return matchesSearch && matchesType;
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Rosters & Lineups</h1>
          <p className="text-muted-foreground">
            Manage war rosters, lineups, and member assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {comparisonMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleExitComparisonMode}
                className="border-border"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleStartComparison}
                disabled={selectedRosterIds.size < 2}
                className="bg-primary hover:bg-primary/90"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare ({selectedRosterIds.size}/3)
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setComparisonMode(true)}
                className="border-border"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Rosters
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Roster
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create New Roster</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Create a new war roster or lineup for your server
                    </DialogDescription>
                  </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roster-name" className="text-foreground">Roster Name</Label>
                <Input
                  id="roster-name"
                  placeholder="e.g., CWL Main, War Team A"
                  value={newRosterData.alias}
                  onChange={(e) => setNewRosterData({ ...newRosterData, alias: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roster-type" className="text-foreground">Roster Type</Label>
                <Select
                  value={newRosterData.roster_type}
                  onValueChange={(value: "clan" | "family") =>
                    setNewRosterData({ ...newRosterData, roster_type: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="clan">Clan-Specific</SelectItem>
                    <SelectItem value="family">Family-Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-scope" className="text-foreground">Signup Scope</Label>
                <Select
                  value={newRosterData.signup_scope}
                  onValueChange={(value: "clan-only" | "family-wide") =>
                    setNewRosterData({ ...newRosterData, signup_scope: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="clan-only">Clan Members Only</SelectItem>
                    <SelectItem value="family-wide">Entire Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRosterData.roster_type === "clan" && (
                <div className="space-y-2">
                  <Label htmlFor="clan-tag" className="text-foreground">Clan</Label>
                  <Select
                    value={newRosterData.clan_tag}
                    onValueChange={(value) =>
                      setNewRosterData({ ...newRosterData, clan_tag: value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select clan" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {clans.map((clan) => (
                        <SelectItem key={clan.tag} value={clan.tag}>
                          {clan.name} ({clan.tag})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoster}
                disabled={creating || !newRosterData.alias || (newRosterData.roster_type === "clan" && !newRosterData.clan_tag)}
                className="bg-primary hover:bg-primary/90"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Roster"
                )}
              </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Rosters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{Array.isArray(rosters) ? rosters.length : 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Members</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Array.isArray(rosters) ? rosters.reduce((sum, r) => sum + (r.members?.length || 0), 0) : 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Clan Rosters</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Array.isArray(rosters) ? rosters.filter(r => r.roster_type === "clan").length : 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Family Rosters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Array.isArray(rosters) ? rosters.filter(r => r.roster_type === "family").length : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rosters by name, clan..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="bg-background border-border text-foreground pl-9"
              />
            </div>
            <Select value={rosterTypeFilter} onValueChange={(value: "all" | "clan" | "family") => setRosterTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background border-border text-foreground">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="clan">Clan Only</SelectItem>
                <SelectItem value="family">Family Only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => handleRefreshRoster()}
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
                  Refresh All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rosters List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            All Rosters
            {filteredRosters.length !== (Array.isArray(rosters) ? rosters.length : 0) && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredRosters.length} of {Array.isArray(rosters) ? rosters.length : 0})
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your war rosters and lineups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRosters.length === 0 ? (
            (Array.isArray(rosters) ? rosters.length : 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No rosters created yet</p>
                <p className="text-sm">Create your first roster to get started</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No rosters match your filters</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRosters.map((roster) => {
                const stats = getRosterStats(roster);
                const thRestriction = getTownhallRestrictionText(roster);

                const isSelected = selectedRosterIds.has(roster.custom_id);

                return (
                  <Card
                    key={roster.custom_id}
                    className={`group bg-gradient-to-br from-card to-secondary/30 border-border hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 ${
                      comparisonMode ? 'cursor-pointer' : ''
                    } ${
                      isSelected ? 'border-primary border-2 scale-[1.02]' : ''
                    } ${
                      !comparisonMode ? 'hover:scale-[1.02]' : ''
                    } overflow-hidden`}
                    onClick={() => comparisonMode && handleToggleRosterSelection(roster.custom_id)}
                  >
                    <CardHeader className="pb-3 relative">
                      {/* Decorative gradient bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        roster.roster_type === "clan"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : "bg-gradient-to-r from-orange-500 to-amber-500"
                      }`} />

                      {/* Selection checkbox (comparison mode) */}
                      {comparisonMode && (
                        <div className="absolute top-3 right-3 z-10">
                          {isSelected ? (
                            <CheckSquare className="w-6 h-6 text-primary" />
                          ) : (
                            <Square className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                      )}

                      <div className="flex items-start justify-between mt-2">
                        <div className="flex items-center gap-3 flex-1">
                          {roster.clan_badge ? (
                            <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-md">
                              <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                                {roster.alias.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                              <Shield className="h-7 w-7 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl text-foreground truncate group-hover:text-primary transition-colors">
                              {roster.alias}
                            </CardTitle>
                            {roster.clan_name && (
                              <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <Star className="h-3 w-3" />
                                {roster.clan_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={roster.roster_type === "clan" ? "default" : "secondary"}
                          className={`shrink-0 ${
                            roster.roster_type === "clan"
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0"
                              : "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0"
                          }`}
                        >
                          {roster.roster_type.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Member count with progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            Members
                          </span>
                          <span className="font-bold text-foreground">
                            {roster.roster_size
                              ? `${roster.members?.length || 0}/${roster.roster_size}`
                              : roster.members?.length || 0}
                          </span>
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

                      {/* TH restriction */}
                      {thRestriction !== "No restriction" && (
                        <div className="flex items-center justify-between text-sm p-2 bg-primary/5 rounded-md border border-primary/10">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Target className="h-4 w-4" />
                            TH Level
                          </span>
                          <span className="font-bold text-primary">{thRestriction}</span>
                        </div>
                      )}

                      {/* Stats */}
                      {roster.members && roster.members.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-sm p-2 bg-orange-500/10 rounded-md border border-orange-500/20">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4 text-orange-500" />
                              Avg TH
                            </span>
                            <span className="font-bold text-orange-400">TH{stats.avgTownhall}</span>
                          </div>

                          {stats.avgHitrate > 0 && (
                            <div className={`flex items-center justify-between text-sm p-2 rounded-md border ${
                              stats.avgHitrate >= 80
                                ? "bg-green-500/10 border-green-500/20"
                                : stats.avgHitrate >= 60
                                ? "bg-yellow-500/10 border-yellow-500/20"
                                : "bg-red-500/10 border-red-500/20"
                            }`}>
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Target className={`h-4 w-4 ${
                                  stats.avgHitrate >= 80 ? "text-green-500" :
                                  stats.avgHitrate >= 60 ? "text-yellow-500" : "text-red-500"
                                }`} />
                                Avg Hitrate
                              </span>
                              <span className={`font-bold ${
                                stats.avgHitrate >= 80 ? "text-green-400" :
                                stats.avgHitrate >= 60 ? "text-yellow-400" : "text-red-400"
                              }`}>
                                {stats.avgHitrate}%
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
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
                        </div>
                      )}

                      {!comparisonMode && (
                        <div className="flex gap-2 pt-3 border-t border-border/50">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${params.locale}/dashboard/${guildId}/rosters/${roster.custom_id}`);
                            }}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Open Roster
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(roster);
                            }}
                            className="border-border hover:border-primary hover:bg-primary/10"
                            title="Quick Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoster(roster.custom_id);
                            }}
                            disabled={deleting === roster.custom_id}
                            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
                          >
                            {deleting === roster.custom_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      {comparisonMode && (
                        <div className="pt-3 border-t border-border/50 text-center text-sm text-muted-foreground">
                          {isSelected ? "Selected for comparison" : "Click to select"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedRoster?.alias}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRoster?.clan_name && `${selectedRoster.clan_name} • `}
              {selectedRoster?.members?.length || 0} members
            </DialogDescription>
          </DialogHeader>

          {selectedRoster && (
            <div className="space-y-4">
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
                          {selectedRoster.members?.length || 0}
                        </span>
                        {selectedRoster.roster_size && (
                          <span className="text-muted-foreground">/ {selectedRoster.roster_size}</span>
                        )}
                      </div>
                      {selectedRoster.roster_size && (
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ((selectedRoster.members?.length || 0) / selectedRoster.roster_size) >= 0.9
                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                : ((selectedRoster.members?.length || 0) / selectedRoster.roster_size) >= 0.5
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                : "bg-gradient-to-r from-red-500 to-pink-500"
                            }`}
                            style={{ width: `${Math.min(((selectedRoster.members?.length || 0) / selectedRoster.roster_size) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Performance Stats */}
                    {selectedRoster.members && selectedRoster.members.length > 0 && (() => {
                      const stats = getRosterStats(selectedRoster);
                      return (
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
                      );
                    })()}

                    {/* Distribution & Info */}
                    <div className="space-y-3">
                      {selectedRoster.members && selectedRoster.members.length > 0 && (() => {
                        const stats = getRosterStats(selectedRoster);
                        return (
                          <div className="flex items-center gap-2">
                            {selectedRoster.clan_tag && (
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
                        );
                      })()}

                      {selectedRoster.description && (
                        <div className="p-2 bg-secondary/30 rounded-md border border-border">
                          <p className="text-xs text-muted-foreground italic">{selectedRoster.description}</p>
                        </div>
                      )}

                      {(() => {
                        const thRestriction = getTownhallRestrictionText(selectedRoster);
                        if (thRestriction !== "No restriction") {
                          return (
                            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/10">
                              <span className="text-xs text-muted-foreground">TH Restriction</span>
                              <span className="font-bold text-primary text-xs">{thRestriction}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenAddMembers(selectedRoster)}
                  className="border-border"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRefreshRoster(selectedRoster.custom_id)}
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
                      Refresh Data
                    </>
                  )}
                </Button>
              </div>

              {(!selectedRoster.members || selectedRoster.members.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No members in this roster yet</p>
                </div>
              ) : (() => {
                // Get display configuration
                const displayColumns = getDisplayColumns(selectedRoster);
                const sortConfig = getSortConfig(selectedRoster);

                // Sort and group members
                const sortedMembers = sortMembers(selectedRoster.members, sortConfig);
                const { grouped, uncategorized } = groupMembersByCategory(sortedMembers);

                // Render cell content based on column type
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
                        if (selectedRoster.clan_tag && member.current_clan_tag === selectedRoster.clan_tag) {
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

                return (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">
                      Members ({selectedRoster.members.length})
                    </h3>

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
                                  <tr key={member.tag} className="hover:bg-accent/50 transition-colors border-b border-border">
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
                                          onClick={() => handleToggleSubstitute(member.tag, member.sub)}
                                          disabled={saving}
                                          className={member.sub ? "bg-primary" : "border-border"}
                                          title={member.sub ? "Unmark as substitute" : "Mark as substitute"}
                                        >
                                          SUB
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveMember(member.tag)}
                                          disabled={saving}
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          title="Remove member"
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
                                  <tr key={member.tag} className="hover:bg-accent/50 transition-colors border-b border-border">
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
                                          onClick={() => handleToggleSubstitute(member.tag, member.sub)}
                                          disabled={saving}
                                          className={member.sub ? "bg-primary" : "border-border"}
                                          title={member.sub ? "Unmark as substitute" : "Mark as substitute"}
                                        >
                                          SUB
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveMember(member.tag)}
                                          disabled={saving}
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          title="Remove member"
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
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Roster Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Roster</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update roster settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alias" className="text-foreground">Roster Name</Label>
              <Input
                id="edit-alias"
                value={editRosterData.alias}
                onChange={(e) => setEditRosterData({ ...editRosterData, alias: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-foreground">Description</Label>
              <Textarea
                id="edit-description"
                value={editRosterData.description}
                onChange={(e) => setEditRosterData({ ...editRosterData, description: e.target.value })}
                className="bg-background border-border text-foreground"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-min-th" className="text-foreground">Min TH</Label>
                <Input
                  id="edit-min-th"
                  type="number"
                  min="1"
                  max="17"
                  value={editRosterData.min_th}
                  onChange={(e) => setEditRosterData({ ...editRosterData, min_th: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-th" className="text-foreground">Max TH</Label>
                <Input
                  id="edit-max-th"
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
              <Label htmlFor="edit-roster-size" className="text-foreground">Roster Size</Label>
              <Input
                id="edit-roster-size"
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRoster}
              disabled={saving || !editRosterData.alias}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              disabled={saving || (bulkTags.trim().length === 0 && selectedMembers.size === 0)}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Roster Comparison
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Comparing {selectedRosterIds.size} rosters side-by-side • Duplicate members are highlighted
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const rostersToCompare = getComparisonRosters();
            const duplicateMembers = findDuplicateMembers(rostersToCompare);

            return (
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                <div className="flex gap-4 min-w-max pb-4">
                  {rostersToCompare.map((roster) => {
                    const stats = getRosterStats(roster);
                    const thRestriction = getTownhallRestrictionText(roster);
                    const displayColumns = getDisplayColumns(roster);
                    const sortConfig = getSortConfig(roster);
                    const sortedMembers = sortMembers(roster.members || [], sortConfig);

                    // Render cell helper
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
                            if (roster.clan_tag && member.current_clan_tag === roster.clan_tag) {
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

                    return (
                      <Card key={roster.custom_id} className="bg-card border-border min-w-[400px] flex-shrink-0">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            {roster.clan_badge ? (
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {roster.alias.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                                <Shield className="h-6 w-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1">
                              <CardTitle className="text-lg text-foreground">{roster.alias}</CardTitle>
                              {roster.clan_name && (
                                <p className="text-xs text-muted-foreground">{roster.clan_name}</p>
                              )}
                            </div>
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
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {/* Stats summary */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-primary/5 rounded-md border border-primary/10">
                              <div className="text-2xl font-bold text-primary">{roster.members?.length || 0}</div>
                              <div className="text-xs text-muted-foreground">Members</div>
                            </div>
                            <div className="text-center p-2 bg-orange-500/10 rounded-md border border-orange-500/20">
                              <div className="text-2xl font-bold text-orange-400">TH{stats.avgTownhall}</div>
                              <div className="text-xs text-muted-foreground">Avg TH</div>
                            </div>
                            {stats.avgHitrate > 0 && (
                              <div className={`text-center p-2 rounded-md border ${
                                stats.avgHitrate >= 80
                                  ? "bg-green-500/10 border-green-500/20"
                                  : stats.avgHitrate >= 60
                                  ? "bg-yellow-500/10 border-yellow-500/20"
                                  : "bg-red-500/10 border-red-500/20"
                              }`}>
                                <div className={`text-2xl font-bold ${
                                  stats.avgHitrate >= 80 ? "text-green-400" :
                                  stats.avgHitrate >= 60 ? "text-yellow-400" : "text-red-400"
                                }`}>
                                  {stats.avgHitrate}%
                                </div>
                                <div className="text-xs text-muted-foreground">Hitrate</div>
                              </div>
                            )}
                          </div>

                          {/* Members table */}
                          <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  {displayColumns.map(col => (
                                    <th key={col} className="px-2 py-1 text-center text-xs font-medium text-muted-foreground uppercase">
                                      {getColumnDisplayName(col)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sortedMembers.length === 0 ? (
                                  <tr>
                                    <td colSpan={displayColumns.length} className="px-2 py-8 text-center text-muted-foreground text-sm">
                                      No members
                                    </td>
                                  </tr>
                                ) : (
                                  sortedMembers.map((member) => (
                                    <tr
                                      key={member.tag}
                                      className={`border-b border-border transition-colors ${
                                        duplicateMembers.has(member.tag)
                                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-yellow-500'
                                          : 'hover:bg-accent/50'
                                      }`}
                                      title={duplicateMembers.has(member.tag) ? 'Duplicate member (in multiple rosters)' : ''}
                                    >
                                      {displayColumns.map(col => (
                                        <td key={col} className="px-2 py-1.5 text-center text-xs">
                                          {renderCell(member, col)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Duplicate summary */}
                {duplicateMembers.size > 0 && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-600 font-medium mb-2">
                      <TrendingUp className="w-4 h-4" />
                      {duplicateMembers.size} Duplicate Member{duplicateMembers.size !== 1 ? 's' : ''} Found
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Members highlighted in yellow appear in multiple rosters
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompareDialogOpen(false)}
              className="border-border"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
