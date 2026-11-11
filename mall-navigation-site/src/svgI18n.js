import { getLanguage, translateSvgLabel } from "./i18n.js";

// 把楼层 SVG 中的静态中文文案（设施名、右侧列表标题、提示语）翻译成英文。
// 店铺品牌名保持原样；中文模式直接返回原 SVG。
export function localizeSvgMarkup(markup) {
  if (!markup || getLanguage() !== "en") return markup;
  try {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root) return markup;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = node.nodeValue;
      if (!original) continue;
      const trimmed = original.trim();
      if (!trimmed) continue;
      const translated = translateSvgLabel(trimmed);
      if (translated !== trimmed) {
        node.nodeValue = original.replace(trimmed, translated);
      }
    }
    for (const element of root.querySelectorAll("[aria-label], [title]")) {
      for (const attr of ["aria-label", "title"]) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const translated = translateSvgLabel(value);
        if (translated !== value) element.setAttribute(attr, translated);
      }
    }
    return new XMLSerializer().serializeToString(root);
  } catch {
    return markup;
  }
}
