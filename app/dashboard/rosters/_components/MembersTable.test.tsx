import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { afterEach, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { MembersTable } from "./MembersTable";

vi.mock("@/components/ui/player-profile-popover", () => ({ PlayerProfilePopover: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/clan-profile-popover", () => ({ ClanProfilePopover: ({ children }: { children: ReactNode }) => <>{children}</> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows a TH warning even without a name column and keeps removal available", () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-04T05:30:00Z"));
  const remove = vi.fn();
  render(<IntlProvider locale="en" messages={messages}><MembersTable
    members={[{ tag: "#2PP", name: "Player", townhall: 15, refreshed_at: "2026-09-04T05:29:00Z" }]}
    minTownhall={16} columns={["tag"]} familyClans={[]} onRemoveMember={remove} t={(key) => key}
  /></IntlProvider>);
  expect(screen.getAllByText("TH 15 is below the roster minimum (TH 16)")).toHaveLength(2);
  const button = screen.getAllByRole("button", { name: "members.actions" })[0]!;
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(remove).toHaveBeenCalledWith("#2PP");
});
