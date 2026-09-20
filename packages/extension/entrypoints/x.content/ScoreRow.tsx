import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AiTasteIcon, ParrotIcon, SolicitationIcon } from "../../lib/icons";
import { t, subscribeI18n, type I18nKey } from "../../lib/i18n";
import { randomMemeUrl } from "../../lib/memes";
import { OPEN_COMPUTE_URL, SOURCE_REPO_URL } from "../../lib/config";
import {
  getScore,
  overallTone,
  pct,
  subscribeScore,
  toneFor,
  type ScoreState,
  type Tone,
} from "../../lib/scores";
import { applyPopoverTheme, getPopoverRoot } from "./popover";

function stop(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function useScore(url: string): ScoreState {
  const [state, setState] = useState(() => getScore(url));
  useEffect(() => {
    setState(getScore(url));
    return subscribeScore(url, () => setState(getScore(url)));
  }, [url]);
  return state;
}

function useI18nTick() {
  const [, setN] = useState(0);
  useEffect(() => subscribeI18n(() => setN((n) => n + 1)), []);
}

type MetricDef = {
  id: "ai" | "porn" | "para";
  icon: typeof AiTasteIcon;
  name: I18nKey;
  what: I18nKey;
  high: I18nKey;
  mid: I18nKey;
  low: I18nKey;
  value: (s: ScoreState) => number | undefined;
};

const METRICS: MetricDef[] = [
  {
    id: "ai",
    icon: AiTasteIcon,
    name: "metric.ai.name",
    what: "metric.ai.what",
    high: "metric.ai.high",
    mid: "metric.ai.mid",
    low: "metric.ai.low",
    value: (s) => (s.status === "ok" ? s.result.ai_written : undefined),
  },
  {
    id: "porn",
    icon: SolicitationIcon,
    name: "metric.porn.name",
    what: "metric.porn.what",
    high: "metric.porn.high",
    mid: "metric.porn.mid",
    low: "metric.porn.low",
    value: (s) => (s.status === "ok" ? s.result.porn_solicitation : undefined),
  },
  {
    id: "para",
    icon: ParrotIcon,
    name: "metric.para.name",
    what: "metric.para.what",
    high: "metric.para.high",
    mid: "metric.para.mid",
    low: "metric.para.low",
    value: (s) => (s.status === "ok" ? s.result.paraphrase_bot : undefined),
  },
];

function verdict(def: MetricDef, tone: Tone): I18nKey {
  if (tone === "high") return def.high;
  if (tone === "mid") return def.mid;
  return def.low;
}

function capsuleTone(state: ScoreState): Tone | "pending" | "error" {
  if (state.status === "ok") return overallTone(state.result);
  if (state.status === "error") return "error";
  return "pending";
}

function themeFromPage(): "light" | "dark" {
  const bg = getComputedStyle(document.body).backgroundColor;
  const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "dark";
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? "light" : "dark";
}

export function ScoreRow({ url }: { url: string }) {
  useI18nTick();
  const state = useScore(url);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [meme, setMeme] = useState<string | null>(null);
  const hideTimer = useRef<number>(0);

  useEffect(() => {
    setPortal(getPopoverRoot());
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  function cancelHide() {
    window.clearTimeout(hideTimer.current);
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  function show(el: HTMLElement) {
    cancelHide();
    applyPopoverTheme(themeFromPage());
    const r = el.getBoundingClientRect();
    const width = 300;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - width / 2),
      window.innerWidth - width - 8,
    );
    const flip = r.bottom + 420 > window.innerHeight;
    setPos({
      top: flip ? r.top - 8 : r.bottom + 8,
      left,
      flip,
    });
    if (!open) {
      const next = capsuleTone(state);
      setMeme(
        next === "low" || next === "mid" || next === "high"
          ? randomMemeUrl(next)
          : null,
      );
    }
    setOpen(true);
  }

  const tone = capsuleTone(state);
  const overallKey: I18nKey =
    tone === "high"
      ? "popover.overall.high"
      : tone === "mid"
        ? "popover.overall.mid"
        : "popover.overall.low";

  const popover =
    open && portal
      ? createPortal(
          <div
            className="t911-pop"
            role="tooltip"
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.flip ? "translateY(-100%)" : undefined,
            }}
          >
            <h3>{t("app.name")}</h3>
            {state.status === "ok" ? (
              <>
                <p className="what">
                  {t("popover.overall")} · {t(overallKey)}
                </p>
                <div className="rows">
                  {METRICS.map((def) => {
                    const n = def.value(state);
                    const rowTone = toneFor(n);
                    const Icon = def.icon;
                    return (
                      <div key={def.id} className="row">
                        <span className="row-name">
                          <Icon />
                          {t(def.name)}
                        </span>
                        <span className="row-score">
                          <span className={`row-pct row-pct--${rowTone}`}>
                            {pct(n)}%
                          </span>
                          <span className="row-label">
                            {" "}
                            · {t(verdict(def, rowTone))}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {meme ? <img className="meme" src={meme} alt="" /> : null}
                <div className="links">
                  <a
                    href={SOURCE_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void browser.runtime.sendMessage({
                        type: "OPEN_TAB",
                        url: SOURCE_REPO_URL,
                      });
                    }}
                  >
                    {t("options.source")}
                  </a>
                  <a
                    href={OPEN_COMPUTE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void browser.runtime.sendMessage({
                        type: "OPEN_TAB",
                        url: OPEN_COMPUTE_URL,
                      });
                    }}
                  >
                    {t("popover.powered")}
                  </a>
                </div>
              </>
            ) : (
              <p className="what">
                {state.status === "error"
                  ? t("state.error")
                  : t("state.loading")}
              </p>
            )}
          </div>,
          portal,
        )
      : null;

  return (
    <div
      className={`t911 t911--${tone}`}
      onMouseDown={stop}
      onClick={stop}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={scheduleHide}
    >
      {METRICS.map((def) => {
        const n = def.value(state);
        const display =
          state.status === "ok"
            ? String(pct(n))
            : state.status === "error"
              ? "!"
              : "–";
        const Icon = def.icon;
        return (
          <span key={def.id} className="t911-metric" aria-label={t(def.name)}>
            <Icon />
            <span className="t911-n">{display}</span>
          </span>
        );
      })}
      {popover}
    </div>
  );
}
