import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../_lib/api";

vi.mock("../_lib/api");

const rosterData = {
  roster_id: "r1",
  alias: "Main",
  clan_tag: "#ABC123",
  group_id: null,
  members: [],
};

const clanMembersData = [{ tag: "#ABC123", name: "Player" }];

describe("useRosterDetail – clan member loading", () => {
  it("does not resurrect cleared monthly recurrence or account limits after saving", async () => {
    vi.mocked(api.fetchRoster).mockResolvedValue({ ...rosterData, recurrence_day_of_month: 5, max_accounts_per_user: 2 } as never);
    vi.mocked(api.updateRoster).mockResolvedValue({ ...rosterData } as never);
    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.updateRoster({ recurrence_days: null, recurrence_day_of_month: null, max_accounts_per_user: null }));
    expect(result.current.roster?.recurrence_day_of_month).toBeUndefined();
    expect(result.current.roster?.max_accounts_per_user).toBeUndefined();
  });
  beforeEach(() => {
    vi.mocked(api.fetchRoster).mockResolvedValue(rosterData as never);
    vi.mocked(api.fetchClans).mockResolvedValue([]);
    vi.mocked(api.fetchClanMembers).mockResolvedValue(clanMembersData as never);
    vi.mocked(api.fetchGroups).mockResolvedValue([]);
    vi.mocked(api.fetchChannels).mockResolvedValue([]);
    vi.mocked(api.fetchAutomations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads recorded hit rates without treating zero as missing data", async () => {
    vi.mocked(api.fetchRoster).mockResolvedValue({ ...rosterData, members: [{ tag: "#ONE" }, { tag: "#TWO" }] } as never);
    vi.mocked(api.fetchRosterHitRates).mockResolvedValue(new Map([["#ONE", { rate: 0, attacks: 3 }], ["#TWO", { rate: null, attacks: 0 }]]));
    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));
    await waitFor(() => expect(result.current.roster?.members[0].hitrate).toBe(0));
    expect(result.current.roster?.members[1].hitrate).toBeNull();
    expect(api.fetchRosterHitRates).toHaveBeenCalledWith("r1", "server-1");
  });

  it("keeps the roster usable when metrics fail", async () => {
    vi.mocked(api.fetchRoster).mockResolvedValue({ ...rosterData, members: [{ tag: "#ONE" }] } as never);
    vi.mocked(api.fetchRosterHitRates).mockRejectedValue(new Error("Metrics unavailable"));
    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));
    await waitFor(() => expect(result.current.hitrateError).toBe("Metrics unavailable"));
    expect(result.current.roster?.roster_id).toBe("r1");
    expect(result.current.error).toBeNull();
  });

  it("fetches clan members when roster has a clan_tag", async () => {
    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.fetchClanMembers).toHaveBeenCalledWith("#ABC123");
    await waitFor(() => expect(result.current.clanMembers).toEqual(clanMembersData));
  });

  it("does not fetch clan members when clan_tag is absent", async () => {
    vi.mocked(api.fetchRoster).mockResolvedValue({ ...rosterData, clan_tag: null } as never);

    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.fetchClanMembers).not.toHaveBeenCalled();
    expect(result.current.clanMembers).toEqual([]);
  });

  it("keeps a loaded roster when the auxiliary clan request fails", async () => {
    vi.mocked(api.fetchClans).mockRejectedValue(new Error("Discord unavailable"));

    const { useRosterDetail } = await import("./useRosterDetail");
    const { result } = renderHook(() => useRosterDetail("r1", "server-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roster).toEqual(rosterData);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.clans).toEqual([]));
  });
});
