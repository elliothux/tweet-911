(function () {
  const { injectButton, observe } = globalThis.Slop911;

  function extractTweet(article) {
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText.trim() : "";

    const images = [
      ...article.querySelectorAll('[data-testid="tweetPhoto"] img'),
    ]
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean);

    let author = "";
    const userName = article.querySelector('[data-testid="User-Name"]');
    if (userName) {
      const spans = userName.querySelectorAll("span");
      for (const s of spans) {
        const t = s.textContent?.trim() || "";
        if (t.startsWith("@")) {
          author = t;
          break;
        }
      }
      if (!author) author = userName.innerText.split("\n")[0]?.trim() || "";
    }

    const link = article.querySelector('a[href*="/status/"]');
    const url = link ? new URL(link.href, location.origin).href : location.href;

    return { text, images, author, url };
  }

  function mount(article) {
    // Prefer action bar area; fall back to article itself
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
