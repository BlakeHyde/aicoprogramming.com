import MarkdownIt from "markdown-it";

// Plain text, not Markdown: title punctuation must not consume literal markup.
const typography = new MarkdownIt("zero", { typographer: true }).enable("smartquotes");
export function smartQuotes(value) {
  return typography.parseInline(String(value), {})[0].children.map((token) => token.content).join("");
}

export function smartSvgLabels(svg) {
  const decode = (text) => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === "#") return String.fromCodePoint(entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity];
  });
  const escape = (text) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
  return svg.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (_, opening, text, closing) => `${opening}${escape(smartQuotes(decode(text)))}${closing}`);
}

// Find a balanced TeX group without treating escaped delimiters or comments as syntax.
function groupEnd(source, start, opening, closing) {
  let depth = 1;
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === "\\") { index++; continue; }
    if (source[index] === "%") {
      const newline = source.indexOf("\n", index);
      if (newline < 0) return source.length;
      index = newline;
      continue;
    }
    if (source[index] === opening) depth++;
    if (source[index] === closing && --depth === 0) return index + 1;
  }
  return source.length;
}

function smartTexText(text) {
  const protectedParts = [];
  const protect = (value) => {
    const marker = `\uE000${protectedParts.length}\uE001`;
    protectedParts.push(value);
    return marker;
  };
  // Keep math primes, control sequences, comments, URLs and code-like labels literal.
  const masked = text.replace(/\$\$[\s\S]*?\$\$|\$(?:\\.|[^$])*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|%[^\n]*|\\verb\*?([^\w\s])[^\n]*?\1|\\[a-zA-Z@]+\*?|\\./g, (part) => {
    if (/^\\(?:url|path|href|ref|label|cite|texttt|mathtt|includegraphics)\*?$/.test(part)) {
      // Mask the argument separately below; its braces may be nested.
      return part;
    }
    return protect(part);
  });
  // Command arguments containing programmatic values are not prose. Work from
  // right to left so replacing balanced groups does not invalidate offsets.
  let prose = masked;
  const commands = [...prose.matchAll(/\\(?:url|path|href|ref|label|cite|texttt|mathtt|includegraphics)\*?\s*(?:\[[^\]]*\]\s*)?\{/g)];
  for (const match of commands.reverse()) {
    const start = match.index;
    const opening = start + match[0].length - 1;
    const end = groupEnd(prose, opening, "{", "}");
    prose = prose.slice(0, start) + protect(prose.slice(start, end)) + prose.slice(end);
  }
  prose = smartQuotes(prose.replace(/``/g, "“").replace(/''/g, "”"));
  // Protected values may contain markers for already-protected math/macros.
  for (let i = protectedParts.length - 1; i >= 0; i--) prose = prose.replaceAll(`\uE000${i}\uE001`, protectedParts[i]);
  return prose;
}

function smartTikzOptions(options) {
  const entries = [];
  let start = 0;
  for (let index = 0; index < options.length; index++) {
    const character = options[index];
    if (character === "\\") { index++; continue; }
    if (character === "{" || character === "[" || character === "(") {
      index = groupEnd(options, index, character, { "{": "}", "[": "]", "(": ")" }[character]) - 1;
    } else if (character === '"') {
      // The quotes library uses literal double quotes as option delimiters.
      while (++index < options.length) {
        if (options[index] === "\\") index++;
        else if (options[index] === '"') break;
      }
    } else if (character === ",") {
      entries.push(options.slice(start, index));
      start = index + 1;
    }
  }
  entries.push(options.slice(start));
  return entries.map((entry) => {
    const quoted = entry.match(/^(\s*)"((?:\\.|[^"\\])*)"([\s\S]*)$/);
    if (quoted) return `${quoted[1]}"${smartTexText(quoted[2])}"${quoted[3]}`;
    const label = entry.match(/^(\s*(?:label|pin)\s*=\s*)([\s\S]*)$/);
    if (!label) return entry;
    // Optional formatting keys precede the prose and are not typographic text.
    let value = label[2];
    let wrapping = "";
    if (value[0] === "{" && groupEnd(value, 0, "{", "}") === value.length) {
      wrapping = "{}";
      value = value.slice(1, -1);
    }
    let formatting = "";
    if (value[0] === "[") {
      const end = groupEnd(value, 0, "[", "]");
      formatting = value.slice(0, end);
      value = value.slice(end);
    }
    return label[1] + (wrapping ? "{" : "") + formatting + smartTexText(value) + (wrapping ? "}" : "");
  }).join(",");
}

// Rewrite only node/edge label bodies, never the surrounding TikZ program.
// Handles both \node ... {text} and path syntax: -- node[...] {text} ... .
export function smartTikzLabels(source) {
  const labels = [];
  const nodes = /\\node\b|\bnode\b|%[^\n]*|\\verb\*?([^\w\s])[^\n]*?\1/g;
  let consumedUntil = 0;
  for (const match of source.matchAll(nodes)) {
    if (match.index < consumedUntil) continue;
    if (match[0].startsWith("%") || match[0].startsWith("\\verb")) continue;
    // A node keyword inside a label is prose, not another TikZ declaration.
    if (labels.some(([start, end]) => match.index >= start && match.index < end)) continue;
    let index = match.index + match[0].length;
    while (index < source.length) {
      const character = source[index];
      if (character === ";" || character === "\\") break;
      if (character === "[" || character === "(") {
        index = groupEnd(source, index, character, character === "[" ? "]" : ")");
      } else if (character === "%") {
        const newline = source.indexOf("\n", index);
        index = newline < 0 ? source.length : newline + 1;
      } else if (character === "{") {
        const end = groupEnd(source, index, "{", "}");
        labels.push([index + 1, end - 1]);
        consumedUntil = end;
        break;
      } else index++;
    }
  }
  const changes = labels.map(([start, end]) => ({ start, end, text: smartTexText(source.slice(start, end)) }));
  // Option-based labels (label=, pin=, and the quotes library) are also prose.
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\\") { index++; continue; }
    if (source[index] === "%") {
      const newline = source.indexOf("\n", index);
      if (newline < 0) break;
      index = newline;
    } else if (source[index] === "[") {
      const end = groupEnd(source, index, "[", "]");
      if (!labels.some(([start, stop]) => index >= start && index < stop)) {
        changes.push({ start: index + 1, end: end - 1, text: smartTikzOptions(source.slice(index + 1, end - 1)) });
      }
      index = end - 1;
    }
  }
  for (const { start, end, text } of changes.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, start) + text + source.slice(end);
  }
  return source;
}
