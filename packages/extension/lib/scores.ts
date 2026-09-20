import type { ScoreApiResponse } from "./types";

export const HIGH = 0.65;
export const LOW = 0.35;

export type Tone = "low" | "mid" | "high";

export type ScoreState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; result: ScoreApiResponse }
  | { status: "error"; error: string };

const states = new Map<string, ScoreState>();
const listeners = new Map<string, Set<() => void>>();

export function toneFor(n: number | undefined): Tone {
  const v = n ?? 0;
  if (v >= HIGH) return "high";
  if (v <= LOW) return "low";
  return "mid";
}

const TONE_RANK: Record<Tone, number> = { low: 0, mid: 1, high: 2 };

export function overallTone(result: ScoreApiResponse): Tone {
  const tones = [
    toneFor(result.ai_written),
    toneFor(result.porn_solicitation),
    toneFor(result.paraphrase_bot),
  ];
  return tones.reduce((worst, t) => (TONE_RANK[t] > TONE_RANK[worst] ? t : worst), "low");
}

export function pct(n: number | undefined) {
  return Math.round((n ?? 0) * 100);
}

export function getScore(url: string): ScoreState {
  return states.get(url) ?? { status: "idle" };
}

export function setScore(url: string, state: ScoreState) {
  states.set(url, state);
  const set = listeners.get(url);
  if (set) for (const fn of set) fn();
}

export function subscribeScore(url: string, fn: () => void) {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) listeners.delete(url);
  };
}
