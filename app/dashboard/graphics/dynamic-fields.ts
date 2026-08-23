import { playerLeagueImageUrl, townHallImageUrl } from "../../../lib/clash-asset-urls";
import { proxyClashApiAssetUrl } from "./asset-url";
import { normalizeGraphicWarSize, type BindingValues, type GraphicDocument, type GraphicProjectKind } from "./graphic-document";

export type DynamicFieldKind = "text" | "image";

export interface DynamicField {
  key: string;
  label: string;
  description: string;
  kind: DynamicFieldKind;
  placeholder: string;
}

export const PLAYER_DYNAMIC_FIELDS: readonly DynamicField[] = [
  { key: "player_name", label: "Player name", description: "The player's current in-game name", kind: "text", placeholder: "Chief Matthew" },
  { key: "player_tag", label: "Player tag", description: "The player's Clash of Clans tag", kind: "text", placeholder: "#2PP" },
  { key: "player_townhall", label: "Town Hall", description: "The player's Town Hall level", kind: "text", placeholder: "17" },
  { key: "player_trophies", label: "Trophies", description: "The player's current trophy count", kind: "text", placeholder: "5,842" },
  { key: "player_best_trophies", label: "Best trophies", description: "The player's all-time best trophy count", kind: "text", placeholder: "6,214" },
  { key: "player_warstars", label: "War stars", description: "The player's total war stars", kind: "text", placeholder: "1,337" },
  { key: "player_attack_wins", label: "Attack wins", description: "The player's attack wins this season", kind: "text", placeholder: "184" },
  { key: "player_defense_wins", label: "Defense wins", description: "The player's defense wins this season", kind: "text", placeholder: "27" },
  { key: "player_role", label: "Clan role", description: "The player's role in their clan", kind: "text", placeholder: "Co-leader" },
  { key: "player_experience_level", label: "Experience level", description: "The player's experience level", kind: "text", placeholder: "265" },
  { key: "player_clan_name", label: "Clan name", description: "The player's current clan name", kind: "text", placeholder: "ClashKing" },
  { key: "player_clan_tag", label: "Clan tag", description: "The player's current clan tag", kind: "text", placeholder: "#2PP" },
  { key: "player_league", label: "League", description: "The player's current league", kind: "text", placeholder: "Legend League" },
  { key: "player_league_icon", label: "League icon", description: "The player's current league artwork", kind: "image", placeholder: playerLeagueImageUrl("Legend League") },
  { key: "player_clan_badge", label: "Clan badge", description: "The player's current clan badge", kind: "image", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield.png" },
  { key: "player_townhall_image", label: "Town Hall image", description: "Artwork for the player's Town Hall level", kind: "image", placeholder: townHallImageUrl(17) },
] as const;

export const CLAN_DYNAMIC_FIELDS: readonly DynamicField[] = [
  { key: "clan_name", label: "Clan name", description: "The clan's current name", kind: "text", placeholder: "ClashKing" },
  { key: "clan_tag", label: "Clan tag", description: "The clan's tag", kind: "text", placeholder: "#2PP" },
  { key: "clan_description", label: "Description", description: "The clan's description", kind: "text", placeholder: "Competitive, social, and always improving." },
  { key: "clan_type", label: "Join type", description: "How players can join the clan", kind: "text", placeholder: "Invite only" },
  { key: "clan_level", label: "Clan level", description: "The clan's current level", kind: "text", placeholder: "25" },
  { key: "clan_members", label: "Clan member count", description: "The current number of clan members", kind: "text", placeholder: "50" },
  { key: "clan_location", label: "Location", description: "The clan's location", kind: "text", placeholder: "International" },
  { key: "clan_points", label: "Clan points", description: "The clan's home village trophy total", kind: "text", placeholder: "52,840" },
  { key: "clan_builder_base_points", label: "Builder Base points", description: "The clan's Builder Base trophy total", kind: "text", placeholder: "48,200" },
  { key: "clan_capital_points", label: "Clan Capital points", description: "The clan's Clan Capital trophy total", kind: "text", placeholder: "4,860" },
  { key: "clan_required_trophies", label: "Required trophies", description: "The trophies required to join", kind: "text", placeholder: "3,000" },
  { key: "clan_required_builder_base_trophies", label: "Required Builder Base trophies", description: "The Builder Base trophies required to join", kind: "text", placeholder: "2,000" },
  { key: "clan_required_townhall", label: "Required Town Hall", description: "The Town Hall level required to join", kind: "text", placeholder: "15" },
  { key: "clan_war_frequency", label: "War frequency", description: "How often the clan participates in wars", kind: "text", placeholder: "Always" },
  { key: "clan_war_wins", label: "War wins", description: "The clan's total war wins", kind: "text", placeholder: "842" },
  { key: "clan_war_ties", label: "War ties", description: "The clan's total war ties", kind: "text", placeholder: "12" },
  { key: "clan_war_losses", label: "War losses", description: "The clan's total war losses", kind: "text", placeholder: "126" },
  { key: "clan_war_win_streak", label: "War win streak", description: "The clan's current war win streak", kind: "text", placeholder: "8" },
  { key: "clan_war_league", label: "War league", description: "The clan's current Clan War League", kind: "text", placeholder: "Champion League I" },
  { key: "clan_capital_league", label: "Capital league", description: "The clan's current Clan Capital league", kind: "text", placeholder: "Legend League" },
  { key: "clan_capital_hall", label: "Capital Hall", description: "The clan's Capital Hall level", kind: "text", placeholder: "10" },
  { key: "clan_family_friendly", label: "Family friendly", description: "Whether the clan is marked family friendly", kind: "text", placeholder: "Yes" },
  { key: "clan_badge", label: "Clan badge", description: "The clan's badge from the Clash API asset proxy", kind: "image", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield.png" },
] as const;

export const WAR_DYNAMIC_FIELDS: readonly DynamicField[] = [
  { key: "war_state", label: "War state", description: "The current state of the war", kind: "text", placeholder: "In war" },
  { key: "war_team_size", label: "Team size", description: "The number of players on each war roster", kind: "text", placeholder: "10" },
  { key: "war_attacks_per_member", label: "Attacks per member", description: "The attacks available to each member", kind: "text", placeholder: "2" },
  { key: "war_preparation_start_time", label: "Preparation start", description: "When preparation began", kind: "text", placeholder: "Aug 8, 18:00 UTC" },
  { key: "war_start_time", label: "War start", description: "When battle day begins", kind: "text", placeholder: "Aug 9, 18:00 UTC" },
  { key: "war_end_time", label: "War end", description: "When the war ends", kind: "text", placeholder: "Aug 10, 18:00 UTC" },
  { key: "war_clan_name", label: "War clan name", description: "The home clan in a war", kind: "text", placeholder: "ClashKing" },
  { key: "war_clan_tag", label: "War clan tag", description: "The home clan's tag", kind: "text", placeholder: "#2PP" },
  { key: "war_clan_level", label: "War clan level", description: "The home clan's level", kind: "text", placeholder: "25" },
  { key: "war_clan_attacks", label: "War clan attacks", description: "The home clan's attacks used", kind: "text", placeholder: "18" },
  { key: "war_opponent_name", label: "War opponent name", description: "The opposing clan in a war", kind: "text", placeholder: "Opponent" },
  { key: "war_opponent_tag", label: "War opponent tag", description: "The opposing clan's tag", kind: "text", placeholder: "#P0LY" },
  { key: "war_opponent_level", label: "War opponent level", description: "The opposing clan's level", kind: "text", placeholder: "24" },
  { key: "war_opponent_attacks", label: "War opponent attacks", description: "The opposing clan's attacks used", kind: "text", placeholder: "17" },
  { key: "war_clan_stars", label: "War clan stars", description: "The home clan's current stars", kind: "text", placeholder: "36" },
  { key: "war_opponent_stars", label: "War opponent stars", description: "The opposing clan's current stars", kind: "text", placeholder: "34" },
  { key: "war_clan_destruction", label: "War clan destruction", description: "The home clan's destruction percentage", kind: "text", placeholder: "98.40%" },
  { key: "war_opponent_destruction", label: "War opponent destruction", description: "The opposing clan's destruction percentage", kind: "text", placeholder: "96.75%" },
  { key: "war_clan_badge", label: "War clan badge", description: "The home clan badge", kind: "image", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield.png" },
  { key: "war_opponent_badge", label: "War opponent badge", description: "The opposing clan badge", kind: "image", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield_Arrow.png" },
] as const;

export const DYNAMIC_FIELDS: readonly DynamicField[] = [
  ...PLAYER_DYNAMIC_FIELDS,
  ...CLAN_DYNAMIC_FIELDS,
  ...WAR_DYNAMIC_FIELDS,
] as const;

const LEGACY_DYNAMIC_FIELDS: readonly DynamicField[] = [
  { key: "player_clan", label: "Clan name", description: "Legacy player clan name binding", kind: "text", placeholder: "ClashKing" },
] as const;

function warMemberDynamicFields(size: number): DynamicField[] {
  const fields: DynamicField[] = [];
  for (let index = 1; index <= size; index += 1) {
    for (const side of ["clan", "opponent"] as const) {
      const sideLabel = side === "clan" ? "Home" : "Away";
      const prefix = `war_${side}_member_${index}`;
      fields.push(
        { key: `${prefix}_name`, label: `${sideLabel} member ${index} name`, description: `The name of ${sideLabel.toLowerCase()} war member ${index}`, kind: "text", placeholder: `${sideLabel} ${index}` },
        { key: `${prefix}_tag`, label: `${sideLabel} member ${index} tag`, description: `The tag of ${sideLabel.toLowerCase()} war member ${index}`, kind: "text", placeholder: "#PLAYER" },
        { key: `${prefix}_townhall`, label: `${sideLabel} member ${index} Town Hall`, description: `The Town Hall level of ${sideLabel.toLowerCase()} war member ${index}`, kind: "text", placeholder: "17" },
        { key: `${prefix}_map_position`, label: `${sideLabel} member ${index} map position`, description: `The map position of ${sideLabel.toLowerCase()} war member ${index}`, kind: "text", placeholder: String(index) },
      );
    }
  }
  return fields;
}

const ALL_WAR_MEMBER_DYNAMIC_FIELDS = warMemberDynamicFields(10);

export function getDynamicFieldsForKind(kind: GraphicProjectKind): readonly DynamicField[] {
  if (kind === "clan") return CLAN_DYNAMIC_FIELDS;
  if (kind === "war") return WAR_DYNAMIC_FIELDS;
  return PLAYER_DYNAMIC_FIELDS;
}

export function getDynamicFieldsForDocument(document: Pick<GraphicDocument, "kind" | "warSize">): readonly DynamicField[] {
  const kind = document.kind ?? "player";
  const baseFields = getDynamicFieldsForKind(kind);
  if (kind !== "war") return baseFields;
  const size = normalizeGraphicWarSize(document.warSize);
  return [...baseFields, ...warMemberDynamicFields(size)];
}

export const PLACEHOLDER_BINDINGS: BindingValues = Object.fromEntries(
  [...DYNAMIC_FIELDS, ...ALL_WAR_MEMBER_DYNAMIC_FIELDS, ...LEGACY_DYNAMIC_FIELDS].map((field) => [field.key, field.placeholder]),
);

export function bindingToken(key: string): string {
  return `{${key}}`;
}

export function findDynamicField(key: string): DynamicField | undefined {
  return [...DYNAMIC_FIELDS, ...ALL_WAR_MEMBER_DYNAMIC_FIELDS, ...LEGACY_DYNAMIC_FIELDS].find((field) => field.key === key);
}

export function getBindingsInText(value: string): string[] {
  return [...new Set([...value.matchAll(/\{([a-z][a-z0-9_]*)\}/gi)].map((match) => match[1]))];
}

export function mapPlayerApiData(payload: Record<string, unknown>): BindingValues {
  const clan = isRecord(payload.clan) ? payload.clan : undefined;
  // Player profiles use `leagueTier`; `league` only existed on the older
  // profile contract and is retained here for previously captured payloads.
  const league = isRecord(payload.leagueTier)
    ? payload.leagueTier
    : isRecord(payload.league)
      ? payload.league
      : undefined;
  const leagueIcons = league && isRecord(league.iconUrls) ? league.iconUrls : undefined;
  const clanBadges = clan && isRecord(clan.badgeUrls) ? clan.badgeUrls : undefined;
  const townHall = numberValue(payload.townHallLevel ?? payload.townhall);

  return {
    player_name: stringValue(payload.name),
    player_tag: stringValue(payload.tag),
    player_townhall: townHall,
    player_trophies: numberValue(payload.trophies)?.toLocaleString("en-US"),
    player_best_trophies: numberValue(payload.bestTrophies)?.toLocaleString("en-US"),
    player_warstars: numberValue(payload.warStars)?.toLocaleString("en-US"),
    player_attack_wins: numberValue(payload.attackWins)?.toLocaleString("en-US"),
    player_defense_wins: numberValue(payload.defenseWins)?.toLocaleString("en-US"),
    player_role: stringValue(payload.role),
    player_experience_level: numberValue(payload.expLevel),
    player_clan_name: stringValue(clan?.name),
    player_clan_tag: stringValue(clan?.tag),
    // Retain the original binding so existing saved graphics continue to render.
    player_clan: stringValue(clan?.name),
    // Early player projects could select unscoped clan fields. These aliases
    // remain resolvable but are intentionally absent from the player picker.
    clan_name: stringValue(clan?.name),
    clan_tag: stringValue(clan?.tag),
    clan_badge: proxiedStringValue(clanBadges?.large ?? clanBadges?.medium ?? clanBadges?.small),
    player_league: stringValue(league?.name),
    player_league_icon: proxiedStringValue(leagueIcons?.large ?? leagueIcons?.medium ?? leagueIcons?.small ?? leagueIcons?.tiny),
    player_clan_badge: proxiedStringValue(clanBadges?.large ?? clanBadges?.medium ?? clanBadges?.small),
    player_townhall_image: townHall ? townHallImageUrl(townHall) : undefined,
  };
}

export function mapClanApiData(payload: Record<string, unknown>): BindingValues {
  const badgeUrls = isRecord(payload.badgeUrls) ? payload.badgeUrls : undefined;
  const members = Array.isArray(payload.memberList) ? payload.memberList.filter(isRecord) : [];
  const location = isRecord(payload.location) ? payload.location : undefined;
  const warLeague = isRecord(payload.warLeague) ? payload.warLeague : undefined;
  const capitalLeague = isRecord(payload.capitalLeague) ? payload.capitalLeague : undefined;
  const clanCapital = isRecord(payload.clanCapital) ? payload.clanCapital : undefined;
  const capitalDistricts = Array.isArray(clanCapital?.districts) ? clanCapital.districts.filter(isRecord) : [];
  const capitalPeak = capitalDistricts.find((district) => stringValue(district.name)?.toLowerCase() === "capital peak")
    ?? capitalDistricts[0];
  const bindings: BindingValues = {
    clan_name: stringValue(payload.name),
    clan_tag: stringValue(payload.tag),
    clan_description: stringValue(payload.description),
    clan_type: stringValue(payload.type),
    clan_level: numberValue(payload.clanLevel),
    clan_members: numberValue(payload.members) ?? members.length,
    clan_location: stringValue(location?.name),
    clan_points: numberValue(payload.clanPoints)?.toLocaleString("en-US"),
    clan_builder_base_points: numberValue(payload.clanBuilderBasePoints)?.toLocaleString("en-US"),
    clan_capital_points: numberValue(payload.clanCapitalPoints)?.toLocaleString("en-US"),
    clan_required_trophies: numberValue(payload.requiredTrophies)?.toLocaleString("en-US"),
    clan_required_builder_base_trophies: numberValue(payload.requiredBuilderBaseTrophies)?.toLocaleString("en-US"),
    clan_required_townhall: numberValue(payload.requiredTownhallLevel),
    clan_war_frequency: stringValue(payload.warFrequency),
    clan_war_wins: numberValue(payload.warWins)?.toLocaleString("en-US"),
    clan_war_ties: numberValue(payload.warTies)?.toLocaleString("en-US"),
    clan_war_losses: numberValue(payload.warLosses)?.toLocaleString("en-US"),
    clan_war_win_streak: numberValue(payload.warWinStreak)?.toLocaleString("en-US"),
    clan_war_league: stringValue(warLeague?.name),
    clan_capital_league: stringValue(capitalLeague?.name),
    // The Clash API exposes the Capital Hall as the Capital Peak district's
    // districtHallLevel. Keep the older flat property as a compatibility fallback.
    clan_capital_hall: numberValue(capitalPeak?.districtHallLevel ?? clanCapital?.capitalHallLevel),
    clan_family_friendly: booleanLabel(payload.isFamilyFriendly),
    clan_badge: proxiedStringValue(badgeUrls?.large ?? badgeUrls?.medium ?? badgeUrls?.small),
  };
  members.forEach((member, index) => {
    const prefix = `clan_member_${index + 1}`;
    bindings[`${prefix}_name`] = stringValue(member.name);
    bindings[`${prefix}_tag`] = stringValue(member.tag);
    bindings[`${prefix}_townhall`] = numberValue(member.townHallLevel);
    bindings[`${prefix}_trophies`] = numberValue(member.trophies)?.toLocaleString("en-US");
  });
  return bindings;
}

export function mapWarApiData(payload: Record<string, unknown>, warSize = 5): BindingValues {
  const safeWarSize = normalizeGraphicWarSize(warSize);
  const clan = isRecord(payload.clan) ? payload.clan : {};
  const opponent = isRecord(payload.opponent) ? payload.opponent : {};
  const bindings: BindingValues = {
    war_state: stringValue(payload.state),
    war_team_size: numberValue(payload.teamSize),
    war_attacks_per_member: numberValue(payload.attacksPerMember),
    war_preparation_start_time: stringValue(payload.preparationStartTime),
    war_start_time: stringValue(payload.startTime),
    war_end_time: stringValue(payload.endTime),
  };
  for (const [side, value] of [["clan", clan], ["opponent", opponent]] as const) {
    const badges = isRecord(value.badgeUrls) ? value.badgeUrls : undefined;
    bindings[`war_${side}_name`] = stringValue(value.name);
    bindings[`war_${side}_tag`] = stringValue(value.tag);
    bindings[`war_${side}_level`] = numberValue(value.clanLevel);
    bindings[`war_${side}_attacks`] = numberValue(value.attacks);
    bindings[`war_${side}_stars`] = numberValue(value.stars);
    bindings[`war_${side}_destruction`] = numberValue(value.destructionPercentage);
    bindings[`war_${side}_badge`] = proxiedStringValue(badges?.large ?? badges?.medium ?? badges?.small);
    const members = Array.isArray(value.members) ? value.members.filter(isRecord).slice(0, safeWarSize) : [];
    members.forEach((member, index) => {
      const prefix = `war_${side}_member_${index + 1}`;
      bindings[`${prefix}_name`] = stringValue(member.name);
      bindings[`${prefix}_tag`] = stringValue(member.tag);
      bindings[`${prefix}_townhall`] = numberValue(member.townhallLevel ?? member.townHallLevel);
      bindings[`${prefix}_map_position`] = numberValue(member.mapPosition);
    });
  }
  return bindings;
}

function proxiedStringValue(value: unknown): string | undefined {
  const source = stringValue(value);
  return source ? proxyClashApiAssetUrl(source) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanLabel(value: unknown): string | undefined {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : undefined;
}
