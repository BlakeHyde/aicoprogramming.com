import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compileTikz, createTikzCompiler, tikzDocument } from "../src/_lib/tikz.js";
import { tikzFontFiles } from "../src/_lib/tikz-fonts.js";
import { inlineSvg } from "../src/_lib/inline-svg.js";
import { renderMarkdown } from "../src/_lib/markdown.js";

const picture = String.raw`\begin{tikzpicture}
  \node (a) {Sans $x^2 + y$};
  \node[right=of a] (b) {\texttt{code}};
  \node[below=of b] (c) {\plexserif Serif};
  \draw[->,decorate,decoration=snake] (a) -- (b);
  \draw[dashed] (b) -- (c);
\end{tikzpicture}`;

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "tikz-test-"));
  const fonts = path.join(directory, "fonts");
  mkdirSync(fonts);
  for (const { filename } of tikzFontFiles) writeFileSync(path.join(fonts, filename), "test font");
  return { directory, fonts, cache: path.join(directory, "cache") };
}

test("TikZ preamble controls all Plex font families, math, colors, and SVG driver", () => {
  const document = tikzDocument("SOURCE", "/fonts");
  assert.match(document, /\\def\\pgfsysdriver\{pgfsys-dvisvgm.def\}/);
  for (const family of ["Sans", "Serif", "Mono", "Math"]) assert.ok(document.includes(`IBMPlex${family}`));
  for (const color of ["335050", "113030", "F6F9F9"]) assert.ok(document.includes(color));
  assert.match(document, /\\usetikzlibrary\{[^}]*positioning[^}]*decorations.pathmorphing/);
  assert.match(document, /\\fontsize\{14\.4bp\}\{20bp\}\\selectfont/);
  assert.ok(document.includes("SOURCE"));
});

