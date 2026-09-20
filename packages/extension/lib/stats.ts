export type ScanStats = {
  total: number;
  day: string;
  today: number;
  todayIds: string[];
};

export type ScanStatsView = {
  total: number;
  today: number;
};

const EMPTY: ScanStats = {
  total: 0,
  day: "",
  today: 0,
  todayIds: [],
};

export const statsItem = storage.defineItem<ScanStats>("local:scanStats", {
  fallback: EMPTY,
});

export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function viewStats(raw: ScanStats | null | undefined): ScanStatsView {
  const data = raw ?? EMPTY;
  const total = Math.max(0, data.total || 0);
  if (data.day !== todayKey()) return { total, today: 0 };
  return { total, today: Math.max(0, data.today || 0) };
}

function scanId(url: string) {
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1] || url;
}

let writeChain: Promise<void> = Promise.resolve();

export function recordSuccessfulScans(urls: readonly string[]) {
  writeChain = writeChain.then(() => persistScans(urls)).catch((err) => {
    console.warn("[tweet-911] stats:", err);
  });
  return writeChain;
}

async function persistScans(urls: readonly string[]) {
  const ids = [
    ...new Set(urls.map(scanId).filter((id) => id.length > 0)),
  ];
  if (ids.length === 0) return;

  const current = (await statsItem.getValue()) ?? EMPTY;
  const day = todayKey();
  const seen = new Set(current.day === day ? current.todayIds : []);
  const added: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    added.push(id);
  }
  if (added.length === 0) return;

  await statsItem.setValue({
    total: Math.max(0, current.total || 0) + added.length,
    day,
    today: (current.day === day ? current.today || 0 : 0) + added.length,
    todayIds: [...seen],
  });
}
