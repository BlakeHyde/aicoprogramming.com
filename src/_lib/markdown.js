import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { instance } from "@viz-js/viz";
import texmath from "markdown-it-texmath";
import temml from "temml";

const viz = await instance();
const markdown = new MarkdownIt({ html: true, typographer: true })
  .use(footnote)
  .use(texmath, { engine: temml, delimiters: ["dollars", "brackets"] });

// Treat only the special block wrappers as HTML, leaving their contents in
// the normal Markdown pipeline (including math, footnotes and code fences).
markdown.block.ruler.before("html_block", "special_block", (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim();
  const opening = line.match(/^(<(aside|clanker-output)(?:\s+[^<>]*?)?>)(.*)$/);
  const closing = /^<\/(?:aside|clanker-output)>$/.test(line);
  if (!opening && !closing) return false;
  const remainder = opening?.[3] || "";
  const endTag = opening ? `</${opening[2]}>` : "";
  // Same-line blocks are useful for short output quotes. Other blocks use
  // standalone opening/closing tags, so paragraph termination stays explicit.
  if (remainder && !remainder.endsWith(endTag)) return false;
  if (silent) return true;
  const token = state.push("html_block", "", 0);
  token.content = `${opening ? opening[1] : line}\n`;
  token.map = [startLine, startLine + 1];
  if (remainder) {
    state.md.block.parse(remainder.slice(0, -endTag.length), state.md, state.env, state.tokens);
    state.push("html_block", "", 0).content = `${endTag}\n`;
  }
  state.line = startLine + 1;
  return true;
}, { alt: ["paragraph", "reference", "blockquote"] });

const defaultFence = markdown.renderer.rules.fence;

function fitGraphvizText(svg, layout) {
  // Viz's WASM build uses substitute font metrics, not the browser's IBM Plex
  // font. Keep each SVG text run within the width reserved during layout.
  const widths = new Map();
  const position = (x, y) => `${Number(x).toFixed(2)},${Number(y).toFixed(2)}`;
  function collect(value) {
    if (!value || typeof value !== "object") return;
    if (value.op === "T" && value.width > 0) {
      widths.set(position(value.pt[0], -value.pt[1]), value.width);
    }
    for (const child of Object.values(value)) collect(child);
  }
  collect(layout);
  return svg.replace(/<text\b[^>]*>/g, (tag) => {
    const x = tag.match(/\bx="([^"]+)"/)?.[1];
    const y = tag.match(/\by="([^"]+)"/)?.[1];
    const width = widths.get(position(x, y));
    return width ? tag.replace(/>$/, ` textLength="${width}" lengthAdjust="spacingAndGlyphs">`) : tag;
  });
}

markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  const [language, ...caption] = token.info.trim().split(/\s+/);
  if (language !== "dot" && language !== "graphviz") {
    return defaultFence(tokens, index, options, env, renderer);
  }

  const prefix = `diagram-${env.slug || "essay"}-${++env.diagramIndex}-`;
  let svg;
  try {
    const result = viz.renderFormats(token.content, ["svg", "json"], {
      engine: "dot",
      graphAttributes: { bgcolor: "#F6F9F9", fontname: "IBM Plex Sans", fontcolor: "#113030" },
      nodeAttributes: { fontname: "IBM Plex Sans", fontcolor: "#113030", color: "#335050" },
      edgeAttributes: { fontname: "IBM Plex Sans", fontcolor: "#113030", color: "#335050" },
    });
    if (result.status !== "success") {
      throw new Error(result.errors.map((error) => error.message).join("; "));
    }
    svg = fitGraphvizText(result.output.svg, JSON.parse(result.output.json));
  } catch (error) {
    throw new Error(`${env.slug || "Markdown"}: invalid Graphviz diagram ${env.diagramIndex}: ${error.message}`, { cause: error });
  }

  // Inline only the SVG, not its XML declaration or document type. Namespace
  // Graphviz's repeated graph/node IDs so multiple diagrams can share a page.
  svg = svg.slice(svg.indexOf("<svg"))
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/\b((?:xlink:)?href)="#([^"]+)"/g, (_, attribute, id) => `${attribute}="#${prefix}${id}"`);
  const label = markdown.utils.escapeHtml(caption.join(" ") || "Graphviz diagram");
  svg = svg.replace("<svg ", `<svg role="img" aria-label="${label}" `);
  return `<div class="graphviz-diagram">${svg}</div>\n`;
};

export function renderMarkdown(content, environment = {}) {
  return markdown.render(content, { ...environment, diagramIndex: 0 });
}
