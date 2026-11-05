import { mkdir, access, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { plexRevision, tikzFontDirectory, tikzFontFiles } from "../src/_lib/tikz-fonts.js";

await mkdir(tikzFontDirectory, { recursive: true });
for (const { filename, source } of tikzFontFiles) {
  const destination = path.join(tikzFontDirectory, filename);
  try {
    await access(destination);
    continue;
  } catch {}
  const response = await fetch(`https://raw.githubusercontent.com/IBM/plex/${plexRevision}/${source}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Downloading ${filename}: HTTP ${response.status}`);
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Installed ${filename}`);
}
console.log(`TikZ fonts ready: ${tikzFontDirectory}`);
