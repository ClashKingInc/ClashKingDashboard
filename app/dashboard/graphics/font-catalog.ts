export interface EditorFont {
  family: string;
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  google: boolean;
}

export const EDITOR_FONTS: readonly EditorFont[] = [
  { family: "Arial", category: "sans-serif", google: false },
  { family: "Georgia", category: "serif", google: false },
  { family: "Impact", category: "display", google: false },
  { family: "Roboto", category: "sans-serif", google: true },
  { family: "Open Sans", category: "sans-serif", google: true },
  { family: "Montserrat", category: "sans-serif", google: true },
  { family: "Poppins", category: "sans-serif", google: true },
  { family: "Inter", category: "sans-serif", google: true },
  { family: "Lato", category: "sans-serif", google: true },
  { family: "Nunito", category: "sans-serif", google: true },
  { family: "Oswald", category: "display", google: true },
  { family: "Bebas Neue", category: "display", google: true },
  { family: "Anton", category: "display", google: true },
  { family: "Archivo Black", category: "display", google: true },
  { family: "Bungee", category: "display", google: true },
  { family: "Righteous", category: "display", google: true },
  { family: "Playfair Display", category: "serif", google: true },
  { family: "Merriweather", category: "serif", google: true },
  { family: "Lora", category: "serif", google: true },
  { family: "Cinzel", category: "serif", google: true },
  { family: "Roboto Slab", category: "serif", google: true },
  { family: "Caveat", category: "handwriting", google: true },
  { family: "Dancing Script", category: "handwriting", google: true },
  { family: "Pacifico", category: "handwriting", google: true },
  { family: "Permanent Marker", category: "handwriting", google: true },
  { family: "Press Start 2P", category: "display", google: true },
  { family: "Roboto Mono", category: "monospace", google: true },
  { family: "Space Mono", category: "monospace", google: true },
] as const;

export function editorFontStack(family: string): string {
  const font = EDITOR_FONTS.find((candidate) => candidate.family === family);
  const fallback = font?.category ?? "sans-serif";
  return `'${family.replaceAll("'", "")}', ${fallback}`;
}

export function googleFontStylesheetUrl(family: string): string | null {
  const font = EDITOR_FONTS.find((candidate) => candidate.family === family && candidate.google);
  if (!font) return null;
  const encodedFamily = encodeURIComponent(font.family).replaceAll("%20", "+");
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
}

