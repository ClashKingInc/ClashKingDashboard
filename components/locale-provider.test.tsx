import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocale } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider, useAppLocale } from "./locale-provider";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
} from "@/lib/locale-preference";

function LocaleProbe() {
  const locale = useLocale();
  const { setDashboardLocale } = useAppLocale();
  return (
    <>
      <span>{locale}</span>
      <button type="button" onClick={() => setDashboardLocale("nl", "manual")}>
        Dutch
      </button>
    </>
  );
}

describe("LocaleProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    globalThis.history.replaceState({}, "", "/dashboard");
  });

  it("loads the stored Dashboard locale and updates html lang", async () => {
    localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, "fr");
    localStorage.setItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY, "manual");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("fr")).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("fr");
  });

  it("changes the Dashboard locale without changing its URL", async () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dutch" }));

    await waitFor(() => expect(screen.getByText("nl")).toBeInTheDocument());
    expect(localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY)).toBe("nl");
    expect(document.documentElement.lang).toBe("nl");
  });
});
