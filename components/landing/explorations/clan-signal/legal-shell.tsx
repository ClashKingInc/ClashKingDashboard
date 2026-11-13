import { useLandingTheme } from "./use-landing-theme";
import { ClanSignalFooter } from "./footer";
import { ClanSignalHeader } from "./header";
import { type PublicLocale } from "@/lib/locale-preference";
import "../../../../app/explorations/clan-signal.css";


export function ClanSignalPageShell({
  title,
  eyebrow,
  description,
  contentClassName,
  children,
}: Readonly<{
  title: string;
  eyebrow: string;
  description?: string;
  contentClassName: string;
  locale?: PublicLocale;
  children: React.ReactNode;
}>) {
  const { theme: landingTheme, preference: themePreference, changeTheme } = useLandingTheme();

  return (
    <main className="clan-signal ck-home cs-legal-page" data-cs-theme={landingTheme}>
      <div className="ck-sky">
      <ClanSignalHeader landingTheme={landingTheme} themePreference={themePreference} onThemeChange={changeTheme} />

      <section className="cs-legal-hero">
        <div>
          <p className="cs-legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="cs-page-description">{description}</p>}
        </div>
      </section>
      </div>

      <article className={contentClassName} lang={contentClassName === "cs-legal-document" ? "en" : undefined}>{children}</article>
      <ClanSignalFooter />
    </main>
  );
}

export function ClanSignalLegalShell(
  props: Readonly<{
    title: string;
    eyebrow: string;
    locale?: PublicLocale;
    children: React.ReactNode;
  }>,
) {
  return <ClanSignalPageShell {...props} contentClassName="cs-legal-document" />;
}
