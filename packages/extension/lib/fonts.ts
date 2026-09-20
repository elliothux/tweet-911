import w400 from "@fontsource/inter/files/inter-latin-400-normal.woff2?url";
import w600 from "@fontsource/inter/files/inter-latin-600-normal.woff2?url";
import w700 from "@fontsource/inter/files/inter-latin-700-normal.woff2?url";

export const SANS =
  'Tweet911Sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", Helvetica, Arial, sans-serif';

function extUrl(path: string) {
  if (/^(chrome|moz|safari)-extension:/.test(path) || path.startsWith("data:")) {
    return path;
  }
  const rel = path.startsWith("/") ? path.slice(1) : path;
  return (browser.runtime as unknown as { getURL: (p: string) => string }).getURL(
    rel,
  );
}

export function fontFaceCss() {
  return `
@font-face {
  font-family: "Tweet911Sans";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("${extUrl(w400)}") format("woff2");
}
@font-face {
  font-family: "Tweet911Sans";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("${extUrl(w600)}") format("woff2");
}
@font-face {
  font-family: "Tweet911Sans";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("${extUrl(w700)}") format("woff2");
}
`.trim();
}

export function injectFontStyle(target: Document | ShadowRoot) {
  if (target.querySelector("style[data-tweet911-font]")) return;
  const style = document.createElement("style");
  style.dataset.tweet911Font = "1";
  style.textContent = fontFaceCss();
  target.appendChild(style);
}
