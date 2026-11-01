import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { instance } from "@viz-js/viz";

const viz = await instance();
const markdown = new MarkdownIt({ html: true, typographer: true }).use(footnote);
const defaultFence = markdown.renderer.rules.fence;

markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  const [language, ...caption] = token.info.trim().split(/\s+/);
  if (language !== "dot" && language !== "graphviz") {
    return defaultFence(tokens, index, options, env, renderer);
  }

  const prefix = `diagram-${env.slug || "essay"}-${++env.diagramIndex}-`;
  let svg;
  try {
    svg = viz.renderString(token.content, {
      format: "svg",
      engine: "dot",
      graphAttributes: { bgcolor: "#F6F9F9", fontname: "IBM Plex Sans", fontcolor: "#113030" },
      nodeAttributes: { fontname: "IBM Plex Sans", fontcolor: "#113030", color: "#335050" },
      edgeAttributes: { fontname: "IBM Plex Sans", fontcolor: "#113030", color: "#335050" },
    });
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
