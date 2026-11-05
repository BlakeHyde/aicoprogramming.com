import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { plexRevision, tikzCacheDirectory, tikzFontDirectory, tikzFontFiles } from "./tikz-fonts.js";
import { smartTikzLabels } from "./typography.js";

export function tikzDocument(source, fontDirectory = tikzFontDirectory) {
  const fonts = fontDirectory.replaceAll(path.sep, "/") + "/";
  const family = (name) => `{IBMPlex${name}}[Path={${fonts}},Extension=.otf,UprightFont=*-Regular,ItalicFont=*-Italic,BoldFont=*-Bold,BoldItalicFont=*-BoldItalic]`;
  return String.raw`\def\pgfsysdriver{pgfsys-dvisvgm.def}
\documentclass[tikz,border=2pt]{standalone}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont${family("Sans")}
\setsansfont${family("Sans")}
\setmonofont${family("Mono")}
\newfontfamily\plexserif${family("Serif")}
\setmathfont{IBMPlexMath-Regular.otf}[Path={${fonts}}]
\usetikzlibrary{arrows.meta,calc,positioning,fit,backgrounds,shapes,decorations.pathmorphing,decorations.pathreplacing,decorations.markings,matrix,intersections,patterns,automata,angles,quotes}
\definecolor{siteInk}{HTML}{335050}
\definecolor{siteText}{HTML}{113030}
\definecolor{siteBackground}{HTML}{F6F9F9}
\color{siteText}
\tikzset{every picture/.style={draw=siteInk,text=siteText},every node/.style={font=\sffamily}}
\begin{document}
% 14.4bp = 19.2 CSS pixels, matching the default 1.2rem body text.
\fontsize{14.4bp}{20bp}\selectfont
${source}
\end{document}
`;
}

// TeX sources are trusted repository content, not untrusted visitor input.
// Disabling shell escape and limiting execution time is not a TeX sandbox.
export function createTikzCompiler({
  cacheDirectory = path.join(tikzCacheDirectory, "svg"),
  fontDirectory = tikzFontDirectory,
  run = execFileSync,
} = {}) {
  let versions;
  return (source) => {
    if (!versions) {
      for (const { filename } of tikzFontFiles.filter(({ filename }) => filename.endsWith(".otf"))) {
        if (!existsSync(path.join(fontDirectory, filename))) {
          throw new Error("TikZ fonts are missing; run npm run setup:tikz-fonts first.");
        }
      }
      try {
        versions = ["xelatex", "dvisvgm"].map((tool) =>
          run(tool, ["--version"], { encoding: "utf8", timeout: 10000 }).trim()).join("\n");
      } catch (error) {
        throw new Error("TikZ requires XeLaTeX and dvisvgm. See README.md for setup instructions.", { cause: error });
      }
    }
    const document = tikzDocument(smartTikzLabels(source), fontDirectory);
    const key = createHash("sha256").update(JSON.stringify({ pipeline: 1, document, plexRevision, versions })).digest("hex");
    const cached = path.join(cacheDirectory, `${key}.svg`);
    if (existsSync(cached)) return readFileSync(cached, "utf8");

    const temporary = mkdtempSync(path.join(tmpdir(), "essay-tikz-"));
    try {
      writeFileSync(path.join(temporary, "diagram.tex"), document);
      const options = { cwd: temporary, encoding: "utf8", stdio: "pipe", timeout: 60000, maxBuffer: 4 * 1024 * 1024 };
      run("xelatex", ["-no-pdf", "-no-shell-escape", "-halt-on-error", "-interaction=nonstopmode", "-file-line-error", "diagram.tex"], options);
      const log = readFileSync(path.join(temporary, "diagram.log"), "utf8");
      const pages = log.match(/Output written on [^\n]*\((\d+) pages?/);
      if (!pages || Number(pages[1]) !== 1) throw new Error("Each TikZ fence must produce exactly one page.");
      run("dvisvgm", ["--no-fonts", "--exact-bbox", "--page=1", "--output=diagram.svg", "diagram.xdv"], options);
      const output = readFileSync(path.join(temporary, "diagram.svg"), "utf8");
      if (!/<svg\b/.test(output) || /<text\b/.test(output)) {
        throw new Error("TikZ conversion did not produce an outlined SVG.");
      }
      // Publish complete cache entries only; parallel builds may share the cache.
      mkdirSync(cacheDirectory, { recursive: true });
      const staging = `${cached}.${process.pid}.${path.basename(temporary)}.tmp`;
      try {
        writeFileSync(staging, output);
        renameSync(staging, cached);
      } finally {
        rmSync(staging, { force: true });
      }
      return output;
    } catch (error) {
      const details = [error.stdout, error.stderr].filter(Boolean).join("\n").trim().split("\n").slice(-35).join("\n");
      throw new Error(`TikZ compilation failed: ${error.message}${details ? `\n${details}` : ""}`, { cause: error });
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  };
}

export const compileTikz = createTikzCompiler();
