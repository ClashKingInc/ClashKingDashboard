import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocale } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider, useAppLocale } from "./locale-provider";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
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
      <button type="button" onClick={() => setDashboardLocale("ar", "manual")}>
        Arabic
      </button>
      {SUPPORTED_LOCALES.map((nextLocale) => (
        <button
          key={nextLocale}
          type="button"
          onClick={() => setDashboardLocale(nextLocale, "manual")}
        >
          Locale {nextLocale}
        </button>
      ))}
    </>
  );
}

describe("LocaleProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    globalThis.history.replaceState({}, "", "/dashboard");
  });

  it("loads every Dashboard locale independently of the URL and sets RTL direction", async () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    for (const locale of SUPPORTED_LOCALES) {
      fireEvent.click(screen.getByRole("button", { name: `Locale ${locale}` }));

      await waitFor(() => expect(screen.getByText(locale)).toBeInTheDocument());
      expect(globalThis.location.pathname).toBe("/dashboard");
      expect(document.documentElement.lang).toBe(locale);
      expect(document.documentElement.dir).toBe(
        ["ar", "he", "ur"].includes(locale) ? "rtl" : "ltr",
      );
    }
  }, 20_000);

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

  it("keeps the newest locale when dynamic catalog loads overlap", async () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Locale ar" }));
    fireEvent.click(screen.getByRole("button", { name: "Locale nl" }));

    await waitFor(() => expect(screen.getByText("nl")).toBeInTheDocument());
    expect(localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY)).toBe("nl");
    expect(document.documentElement.lang).toBe("nl");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("keeps the English concept route isolated from a stored Dashboard locale", async () => {
    localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, "ar");
    localStorage.setItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY, "manual");
    globalThis.history.replaceState({}, "", "/concepts/clan-signal");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("en")).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
