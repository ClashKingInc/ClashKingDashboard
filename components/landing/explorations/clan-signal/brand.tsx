import Image from "next/image";

export function ClanSignalWordmark({ priority = false }: Readonly<{ priority?: boolean }>) {
  return (
    <span className="cs-wordmark-wrap">
      <Image
        src="/concepts/clashking-wordmark-light.svg"
        alt="ClashKing"
        width={190}
        height={52}
        priority={priority}
        loading={priority ? "eager" : undefined}
        className="cs-wordmark cs-wordmark-day"
        unoptimized
      />
      <Image
        src="/concepts/clashking-wordmark-dark.svg"
        alt=""
        width={190}
        height={52}
        className="cs-wordmark cs-wordmark-sunset"
        unoptimized
      />
    </span>
  );
}
