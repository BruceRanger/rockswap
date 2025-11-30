// src/systems/highscore.ts
const HS_KEY = "rockswap.highscore.v1";

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    // Safari private mode or blocked storage
    return 0;
  }
}

export function maybeUpdateHighScore(score: number): number {
  const prev = loadHighScore();
  const next = score > prev ? score : prev;
  if (next !== prev) {
    try {
      localStorage.setItem(HS_KEY, String(next));
    } catch {}
  }
  return next;
}

export function clearHighScore(): void {
  try {
    localStorage.removeItem(HS_KEY);
  } catch {}
}
