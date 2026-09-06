import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AppImage from "./app-image";

describe("badge image format selection", () => {
  it("offers AVIF with a PNG fallback and preserves image dimensions", () => {
    const html = renderToStaticMarkup(<AppImage src="https://badges.clashk.ing/P0Y" alt="Clan" width={48} height={48} />);
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('srcSet="https://badges.clashk.ing/P0Y.avif?size=128"');
    expect(html).toContain('src="https://badges.clashk.ing/P0Y.png?size=128"');
    expect(html).toContain('width="48"');
  });
  it("keeps other artwork as a plain image", () => {
    expect(renderToStaticMarkup(<AppImage src="/icon.png" alt="Icon" />)).not.toContain("<picture");
  });
});
