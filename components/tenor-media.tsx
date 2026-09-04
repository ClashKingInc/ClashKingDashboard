import { endpoints } from "@clashking/api-contracts";
import { useQuery } from "@tanstack/react-query";

import Image from "@/components/app-image";
import { executeSharedEndpoint } from "@/lib/api/shared-client";

interface TenorMediaProps {
  readonly alt: string;
  readonly className?: string;
  readonly url: string;
}

export function TenorMedia({ alt, className, url }: TenorMediaProps) {
  const media = useQuery({
    queryKey: ["tenor-media", url],
    queryFn: ({ signal }) => executeSharedEndpoint(
      endpoints.tenorMedia,
      { body: { url }, path: {}, query: {} },
      { signal },
    ),
    staleTime: 24 * 60 * 60 * 1_000,
  });

  if (!media.data) return null;

  return (
    <Image
      src={media.data.media_url}
      alt={alt}
      width={media.data.width || 640}
      height={media.data.height || 360}
      unoptimized
      className={className}
    />
  );
}
