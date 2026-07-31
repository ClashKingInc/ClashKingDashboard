import { renderHook, waitFor } from "@testing-library/react";
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
  beforeEach(() => {
    vi.mocked(api.fetchRoster).mockResolvedValue(rosterData as never);
    vi.mocked(api.fetchClans).mockResolvedValue([]);
    vi.mocked(api.fetchClanMembers).mockResolvedValue(clanMembersData as never);
    vi.mocked(api.fetchGroups).mockResolvedValue([]);
    vi.mocked(api.fetchCategories).mockResolvedValue([]);
    vi.mocked(api.fetchChannels).mockResolvedValue([]);
    vi.mocked(api.fetchAutomations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
});
