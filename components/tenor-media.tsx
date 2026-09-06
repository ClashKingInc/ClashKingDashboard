import Image from "@/components/app-image";

interface TenorMediaProps {
  readonly alt: string;
  readonly className?: string;
  readonly url: string;
}

export function TenorMedia({ alt, className, url }: TenorMediaProps) {
  return (
    <Image
      src={`/api/tenor-media?url=${encodeURIComponent(url)}`}
      alt={alt}
      width={640}
      height={360}
      unoptimized
      className={className}
    />
  );
}
