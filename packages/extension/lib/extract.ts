import type {
  AuthorInfo,
  ContentKind,
  InReplyTo,
  ScoreRequest,
} from "./types";

export const TWEET_SELECTOR = 'article[data-testid="tweet"]';

function extractAuthor(article: Element): AuthorInfo {
  const userName = article.querySelector('[data-testid="User-Name"]');
  let handle = "";
  let displayName = "";
  if (userName) {
    const spans = userName.querySelectorAll("span");
    for (const s of spans) {
      const t = s.textContent?.trim() || "";
      if (t.startsWith("@")) {
        handle = t;
        break;
      }
    }
    const lines = (userName as HTMLElement).innerText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines[0]) displayName = lines[0];
    if (!handle) {
      for (const l of lines) {
        if (l.startsWith("@")) {
          handle = l;
          break;
        }
      }
    }
  }
  return {
    handle: handle || undefined,
    display_name: displayName || undefined,
  };
}

function extractTextAndImages(article: Element) {
  const textEl = article.querySelector('[data-testid="tweetText"]');
  const text = textEl ? (textEl as HTMLElement).innerText.trim() : "";
  const images = [
    ...article.querySelectorAll<HTMLImageElement>('[data-testid="tweetPhoto"] img'),
  ]
    .map((img) => img.currentSrc || img.src)
    .filter(Boolean);
  return { text, images };
}

export function extractStatusUrl(article: Element) {
  const link = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
  return link ? new URL(link.href, location.origin).href : location.href;
}

const RESERVED_ROOTS = new Set([
  "about",
  "account",
  "analytics",
  "articles",
  "bookmarks",
  "communities",
  "community",
  "compose",
  "connect",
  "download",
  "explore",
  "flow",
  "following",
  "grok",
  "hashtag",
  "help",
  "home",
  "i",
  "intent",
  "jobs",
  "lists",
  "live",
  "login",
  "logout",
  "messages",
  "notifications",
  "oauth",
  "premium",
  "privacy",
  "search",
  "settings",
  "share",
  "signup",
  "spaces",
  "topics",
  "tos",
]);

export function isStatusPage(pathname = location.pathname) {
  return /\/status\/\d+/.test(pathname);
}

export function isHomePage(pathname = location.pathname) {
  return pathname === "/" || pathname === "/home" || pathname.startsWith("/home/");
}

export function isUserProfilePage(pathname = location.pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const root = parts[0];
  if (!root) return false;
  if (RESERVED_ROOTS.has(root.toLowerCase())) return false;
  if (parts.length === 1) return true;
  return parts.length === 2 && parts[1] === "with_replies";
}

export function listDetailReplyArticles(limit = 20): Element[] {
  if (!isStatusPage()) return [];
  const articles = [...document.querySelectorAll(TWEET_SELECTOR)];
  const focal =
    document.querySelector(`${TWEET_SELECTOR}[tabindex="-1"]`) ||
    articles[0];
  if (!focal) return [];
  const start = articles.indexOf(focal);
  const from = start >= 0 ? start + 1 : 1;
  return articles.slice(from, from + limit);
}

export function listFeedPrefetchArticles(limit = 30): Element[] {
  if (!isHomePage() && !isUserProfilePage()) return [];
  return [...document.querySelectorAll(TWEET_SELECTOR)].slice(0, limit);
}

function getFocalArticle() {
  if (!isStatusPage()) return null;
  const articles = [...document.querySelectorAll(TWEET_SELECTOR)];
  return articles[0] || null;
}

const REPLY_HINTS = [
  "replied",
  "replying",
  "回复",
  "回覆",
  "返信",
  "답글",
  "respuesta",
  "respondiendo",
];

export function isReplyArticle(article: Element) {
  const ctx = article.querySelector('[data-testid="socialContext"]');
  if (ctx) {
    const text = ((ctx as HTMLElement).innerText || "").toLowerCase();
    if (REPLY_HINTS.some((hint) => text.includes(hint))) return true;
  }
  if (isStatusPage()) {
    const focal = getFocalArticle();
    if (focal && article !== focal) return true;
  }
  const preamble = (article as HTMLElement).innerText.slice(0, 80).toLowerCase();
  if (REPLY_HINTS.some((hint) => preamble.includes(hint))) return true;
  return false;
}

function detectKind(article: Element): ContentKind {
  if (isReplyArticle(article)) return "reply";
  if (
    article.querySelector('[data-testid="twitterArticleMaybe"]') ||
    /\/i\/article\//.test(extractStatusUrl(article))
  ) {
    return "article";
  }
  return "tweet";
}

function buildInReplyTo(article: Element): InReplyTo | undefined {
  if (!isReplyArticle(article)) return undefined;
  const focal = getFocalArticle();
  if (!focal || focal === article) return undefined;
  const { text } = extractTextAndImages(focal);
  const author = extractAuthor(focal);
  if (!text && !author.handle && !author.display_name) return undefined;
  return {
    author,
    text: text || undefined,
  };
}

export function extractTweet(article: Element): ScoreRequest {
  const { text, images } = extractTextAndImages(article);
  const author = extractAuthor(article);
  const url = extractStatusUrl(article);
  const kind = detectKind(article);
  const payload: ScoreRequest = {
    text,
    images,
    author,
    url,
    kind,
    platform: "x",
  };
  const in_reply_to = buildInReplyTo(article);
  if (in_reply_to) payload.in_reply_to = in_reply_to;
  return payload;
}

export function findActionBar(article: Element): HTMLElement | null {
  const reply = article.querySelector<HTMLElement>('[data-testid="reply"]');
  const group = reply?.closest<HTMLElement>('[role="group"]');
  if (group) return group;
  return (
    article.querySelector<HTMLElement>('[role="group"][id^="id__"]') || null
  );
}
