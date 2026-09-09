import { clanBadgeSources } from "@/lib/clash-asset-urls";
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";

type NativeImageProps = Omit<ComponentPropsWithoutRef<"img">, "height" | "src" | "width">;

export type AppImageProps = NativeImageProps & {
  readonly alt: string;
  readonly src: string;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly fill?: boolean;
  readonly priority?: boolean;
  readonly unoptimized?: boolean;
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

const AppImage = forwardRef<HTMLImageElement, AppImageProps>(function AppImage(
  { alt, fill = false, height, priority = false, src, style, unoptimized: _unoptimized, width, ...props },
  ref,
) {
  const badge = clanBadgeSources(src);
  const image = (
    <img
      {...props}
      alt={alt}
      ref={ref}
      src={badge?.png ?? src}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={fill ? { ...fillStyle, ...style } : style}
      fetchPriority={priority ? "high" : props.fetchPriority}
    />
  );
  return badge ? <picture style={{ display: "contents" }}><source type="image/avif" srcSet={badge.avif} />{image}</picture> : image;
});

export default AppImage;
