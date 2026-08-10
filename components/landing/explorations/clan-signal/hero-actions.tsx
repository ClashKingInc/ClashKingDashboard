import Image from "next/image";

const IOS_URL = "https://testflight.apple.com/join/6Q8dfnMX";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.clashking.clashkingapp";
const DISCORD_URL = "https://invite.clashk.ing/";

type Platform = "ios" | "android" | "app" | "discord";

function PlatformMark({ platform }: Readonly<{ platform: Platform }>) {
  if (platform === "ios") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7 12.8c0-2 1.7-3 1.8-3.1a4 4 0 0 0-3.1-1.7c-1.3-.2-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1 1.6 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.7-2.1.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.7-1.1-2.7-3.9Zm-2.2-6.2c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z" /></svg>;
  }

  if (platform === "android") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.2 3.3 9.2 8.7-9.2 8.7c-.4-.4-.7-1-.7-1.8V5.1c0-.8.3-1.4.7-1.8Zm10.1 9.6 2.4 2.3-9.4 5.3 7-7.6Zm3.6-3.7 2.3 1.3c1 .6 1 2.4 0 3l-2.4 1.3-2.6-2.8 2.7-2.8ZM7.3 3.5l9.4 5.3-2.4 2.3-7-7.6Z" /></svg>;
  }

  if (platform === "discord") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 5.3A16.3 16.3 0 0 0 15 4.1l-.5 1a14.7 14.7 0 0 0-5 0l-.5-1a16.7 16.7 0 0 0-4 1.2C2.5 9 1.8 12.5 2.1 16a16 16 0 0 0 4.8 2.5l1.2-1.7c-.7-.3-1.3-.6-1.9-1l.5-.4a11.5 11.5 0 0 0 10.6 0l.5.4c-.6.4-1.2.7-1.9 1l1.2 1.7a16 16 0 0 0 4.8-2.5c.4-4.1-.8-7.6-3-10.7ZM8.7 14.2c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.8C3 3.8 3.8 3 4.8 3h5.4v8H3V4.8Zm10.8-1.8h5.4c1 0 1.8.8 1.8 1.8V11h-7.2V3ZM3 14h7.2v7H4.8c-1 0-1.8-.8-1.8-1.8V14Zm10.8 0H21v5.2c0 1-.8 1.8-1.8 1.8h-5.4v-7Z" /></svg>;
}

function ArrowAsset() {
  return (
    <Image
      src="/concepts/local/assets/icons/Icon_DC_ArrowRight.png"
      alt=""
      width={12}
      height={17}
      className="cs-arrow"
      unoptimized
    />
  );
}

export function HeroActions({
  mobileAppLabel,
  iosLabel,
  androidLabel,
  discordLabel,
}: Readonly<{
  mobileAppLabel: string;
  iosLabel: string;
  androidLabel: string;
  discordLabel: string;
}>) {
  return (
    <>
      <div className="cs-actions cs-hero-store-actions cs-hero-actions-desktop">
        <a className="cs-store-link is-primary" href="#app"><PlatformMark platform="app" /> {mobileAppLabel} <ArrowAsset /></a>
        <a className="cs-store-link" href={DISCORD_URL} target="_blank" rel="noreferrer"><PlatformMark platform="discord" /> {discordLabel} <ArrowAsset /></a>
      </div>
      <div className="cs-actions cs-hero-store-actions cs-hero-actions-mobile">
        <a className="cs-store-link cs-mobile-app-link is-ios is-primary" href={IOS_URL} target="_blank" rel="noreferrer"><PlatformMark platform="ios" /> {iosLabel} <ArrowAsset /></a>
        <a className="cs-store-link cs-mobile-app-link is-android is-primary" href={ANDROID_URL} target="_blank" rel="noreferrer"><PlatformMark platform="android" /> {androidLabel} <ArrowAsset /></a>
        <a className="cs-store-link cs-mobile-app-link is-fallback is-primary" href="#app"><PlatformMark platform="app" /> {mobileAppLabel} <ArrowAsset /></a>
        <a className="cs-store-link" href={DISCORD_URL} target="_blank" rel="noreferrer"><PlatformMark platform="discord" /> {discordLabel} <ArrowAsset /></a>
      </div>
    </>
  );
}
