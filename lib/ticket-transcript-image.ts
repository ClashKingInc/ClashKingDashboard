/** Identify raster bytes, never trust a Discord filename or declared MIME type. */
export function transcriptRasterMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  const text = new TextDecoder().decode(bytes.slice(0,12));
  if (bytes.length >= 10 && /^(GIF87a|GIF89a)/.test(text)) return "image/gif";
  if (bytes.length >= 16 && text.startsWith("RIFF") && text.slice(8,12) === "WEBP") return "image/webp";
  return null;
}
