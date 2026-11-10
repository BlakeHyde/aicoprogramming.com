import hljs from "highlight.js/lib/common";

// Only highlight explicitly labelled, supported fences. Unknown languages and
// unlabelled examples keep MarkdownIt's escaped plain-code rendering.
export function highlightCode(source, language) {
  if (!language || !hljs.getLanguage(language)) return "";
  return hljs.highlight(source, { language, ignoreIllegals: true }).value;
}
