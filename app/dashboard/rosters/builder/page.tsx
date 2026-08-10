"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, readUIMessageStream, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Columns3,
  FileSpreadsheet,
  GripVertical,
  Info,
  Loader2,
  ListFilter,
  MessageSquareX,
  MoreHorizontal,
  Pencil,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  Square,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthSession } from "@/components/auth-session-provider";
import { DashboardHeaderPortal } from "@/components/dashboard/dashboard-header-portal";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, getDefaultBaseUrl } from "@/lib/api/client";
import { apiFetch, apiUrl } from "@/lib/api/fetch";
import type { MaterializedRosterView, RosterMembershipProposal, RosterView, RosterViewResult } from "@/lib/api/types/roster";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";
import { clearRosterBuilderChats, loadRosterBuilderChat, saveRosterBuilderChat } from "@/lib/roster-builder-session";
import { rosterAssistantErrorText } from "@/lib/roster-assistant-error";
import {
  ROSTER_ASSISTANT_COMPACTION_THRESHOLD,
  ROSTER_ASSISTANT_MODEL,
} from "@/lib/roster-assistant-constants";
import { getAccessToken, refreshAccessToken, subscribeSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { clashKingAssets, playerLeagueImageUrl, townHallImageUrl } from "@/lib/theme";
import { Checkpoint, CheckpointIcon } from "@/components/ai-elements/checkpoint";
import {
  Context,
  ContextContent,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { isDeveloperUserId } from "@/lib/internal/developer-access";
import { fetchRosters } from "../_lib/api";
import type { Roster } from "../_lib/types";
import { mergeRosterContextIds, removeAtomicMention, rosterMentionIds } from "./roster-mentions";
import { RosterAssistantChart, type RosterAssistantChartSpec } from "./roster-assistant-chart";
import { downloadRosterViewExcel } from "./roster-view-export";

type RosterChatData = {
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  };
  viewResult: RosterViewResult;
  viewDraft: MaterializedRosterView;
  membershipProposal: RosterMembershipProposal;
  rosterTool: { id: string; name: string; state: "started" | "completed" | "failed"; error?: string };
  playerContexts: PlayerChatContext[];
  toolProgress: {
    tool: string;
    label?: string;
    state: "running" | "complete" | "error";
  };
  chart: RosterAssistantChartSpec;
};

type RosterChatMessage = UIMessage<unknown, RosterChatData>;

type PlayerChatContext = {
  playerTag: string;
  name: string;
  townhall: number;
  rosterId: string;
};

function rosterAssistantUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ASSISTANT_URL?.trim();
  if (configured) return configured;
  const apiBaseUrl = getDefaultBaseUrl();
  if (apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1")) {
    return "http://localhost:8788/chat";
  }
  return apiBaseUrl.includes("dev-api.clashk.ing")
    ? "https://dev-ai.clashk.ing/chat"
    : "https://ai.clashk.ing/chat";
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Safari can reject Clipboard API writes during local development even
      // when the action began with a user gesture. Fall through to selection.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function assistantFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const apiBaseUrl = getDefaultBaseUrl();
  let token = getAccessToken();
  if (!token && await refreshAccessToken(apiBaseUrl)) token = getAccessToken();

  const request = new Request(input, init);
  const send = (accessToken: string | undefined) => {
    const headers = new Headers(request.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(new Request(request.clone(), { headers, credentials: "omit" }));
  };

  let response = await send(token);
  if (response.status !== 401 || !(await refreshAccessToken(apiBaseUrl))) return response;
  response = await send(getAccessToken());
  return response;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (Array.isArray(value)) return value.map(formatCell).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function leagueBadgeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return playerLeagueImageUrl(value);
}

type LeagueTrophiesValue = { leagueName?: unknown; trophies?: unknown };

function isLeagueTrophiesValue(value: unknown): value is LeagueTrophiesValue {
  return Boolean(value && typeof value === "object" && ("leagueName" in value || "trophies" in value));
}

function RosterCellValue({ metricId, value }: { readonly metricId: string; readonly value: unknown }) {
  if (metricId === "player.townhall" && typeof value === "number") {
    return (
      <span className="inline-flex items-center gap-2">
        <Image src={townHallImageUrl(value)} alt="" width={28} height={28} unoptimized />
        <span>TH{value}</span>
      </span>
    );
  }
  if (metricId === "player.league") {
    const badge = leagueBadgeUrl(value);
    return (
      <span className="inline-flex items-center gap-2">
        {badge && <Image src={badge} alt="" width={28} height={28} unoptimized />}
        <span>{formatCell(value)}</span>
      </span>
    );
  }
  if (metricId === "player.league_trophies" && isLeagueTrophiesValue(value)) {
    const badge = leagueBadgeUrl(value.leagueName);
    return (
      <span className="inline-flex items-center gap-2">
        {badge && <Image src={badge} alt="" width={28} height={28} unoptimized />}
        <span>{typeof value.trophies === "number" ? value.trophies.toLocaleString() : "—"}</span>
      </span>
    );
  }
  if (metricId === "player.heroes") {
    return typeof value === "number"
      ? <span>{value.toLocaleString()}</span>
      : <span className="text-muted-foreground">—</span>;
  }
  if (metricId === "player.max_percent" && typeof value === "number") {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  }
  return formatCell(value);
}

function cleanGeneratedViewName(name: string, rosters: Roster[]): string {
  let cleaned = name.trim();
  const rosterNames = rosters.flatMap((roster) => [roster.alias, roster.clan_name]).filter((value): value is string => Boolean(value?.trim()));
  for (const rosterName of rosterNames.sort((left, right) => right.length - left.length)) {
    cleaned = cleaned.replace(new RegExp(escapeMentionPattern(rosterName), "gi"), "");
  }
  cleaned = cleaned.replace(/\s*[—–|:-]\s*(?=$|[—–|:-])/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s—–|:-]+|[\s—–|:-]+$/g, "");
  return cleaned || "Custom view";
}

function compareHighlightValue(actual: unknown, expected: unknown): number {
  if (typeof actual === "number" && typeof expected === "number") return actual - expected;
  return String(actual ?? "").toLocaleLowerCase().localeCompare(String(expected ?? "").toLocaleLowerCase());
}

function highlightMatches(actual: unknown, operator: string, expected: unknown): boolean {
  const comparison = compareHighlightValue(actual, expected);
  if (operator === "eq") return comparison === 0;
  if (operator === "neq") return comparison !== 0;
  if (operator === "gt") return comparison > 0;
  if (operator === "gte") return comparison >= 0;
  if (operator === "lt") return comparison < 0;
  if (operator === "lte") return comparison <= 0;
  if (operator === "contains") return String(actual ?? "").toLocaleLowerCase().includes(String(expected ?? "").toLocaleLowerCase());
  if (operator === "in") return Array.isArray(expected) && expected.some((value) => compareHighlightValue(actual, value) === 0);
  return false;
}

