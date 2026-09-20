import { fontFaceCss, SANS } from "../../lib/fonts";

const POPOVER_CSS = `
${fontFaceCss()}
:host {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  font-family: ${SANS} !important;
}
.t911-pop {
  position: fixed;
  width: 300px;
  padding: 12px 14px 14px;
  border-radius: 16px;
  background: var(--t911-pop-bg, #181818);
  color: var(--t911-pop-text, #e7e9ea);
  border: 1px solid var(--t911-pop-border, #2f3336);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
  text-align: left;
  pointer-events: auto;
  font-family: ${SANS} !important;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}
.t911-pop h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}
.t911-pop .what {
  margin: 0 0 10px;
  color: var(--t911-pop-muted, #71767b);
  font-size: 13px;
  line-height: 1.4;
}
.t911-pop .rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 10px;
}
.t911-pop .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.t911-pop .row-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
.t911-pop .row-name svg {
  display: block;
  width: 16px;
  height: 16px;
  flex: none;
  stroke: currentColor;
}
.t911-pop .row-score {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.t911-pop .row-pct--mid { color: #ffd400; }
.t911-pop .row-pct--high { color: #f4212e; }
.t911-pop .row-label {
  color: var(--t911-pop-muted, #71767b);
  font-weight: 400;
}
.t911-pop .meme {
  display: block;
  width: 272px;
  height: auto;
  margin: 10px 0 0;
  border-radius: 10px;
  object-fit: contain;
  background: #000;
}
.t911-pop .links {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
}
.t911-pop .links a {
  color: var(--t911-pop-muted, #71767b);
  text-decoration: underline;
  cursor: pointer;
}
.t911-pop .links a:hover {
  color: var(--t911-pop-text, #e7e9ea);
}
`;

const HOST_NAME = "tweet-911-popover";

export function getPopoverRoot(): HTMLElement {
  let host = document.querySelector<HTMLElement>(HOST_NAME);
  if (!host) {
    host = document.createElement(HOST_NAME);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = POPOVER_CSS;
    const root = document.createElement("div");
    root.setAttribute("data-root", "1");
    shadow.append(style, root);
    document.documentElement.append(host);
  }
  const root = host.shadowRoot?.querySelector<HTMLElement>("[data-root]");
  if (!root) throw new Error("tweet-911 popover root missing");
  return root;
}

export function applyPopoverTheme(theme: "light" | "dark") {
  const host = document.querySelector<HTMLElement>(HOST_NAME);
  if (!host) return;
  host.style.fontFamily = SANS;
  if (theme === "light") {
    host.style.setProperty("--t911-pop-bg", "#ffffff");
    host.style.setProperty("--t911-pop-border", "#eff3f4");
    host.style.setProperty("--t911-pop-text", "#0f1419");
    host.style.setProperty("--t911-pop-muted", "#536471");
  } else {
    host.style.setProperty("--t911-pop-bg", "#181818");
    host.style.setProperty("--t911-pop-border", "#2f3336");
    host.style.setProperty("--t911-pop-text", "#e7e9ea");
    host.style.setProperty("--t911-pop-muted", "#71767b");
  }
}

export function removePopoverHost() {
  document.querySelector(HOST_NAME)?.remove();
}
