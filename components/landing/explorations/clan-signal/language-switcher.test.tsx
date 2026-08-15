import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocale } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useAppLocale } from "@/components/locale-provider";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
} from "@/lib/locale-preference";
import { LandingLanguageSwitcher } from "./language-switcher";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock }),
}));

function LocaleProbe() {
  const locale = useLocale();
  const { mode } = useAppLocale();
  return <span data-testid="locale-probe">{locale}:{mode}</span>;
}

function renderSwitcher() {
  return render(
    <LocaleProvider>
      <LandingLanguageSwitcher
        label="Language"
        appearanceLabel="Appearance"
        dayLabel="Day"
        sunsetLabel="Sunset"
        initialTheme="day"
      />
      <LocaleProbe />
    </LocaleProvider>,
  );
}

function openLanguageMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Language" }), {
    button: 0,
    ctrlKey: false,
  });
}

describe("LandingLanguageSwitcher", () => {
  beforeEach(() => {
    pushMock.mockClear();
    localStorage.clear();
    globalThis.history.replaceState({}, "", "/");
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      value: ["en-US"],
    });
  });

  it("offers browser detection and every translated language", async () => {
    renderSwitcher();

    openLanguageMenu();

    expect(await screen.findByRole("menuitem", { name: /Browser Language/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Afrikaans/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Deutsch/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Polski/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /中文/ })).toBeInTheDocument();
  });

  it("changes the landing page language without requiring a localized route", async () => {
    renderSwitcher();

    openLanguageMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Deutsch/ }));

    await waitFor(() => expect(screen.getByTestId("locale-probe")).toHaveTextContent("de:manual"));
    expect(localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY)).toBe("de");
    expect(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY)).toBe("manual");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("applies the current browser language from the landing menu", async () => {
    renderSwitcher();
    await waitFor(() => expect(screen.getByTestId("locale-probe")).toHaveTextContent("en:browser"));

    Object.defineProperty(navigator, "languages", {
      configurable: true,
      value: ["fr-CA"],
    });
    openLanguageMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Browser Language/ }));

    await waitFor(() => expect(screen.getByTestId("locale-probe")).toHaveTextContent("fr:browser"));
    expect(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY)).toBe("browser");
  });
});
