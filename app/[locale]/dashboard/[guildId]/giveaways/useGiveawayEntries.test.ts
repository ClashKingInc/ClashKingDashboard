import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGiveawayEntries } from "./useGiveawayEntries";

const mockGiveaway = {
  id: "giveaway-1",
  prize: "100 gems",
  status: "ongoing" as const,
  entry_count: 42,
  channel_id: "chan-1",
  start_time: "2024-01-01T00:00:00Z",
  end_time: "2024-01-02T00:00:00Z",
  winners: 1,
  mentions: [],
  profile_picture_required: false,
  coc_account_required: false,
  roles_mode: "none" as const,
  roles: [],
  boosters: [],
};

const entriesData = {
  total_entries: 10,
  unique_users: 8,
  entrants: [{ user_id: "u1", entries: 2, win_chance: 0.2 }],
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
