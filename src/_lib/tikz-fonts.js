import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the upstream font files independently of the host's installed fonts.
export const plexRevision = "48e8676114c04f29033b4b53da4ec579f8846297";
export const tikzCacheDirectory = fileURLToPath(new URL("../../.cache/tikz/", import.meta.url));
export const tikzFontDirectory = path.join(tikzCacheDirectory, "fonts", plexRevision);
export const tikzFontFiles = [
  ...["Sans", "Serif", "Mono"].flatMap((family) =>
    ["Regular", "Italic", "Bold", "BoldItalic"].map((weight) => ({
      filename: `IBMPlex${family}-${weight}.otf`,
      source: `packages/plex-${family.toLowerCase()}/fonts/complete/otf/IBMPlex${family}-${weight}.otf`,
    }))),
  { filename: "IBMPlexMath-Regular.otf", source: "packages/plex-math/fonts/complete/otf/IBMPlexMath-Regular.otf" },
  ...["sans", "serif", "mono", "math"].map((family) => ({
    filename: `LICENSE-${family}.txt`, source: `packages/plex-${family}/LICENSE.txt`,
  })),
];
