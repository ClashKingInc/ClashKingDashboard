import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGiveawayEntries } from "./useGiveawayEntries";

const mockGiveaway = {
  id: "giveaway-1",
  serverId: "guild-1",
  prize: "100 gems",
  status: "ongoing" as const,
  entryCount: 42,
  channelId: "chan-1",
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-02T00:00:00Z",
  winners: 1,
  mentions: [],
  textAboveEmbed: "",
  textInEmbed: "",
  textOnEnd: "",
  imageUrl: null,
  profilePictureRequired: false,
  cocAccountRequired: false,
  rolesMode: "none" as const,
  roles: [],
  boosters: [],
  updated: false,
  messageId: null,
  winnersList: [],
  eventPending: null,
  eventPendingAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const entriesData = {
  giveawayId: "giveaway-1",
  serverId: "guild-1",
  totalEntries: 10,
  uniqueUsers: 8,
  entrants: [{ userId: "u1", entries: 2, winChance: 0.2 }],
};

describe("useGiveawayEntries", () => {
  const onError = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens dialog and fetches entries on success", async () => {
    const fetchEntries = vi.fn().mockResolvedValue({ data: entriesData });

    const { result } = renderHook(() =>
      useGiveawayEntries("guild-1", fetchEntries, onError)
    );

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.openDialog(mockGiveaway);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.target).toEqual(mockGiveaway);
    expect(result.current.data).toEqual(entriesData);
    expect(result.current.loading).toBe(false);
    expect(fetchEntries).toHaveBeenCalledWith("guild-1", "giveaway-1");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError and closes dialog when API returns error field", async () => {
    const fetchEntries = vi.fn().mockResolvedValue({ error: "Not found" });

    const { result } = renderHook(() =>
      useGiveawayEntries("guild-1", fetchEntries, onError)
    );

    await act(async () => {
      await result.current.openDialog(mockGiveaway);
    });

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.data).toBeNull();
    expect(onError).toHaveBeenCalledWith("Not found");
  });

  it("calls onError and closes dialog when fetch throws", async () => {
    const fetchEntries = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useGiveawayEntries("guild-1", fetchEntries, onError)
    );

    await act(async () => {
      await result.current.openDialog(mockGiveaway);
    });

    expect(result.current.dialogOpen).toBe(false);
    expect(onError).toHaveBeenCalledWith("Network error");
    expect(result.current.loading).toBe(false);
  });

  it("uses a fallback message when a non-Error is thrown", async () => {
    const fetchEntries = vi.fn().mockRejectedValue("string error");

    const { result } = renderHook(() =>
      useGiveawayEntries("guild-1", fetchEntries, onError)
    );

    await act(async () => {
      await result.current.openDialog(mockGiveaway);
    });

    expect(onError).toHaveBeenCalledWith("Failed to load entries");
  });

  it("closeDialog resets all state", async () => {
    const fetchEntries = vi.fn().mockResolvedValue({ data: entriesData });

    const { result } = renderHook(() =>
      useGiveawayEntries("guild-1", fetchEntries, onError)
    );

    await act(async () => {
      await result.current.openDialog(mockGiveaway);
    });

    expect(result.current.dialogOpen).toBe(true);

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.target).toBeNull();
    expect(result.current.data).toBeNull();
  });
});