function compareRosterValues(left: unknown, right: unknown): number {
  const leftValue = isLeagueTrophiesValue(left) ? left.trophies : left;
  const rightValue = isLeagueTrophiesValue(right) ? right.trophies : right;
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

const highlightClasses = {
  red: "bg-red-500/15 text-red-100",
  amber: "bg-amber-500/15 text-amber-100",
  green: "bg-emerald-500/15 text-emerald-100",
  blue: "bg-blue-500/15 text-blue-100",
  purple: "bg-purple-500/15 text-purple-100",
  gray: "bg-muted/70",
} as const;

function messageText(message: RosterChatMessage): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function escapeMentionPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function playerContextLabel(player: PlayerChatContext): string {
  return `${player.townhall > 0 ? `TH${player.townhall} ` : ""}${player.name}`;
}

function HighlightedPrompt({
  text,
  rosters,
  mentionIds,
  playerContexts,
}: {
  readonly text: string;
  readonly rosters: Roster[];
  readonly mentionIds: string[];
  readonly playerContexts: PlayerChatContext[];
}) {
  const aliases = rosters
    .filter((roster) => mentionIds.includes(roster.id))
    .map((roster) => roster.alias)
    .sort((left, right) => right.length - left.length);
  const tokens = [
    ...aliases.map((alias) => `@${alias}`),
    ...playerContexts.map(playerContextLabel),
  ].sort((left, right) => right.length - left.length);
  if (tokens.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${tokens.map(escapeMentionPattern).join("|")})(?=\\s|$|[.,!?;:])`, "gi");
  const known = new Set(tokens.map((token) => token.toLocaleLowerCase()));
  const playersByLabel = new Map(playerContexts.map((player) => [playerContextLabel(player).toLocaleLowerCase(), player]));
  return (
    <>
      {text.split(pattern).map((part, index) => {
        const normalized = part.toLocaleLowerCase();
        if (!known.has(normalized)) return <span key={`${part}:${index}`}>{part}</span>;
        const player = playersByLabel.get(normalized);
        return (
          <span
            key={`${part}:${index}`}
            className="rounded-[3px] bg-[#5865F2]/30 text-[#C9CDFB] shadow-[0_0_0_2px_rgba(88,101,242,0.3)]"
          >
            {player?.townhall ? (
              <>
                <span className="relative inline-block h-[22px] w-[22px] align-middle">
                  <Image
                    src={townHallImageUrl(player.townhall)}
                    alt={`Town Hall ${player.townhall}`}
                    width={22}
                    height={22}
                    className="absolute inset-0 h-[22px] w-[22px] object-contain"
                  />
                </span>{player.name}
              </>
            ) : part}
          </span>
        );
      })}
    </>
  );
}

function toolStateLabel(state: string): string {
  if (state === "output-available") return "Complete";
  if (state === "output-error") return "Failed";
  return "Working";
}

const toolLabels: Record<string, string> = {
  refresh_roster_data: "Refreshing roster data",
  get_roster_members: "Reading roster members",
  get_roster_account_groups: "Matching linked player accounts",
  get_roster_metric: "Calculating roster metric",
  render_roster_view: "Building roster view",
  publish_roster_chart: "Building roster chart",
  propose_roster_membership_changes: "Preparing roster changes",
};

type MembershipProposalInput = {
  expiresAt?: string;
  counts?: { add?: number; move?: number; remove?: number };
  items?: Array<{ action: "add" | "move" | "remove"; playerTag: string; fromRoster?: string; toRoster?: string; reason?: string }>;
  expectedRevisions?: Record<string, number>;
  generatedAt?: string;
};

const membershipActionStyles = {
  add: {
    summary: "border-success/25 bg-success/10 text-success",
    label: "bg-success/12 text-success",
  },
  move: {
    summary: "border-info/25 bg-info/10 text-info",
    label: "bg-info/12 text-info",
  },
  remove: {
    summary: "border-destructive/25 bg-destructive/10 text-destructive",
    label: "bg-destructive/12 text-destructive",
  },
} as const;

function normalizePlayerTag(tag: string): string {
  const trimmed = tag.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function MembershipApprovalPreview({
  input,
  playerNames,
  onCancel,
  onApply,
  disabled = false,
}: {
  readonly input: MembershipProposalInput;
  readonly playerNames: ReadonlyMap<string, string>;
  readonly onCancel: () => void;
  readonly onApply: () => void;
  readonly disabled?: boolean;
}) {
  const counts = input.counts ?? {};
  const items = input.items ?? [];
  return (
    <div className="flex max-h-[min(62vh,42rem)] min-h-0 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-3 gap-2 pb-3">
        {(["add", "move", "remove"] as const).map((action) => (
          <div key={action} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", membershipActionStyles[action].summary)}>
            <span className="text-lg font-semibold leading-none">{counts[action] ?? 0}</span>
            <span className="text-[11px] font-semibold">{action}</span>
          </div>
        ))}
      </div>
      <div className="scrollbar-custom min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto overscroll-contain pr-2">
        {items.map((item, index) => (
          <div key={`${item.action}:${item.playerTag}:${index}`} className="grid grid-cols-[4.25rem_minmax(0,1fr)_minmax(8rem,0.85fr)] items-center gap-3 py-2.5">
            <span className={cn("w-fit rounded-md px-2 py-1 text-[10px] font-semibold", membershipActionStyles[item.action].label)}>{item.action}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {playerNames.get(normalizePlayerTag(item.playerTag)) ?? item.playerTag}
              </span>
              {playerNames.has(normalizePlayerTag(item.playerTag)) && (
                <span className="block truncate font-mono text-[10px] text-muted-foreground">{item.playerTag}</span>
              )}
              {item.reason && <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{item.reason}</span>}
            </span>
            <div className="flex min-w-0 items-center justify-end gap-1.5 text-right text-xs text-muted-foreground">
              {item.fromRoster && <span className="max-w-28 truncate">{item.fromRoster}</span>}
              {item.fromRoster && item.toRoster && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
              {item.toRoster && <span className="max-w-28 truncate">{item.toRoster}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/50 pt-3">
        {input.expiresAt && <p className="mr-auto text-[11px] text-muted-foreground">
          Approval expires {new Date(input.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
        </p>}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="h-7" disabled={disabled} onClick={onApply}>Apply changes</Button>
        </div>
      </div>
    </div>
  );
}

function formatRequestDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${durationMs} ms`;
  return `${(durationMs / 1_000).toFixed(durationMs < 10_000 ? 1 : 0)} s`;
}

function useDelayedThinking(active: boolean, hasResponseActivity: boolean, startedAt?: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active || hasResponseActivity) {
      setVisible(false);
      return;
    }
    const remaining = Math.max(0, 250 - (Date.now() - (startedAt ?? Date.now())));
    const timer = window.setTimeout(() => setVisible(true), remaining);
    return () => window.clearTimeout(timer);
  }, [active, hasResponseActivity, startedAt]);

  return visible;
}

function PendingAssistantMessage({ startedAt }: { readonly startedAt?: number }) {
  const showThinking = useDelayedThinking(true, false, startedAt);
  if (!showThinking) return null;
  return (
    <div className="flex gap-3">
      <Image src={clashKingAssets.logos.botApp} alt="ClashKing" width={32} height={32} className="mt-1 h-8 w-8 shrink-0 rounded-xl object-cover" />
      <div className="flex min-w-0 flex-1 items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Thinking…</span>
      </div>
    </div>
  );
}

function AssistantErrorMessage({ error }: { readonly error: unknown }) {
  return (
    <div className="flex gap-3" role="alert">
      <Image src={clashKingAssets.logos.botApp} alt="ClashKing" width={32} height={32} className="mt-1 h-8 w-8 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 max-w-[calc(100%-2.75rem)] flex-1 py-1 text-sm text-foreground">
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
          <p className="font-medium">I couldn’t complete that request.</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{rosterAssistantErrorText(error)}</p>
        </div>
      </div>
    </div>
  );
}

