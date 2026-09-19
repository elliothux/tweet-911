(function (global) {
  const NS = "slop911";

  function formatBadge(result) {
    const pct = Math.round((result.ai_written ?? 0) * 100);
    if (result.label === "likely_ai") return `AI ${pct}%`;
    if (result.label === "likely_human") return "Human";
    return `~${pct}%`;
  }

  function badgeClass(result) {
    if (result.label === "likely_ai") return `${NS}-badge--ai`;
    if (result.label === "likely_human") return `${NS}-badge--human`;
    return `${NS}-badge--mixed`;
  }

  /**
   * Inject Score button into a post container. onExtract() returns payload for API.
   */
  function injectButton(container, { platform, onExtract }) {
    if (!container || container.dataset.slop911 === "1") return;
    container.dataset.slop911 = "1";

    const wrap = document.createElement("div");
    wrap.className = `${NS}-wrap`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `${NS}-btn`;
    btn.textContent = "911";
    btn.title = "Score AI-writing (Slop 911)";

    const badge = document.createElement("span");
    badge.className = `${NS}-badge`;
    badge.hidden = true;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = "…";
      badge.hidden = true;
      try {
        const payload = onExtract();
        if (!payload.text?.trim() && !(payload.images?.length > 0)) {
          throw new Error("No text or images found on this post");
        }
        payload.platform = platform;
        const response = await chrome.runtime.sendMessage({
          type: "SCORE_POST",
          payload,
        });
        if (!response?.ok) throw new Error(response?.error || "Score failed");
        badge.textContent = formatBadge(response.result);
        badge.className = `${NS}-badge ${badgeClass(response.result)}`;
        badge.hidden = false;
        badge.title = JSON.stringify(response.result);
      } catch (err) {
        badge.textContent = "!";
        badge.className = `${NS}-badge ${NS}-badge--err`;
        badge.hidden = false;
        badge.title = err instanceof Error ? err.message : String(err);
      } finally {
        btn.disabled = false;
        btn.textContent = "911";
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(badge);
    container.appendChild(wrap);
  }

  function observe(root, selector, onFind) {
    const seen = new WeakSet();
    function scan() {
      root.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        onFind(el);
      });
    }
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });
    return mo;
  }

  global.Slop911 = { injectButton, observe, formatBadge, NS };
})(typeof globalThis !== "undefined" ? globalThis : window);
