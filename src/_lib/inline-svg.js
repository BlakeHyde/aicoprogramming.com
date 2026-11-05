// Namespace both XML quote styles and all local references, including the
// glyph <use> elements and clipping paths emitted by TeX converters.
export function inlineSvg(source, prefix, label) {
  const start = source.indexOf("<svg");
  if (start < 0) throw new Error("Diagram output contains no SVG element");
  return source.slice(start)
    .replace(/\bid=(['"])(.*?)\1/g, (_, quote, id) => `id=${quote}${prefix}${id}${quote}`)
    .replace(/\b((?:xlink:)?href)=(['"])#(.*?)\2/g, (_, attribute, quote, id) => `${attribute}=${quote}#${prefix}${id}${quote}`)
    .replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (_, quote, id) => `url(${quote}#${prefix}${id}${quote})`)
    .replace("<svg ", `<svg role="img" aria-label="${label}" `);
}
