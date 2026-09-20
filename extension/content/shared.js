(function (global) {
  const NS = "tweet911";

  function pct(n) {
    return Math.round((n ?? 0) * 100);
  }

  /**
   * Badge summarizing raised flags, e.g. "AI 80% · 引流 90%" or "Clean".
   */
  function formatBadge(result) {
    const parts = [];
    const ai = result.ai_written ?? 0;
    const porn = result.porn_solicitation ?? 0;
    const para = result.paraphrase_bot ?? 0;

    if (ai >= 0.5 || result.ai_label === "likely_ai") {
      parts.push(`AI ${pct(ai)}%`);
    }
    if (porn >= 0.5 || result.solicitation_label === "likely_solicitation") {
      parts.push(`引流 ${pct(porn)}%`);
    }
    if (para >= 0.5 || result.paraphrase_label === "likely_paraphrase") {
      parts.push(`复述 ${pct(para)}%`);
    }

    if (parts.length === 0) {
      if (
        result.ai_label === "likely_human" &&
        (result.solicitation_label === "likely_clean" || porn < 0.35) &&
        (result.paraphrase_label === "likely_original" || para < 0.35)
      ) {
        return "Clean";
      }
      return `~AI ${pct(ai)}%`;
    }
    return parts.join(" · ");
  }

  function badgeClass(result) {
    const porn = result.porn_solicitation ?? 0;
    const para = result.paraphrase_bot ?? 0;
    const ai = result.ai_written ?? 0;
    if (
      result.solicitation_label === "likely_solicitation" ||
      porn >= 0.65 ||
      result.ai_label === "likely_ai" ||
      ai >= 0.65 ||
      result.paraphrase_label === "likely_paraphrase" ||
      para >= 0.65
    ) {
      return `${NS}-badge--ai`;
    }
    if (
      result.ai_label === "likely_human" &&
      porn <= 0.35 &&
      para <= 0.35
    ) {
      return `${NS}-badge--human`;
    }
    return `${NS}-badge--mixed`;
  }

  /**
   * Inject Score button into a post container. onExtract() returns payload for API.
   */
  function injectButton(container, { platform, onExtract }) {
    if (!container || container.dataset.tweet911 === "1") return;
    container.dataset.tweet911 = "1";

    const wrap = document.createElement("div");
    wrap.className = `${NS}-wrap`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `${NS}-btn`;
    btn.textContent = "911";
    btn.title = "Score with Tweet 911 (AI / 引流 / paraphrase)";

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

  global.Tweet911 = { injectButton, observe, formatBadge, NS };
})(typeof globalThis !== "undefined" ? globalThis : window);
