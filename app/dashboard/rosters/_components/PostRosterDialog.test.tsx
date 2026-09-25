import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostRosterDialog } from "./PostRosterDialog";

const mocks = vi.hoisted(() => ({ executeSharedApiResult: vi.fn() }));
vi.mock("@/lib/api/shared-client", () => ({ executeSharedApiResult: mocks.executeSharedApiResult }));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, disabled, onValueChange }: {
    children: React.ReactNode; value: string; disabled?: boolean; onValueChange: (value: string) => void;
  }) => <select value={value} disabled={disabled} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

it("holds an uncertain publication until the operator checks the channel", async () => {
  mocks.executeSharedApiResult.mockResolvedValueOnce({ status: 409, error: "Pending", errorData: { reason: "publication_pending" } })
    .mockResolvedValueOnce({ status: 200, data: { messageId: "123456789012345678" } });
  render(<PostRosterDialog serverId="111111111111111111" rosterId="roster-1" channels={[{ id: "222222222222222222", name: "rosters", type: "text" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "automations.actions.post" }));
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "222222222222222222" } });
  fireEvent.click(screen.getAllByRole("button", { name: "automations.actions.post" })[1]);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Check the destination channel"));
  expect(screen.getAllByRole("combobox")[0]).toBeDisabled();
  expect(screen.getAllByRole("combobox")[1]).toBeDisabled();
  expect(screen.getAllByRole("button", { name: "automations.actions.post" })[1]).toBeDisabled();
  expect(mocks.executeSharedApiResult).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getAllByRole("button", { name: "automations.actions.post" })[0]);
  expect(screen.getAllByRole("button", { name: "automations.actions.post" })[1]).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /I checked the channel/ }));
  expect(screen.getAllByRole("combobox")[0]).toBeEnabled();
  fireEvent.click(screen.getAllByRole("button", { name: "automations.actions.post" })[1]);
  await waitFor(() => expect(mocks.executeSharedApiResult).toHaveBeenCalledTimes(2));
  expect(mocks.executeSharedApiResult.mock.calls[0][1].body.nonce).not.toBe(mocks.executeSharedApiResult.mock.calls[1][1].body.nonce);
});
