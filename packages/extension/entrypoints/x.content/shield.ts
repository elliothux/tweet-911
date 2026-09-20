import type { BlockSettings, BlockThreshold } from "../../lib/config";
import {
  extractStatusUrl,
  findActionBar,
  isReplyArticle,
} from "../../lib/extract";
import { resolveLang, t, type I18nKey } from "../../lib/i18n";
import {
  getScore,
  overallTone,
  toneFor,
  type Tone,
} from "../../lib/scores";
import type { ScoreApiResponse } from "../../lib/types";

const HIDE = "tweet911-hide";
const BLUR = "tweet911-blur";
const TARGET = "tweet911-blur-target";
const VEIL = "tweet-911-veil";

const revealed = new Set<string>();

export function shouldBlock(tone: Tone, threshold: BlockThreshold): boolean {
  if (threshold === "mid") return tone === "mid" || tone === "high";
  return tone === "high";
}

const METRICS = [
  ["ai", "ai_written"],
  ["porn", "porn_solicitation"],
  ["para", "paraphrase_bot"],
] as const;

export function veilHeadline(
  result: ScoreApiResponse,
  threshold: BlockThreshold,
) {
  const reasons = METRICS.map(([key, field]) => ({
    key,
    n: result[field] ?? 0,
    tone: toneFor(result[field]),
  }))
    .filter((row) => shouldBlock(row.tone, threshold))
    .sort((a, b) => b.n - a.n);
  if (reasons.length === 0) {
    return t(overallTone(result) === "high" ? "veil.high.ai" : "veil.mid.ai");
  }
  const lang = resolveLang();
  const sep =
    lang === "zh" || lang === "zh-Hant" ? "，" : lang === "ja" ? "、" : " · ";
  return reasons
    .map((row) => t(`veil.${row.tone}.${row.key}` as I18nKey))
    .join(sep);
}

function markBlurTargets(article: Element, group: Element | null) {
  article.querySelectorAll(`.${TARGET}`).forEach((el) => {
    el.classList.remove(TARGET);
  });
  if (!group) {
    for (const child of article.children) {
      if (child.localName !== VEIL) child.classList.add(TARGET);
    }
    return;
  }
  let node: Element | null = group;
  while (node && node !== article) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const child of parent.children) {
      if (child !== node && child.localName !== VEIL) {
        child.classList.add(TARGET);
      }
    }
    node = parent;
  }
}

export function clearShield(article: Element) {
  article.classList.remove(HIDE, BLUR);
  article.querySelectorAll(`.${TARGET}`).forEach((el) => {
    el.classList.remove(TARGET);
  });
  article.querySelectorAll(VEIL).forEach((el) => el.remove());
}

function layoutVeil(article: HTMLElement, veil: HTMLElement, group: Element | null) {
  veil.style.position = "absolute";
  veil.style.left = "0";
  veil.style.right = "0";
  veil.style.top = "0";
  veil.style.zIndex = "30";
  if (!group) {
    veil.style.bottom = "0";
    veil.style.height = "auto";
    return;
  }
  const a = article.getBoundingClientRect();
  const g = group.getBoundingClientRect();
  const height = Math.max(0, g.top - a.top);
  veil.style.bottom = "auto";
  veil.style.height = `${height}px`;
}

export function applyShield(article: Element, settings: BlockSettings) {
  const url = extractStatusUrl(article);
  const score = url ? getScore(url) : { status: "idle" as const };
  const tone = score.status === "ok" ? overallTone(score.result) : null;
  const threshold = isReplyArticle(article)
    ? settings.replyThreshold
    : settings.postThreshold;
  const want = Boolean(
    url &&
      settings.mode !== "off" &&
      !revealed.has(url) &&
      tone &&
      shouldBlock(tone, threshold),
  );

  const isHide = article.classList.contains(HIDE);
  const isBlur = article.classList.contains(BLUR);
  if (!want) {
    if (isHide || isBlur) clearShield(article);
    return;
  }
  if (!url || !tone) return;

  if (settings.mode === "hide") {
    if (isHide) return;
    clearShield(article);
    article.classList.add(HIDE);
    return;
  }

  const group = findActionBar(article);
  const headline =
    score.status === "ok" ? veilHeadline(score.result, threshold) : "";
  if (isBlur && article.querySelector(VEIL)) {
    markBlurTargets(article, group);
    const veil = article.querySelector<HTMLElement>(VEIL);
    if (veil) {
      const reason = veil.shadowRoot?.querySelector(".reason");
      if (reason && headline) reason.textContent = headline;
      layoutVeil(article as HTMLElement, veil, group);
    }
    return;
  }

  clearShield(article);
  article.classList.add(BLUR);
  markBlurTargets(article, group);

  const veil = document.createElement(VEIL);
  const shadow = veil.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
:host {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  overflow: hidden;
}
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 260px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.72);
  color: #e7e9ea;
  text-align: center;
  font-family: ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1.4;
}
.by {
  margin: 0;
  font-size: 12px;
  color: #71767b;
}
.box p { margin: 0; }
button {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  background: #e7e9ea;
  color: #0f1419;
}
`;
  const box = document.createElement("div");
  box.className = "box";
  const by = document.createElement("p");
  by.className = "by";
  by.textContent = t("veil.by");
  const p = document.createElement("p");
  p.className = "reason";
  p.textContent = headline;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = t("veil.restore");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    revealed.add(url);
    clearShield(article);
  });
  box.append(by, p, btn);
  shadow.append(style, box);
  veil.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  veil.addEventListener("mousedown", (e) => e.stopPropagation());

  const pos = getComputedStyle(article).position;
  if (!pos || pos === "static") {
    (article as HTMLElement).style.position = "relative";
  }
  article.append(veil);
  layoutVeil(article as HTMLElement, veil, group);
}

export const SHIELD_CSS = `
article[data-testid="tweet"].${HIDE} {
  display: none !important;
}
article[data-testid="tweet"].${BLUR} {
  position: relative !important;
}
article[data-testid="tweet"] .${TARGET} {
  filter: blur(18px) !important;
  pointer-events: none !important;
  user-select: none !important;
}
`;
