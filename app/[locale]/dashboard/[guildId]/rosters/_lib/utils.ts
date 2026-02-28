// Roster Utils - Centralized utility functions for the rosters module

import type { RosterMember, RosterStats, AutomationActionType } from './types';

// ============================================
// Player Tag Validation
// ============================================

const VALID_TAG_CHARS = '0289CGJLPQRUVWY';
const TAG_REGEX = new RegExp(`^#[${VALID_TAG_CHARS}]{3,9}$`);

/**
 * Validates a Clash of Clans player tag format
 */
export function validatePlayerTag(tag: string): boolean {
  const cleaned = tag.trim().toUpperCase();
  return TAG_REGEX.test(cleaned);
}

/**
 * Normalizes a player tag (uppercase, trim, ensure # prefix)
 */
export function normalizePlayerTag(tag: string): string {
  let cleaned = tag.trim().toUpperCase();
  if (!cleaned.startsWith('#')) {
    cleaned = '#' + cleaned;
  }
  return cleaned;
}

/**
 * Parses bulk tags input and returns valid/invalid arrays
 */
export function parseBulkTags(input: string): { valid: string[]; invalid: string[] } {
  const tags = input
    .split(/[\n,\s]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0)
    .map(t => t.startsWith('#') ? t : '#' + t);

  const valid: string[] = [];
  const invalid: string[] = [];

  const seen = new Set<string>();
  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);

    if (validatePlayerTag(tag)) {
      valid.push(tag);
    } else {
      invalid.push(tag);
    }
  }

  return { valid, invalid };
}

// ============================================
// Timezone & DateTime Utils
// ============================================

/**
 * Converts Unix timestamp to datetime-local input value
 */