function RequestInfo({ usage }: { readonly usage: RosterChatData["usage"] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground" aria-label="Request details">
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium text-foreground">Request details</p>
        <dl className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between gap-4"><dt>Time spent</dt><dd className="font-medium text-foreground">{formatRequestDuration(usage.durationMs)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Total tokens</dt><dd className="font-medium text-foreground">{usage.totalTokens.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-4"><dt>Input</dt><dd>{usage.promptTokens.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-4"><dt>Cached input</dt><dd>{(usage.cachedInputTokens ?? 0).toLocaleString()}</dd></div>
          <div className="flex justify-between gap-4"><dt>Output</dt><dd>{usage.completionTokens.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-4"><dt>Reasoning</dt><dd>{(usage.reasoningTokens ?? 0).toLocaleString()}</dd></div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function ChatMessage({
  message,
  onApplyProposal,
  onDismissProposal,
  rosterRevisions,
  dismissedProposalKeys,
  playerNames,
  rosters,
  active,
  activeSince,
}: {
  readonly message: RosterChatMessage;
  readonly onApplyProposal: (proposal: RosterMembershipProposal) => void;
  readonly onDismissProposal: (proposal: RosterMembershipProposal) => void;
  readonly rosterRevisions: ReadonlyMap<string, number>;
  readonly dismissedProposalKeys: ReadonlySet<string>;
  readonly playerNames: ReadonlyMap<string, string>;
  readonly rosters: Roster[];
  readonly active: boolean;
  readonly activeSince?: number;
}) {
  const text = messageText(message);
  const isUser = message.role === "user";
  const toolParts = message.parts.filter(
    (part) => part.type === "dynamic-tool" || part.type.startsWith("tool-"),
  );
  const toolNameFor = (part: (typeof toolParts)[number]) =>
    "toolName" in part && typeof part.toolName === "string"
      ? part.toolName
      : part.type.replace(/^tool-/, "");
  const progressToolParts = toolParts.filter((part) => toolNameFor(part) !== "codemode");
  const rosterToolEvents = [...message.parts]
    .filter((part) => part.type === "data-rosterTool")
    .reduce<Map<string, RosterChatData["rosterTool"]>>((events, part) => events.set(part.data.id, part.data), new Map());
  const rosterToolSteps = [...rosterToolEvents.values()];
  const usagePart = message.parts.find((part) => part.type === "data-usage");
  const hasCompaction = message.parts.some(
    (part) => part.type === "custom" && part.kind === "openai.compaction",
  );
  const proposalPart = message.parts.find((part) => part.type === "data-membershipProposal");
  const chartParts = message.parts.filter((part) => part.type === "data-chart");
  const messagePlayerContexts = message.parts.find((part) => part.type === "data-playerContexts")?.data ?? [];
  const proposal = proposalPart?.data;
  const proposalStale = proposal ? Object.entries(proposal.expectedRevisions).some(([rosterId, revision]) => rosterRevisions.get(rosterId) !== revision) : false;
  const usage = usagePart?.data;
  const hasToolActivity = progressToolParts.length > 0 || rosterToolSteps.length > 0;
  const hasResponseActivity = Boolean(text || hasToolActivity || proposal || chartParts.length > 0 || usage);
  const showThinking = useDelayedThinking(active, hasResponseActivity, activeSince);
  const toolsComplete = (progressToolParts.length > 0 || rosterToolSteps.length > 0)
    && progressToolParts.every((part) => "state" in part && (part.state === "output-available" || part.state === "output-error"))
    && rosterToolSteps.every((event) => event.state !== "started");
  const [toolsOpen, setToolsOpen] = useState(active || !toolsComplete);

  useEffect(() => {
    if (active) setToolsOpen(true);
    else if (toolsComplete) setToolsOpen(false);
  }, [active, toolsComplete]);

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <Image src={clashKingAssets.logos.botApp} alt="ClashKing" width={32} height={32} className="mt-1 h-8 w-8 shrink-0 rounded-xl object-cover" />
      )}
      <div
        className={cn(
          "text-sm",
          isUser
            ? "max-w-[78%] rounded-2xl bg-muted px-4 py-3 text-foreground"
            : "min-w-0 max-w-[calc(100%-2.75rem)] flex-1 py-1 text-foreground",
        )}
      >
        {!isUser && hasCompaction && (
          <Checkpoint className="mb-3 text-[11px]">
            <CheckpointIcon className="h-3.5 w-3.5" />
            <span className="shrink-0">Earlier context compacted</span>
          </Checkpoint>
        )}
        {(hasToolActivity || showThinking) && (
          <Collapsible open={toolsOpen} onOpenChange={setToolsOpen} className="mb-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                <span>{active ? "Thinking…" : usage ? `Worked for ${formatRequestDuration(usage.durationMs)}` : "Work completed"}</span>
                {hasToolActivity && <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", toolsOpen && "rotate-180")} />}
              </button>
            </CollapsibleTrigger>
            {hasToolActivity && <CollapsibleContent className="mt-1 overflow-hidden rounded-xl bg-muted/35 px-3">
              {rosterToolSteps.map((event) => (
                <div key={event.id} className="border-b border-border/50 py-2.5 text-xs text-muted-foreground last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{toolLabels[event.name] ?? event.name.replaceAll("_", " ")}</span>
                    <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px]">{event.state === "started" ? "Working" : event.state === "completed" ? "Complete" : "Failed"}</Badge>
                  </div>
                  {event.error && <p className="mt-1.5 pl-5 text-[11px] text-destructive">{event.error}</p>}
                </div>
              ))}
              {progressToolParts.map((part) => {
              const invocation = "state" in part ? part : undefined;
              const toolName = toolNameFor(part);
              const toolError = invocation?.state === "output-error" && "errorText" in invocation
                ? invocation.errorText
                : null;
              return (
                <div key={("toolCallId" in part && part.toolCallId) || part.type} className="border-b border-border/50 py-2.5 text-xs text-muted-foreground last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{toolLabels[toolName] ?? toolName.replaceAll("_", " ")}</span>
                    <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px]">
                      {invocation?.state ? toolStateLabel(invocation.state) : "Working"}
                    </Badge>
                  </div>
                  {toolError && <p className="mt-1.5 pl-5 text-[11px] text-destructive">{toolError}</p>}
                </div>
              );
            })}
            </CollapsibleContent>}
          </Collapsible>
        )}
        {text && (
          <div className="max-w-none space-y-2 text-inherit [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:font-semibold">
            {isUser ? (
              <div className="whitespace-pre-wrap">
                <HighlightedPrompt
                  text={text}
                  rosters={rosters}
                  mentionIds={rosterMentionIds(text, rosters)}
                  playerContexts={messagePlayerContexts}
                />
              </div>
            ) : <ReactMarkdown>{text}</ReactMarkdown>}
          </div>
        )}
        {!isUser && chartParts.map((part, index) => (
          <RosterAssistantChart key={`${message.id}:chart:${index}`} spec={part.data} />
        ))}
        {!isUser && proposal && !dismissedProposalKeys.has(proposal.generatedAt) && (
          <section className={cn("mt-4 rounded-xl border border-border/70 bg-card/60 p-4", proposalStale && "opacity-55")}>
            {proposalStale && (
              <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Roster data changed after this proposal was created, so it can no longer be applied.
              </p>
            )}
            <MembershipApprovalPreview
              input={proposal}
              playerNames={playerNames}
              onCancel={() => onDismissProposal(proposal)}
              onApply={() => !proposalStale && onApplyProposal(proposal)}
              disabled={proposalStale}
            />
          </section>
        )}
        {!isUser && usage && (
          <div className="mt-2 flex justify-end">
            <RequestInfo usage={usage} />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewTable({
  name,
  result,
  spec,
  onPlayerContext,
}: {
  readonly name: string;
  readonly result: RosterViewResult;
  readonly spec: MaterializedRosterView["spec"];
  readonly onPlayerContext: (row: RosterViewResult["rows"][number]) => void;
}) {
  const { columns, highlights = [] } = spec;
  const [sortRules, setSortRules] = useState(spec.sort ?? []);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const facetValue = (metricId: string, value: unknown): string | null => {
    if (metricId === "player.league_trophies" && isLeagueTrophiesValue(value)) {
      return typeof value.leagueName === "string" ? value.leagueName : null;
    }
    if (metricId === "roster.name" || metricId === "player.townhall" || metricId === "player.league") {
      return value === null || value === undefined || value === "" ? null : String(value);
    }
    return null;
  };

  const facetOptions = useMemo(() => Object.fromEntries(columns.map((column) => {
    const options = new Set<string>();
    for (const row of result.rows) {
      const value = facetValue(column.metricId, row.values[column.id]);
      if (value) options.add(value);
    }
    return [column.id, [...options].sort((left, right) => {
      if (column.metricId === "player.townhall") return Number(right) - Number(left);
      return left.localeCompare(right, undefined, { numeric: true });
    })];
  })), [columns, result.rows]);

  const toggleSort = (columnId: string, additive: boolean) => {
    setSortRules((current) => {
      const existing = current.find((rule) => rule.columnId === columnId);
      const direction = !existing ? "asc" : existing.direction === "asc" ? "desc" : undefined;
      const withoutColumn = current.filter((rule) => rule.columnId !== columnId);
      if (!additive) return direction ? [{ columnId, direction }] : [];
      return direction ? [...withoutColumn, { columnId, direction }] : withoutColumn;
    });
  };

  const displayedRows = useMemo(() => {
    const filtered = result.rows.filter((row) => columns.every((column) => {
      const selected = filters[column.id] ?? [];
      if (selected.length === 0) return true;
      const value = facetValue(column.metricId, row.values[column.id]);
      return value !== null && selected.includes(value);
    }));
    return [...filtered].sort((left, right) => {
      for (const rule of sortRules) {
        const comparison = compareRosterValues(left.values[rule.columnId], right.values[rule.columnId]);
        if (comparison !== 0) return rule.direction === "desc" ? -comparison : comparison;
      }
      return 0;
    });
  }, [columns, filters, result.rows, sortRules]);

  const ruleMatches = (rule: NonNullable<MaterializedRosterView["spec"]["highlights"]>[number], row: RosterViewResult["rows"][number], rowIndex: number) => {
    if (!rule.when) return true;
    const actual = rule.when.columnId ? row.values[rule.when.columnId] : rowIndex + 1;
    return highlightMatches(actual, rule.when.operator, rule.when.value);
  };

  const rowTone = (row: RosterViewResult["rows"][number], rowIndex: number) =>
    highlights.findLast((rule) => rule.target === "row" && ruleMatches(rule, row, rowIndex))?.tone;

  const cellTone = (columnId: string, row: RosterViewResult["rows"][number], rowIndex: number) =>
    highlights.findLast((rule) =>
      (rule.target === "column" || rule.target === "cell") && rule.columnId === columnId && ruleMatches(rule, row, rowIndex),
    )?.tone;

  const exportExcel = async () => {
    setExporting(true);
    setExportError(false);
    try {
      await downloadRosterViewExcel(name, columns, displayedRows);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-10 items-center gap-2 bg-background px-3">
        <Button size="sm" variant={filtersOpen ? "secondary" : "ghost"} className="h-7 gap-1.5 px-2 text-xs" onClick={() => setFiltersOpen((open) => !open)}>
          <ListFilter className="h-3.5 w-3.5" /> Filters
        </Button>
        {(sortRules.length > 0 || Object.values(filters).some((values) => values.length > 0)) && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => { setSortRules([]); setFilters({}); }}>
            Clear
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1.5 border-0 bg-muted/65 px-2 text-xs shadow-sm shadow-black/5 hover:bg-muted"
          onClick={() => void exportExcel()}
          disabled={exporting || displayedRows.length === 0}
          title="Export the displayed rows to Excel"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          Export Excel
        </Button>
        <span className="sr-only" role="status" aria-live="polite">
          {exporting ? "Creating Excel spreadsheet" : exportError ? "Excel export failed" : ""}
        </span>
        {exportError && <span className="text-[11px] text-destructive">Export failed</span>}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {displayedRows.length === result.rows.length ? `${result.rows.length} players` : `${displayedRows.length} of ${result.rows.length} players`}
        </span>
      </div>
      <div className="scrollbar-custom relative w-full overflow-x-auto border-t border-border/60">
      <table className="w-full caption-bottom text-sm">
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const tone = highlights.findLast((rule) => rule.target === "column" && rule.columnId === column.id && !rule.when)?.tone;
            const sortIndex = sortRules.findIndex((rule) => rule.columnId === column.id);
            const sort = sortIndex >= 0 ? sortRules[sortIndex] : undefined;
            return (
              <TableHead key={column.id} title={column.description ?? "Click to sort; Shift-click to add another sort"} className={tone ? highlightClasses[tone] : undefined}>
                <button type="button" className="flex w-full items-center gap-1.5 py-1 text-left" onClick={(event) => toggleSort(column.id, event.shiftKey)}>
                  <span>{column.label}</span>
                  {sort?.direction === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
                  {sort?.direction === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
                  {sort && sortRules.length > 1 && <span className="text-[9px] text-muted-foreground">{sortIndex + 1}</span>}
                </button>
              </TableHead>
            );
          })}
        </TableRow>
        {filtersOpen && (
          <TableRow>
            {columns.map((column) => {
              const options = facetOptions[column.id] ?? [];
              const selected = filters[column.id] ?? [];
              return (
                <TableHead key={column.id} className="bg-background p-1.5">
                  {options.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 max-w-52 justify-between gap-2 px-2 text-xs font-normal normal-case">
                          <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : `All ${column.label}`}</span>
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-72 min-w-48 overflow-y-auto">
                        <DropdownMenuLabel>{column.label}</DropdownMenuLabel>
                        {options.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option}
                            checked={selected.includes(option)}
                            onSelect={(event) => event.preventDefault()}
                            onCheckedChange={(checked) => setFilters((current) => ({
                              ...current,
                              [column.id]: checked
                                ? [...(current[column.id] ?? []), option]
                                : (current[column.id] ?? []).filter((value) => value !== option),
                            }))}
                          >
                            {column.metricId === "player.townhall" ? `TH${option}` : option}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        )}
      </TableHeader>
      <TableBody>
        {displayedRows.map((row, rowIndex) => {
          const tone = rowTone(row, rowIndex);
          return (
            <TableRow
              key={`${row.rosterId}:${row.playerTag}`}
              className={cn("cursor-default border-border/50 hover:bg-muted/35", tone ? highlightClasses[tone] : undefined)}
              style={row.highlight ? { backgroundColor: `${row.highlight}24` } : undefined}
              title="Double-click to add this player to the chat"
              onDoubleClick={() => onPlayerContext(row)}
            >
              {columns.map((column) => {
                const columnTone = cellTone(column.id, row, rowIndex);
                return (
                  <TableCell key={column.id} className={columnTone ? highlightClasses[columnTone] : undefined}>
                    <RosterCellValue metricId={column.metricId} value={row.values[column.id]} />
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
      </table>
      </div>
    </div>
  );
}

export default function RosterBuilderPage() {
  const guildId = useGuildId();
  const router = useRouter();
  const { user } = useAuthSession();
  const chatStorageScope = user?.user_id && guildId ? `${user.user_id}:${guildId}` : undefined;
  const showDeveloperContext = isDeveloperUserId(user?.user_id);
  const [prompt, setPrompt] = useState("");
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [views, setViews] = useState<RosterView[]>([]);
  const [viewRosterIds, setViewRosterIds] = useState<string[]>([]);
  const [chatMentionIds, setChatMentionIds] = useState<string[]>([]);
  const [playerContexts, setPlayerContexts] = useState<PlayerChatContext[]>([]);
  const [mentionState, setMentionState] = useState<{ start: number; end: number; query: string }>();
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [promptScrollTop, setPromptScrollTop] = useState(0);
  const [selectedView, setSelectedView] = useState<MaterializedRosterView>();
  const [viewResult, setViewResult] = useState<RosterViewResult>();
  const [viewOpen, setViewOpen] = useState(false);
  const [chatPanePercent, setChatPanePercent] = useState(54);
  const [viewDirty, setViewDirty] = useState(false);
  const [viewDialogMode, setViewDialogMode] = useState<"save" | "rename">();
  const [viewName, setViewName] = useState("");
  const [viewLinkCopied, setViewLinkCopied] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [deletingView, setDeletingView] = useState(false);
  const [deleteViewOpen, setDeleteViewOpen] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [pageError, setPageError] = useState<string>();
  const [dismissedProposalKeys, setDismissedProposalKeys] = useState<Set<string>>(() => new Set());
  const [restoredChatForGuild, setRestoredChatForGuild] = useState<string>();
  const [requestStartedAt, setRequestStartedAt] = useState<number>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const replayAbortRef = useRef<AbortController | undefined>(undefined);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openedSharedViewRef = useRef<string | undefined>(undefined);

  const setSplitFromClientX = useCallback((clientX: number) => {
    const bounds = splitContainerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100;
    setChatPanePercent(Math.min(72, Math.max(38, nextPercent)));
  }, []);

  const beginSplitResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSplitFromClientX(event.clientX);
  }, [setSplitFromClientX]);

  const resizePrompt = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
    const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const minHeight = lineHeight * 4 + verticalPadding;
    const maxHeight = lineHeight * 11 + verticalPadding;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    setPromptScrollTop(textarea.scrollTop);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<RosterChatMessage>({
        api: rosterAssistantUrl(),
        fetch: assistantFetch,
      }),
    [],
  );

  const { messages, setMessages, sendMessage, status, error, stop } = useChat<RosterChatMessage>({
    transport,
    throttle: 40,
    onData: (part) => {
      if (part.type === "data-viewResult") {
        setViewResult(part.data);
        setViewOpen(true);
      }
      if (part.type === "data-viewDraft") {
        setSelectedView({ ...part.data, name: cleanGeneratedViewName(part.data.name, rosters) });
        setViewDirty(true);
      }
    },
  });

  const latestUsage = useMemo(() => {
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const usage = messages[messageIndex]?.parts.find((part) => part.type === "data-usage")?.data;
      if (usage) return usage;
    }
    return undefined;
  }, [messages]);

  useEffect(() => {
    resizePrompt();
  }, [prompt, resizePrompt]);

  useEffect(() => {
    if (!guildId || !user?.user_id || !chatStorageScope) {
      setMessages([]);
      setRestoredChatForGuild(undefined);
      return;
    }
    setMessages(loadRosterBuilderChat(user.user_id, guildId) as RosterChatMessage[]);
    setRestoredChatForGuild(chatStorageScope);
  }, [chatStorageScope, guildId, setMessages, user?.user_id]);

  useEffect(() => {
    if (!guildId || !user?.user_id || restoredChatForGuild !== chatStorageScope) return;
    saveRosterBuilderChat(user.user_id, guildId, messages);
  }, [chatStorageScope, guildId, messages, restoredChatForGuild, user?.user_id]);

  useEffect(() => subscribeSession((event) => {
    if (event === "anonymous") clearRosterBuilderChats();
  }), []);

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoadingData(true);
    setPageError(undefined);
    try {
      const [rosterItems, viewResponse] = await Promise.all([
        fetchRosters(guildId),
        apiClient.rosters.listViews(guildId),
      ]);
      setRosters(rosterItems);
      setViewRosterIds((current) => current.length > 0 ? current : rosterItems.slice(0, 1).map((roster) => roster.id));
      if (viewResponse.error) throw new Error(viewResponse.error);
      setViews(viewResponse.data ?? []);
    } catch (loadError) {
      setPageError(loadError instanceof Error ? loadError.message : "Failed to load roster builder data.");
    } finally {
      setLoadingData(false);
    }
  }, [guildId]);

  const applyProposal = useCallback(async (proposal: RosterMembershipProposal) => {
    if (!guildId) return;
    setPageError(undefined);
    const response = await apiClient.rosters.applyMembershipChanges(guildId, {
      serverId: guildId,
      changes: proposal.changes,
      expectedRevisions: proposal.expectedRevisions,
    });
    if (response.error) {
      setPageError(response.error);
      if (response.status === 409) void loadData();
      return;
    }
    await loadData();
  }, [guildId, loadData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshRevisions = () => void loadData();
    window.addEventListener("focus", refreshRevisions);
    return () => window.removeEventListener("focus", refreshRevisions);
  }, [loadData]);

  const updateMention = (value: string, caret: number | null) => {
    if (caret === null) {
      setMentionState(undefined);
      return;
    }
    const beforeCaret = value.slice(0, caret);
    const match = beforeCaret.match(/(?:^|\s)@([^@\n]*)$/);
    if (!match) {
      setMentionState(undefined);
      return;
    }
    const query = match[1];
    const continuesSelectedMention = chatMentionIds.some((id) => {
      const roster = rosters.find((item) => item.id === id);
      if (!roster) return false;
      const normalized = query.toLocaleLowerCase();
      const alias = roster.alias.toLocaleLowerCase();
      return normalized === `${alias} ` || normalized.startsWith(`${alias} `);
    });
    if (continuesSelectedMention) {
      setMentionState(undefined);
      return;
    }
    setMentionState({ start: caret - query.length - 1, end: caret, query });
    setActiveMentionIndex(0);
  };

  const mentionOptions = useMemo(() => {
    if (!mentionState) return [];
    const query = mentionState.query.trim().toLocaleLowerCase();
    return rosters
      .filter((roster) => !query || roster.alias.toLocaleLowerCase().includes(query) || roster.clan_name?.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }, [mentionState, rosters]);

  const insertMention = (roster: Roster) => {
    if (!mentionState) return;
    const suffix = prompt.slice(mentionState.end).replace(/^[\t ]+/, "");
    const next = `${prompt.slice(0, mentionState.start)}@${roster.alias} ${suffix}`;
    const caret = mentionState.start + roster.alias.length + 2;
    setPrompt(next);
    setChatMentionIds((current) => current.includes(roster.id) ? current : [...current, roster.id]);
    setMentionState(undefined);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const submit = async () => {
    const text = prompt.trim();
    const mentionedRosterIds = rosterMentionIds(text, rosters);
    const requestRosterIds = mergeRosterContextIds(viewRosterIds, [
      ...mentionedRosterIds,
      ...playerContexts.map((player) => player.rosterId),
    ]);
    if (!text || requestRosterIds.length === 0 || status === "streaming" || status === "submitted") return;
    setRequestStartedAt(Date.now());
    setViewRosterIds(requestRosterIds);
    setPrompt("");
    setChatMentionIds([]);
    setMentionState(undefined);
    const submittedPlayerContexts = [...playerContexts];
    await sendMessage(
      {
        parts: [
          { type: "text", text },
          ...(submittedPlayerContexts.length > 0 ? [{ type: "data-playerContexts" as const, data: submittedPlayerContexts }] : []),
        ],
      },
      {
        body: {
          serverId: guildId,
          rosterIds: requestRosterIds,
          viewId: selectedView?.id,
          currentView: selectedView ? {
            name: selectedView.name,
            sourceCode: selectedView.sourceCode,
            sourceVersion: selectedView.sourceVersion,
          } : undefined,
          playerContexts: submittedPlayerContexts,
        },
      },
    );
    setPlayerContexts([]);
  };

  const replayView = useCallback(async (view: RosterView, rosterIds: string[]) => {
    const sourceCode = view.sourceCode?.trim();
    if (!sourceCode || rosterIds.length === 0 || !guildId) {
	  setPageError("Select at least one roster before opening this view.");
      return;
    }
    replayAbortRef.current?.abort();
    const controller = new AbortController();
    replayAbortRef.current = controller;
    setEvaluating(true);
    setViewOpen(true);
    setViewLinkCopied(false);
    setPageError(undefined);
    setViewRosterIds(rosterIds);
    try {
      const replayMessage: RosterChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: "Rebuild the saved view for the selected rosters." }],
      };
      const stream = await transport.sendMessages({
        trigger: "submit-message",
        chatId: `view-replay-${view.id || "preview"}`,
        messageId: undefined,
        messages: [replayMessage],
        abortSignal: controller.signal,
        body: {
          serverId: guildId,
          rosterIds,
          viewId: view.id || undefined,
          mode: "replay",
          sourceCode,
          sourceVersion: view.sourceVersion,
          currentView: { name: view.name, sourceCode, sourceVersion: view.sourceVersion },
        },
      });
      let completedMessage: RosterChatMessage | undefined;
      for await (const message of readUIMessageStream<RosterChatMessage>({ stream, terminateOnError: true })) {
        completedMessage = message;
      }
      if (controller.signal.aborted) return;
      const draft = completedMessage?.parts.find((part) => part.type === "data-viewDraft")?.data;
      const result = completedMessage?.parts.find((part) => part.type === "data-viewResult")?.data;
      if (!draft || !result) throw new Error("The saved view could not be rebuilt.");
	  setSelectedView({ ...draft, ...view, spec: draft.spec });
      setViewResult(result);
      setViewDirty(false);
    } catch (replayError) {
      if (!controller.signal.aborted) setPageError(replayError instanceof Error ? replayError.message : "The saved view could not be rebuilt.");
    } finally {
      if (replayAbortRef.current === controller) {
        replayAbortRef.current = undefined;
        setEvaluating(false);
      }
    }
  }, [guildId, transport]);

  const scheduleReplay = useCallback((view: RosterView, rosterIds: string[]) => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    replayTimerRef.current = setTimeout(() => void replayView(view, rosterIds), 350);
  }, [replayView]);

  useEffect(() => () => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    replayAbortRef.current?.abort();
  }, []);

  const startNewView = () => {
    setSelectedView(undefined);
    setViewResult(undefined);
    setViewDirty(false);
    setViewLinkCopied(false);
    setViewOpen(false);
  };

  const openViewDialog = (mode: "save" | "rename") => {
    if (!selectedView) return;
    setViewDialogMode(mode);
    setViewName(cleanGeneratedViewName(selectedView.name, rosters));
    setViewLinkCopied(false);
  };

  const persistView = async () => {
    if (!selectedView || !viewName.trim() || !selectedView.sourceCode.trim()) return;
    setSavingView(true);
    setPageError(undefined);
    const payload = {
      name: viewName.trim(),
      sourceCode: selectedView.sourceCode,
      sourceVersion: selectedView.sourceVersion,
    };
    const response = selectedView.id
      ? await apiClient.rosters.updateView(selectedView.id, guildId, payload)
      : await apiClient.rosters.createView(guildId, payload);
    setSavingView(false);
    if (response.error || !response.data) {
      setPageError(response.error ?? "The view could not be saved.");
      return;
    }
	setSelectedView({ ...selectedView, ...response.data, spec: selectedView.spec });
    setViews((current) => [response.data!, ...current.filter((view) => view.id !== response.data!.id)]);
    setViewDirty(false);
    setViewDialogMode(undefined);
  };

  const deleteSelectedView = async () => {
    if (!selectedView?.id || !guildId) return;
    setDeletingView(true);
    setPageError(undefined);
    const deletedViewId = selectedView.id;
    const response = await apiClient.rosters.deleteView(deletedViewId, guildId);
    setDeletingView(false);
    if (response.error) {
      setPageError(response.error);
      return;
    }
    setViews((current) => current.filter((view) => view.id !== deletedViewId));
    setSelectedView(undefined);
    setViewResult(undefined);
    setViewDirty(false);
    setViewOpen(false);
    setViewDialogMode(undefined);
    setDeleteViewOpen(false);
  };

  const toggleViewRoster = (rosterId: string) => {
    const next = viewRosterIds.includes(rosterId)
      ? viewRosterIds.filter((id) => id !== rosterId)
      : [...viewRosterIds, rosterId];
    if (next.length === 0) return;
    setViewRosterIds(next);
    if (selectedView) scheduleReplay(selectedView, next);
  };

  const shareSelectedView = async () => {
    if (!selectedView?.shareId || typeof window === "undefined") return;
    const url = new URL("/view", window.location.origin);
    url.searchParams.set("share", selectedView.shareId);
    const copied = await copyText(url.toString());
    setViewLinkCopied(copied);
    if (!copied) setPageError("The share link could not be copied.");
  };

  useEffect(() => {
    if (typeof window === "undefined" || views.length === 0) return;
    const viewId = new URL(window.location.href).searchParams.get("viewId");
    if (!viewId || openedSharedViewRef.current === viewId) return;
    const sharedView = views.find((view) => view.id === viewId);
    if (!sharedView) return;
	if (viewRosterIds.length === 0) return;
    openedSharedViewRef.current = viewId;
	void replayView(sharedView, viewRosterIds);
  }, [replayView, viewRosterIds, views]);

  const viewedRosters = rosters.filter((roster) => viewRosterIds.includes(roster.id));
  const filteredRosters = rosters.filter((roster) => {
    const query = rosterSearch.trim().toLocaleLowerCase();
    return !query || roster.alias.toLocaleLowerCase().includes(query) || roster.clan_name?.toLocaleLowerCase().includes(query);
  });
  const playerNames = useMemo(() => {
    const names = new Map<string, string>();
    rosters.forEach((roster) => roster.members?.forEach((member) => {
      if (member.tag && member.name) names.set(normalizePlayerTag(member.tag), member.name);
    }));
    return names;
  }, [rosters]);
  const addPlayerContext = (row: RosterViewResult["rows"][number]) => {
    const roster = rosters.find((item) => item.id === row.rosterId);
    const member = roster?.members?.find((item) => normalizePlayerTag(item.tag) === normalizePlayerTag(row.playerTag));
    const nameColumn = selectedView?.spec.columns.find((column) => column.metricId === "player.name");
    const townhallColumn = selectedView?.spec.columns.find((column) => column.metricId === "player.townhall");
    const nameValue = nameColumn ? row.values[nameColumn.id] : undefined;
    const townhallValue = townhallColumn ? row.values[townhallColumn.id] : undefined;
    const player: PlayerChatContext = {
      playerTag: row.playerTag,
      rosterId: row.rosterId,
      name: member?.name ?? (typeof nameValue === "string" ? nameValue : row.playerTag),
      townhall: member?.townhall ?? (typeof townhallValue === "number" ? townhallValue : 0),
    };
    const label = playerContextLabel(player);
    setPlayerContexts((current) => current.some((item) => normalizePlayerTag(item.playerTag) === normalizePlayerTag(player.playerTag))
      ? current
      : [...current, player]);
    setPrompt((current) => current.toLocaleLowerCase().includes(label.toLocaleLowerCase())
      ? current
      : `${current}${current.length > 0 && !current.endsWith(" ") && !current.endsWith("\n") ? " " : ""}${label} `);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const end = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(end, end);
    });
  };
  const rosterRevisions = useMemo(() => new Map(rosters.map((roster) => [roster.id, roster.revision ?? 1])), [rosters]);
  const promptMentionIds = rosterMentionIds(prompt, rosters);
  const chatTargetRosterIds = mergeRosterContextIds(viewRosterIds, [
    ...promptMentionIds,
    ...playerContexts.map((player) => player.rosterId),
  ]);
  const busy = status === "streaming" || status === "submitted";
  const canShowView = evaluating || Boolean(viewResult && selectedView);

  const clearChat = () => {
    setMessages([]);
    setDismissedProposalKeys(new Set());
    setRequestStartedAt(undefined);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <DashboardHeaderPortal>
        <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Back to rosters" onClick={() => router.push(dashboardHref("rosters", guildId))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold">Roster assistant</h1>
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="max-w-44 gap-1.5" disabled={loadingData}>
                <Users className="h-3.5 w-3.5" />
                <span className="truncate">{viewedRosters.length === 1 ? viewedRosters[0].alias : `${viewedRosters.length} rosters`}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72" onCloseAutoFocus={(event) => event.preventDefault()}>
              <DropdownMenuLabel>Roster data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-1.5 pb-1.5" onKeyDown={(event) => event.stopPropagation()}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={rosterSearch}
                    onChange={(event) => setRosterSearch(event.target.value)}
                    placeholder="Search rosters…"
                    className="h-8 rounded-lg border-0 bg-muted pl-8 text-xs focus-visible:ring-1"
                  />
                </div>
              </div>
              {filteredRosters.map((roster) => {
                const checked = viewRosterIds.includes(roster.id);
                return (
                  <DropdownMenuItem
                    key={roster.id}
                    className="gap-2"
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleViewRoster(roster.id);
                    }}
                  >
                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{roster.alias}</span>
                    <span className="text-xs text-muted-foreground">{roster.members?.length ?? 0}</span>
                  </DropdownMenuItem>
                );
              })}
              {filteredRosters.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">No rosters found.</p>}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedView?.id && !viewDirty && (
            <Button size="icon" variant="ghost" aria-label="Run selected view" onClick={() => void replayView(selectedView, viewRosterIds)} disabled={evaluating}>
              {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="min-w-0 max-w-56 gap-1.5" disabled={loadingData}>
                <Columns3 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden truncate sm:inline">{selectedView?.id ? selectedView.name : "Saved views"}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem onClick={startNewView}><Plus className="mr-2 h-4 w-4" /> New view</DropdownMenuItem>
              {views.length > 0 && <DropdownMenuSeparator />}
              {views.map((view) => (
                <DropdownMenuItem key={view.id} onClick={() => void replayView(view, viewRosterIds)} className="gap-2 py-2.5">
                  <Columns3 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{view.name}</span>
                  {selectedView?.id === view.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedView && viewResult && viewDirty && (
            <Button size="sm" className="gap-1.5" onClick={() => openViewDialog("save")}>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{selectedView.id ? "Save changes" : "Save view"}</span>
            </Button>
          )}
          {selectedView?.id && !viewDirty && (
            <>
              <Button size="icon" variant="ghost" aria-label="Rename saved view" onClick={() => openViewDialog("rename")}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={viewLinkCopied ? "Share link copied" : "Copy share link"}
                title={viewLinkCopied ? "Copied" : "Copy share link"}
                onClick={() => void shareSelectedView()}
              >
                {viewLinkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Clear chat"
            title="Clear chat"
            disabled={messages.length === 0 || busy}
            onClick={clearChat}
          >
            <MessageSquareX className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={viewOpen ? "secondary" : "ghost"}
            aria-label={viewOpen ? "Close roster view" : "Open roster view"}
            disabled={!canShowView}
            onClick={() => setViewOpen((open) => !open)}
          >
            {viewOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
        </div>
      </DashboardHeaderPortal>

      <DashboardHeaderPortal target="mobile">
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">Roster assistant</h1>
          {selectedView && viewResult && viewDirty ? (
            <Button size="touch-icon" className="shrink-0" aria-label={selectedView.id ? "Save changes" : "Save view"} onClick={() => openViewDialog("save")}>
              <Save className="h-4 w-4" />
            </Button>
          ) : selectedView?.id ? (
            <Button size="touch-icon" variant="ghost" className="shrink-0" aria-label="Run selected view" onClick={() => void replayView(selectedView, viewRosterIds)} disabled={evaluating}>
              {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
          ) : null}
          <Button
            size="touch-icon"
            variant={viewOpen ? "secondary" : "ghost"}
            className="shrink-0"
            aria-label={viewOpen ? "Close roster view" : "Open roster view"}
            disabled={!canShowView}
            onClick={() => setViewOpen((open) => !open)}
          >
            {viewOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="touch-icon" variant="ghost" className="shrink-0" aria-label="Roster assistant actions">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))]">
              <DropdownMenuLabel>Saved views</DropdownMenuLabel>
              <DropdownMenuItem onClick={startNewView}><Plus className="mr-2 h-4 w-4" /> New view</DropdownMenuItem>
              {views.map((view) => (
                <DropdownMenuItem key={view.id} onClick={() => void replayView(view, viewRosterIds)} className="gap-2">
                  <Columns3 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{view.name}</span>
                  {selectedView?.id === view.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Roster data</DropdownMenuLabel>
              {filteredRosters.map((roster) => (
                <DropdownMenuCheckboxItem
                  key={roster.id}
                  checked={viewRosterIds.includes(roster.id)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => toggleViewRoster(roster.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{roster.alias}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{roster.members?.length ?? 0}</span>
                </DropdownMenuCheckboxItem>
              ))}
              {(selectedView?.id || messages.length > 0) && <DropdownMenuSeparator />}
              {selectedView?.id && !viewDirty && (
                <>
                  <DropdownMenuItem onClick={() => openViewDialog("rename")}><Pencil className="mr-2 h-4 w-4" /> Rename view</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void shareSelectedView()}><Share2 className="mr-2 h-4 w-4" /> {viewLinkCopied ? "Link copied" : "Copy share link"}</DropdownMenuItem>
                </>
              )}
              {messages.length > 0 && (
                <DropdownMenuItem disabled={busy} onClick={clearChat}><MessageSquareX className="mr-2 h-4 w-4" /> Clear chat</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeaderPortal>

      <div ref={splitContainerRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn("flex min-w-0 flex-1 flex-col", viewOpen && canShowView && "md:w-[var(--chat-pane-width)] md:flex-none")}
          style={viewOpen && canShowView ? { "--chat-pane-width": `${chatPanePercent}%` } as CSSProperties : undefined}
        >
          {pageError && (
            <div className="mx-auto w-full max-w-5xl px-5 pt-4">
              <Alert variant="destructive"><AlertDescription>{pageError}</AlertDescription></Alert>
            </div>
          )}
          <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-10">
              <div className="space-y-7">
                {messages.length === 0 && !viewResult && !evaluating && (
                  <div className="py-20 text-center">
                    <Image
                      src="/concepts/clashking-wordmark-dark.svg"
                      alt="ClashKing"
                      width={146}
                      height={40}
                      className="mx-auto h-10 w-auto"
                    />
                    <h2 className="mt-4 text-lg font-semibold">What do you want to build?</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Mention a roster with @, then describe the lineup, comparison, or view you need.</p>
                  </div>
                )}
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    playerNames={playerNames}
                    rosters={rosters}
                    active={busy && messages.at(-1)?.id === message.id}
                    activeSince={busy ? requestStartedAt : undefined}
                    onApplyProposal={(proposal) => void applyProposal(proposal)}
                    onDismissProposal={(proposal) => setDismissedProposalKeys((current) => new Set(current).add(proposal.generatedAt))}
                    rosterRevisions={rosterRevisions}
                    dismissedProposalKeys={dismissedProposalKeys}
                  />
                ))}
                {error && <AssistantErrorMessage error={error} />}
                {busy && messages.at(-1)?.role === "user" && <PendingAssistantMessage startedAt={requestStartedAt} />}
              </div>
            </div>
          </div>
          <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-2">
            <div className="mx-auto w-full max-w-4xl">
            {mentionState && mentionOptions.length > 0 && (
              <div className="mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Mention a roster</p>
                {mentionOptions.map((roster, index) => (
                  <button key={roster.id} type="button" className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left", index === activeMentionIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted")} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(roster)}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{roster.alias}</p><p className="truncate text-xs text-muted-foreground">{roster.members?.length ?? 0} members · {roster.clan_name ?? "Family roster"}</p></div>
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card/95 p-2 shadow-lg shadow-black/10 focus-within:border-ring">
              <div className="relative">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2.5 text-sm text-foreground">
                  <div style={{ transform: `translateY(-${promptScrollTop}px)` }}><HighlightedPrompt text={prompt} rosters={rosters} mentionIds={promptMentionIds} playerContexts={playerContexts} /></div>
                </div>
                <Textarea
                  ref={textareaRef}
                  spellCheck={false}
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    const value = event.target.value.toLocaleLowerCase();
                    setChatMentionIds((current) => current.filter((id) => {
                      const roster = rosters.find((item) => item.id === id);
                      return roster ? value.includes(`@${roster.alias}`.toLocaleLowerCase()) : false;
                    }));
                    setPlayerContexts((current) => current.filter((player) => value.includes(playerContextLabel(player).toLocaleLowerCase())));
                    updateMention(event.target.value, event.target.selectionStart);
                  }}
                  onScroll={(event) => setPromptScrollTop(event.currentTarget.scrollTop)}
                  onSelect={(event) => updateMention(event.currentTarget.value, event.currentTarget.selectionStart)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" || event.key === "Delete") {
                      const removal = removeAtomicMention(
                        prompt,
                        event.currentTarget.selectionStart,
                        event.currentTarget.selectionEnd,
                        event.key,
                        playerContexts.map((player) => ({ id: player.playerTag, label: playerContextLabel(player) })),
                      );
                      if (removal) {
                        event.preventDefault();
                        setPrompt(removal.text);
                        setPlayerContexts((current) => current.filter((player) => !removal.removedIds.includes(player.playerTag)));
                        setMentionState(undefined);
                        requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                          textareaRef.current?.setSelectionRange(removal.caret, removal.caret);
                        });
                        return;
                      }
                    }
                    if (mentionState && mentionOptions.length > 0) {
                      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        const direction = event.key === "ArrowDown" ? 1 : -1;
                        setActiveMentionIndex((current) => (current + direction + mentionOptions.length) % mentionOptions.length);
                        return;
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        insertMention(mentionOptions[activeMentionIndex] ?? mentionOptions[0]);
                        return;
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setMentionState(undefined);
                        return;
                      }
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder="Ask ClashKing to build a view or make roster changes, Type @ to mention a roster"
                  className="relative z-10 resize-none border-0 bg-transparent text-transparent caret-foreground shadow-none selection:text-transparent focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="min-w-0 flex-1">
                  {promptMentionIds.length > 0 && (
                    <span className="truncate text-xs text-muted-foreground">{promptMentionIds.length} mentioned roster{promptMentionIds.length === 1 ? "" : "s"}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {showDeveloperContext && <Context
                    usedTokens={latestUsage?.promptTokens ?? 0}
                    maxTokens={ROSTER_ASSISTANT_COMPACTION_THRESHOLD}
                    modelId={ROSTER_ASSISTANT_MODEL}
                    usage={latestUsage ? {
                      inputTokens: latestUsage.promptTokens,
                      inputTokenDetails: {
                        noCacheTokens: Math.max(0, latestUsage.promptTokens - (latestUsage.cachedInputTokens ?? 0)),
                        cacheReadTokens: latestUsage.cachedInputTokens ?? 0,
                        cacheWriteTokens: 0,
                      },
                      outputTokens: latestUsage.completionTokens,
                      outputTokenDetails: {
                        textTokens: Math.max(0, latestUsage.completionTokens - (latestUsage.reasoningTokens ?? 0)),
                        reasoningTokens: latestUsage.reasoningTokens ?? 0,
                      },
                      totalTokens: latestUsage.totalTokens,
                      raw: undefined,
                    } : undefined}
                  >
                    <ContextTrigger className="h-8 gap-1.5 rounded-lg px-2 text-[11px]" aria-label="Conversation context usage" />
                    <ContextContent align="end" side="top" className="min-w-52 divide-y-0 rounded-xl p-3 text-center">
                      {(() => {
                        const usedTokens = latestUsage?.promptTokens ?? 0;
                        const usedPercent = Math.min(100, Math.max(0, Math.round((usedTokens / ROSTER_ASSISTANT_COMPACTION_THRESHOLD) * 100)));
                        const compactNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, notation: "compact" });
                        return (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Context window:</p>
                            <p className="text-sm font-medium text-foreground">{usedPercent}% used ({100 - usedPercent}% left)</p>
                            <p className="text-sm text-foreground">{compactNumber.format(usedTokens)} / {compactNumber.format(ROSTER_ASSISTANT_COMPACTION_THRESHOLD)} tokens used</p>
                          </div>
                        );
                      })()}
                    </ContextContent>
                  </Context>}
                  {busy ? (
                    <Button size="icon" variant="ghost" aria-label="Stop generation" onClick={stop}><Square className="h-4 w-4 fill-current" /></Button>
                  ) : (
                    <Button size="icon" className="rounded-xl" aria-label="Send message" disabled={!prompt.trim() || chatTargetRosterIds.length === 0} onClick={() => void submit()}><Send className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            </div>
            {chatTargetRosterIds.length === 0 && <p className="mt-2 px-2 text-xs text-amber-500">Choose a roster above or mention one with @.</p>}
            </div>
          </div>
        </div>

        {viewOpen && canShowView && (
          <button
            type="button"
            role="separator"
            aria-label="Resize chat and roster view"
            aria-orientation="vertical"
            aria-valuemin={38}
            aria-valuemax={72}
            aria-valuenow={Math.round(chatPanePercent)}
            className="group relative z-30 hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:flex"
            onPointerDown={beginSplitResize}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) setSplitFromClientX(event.clientX);
            }}
            onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
            onPointerCancel={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              setChatPanePercent((current) => Math.min(72, Math.max(38, current + (event.key === "ArrowLeft" ? -2 : 2))));
            }}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80 transition-colors group-hover:bg-primary/60" />
            <span className="relative grid h-9 w-4 place-items-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          </button>
        )}

        {viewOpen && canShowView && (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-border bg-background md:relative md:inset-auto md:z-auto md:min-w-0 md:flex-1 md:border-l-0">
            <div className="scrollbar-custom min-h-0 flex-1 overflow-auto">
              {evaluating ? (
                <div className="flex h-full min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Evaluating view…</div>
              ) : viewResult && selectedView ? (
                <ViewTable
                  key={`${selectedView.id}:${selectedView.updatedAt}:${JSON.stringify(selectedView.spec)}`}
                  name={selectedView.name}
                  result={viewResult}
                  spec={selectedView.spec}
                  onPlayerContext={addPlayerContext}
                />
              ) : null}
            </div>
          </aside>
        )}
      </div>

      <Dialog open={Boolean(viewDialogMode)} onOpenChange={(open) => !open && setViewDialogMode(undefined)}>
        <DialogContent variant="form" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewDialogMode === "rename" ? "Rename view" : selectedView?.id ? "Save view changes" : "Save view"}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void persistView();
            }}
            maxLength={80}
            placeholder="View name"
          />
          <DialogFooter>
            <div className="mr-auto flex items-center gap-1">
              {viewDialogMode === "rename" && selectedView?.id && (
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteViewOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={() => setViewDialogMode(undefined)}>Cancel</Button>
            <Button disabled={!viewName.trim() || !selectedView?.sourceCode.trim() || savingView} onClick={() => void persistView()}>
              {savingView && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteViewOpen} onOpenChange={setDeleteViewOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this view?</AlertDialogTitle>
            <AlertDialogDescription>
              “{selectedView?.name}” will be permanently deleted. Your chat and roster data won’t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingView}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingView}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteSelectedView();
              }}
            >
              {deletingView && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete view
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
