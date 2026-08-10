import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearRosterBuilderChats, loadRosterBuilderChat, saveRosterBuilderChat } from "./roster-builder-session";

const message = { id: "message-1", role: "user", parts: [{ type: "text", text: "Build this roster" }] } as const;

describe("roster builder chat storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("restores a server conversation for up to 24 hours", () => {
    saveRosterBuilderChat("server-1", [message], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_000 + 24 * 60 * 60 * 1000 - 1)).toEqual([message]);
  });

  it("removes a conversation once it is 24 hours old", () => {
    saveRosterBuilderChat("server-1", [message], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_000 + 24 * 60 * 60 * 1000)).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it("keeps servers isolated and clears every conversation on logout", () => {
    saveRosterBuilderChat("server-1", [message], 1_000);
    saveRosterBuilderChat("server-2", [{ ...message, id: "message-2" }], 1_000);
    localStorage.setItem("unrelated", "keep");

    clearRosterBuilderChats();

    expect(loadRosterBuilderChat("server-1", 1_000)).toEqual([]);
    expect(loadRosterBuilderChat("server-2", 1_000)).toEqual([]);
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("discards malformed storage", () => {
    localStorage.setItem("clashking:roster-builder-chat:server-1", "not json");
    expect(loadRosterBuilderChat("server-1")).toEqual([]);
  });

  it("persists compact tool history while dropping large tool outputs", () => {
    saveRosterBuilderChat("server-1", [{
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "I built the view." },
        { type: "dynamic-tool", toolName: "get_roster_members", toolCallId: "tool-1", state: "output-available", input: {}, output: { rows: ["large"] } },
      ],
    } as never], 1_000);

    expect(loadRosterBuilderChat("server-1", 1_001)).toEqual([{
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "I built the view." },
        { type: "dynamic-tool", toolName: "get_roster_members", toolCallId: "tool-1", state: "output-available", input: {}, output: { completed: true } },
      ],
    }]);
  });

  it("preserves compact request usage metadata", () => {
    const usage = {
      id: "assistant-usage",
      role: "assistant",
      parts: [{ type: "data-usage", data: { promptTokens: 100, completionTokens: 25, totalTokens: 125, durationMs: 900 } }],
    } as never;

    saveRosterBuilderChat("server-1", [usage], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_001)).toEqual([usage]);
  });

  it("preserves OpenAI's encrypted compaction item", () => {
    const compacted = {
      id: "assistant-compaction",
      role: "assistant",
      parts: [{
        type: "custom",
        kind: "openai.compaction",
        providerMetadata: {
          openai: {
            type: "compaction",
            itemId: "cmp_123",
            encryptedContent: "encrypted-state",
          },
        },
      }],
    } as never;

    saveRosterBuilderChat("server-1", [compacted], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_001)).toEqual([compacted]);
  });

  it("preserves structured player mention context", () => {
    const playerMention = {
      id: "user-player",
      role: "user",
      parts: [
        { type: "text", text: "remove TH17 McLean JunioR" },
        { type: "data-playerContexts", data: [{ playerTag: "#P1", rosterId: "roster-1", name: "McLean JunioR", townhall: 17 }] },
      ],
    } as never;

    saveRosterBuilderChat("server-1", [playerMention], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_001)).toEqual([playerMention]);
  });

  it("preserves the transient membership proposal", () => {
    const proposal = {
      id: "assistant-proposal",
      role: "assistant",
      parts: [{
        type: "data-membershipProposal",
        data: {
          type: "membershipProposal",
          generatedAt: "2026-08-02T00:00:00Z",
          expectedRevisions: { "roster-1": 3 },
          counts: { move: 1 },
          changes: [{ action: "move", playerTag: "#P1", fromRosterId: "roster-1", toRosterId: "roster-2", reason: "TH18 to primary" }],
          items: [{ action: "move", playerTag: "#P1", reason: "TH18 to primary" }],
        },
      }],
    } as never;

    saveRosterBuilderChat("server-1", [proposal], 1_000);
    expect(loadRosterBuilderChat("server-1", 1_001)).toEqual([proposal]);
  });

  it("does not throw when browser storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });

    expect(() => saveRosterBuilderChat("server-1", [message], 1_000)).not.toThrow();
  });
});