export function unixToDatetimeLocal(unix: number | null | undefined): string {
  if (!unix) return "";
  const date = new Date(unix * 1000);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

/**
 * Converts datetime-local input value to Unix timestamp
 */
export function datetimeLocalToUnix(datetime: string): number | null {
  if (!datetime) return null;
  const date = new Date(datetime);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Gets the user's timezone offset as a string (e.g., "UTC+02:00")
 */
export function getTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? '+' : '-';
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Gets the user's timezone name
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formats a Unix timestamp for display
 */
export function formatTimestamp(unix: number, locale: string = 'en'): string {
  return new Date(unix * 1000).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ============================================
// Roster Statistics
// ============================================

/**
 * Calculates roster statistics from members array
 */
export function calculateRosterStats(
  members: RosterMember[] | undefined,
  rosterClanTag?: string | null,
  familyClanTags?: string[]
): RosterStats {
  if (!members || members.length === 0) {
    return {
      totalMembers: 0,
      avgTh: 0,
      avgHitrate: 0,
      inClan: 0,
      inFamily: 0,
      external: 0,
      subs: 0,
      thDistribution: {},
    };
  }

  let totalTh = 0;
  let totalHitrate = 0;
  let hitrateCount = 0;
  let inClan = 0;
  let inFamily = 0;
  let external = 0;
  let subs = 0;
  const thDistribution: Record<number, number> = {};

  for (const member of members) {
    // TH stats
    totalTh += member.townhall;
    thDistribution[member.townhall] = (thDistribution[member.townhall] || 0) + 1;

    // Hitrate stats
    if (member.hitrate !== null && member.hitrate !== undefined) {
      totalHitrate += member.hitrate;
      hitrateCount++;
    }

    // Location stats
    if (member.current_clan_tag) {
      if (rosterClanTag && member.current_clan_tag === rosterClanTag) {
        inClan++;
      } else if (familyClanTags?.includes(member.current_clan_tag)) {
        inFamily++;
      } else {
        external++;
      }
    } else {
      external++;
    }

    // Sub count
    if (member.sub) {
      subs++;
    }
  }

  return {
    totalMembers: members.length,
    avgTh: Math.round((totalTh / members.length) * 10) / 10,
    avgHitrate: hitrateCount > 0 ? Math.round((totalHitrate / hitrateCount) * 10) / 10 : 0,
    inClan,
    inFamily,
    external,
    subs,
    thDistribution,
  };
}

// ============================================
// Automation Helpers
// ============================================

export function getAutomationIcon(actionType: AutomationActionType): string {
  const icons: Record<AutomationActionType, string> = {
    roster_ping: 'Bell',
    roster_post: 'MessageSquare',
    roster_signup: 'Unlock',
    roster_signup_close: 'Lock',
    roster_delete: 'Trash2',
    roster_clear: 'X',
    roster_archive: 'Archive',
  };
  return icons[actionType] || 'Zap';
}

export function getAutomationLabel(actionType: AutomationActionType): string {
  const labels: Record<AutomationActionType, string> = {
    roster_ping: 'Ping Roster',
    roster_post: 'Post Roster',
    roster_signup: 'Open Signup',
    roster_signup_close: 'Close Signup',
    roster_delete: 'Delete Roster',
    roster_clear: 'Clear Roster',
    roster_archive: 'Archive Roster',
  };
  return labels[actionType] || actionType;
}

// ============================================
// Column Display Helpers
// ============================================

const COLUMN_LABELS: Record<string, string> = {
  townhall: 'TH',
  name: 'Name',
  tag: 'Tag',
  hitrate: 'Hit Rate',
  current_clan_tag: 'Clan',
  discord: 'Discord',
  hero_lvs: 'Heroes',
  trophies: 'Trophies',
  war_pref: 'War Pref',
  signup_group: 'Group',
};

const COLUMN_INTERNAL: Record<string, string> = {
  'TH': 'townhall',
  'Town Hall': 'townhall',
  'Name': 'name',
  'Tag': 'tag',
  'Hit Rate': 'hitrate',
  'Hitrate': 'hitrate',
  'Clan': 'current_clan_tag',
  'Current Clan': 'current_clan_tag',
  'Discord': 'discord',
  'Heroes': 'hero_lvs',
  'Hero Levels': 'hero_lvs',
  'Trophies': 'trophies',
  'War Pref': 'war_pref',
  'War Preference': 'war_pref',
  'Group': 'signup_group',
  'Signup Group': 'signup_group',
};

export function getColumnLabel(internal: string): string {
  return COLUMN_LABELS[internal] || internal;
}

export function getColumnInternal(display: string): string {
  return COLUMN_INTERNAL[display] || display;
}

// ============================================
// Sort Display Helpers
// ============================================

const SORT_LABELS: Record<string, string> = {
  townhall_desc: 'TH ↓',
  townhall_asc: 'TH ↑',
  name_asc: 'Name A-Z',
  name_desc: 'Name Z-A',
  hitrate_desc: 'Hit Rate ↓',
  hitrate_asc: 'Hit Rate ↑',
  hero_lvs_desc: 'Heroes ↓',
  added_at_desc: 'Recent',
  added_at_asc: 'Oldest',
};

const SORT_INTERNAL: Record<string, string> = {
  'TH ↓': 'townhall_desc',
  'TH (High to Low)': 'townhall_desc',
  'TH ↑': 'townhall_asc',
  'TH (Low to High)': 'townhall_asc',
  'Name A-Z': 'name_asc',
  'Name (A-Z)': 'name_asc',
  'Name Z-A': 'name_desc',
  'Name (Z-A)': 'name_desc',
  'Hit Rate ↓': 'hitrate_desc',
  'Hit Rate (High to Low)': 'hitrate_desc',
  'Hit Rate ↑': 'hitrate_asc',
  'Hit Rate (Low to High)': 'hitrate_asc',
  'Heroes ↓': 'hero_lvs_desc',
  'Heroes (High to Low)': 'hero_lvs_desc',
  'Recent': 'added_at_desc',
  'Recently Added': 'added_at_desc',
  'Oldest': 'added_at_asc',
  'First Added': 'added_at_asc',
};

export function getSortLabel(internal: string): string {
  return SORT_LABELS[internal] || internal;
}

export function getSortInternal(display: string): string {
  return SORT_INTERNAL[display] || display;
}

// ============================================
// TH Restriction Helper
// ============================================

export function formatThRestriction(minTh?: number | null, maxTh?: number | null): string {
  if (minTh && maxTh) {
    return minTh === maxTh ? `TH${minTh}` : `TH${minTh}-${maxTh}`;
  }
  if (minTh) return `TH${minTh}+`;
  if (maxTh) return `TH${maxTh} max`;
  return 'All TH';
}

// ============================================
// Automation Offset Helpers
// ============================================

export type OffsetUnit = 'minutes' | 'hours' | 'days';
export type OffsetDir = 'before' | 'after';

export const UNIT_SECONDS: Record<OffsetUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

export function buildOffsetSeconds(dir: OffsetDir, val: number, unit: OffsetUnit): number {
  const abs = val * UNIT_SECONDS[unit];
  return dir === 'before' ? -abs : abs;
}

export function parseOffsetSeconds(seconds: number): { dir: OffsetDir; val: number; unit: OffsetUnit } {
  const abs = Math.abs(seconds);
  const dir: OffsetDir = seconds <= 0 ? 'before' : 'after';
  if (abs % 86400 === 0 && abs >= 86400) return { dir, val: abs / 86400, unit: 'days' };
  if (abs % 3600 === 0 && abs >= 3600) return { dir, val: abs / 3600, unit: 'hours' };
  return { dir, val: Math.round(abs / 60), unit: 'minutes' };
}

export function formatOffsetSeconds(seconds: number, t: (key: string) => string): string {
  if (seconds === 0) return t('automations.offsetAtStart');
  const { dir, val, unit } = parseOffsetSeconds(seconds);
  const unitLabel = t(`automations.offsetUnit_${unit}`);
  const dirLabel = dir === 'before' ? t('automations.offsetBefore') : t('automations.offsetAfter');
  return `${val} ${unitLabel} ${dirLabel.toLowerCase()}`;
}
