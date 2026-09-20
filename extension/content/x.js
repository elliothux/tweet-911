(function () {
  const { injectButton, observe } = globalThis.Tweet911;

  function extractAuthor(article) {
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
      const lines = userName.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length) displayName = lines[0];
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

  function extractTextAndImages(article) {
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText.trim() : "";
    const images = [
      ...article.querySelectorAll('[data-testid="tweetPhoto"] img'),
    ]
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean);
    return { text, images };
  }

  function extractStatusUrl(article) {
    const link = article.querySelector('a[href*="/status/"]');
    return link ? new URL(link.href, location.origin).href : location.href;
  }

  function isStatusPage() {
    return /\/status\/\d+/.test(location.pathname);
  }

  /**
   * Focal (OP) tweet on a status page — usually the first article[data-testid=tweet]
   * that is not nested inside another tweet article.
   */
  function getFocalArticle() {
    if (!isStatusPage()) return null;
    const articles = [
      ...document.querySelectorAll('article[data-testid="tweet"]'),
    ];
    return articles[0] || null;
  }

  function isReplyArticle(article) {
    // Explicit reply social context
    if (article.querySelector('[data-testid="socialContext"]')) {
      const ctx = article.querySelector('[data-testid="socialContext"]');
      const t = (ctx?.innerText || "").toLowerCase();
      if (t.includes("replied") || t.includes("回复") || t.includes("replying")) {
        return true;
      }
    }
    // On status page, anything after the focal tweet is a reply/thread item
    if (isStatusPage()) {
      const focal = getFocalArticle();
      if (focal && article !== focal) return true;
    }
    // "Replying to" text in tweet
    const replyLabel = article.querySelector('div[dir="ltr"] a[href^="/"]');
    const preamble = article.innerText.slice(0, 80).toLowerCase();
    if (preamble.includes("replying to") || preamble.includes("回复")) {
      return true;
    }
    void replyLabel;
    return false;
  }

  function detectKind(article) {
    if (isReplyArticle(article)) return "reply";
    // Long-form / Articles on X sometimes use different containers; treat as article
    // when URL path looks like /i/article or article card present.
    if (
      article.querySelector('[data-testid="twitterArticleMaybe"]') ||
      /\/i\/article\//.test(extractStatusUrl(article))
    ) {
      return "article";
    }
    return "tweet";
  }

  function buildInReplyTo(article) {
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

  function extractTweet(article) {
    const { text, images } = extractTextAndImages(article);
    const author = extractAuthor(article);
    const url = extractStatusUrl(article);
    const kind = detectKind(article);
    const payload = {
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

  function mount(article) {
    const actions =
      article.querySelector('[role="group"]') ||
      article.querySelector('[data-testid="reply"]')?.parentElement ||
      article;
    injectButton(actions, {
      platform: "x",
      onExtract: () => extractTweet(article),
    });
  }

  observe(document.body, 'article[data-testid="tweet"]', mount);
})();