test("SVG embedding namespaces glyphs, clipping paths, and references in either quote style", () => {
  const svg = inlineSvg(`<?xml version='1.0'?><svg xmlns='http://www.w3.org/2000/svg'><defs><path id='glyph'/><clipPath id="clip"/></defs><use xlink:href='#glyph' clip-path="url(#clip)"/><use href="#glyph" style="clip-path:url('#clip')"/></svg>`, "unique-", "Diagram");
  assert.match(svg, /role="img" aria-label="Diagram"/);
  assert.match(svg, /id='unique-glyph'/);
  assert.match(svg, /id="unique-clip"/);
  assert.match(svg, /xlink:href='#unique-glyph'/);
  assert.match(svg, /href="#unique-glyph"/);
  assert.match(svg, /url\(#unique-clip\)/);
  assert.match(svg, /url\('#unique-clip'\)/);
  assert.doesNotMatch(svg, /<\?xml/);
});

test("TikZ compilation caches successful SVGs and invalidates on source or tool version changes", () => {
  const { directory, fonts, cache } = fixture();
  const calls = [];
  let version = "1";
  const run = (tool, args, options) => {
    calls.push({ tool, args, options });
    if (args[0] === "--version") return `${tool} ${version}`;
    if (tool === "xelatex") {
      assert.ok(args.includes("-no-shell-escape"));
      assert.equal(options.timeout, 60000);
      assert.match(readFileSync(path.join(options.cwd, "diagram.tex"), "utf8"), /IBMPlexMath/);
      writeFileSync(path.join(options.cwd, "diagram.log"), "Output written on diagram.xdv (1 page, 100 bytes).");
    } else {
      assert.ok(args.includes("--no-fonts"));
      writeFileSync(path.join(options.cwd, "diagram.svg"), "<svg xmlns='http://www.w3.org/2000/svg'><path d='M0 0L1 1'/></svg>");
    }
    return "";
  };
  try {
    const options = { fontDirectory: fonts, cacheDirectory: cache, run };
    const compile = createTikzCompiler(options);
    assert.match(compile("one"), /<svg/);
    compile("one");
    assert.equal(calls.length, 4, "A cache hit runs neither compiler nor converter again");
    compile("two");
    assert.equal(calls.length, 6);
    version = "2";
    createTikzCompiler(options)("one");
    assert.equal(calls.length, 10, "A different toolchain does not reuse stale SVGs");
    for (const call of calls.filter(({ options }) => options.cwd)) {
      assert.equal(existsSync(call.options.cwd), false, "Temporary files are cleaned up");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TikZ failures are not cached and temporary files are removed", () => {
  const { directory, fonts, cache } = fixture();
  let temporary;
  let attempts = 0;
  try {
    const compile = createTikzCompiler({ fontDirectory: fonts, cacheDirectory: cache, run(tool, args, options) {
      if (args[0] === "--version") return tool;
      temporary = options.cwd;
      attempts++;
      throw Object.assign(new Error("exit 1"), { stdout: "Undefined control sequence" });
    } });
    for (let i = 0; i < 2; i++) assert.throws(() => compile("bad"), /Undefined control sequence/);
    assert.equal(attempts, 2);
    assert.equal(existsSync(temporary), false);
    assert.equal(existsSync(cache), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TikZ setup errors explain missing fonts or executables", () => {
  const { directory, fonts, cache } = fixture();
  try {
    assert.throws(() => createTikzCompiler({ fontDirectory: path.join(directory, "missing"), cacheDirectory: cache })(""), /npm run setup:tikz-fonts/);
    assert.throws(() => createTikzCompiler({ fontDirectory: fonts, cacheDirectory: cache, run() { throw new Error("ENOENT"); } })(""), /XeLaTeX and dvisvgm/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("renders real TikZ as themed, outlined, accessible SVG with collision-free IDs", () => {
  const html = renderMarkdown(`\`\`\`tikz Labels & math\n${picture}\n\`\`\`\n\n\`\`\`tikz\n${picture}\n\`\`\``, { slug: "tikz-test" });
  assert.equal((html.match(/<svg /g) || []).length, 2);
  assert.match(html, /class="tikz-diagram"/);
  assert.match(html, /role="img" aria-label="Labels &amp; math"/);
  assert.match(html, /aria-label="TikZ diagram"/);
  assert.match(html, /fill='#113030'/);
  assert.match(html, /stroke='#335050'/);
  assert.match(html, /<path d='M[^']+' fill='none'/, "PGF geometry, not just glyphs, must survive conversion");
  assert.doesNotMatch(html, /<text\b|<\?xml|<!DOCTYPE|language-tikz/);
  const ids = [...html.matchAll(/\bid=['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(ids.some((id) => id.startsWith("tikz-tikz-test-1-")));
  assert.ok(ids.some((id) => id.startsWith("tikz-tikz-test-2-")));
  for (const [, id] of html.matchAll(/(?:xlink:)?href=['"]#([^'"]+)['"]/g)) assert.ok(ids.includes(id), `Missing glyph: ${id}`);
});

test("TikZ smart quotes compile identically to explicitly typographic labels", () => {
  const straight = String.raw`\begin{tikzpicture}\node (raw-id) {It's a "quote" and $f'(x)$};\end{tikzpicture}`;
  const curly = String.raw`\begin{tikzpicture}\node (raw-id) {It’s a “quote” and $f'(x)$};\end{tikzpicture}`;
  assert.equal(compileTikz(straight), compileTikz(curly));
});

test("TikZ works inside special blocks and shares diagram numbering with Graphviz", () => {
  const html = renderMarkdown(`<aside>\n\`\`\`tikz\n${picture}\n\`\`\`\n</aside>\n\n\`\`\`dot\ndigraph { a -> b }\n\`\`\``, { slug: "mixed" });
  assert.match(html, /<aside>\s*<div class="tikz-diagram">/);
  assert.match(html, /tikz-mixed-1-/);
  assert.match(html, /diagram-mixed-2-/);
});

test("invalid TikZ reports the essay and diagram number", () => {
  assert.throws(() => renderMarkdown("```tikz\n\\unknownTikzCommand\n```", { slug: "broken" }), /broken: invalid TikZ diagram 1:[\s\S]*Undefined control sequence/);
});

test("multiple TikZ pages cannot be silently truncated", () => {
  assert.throws(() => renderMarkdown(`\`\`\`tikz\n${picture}\n${picture}\n\`\`\``, { slug: "multiple" }), /multiple: invalid TikZ diagram 1:[\s\S]*exactly one page/);
});
