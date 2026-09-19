/**
 * LinkedIn DOM changes often — selectors are best-effort and may need tweaks.
 * Targets feed cards under update-components / feed-shared-update patterns.
 */
(function () {
  const { injectButton, observe } = globalThis.Slop911;

  const POST_SELECTORS = [
    "div.feed-shared-update-v2",
    "div.update-components-update",
    "div[data-urn*='activity']",
    "article.feed-shared-update-v2",
  ].join(", ");

  function extractPost(card) {
    const textCandidates = card.querySelectorAll(
      ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text, span[dir='ltr']",
    );
    let text = "";
    for (const el of textCandidates) {
      const t = el.innerText?.trim() || "";
      if (t.length > text.length) text = t;
    }

    const images = [...card.querySelectorAll("img")]
      .map((img) => img.currentSrc || img.src)
      .filter(
        (src) =>
          src &&
          !src.includes("data:image") &&
          !src.includes("ghost") &&
          !/profile|emoji|presence/i.test(src),
      );

    const authorEl =
      card.querySelector(".update-components-actor__name") ||
      card.querySelector(".feed-shared-actor__name") ||
      card.querySelector('a[data-control-name="actor"]');
    const author = authorEl?.innerText?.trim().split("\n")[0] || "";

    const link =
      card.querySelector('a[href*="/feed/update/"]') ||
      card.querySelector('a[href*="/posts/"]');
    const url = link ? new URL(link.href, location.origin).href : location.href;

    return { text, images, author, url };
  }

  function mount(card) {
    const anchor =
      card.querySelector(".feed-shared-social-action-bar") ||
      card.querySelector(".social-actions-bar") ||
      card.querySelector(".update-components-footer") ||
      card;
    injectButton(anchor, {
      platform: "linkedin",
      onExtract: () => extractPost(card),
    });
  }

  function scanAll() {
    document.querySelectorAll(POST_SELECTORS).forEach(mount);
  }

  observe(document.body, POST_SELECTORS.split(",")[0].trim(), mount);
  // Also poll lightly — LinkedIn virtualizes aggressively
  scanAll();
  setInterval(scanAll, 2500);
})();
