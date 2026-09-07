import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Giveaway } from "@/lib/api/types/server";
import { GiveawaysList } from "./GiveawaysClient";

const disabledGiveaway: Giveaway = {
  id: "giveaway-1",
  serverId: "123",
  prize: "Gold Pass",
  channelId: "456",
  status: "ongoing",
  start: "2026-09-01T00:00:00Z",
  end: "2026-09-02T00:00:00Z",
  winners: 1,
  mentions: [],
  textAboveEmbed: "",
  textInEmbed: "Enter",
  textOnEnd: "Done",
  profilePictureRequired: false,
  cocAccountRequired: false,
  rolesMode: "none",
  roles: [],
  boosters: [],
  entries: [],
  winnersList: [],
  updated: false,
  disabled: true,
  disabled_reason: "Configured channel is unavailable",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("GiveawaysList disabled configuration", () => {
  it("retains the giveaway, displays the reason, and offers edit as repair", () => {
    render(<GiveawaysList
      items={[disabledGiveaway]}
      shownEnded={20}
      tableLoading={false}
      guildId="123"
      t={(key) => key}
      tCommon={(key) => key}
      channelName={() => "giveaways"}
      onOpenEdit={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      onOpenReroll={vi.fn()}
      onOpenEntries={vi.fn()}
      onShowMore={vi.fn()}
    />);

    expect(screen.getByText("Configured channel is unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "table.editGiveaway" })).toBeInTheDocument();
  });
});
