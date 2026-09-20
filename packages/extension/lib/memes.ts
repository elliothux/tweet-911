import type { Tone } from "./scores";

const CLEAN = [
  "memes/clean/01.jpg",
  "memes/clean/02.png",
  "memes/clean/03.png",
  "memes/clean/04.png",
  "memes/clean/05.png",
] as const;

const BAD = [
  "memes/bad/01.jpg",
  "memes/bad/02.jpg",
  "memes/bad/03.jpg",
  "memes/bad/04.png",
  "memes/bad/05.jpg",
  "memes/bad/06.jpg",
  "memes/bad/07.jpg",
] as const;

const WORST = [
  "memes/worst/01.jpg",
  "memes/worst/02.jpg",
  "memes/worst/03.jpg",
  "memes/worst/04.jpg",
  "memes/worst/05.jpg",
  "memes/worst/06.jpg",
  "memes/worst/07.jpg",
  "memes/worst/08.jpg",
] as const;

const BY_TONE: Record<Tone, readonly string[]> = {
  low: CLEAN,
  mid: BAD,
  high: WORST,
};

function extUrl(path: string) {
  return (browser.runtime as unknown as { getURL: (p: string) => string }).getURL(
    path,
  );
}

export function randomMemeUrl(tone: Tone): string {
  const list = BY_TONE[tone];
  const pick = list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "";
  return extUrl(pick);
}
