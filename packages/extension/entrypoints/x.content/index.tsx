import ReactDOM from "react-dom/client";
import {
  blockModeItem,
  blockPostThresholdItem,
  blockReplyThresholdItem,
  getBlockSettings,
  hydrateLanguage,
  languageItem,
  type BlockSettings,
} from "../../lib/config";
import {
  extractStatusUrl,
  extractTweet,
  findActionBar,
  listDetailReplyArticles,
  listFeedPrefetchArticles,
  TWEET_SELECTOR,
} from "../../lib/extract";
import { setLanguageSetting } from "../../lib/i18n";
import { getScore, setScore } from "../../lib/scores";
import type {
  ScoreBatchMessage,
  ScoreBatchResponse,
  ScoreRequest,
} from "../../lib/types";
import { injectFontStyle } from "../../lib/fonts";
import { removePopoverHost } from "./popover";
import { applyShield, SHIELD_CSS } from "./shield";
import { ScoreRow } from "./ScoreRow";
import "./style.css";

const HOST_NAME = "tweet-911-score";
const ROW_CLASS = "tweet911-actions-row";
const FLUSH_MS = 80;
const MAX_BATCH = 50;
const DETAIL_REPLY_PREFETCH = 20;
const FEED_PREFETCH = 30;

export default defineContentScript({
  matches: ["https://x.com/*", "https://twitter.com/*"],
  cssInjectionMode: "ui",
  runAt: "document_idle",
  async main(ctx) {
    await hydrateLanguage();
    let blockSettings: BlockSettings = await getBlockSettings();
    const unwatchLang = languageItem.watch((value) => {
      setLanguageSetting(value ?? "auto");
      applyAllShields();
    });
    const unwatchMode = blockModeItem.watch((value) => {
      blockSettings = { ...blockSettings, mode: value ?? "off" };
      applyAllShields();
    });
    const unwatchPostThreshold = blockPostThresholdItem.watch((value) => {
      blockSettings = { ...blockSettings, postThreshold: value ?? "high" };
      applyAllShields();
    });
    const unwatchReplyThreshold = blockReplyThresholdItem.watch((value) => {
      blockSettings = { ...blockSettings, replyThreshold: value ?? "high" };
      applyAllShields();
    });

    const mounted = new Map<Element, { remove: () => void }>();
    const observed = new Set<Element>();
    const pending = new Map<string, ScoreRequest>();
    const failedAt = new Map<string, number>();
    let flushTimer: number | undefined;
    let scheduled = false;
    const RETRY_MS = 4000;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          enqueue(entry.target);
        }
      },
      { root: null, threshold: 0, rootMargin: "1200px 0px 2400px 0px" },
    );

    function enqueue(article: Element) {
      const payload = extractTweet(article);
      if (!payload.url) return;
      if (!payload.text?.trim() && !(payload.images && payload.images.length)) {
        return;
      }
      const current = getScore(payload.url);
      if (current.status === "ok" || current.status === "loading") return;
      if (current.status === "error") {
        const at = failedAt.get(payload.url) ?? 0;
        if (Date.now() - at < RETRY_MS) return;
      }
      setScore(payload.url, { status: "loading" });
      pending.set(payload.url, payload);
      scheduleFlush();
    }

    function scheduleFlush() {
      if (pending.size >= MAX_BATCH) {
        window.clearTimeout(flushTimer);
        flushTimer = undefined;
        void flush();
        return;
      }
      window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(() => {
        void flush();
      }, FLUSH_MS);
    }

    async function flush() {
      const items = [...pending.values()].slice(0, MAX_BATCH);
      for (const item of items) pending.delete(item.url);
      if (items.length === 0) return;
      try {
        const response = (await browser.runtime.sendMessage({
          type: "SCORE_BATCH",
          items,
        } satisfies ScoreBatchMessage)) as ScoreBatchResponse;
        if (!response?.ok) {
          const err = response?.error || "batch failed";
          console.warn("[tweet-911] score failed:", err);
          markFailed(items, err);
          return;
        }
        const seen = new Set<string>();
        for (const row of response.results) {
          seen.add(row.url);
          if (row.ok) {
            failedAt.delete(row.url);
            setScore(row.url, { status: "ok", result: row.result });
            applyForUrl(row.url);
          } else {
            const err = row.details || row.error;
            console.warn("[tweet-911] score item failed:", row.url, err);
            failedAt.set(row.url, Date.now());
            setScore(row.url, { status: "error", error: err });
          }
        }
        for (const item of items) {
          if (!seen.has(item.url) && getScore(item.url).status === "loading") {
            markFailed([item], "missing");
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[tweet-911] score failed:", message);
        markFailed(items, message);
      }
      if (pending.size) scheduleFlush();
    }

    function applyForUrl(url: string) {
      for (const article of document.querySelectorAll(TWEET_SELECTOR)) {
        if (extractStatusUrl(article) === url) {
          applyShield(article, blockSettings);
        }
      }
    }

    function applyAllShields() {
      for (const article of document.querySelectorAll(TWEET_SELECTOR)) {
        applyShield(article, blockSettings);
      }
    }

    function markFailed(items: ScoreRequest[], error: string) {
      const now = Date.now();
      for (const item of items) {
        failedAt.set(item.url, now);
        setScore(item.url, { status: "error", error });
      }
    }

    function themeFromPage(): "light" | "dark" {
      const bg = getComputedStyle(document.body).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return "dark";
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return lum > 0.6 ? "light" : "dark";
    }

    async function mount(article: Element) {
      if (mounted.has(article)) return;
      const actions = findActionBar(article);
      if (!actions) return;

      for (const stale of article.querySelectorAll(HOST_NAME)) stale.remove();
      article.querySelector("[data-tweet911-spacer]")?.remove();
      article
        .querySelectorAll(`.${ROW_CLASS}`)
        .forEach((el) => el.classList.remove(ROW_CLASS));
      article.setAttribute("data-tweet911", "1");
      mounted.set(article, { remove() {} });

      const url = extractStatusUrl(article);
      let ui: { remove: () => void; mount: () => void };
      try {
        ui = await createShadowRootUi(ctx, {
          name: HOST_NAME,
          position: "inline",
          anchor: actions,
          append: "last",
          isolateEvents: true,
          onMount(container, shadow, shadowHost) {
            injectFontStyle(shadow);
            shadowHost.setAttribute("data-theme", themeFromPage());
            container.style.cssText =
              "display:flex;align-items:center;height:100%;";
            const wrapper = document.createElement("div");
            wrapper.className = "t911-shell";
            container.append(wrapper);
            const root = ReactDOM.createRoot(wrapper);
            root.render(<ScoreRow url={url} />);
            return { root, wrapper };
          },
          onRemove(els) {
            els?.root.unmount();
            els?.wrapper.remove();
          },
        });
      } catch {
        mounted.delete(article);
        article.removeAttribute("data-tweet911");
        return;
      }

      if (!ctx.isValid || !article.isConnected) {
        mounted.delete(article);
        article.removeAttribute("data-tweet911");
        return;
      }
      mounted.set(article, ui);
      ui.mount();
      applyShield(article, blockSettings);
    }

    function prefetchAhead() {
      for (const article of listDetailReplyArticles(DETAIL_REPLY_PREFETCH)) {
        enqueue(article);
      }
      for (const article of listFeedPrefetchArticles(FEED_PREFETCH)) {
        enqueue(article);
      }
    }

    function scan() {
      for (const article of observed) {
        if (article.isConnected) continue;
        io.unobserve(article);
        observed.delete(article);
      }
      for (const [article, ui] of mounted) {
        if (!article.isConnected) {
          ui.remove();
          mounted.delete(article);
        }
      }
      for (const article of document.querySelectorAll(TWEET_SELECTOR)) {
        io.observe(article);
        observed.add(article);
        void mount(article);
      }
      prefetchAhead();
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (ctx.isValid) scan();
      });
    }

    const layoutStyle = document.createElement("style");
    layoutStyle.dataset.tweet911 = "layout";
    layoutStyle.textContent = `
${SHIELD_CSS}
article[data-testid="tweet"] [role="group"] > ${HOST_NAME} {
  flex: 0 0 auto !important;
  display: inline-flex !important;
  align-items: center !important;
  align-self: stretch !important;
  width: max-content !important;
  min-width: max-content !important;
  max-width: none !important;
  height: auto !important;
  min-height: 100% !important;
  margin: 0 !important;
  overflow: visible !important;
}
`;
    document.documentElement.append(layoutStyle);

    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    ctx.addEventListener(window, "wxt:locationchange", schedule);
    ctx.onInvalidated(() => {
      observer.disconnect();
      io.disconnect();
      unwatchLang();
      unwatchMode();
      unwatchPostThreshold();
      unwatchReplyThreshold();
      layoutStyle.remove();
      removePopoverHost();
      window.clearTimeout(flushTimer);
      for (const ui of mounted.values()) ui.remove();
      mounted.clear();
    });
  },
});
