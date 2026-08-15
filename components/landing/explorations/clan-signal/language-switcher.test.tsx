import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLocale } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useAppLocale } from "@/components/locale-provider";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
} from "@/lib/locale-preference";
import { LandingLanguageSwitcher } from "./language-switcher";

const { navigationMock, pushMock } = vi.hoisted(() => ({
  navigationMock: { pathname: "/" },
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
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
    navigationMock.pathname = "/";
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

    const browserLanguageOption = await screen.findByRole("menuitem", {
      name: /Browser Language|Langue du navigateur/,
    });
    expect(browserLanguageOption).toBeInTheDocument();
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

  it("keeps browser-language selection on a legal page and hides unsupported locales", async () => {
    navigationMock.pathname = "/fr/privacy";
    globalThis.history.replaceState({}, "", "/fr/privacy");
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      value: ["de-DE"],
    });
    renderSwitcher();

    openLanguageMenu();

    const browserLanguageOption = await screen.findByRole("menuitem", {
      name: /Browser Language|Langue du navigateur/,
    });
    expect(browserLanguageOption).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Deutsch/ })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Français/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Nederlands/ })).toBeInTheDocument();

    fireEvent.click(browserLanguageOption);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/privacy"));
    expect(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY)).toBe("browser");
  });
});
