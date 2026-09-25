import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MissingMembersDialog } from "./MissingMembersDialog";

vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const data = {
  query_type: "roster" as const,
  query_value: "roster-1",
  total_rosters_checked: 1,
  results: [{ state: "ok" as const, missing_members: [
    { tag: "#AAA", name: "Alpha", townhall: 16, role: "member", trophies: 0 },
    { tag: "#BBB", name: "Beta", townhall: 16, role: "member", trophies: 0 },
  ] }],
};

it("never bulk-adds hidden members after a search", async () => {
  const onAddMembers = vi.fn().mockResolvedValue(undefined);
  render(<MissingMembersDialog open onOpenChange={vi.fn()} data={data} loading={false} onLoad={vi.fn()} onAddMembers={onAddMembers} />);
  fireEvent.change(screen.getByRole("textbox", { name: "addMembersDialog.searchLabel" }), { target: { value: "Alpha" } });
  fireEvent.click(screen.getByRole("button", { name: "missingMembers.addAll" }));
  await waitFor(() => expect(onAddMembers).toHaveBeenCalledWith(["#AAA"]));

  fireEvent.change(screen.getByRole("textbox", { name: "addMembersDialog.searchLabel" }), { target: { value: "Nobody" } });
  expect(screen.getByText("memberAutocomplete.noResults")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "missingMembers.addAll" })).toBeNull();
  expect(screen.queryByText("missingMembers.allCaughtUp")).toBeNull();
});
