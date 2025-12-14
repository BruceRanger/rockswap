console.log("[RockSwap] main.ts loaded");

// ============================================================
// File: src/main.ts
// Purpose: Main game loop + UI wiring for RockSwap
// ============================================================

import packageInfo from "../package.json";

import { createBoard } from "./core/grid";
import { findMatches } from "./core/match";
import { collapse } from "./core/collapse";
import { refill } from "./core/refill";
import { trySwap } from "./core/swap";
import { clearAndScore, USER_SCORING } from "./core/scoring";
import { renderBoard, pickCellAt } from "./systems/renderer";
import { loadHighScore, maybeUpdateHighScore, clearHighScore } from "./systems/highscore";
import { isPowerGem, isHypercube } from "./core/cell";

// Grab document elements
const canvas = document.getElementById("board") as HTMLCanvasElement | null;
const hud = document.getElementById("hud") as HTMLDivElement;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;

if (versionEl) {
  const updated = new Date(document.lastModified).toISOString(); // full ISO date+time
  versionEl.textContent = ` • Version: ${packageInfo.version} • Updated: ${updated}`;
}

if (!canvas || !hud || !versionEl) {
  throw new Error(
    "Missing required DOM elements. Ensure canvas, hud, and version exist in index.html."
  );
}

const ctx = canvas.getContext("2d")!;
if (!ctx) {
  throw new Error("2D canvas context not available");
}

// Make sure canvas actually receives pointer events (helps on mobile)
canvas.style.touchAction = "none";
canvas.style.pointerEvents = "auto";
canvas.tabIndex = 0;

// ---- Timing knobs ----
// Normal speed
const FLASH_MS = 240;
const PULSE_MS = 160;
const CASCADE_PAUSE_MS = 40;

// Slow-motion when a special gem is cashed in (diamond or star)
const SLOW_FLASH_MS = 750;
const SLOW_PULSE_MS = 420;
const SLOW_CASCADE_PAUSE_MS = 260;

// ---- Game state ----
let board = createBoard(); // size NxN filled with random cell types
let score = 0;
let moves = 0;
let firstPick: { r: number; c: number } | null = null;
let isResolving = false; // to prevent input during resolution
let high = loadHighScore();
let lastSwapDest: { r: number; c: number } | null = null;
let gameOver = false;
let dragStart: { r: number; c: number } | null = null;

// ---- Scoring summary (display only) ----
function scoringSummary(): string {
  const per = USER_SCORING?.perCell ?? 10;

  const exact = (USER_SCORING?.bonuses?.exact || {}) as Record<string, number>;
  const atLeast = (USER_SCORING?.bonuses?.atLeast || {}) as Record<string, number>;

  const exactKeys = Object.keys(exact).sort((a, b) => Number(a) - Number(b));
  const atLeastKeys = Object.keys(atLeast).sort((a, b) => Number(a) - Number(b));

  const exactText =
    exactKeys.length > 0 ? exactKeys.map((k) => `for ${k}: ${exact[k as any]} pts`).join(", ") : "none";

  const atLeastText =
    atLeastKeys.length > 0
      ? atLeastKeys.map((k) => `${k}+ cells: +${atLeast[k]} pts`).join(" | ")
      : "none";

  return "Scoring: " + per + " pts/cell; bonus " + exactText + ".";
}

// ---- HUD helper ----
function updateHUD() {
  hud.textContent = `Score: ${score} | High: ${high} | Moves: ${moves}`;
  hud.title = scoringSummary();
}

// ---- Small async helpers ----
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function flashMatches(matches: { r: number; c: number }[], durationMs = 220): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const alpha = 0.4 + 0.6 * Math.sin(t * Math.PI * 3);
      renderBoard(ctx, board, { highlight: matches, alpha, gameOver });
      if (t >= 1) resolve();
      else requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

// ---- Pulse animation when cashing in a special gem ----
function animatePulse(maxScale = 1.06, durationMs = 160): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const scale = 1 + (maxScale - 1) * phase;

      renderBoard(ctx, board, { gameOver, pulse: scale });

      if (t >= 1) resolve();
      else requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

// ---- Detect if this match "cashes in" any special gem ----
function usedSpecialGem(b: number[][], matches: { r: number; c: number }[]): boolean {
  for (const cell of matches) {
    const r = cell.r;
    const c = cell.c;
    const row = b[r];
    if (!row) continue;
    const v = row[c];
    if (typeof v !== "number" || v < 0) continue;
    if (isPowerGem(v) || isHypercube(v)) return true;
  }
  return false;
}

// ---- Game-over detection: does ANY swap create a match? ----
function cloneBoard(b: number[][]): number[][] {
  return b.map((row) => row.slice());
}

function hasAnyValidMove(b: number[][]): boolean {
  const rows = b.length;
  const cols = rows > 0 ? (b[0] ? b[0]!.length : 0) : 0;

  for (let r = 0; r < rows; r++) {
    const row = b[r];
    if (!row) continue;

    for (let c = 0; c < cols; c++) {
      const v = row[c];
      if (typeof v !== "number" || v < 0) continue;

      const dirs = [
        [0, 1],
        [1, 0]
      ] as const;

      for (const [dr, dc] of dirs) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (r2 >= rows || c2 >= cols) continue;

        const v2 = b[r2]?.[c2];
        if (typeof v2 !== "number" || v2 < 0) continue;

        const copy = cloneBoard(b);
        if (trySwap(copy as any, r, c, r2, c2)) return true;
      }
    }
  }

  return false;
}

// ---- Core: swap + resolve helper (used by tap and slide) ----
async function doSwapAndResolve(a: { r: number; c: number }, b: { r: number; c: number }) {
  console.log("[input] Attempt swap", { a, b });

  const swapped = trySwap(board, a.r, a.c, b.r, b.c);
  if (!swapped) {
    console.log("[input] Swap rejected (no match).");
    renderBoard(ctx, board, { gameOver });
    return;
  }

  moves++;
  lastSwapDest = { r: b.r, c: b.c };
  updateHUD();

  try {
    await resolveBoard();
  } catch (e) {
    console.warn("[doSwapAndResolve] resolveBoard failed:", e);
  }
}

// ---- Resolve helper: match -> flash -> clear -> collapse -> refill (repeat until stable) ----
async function resolveBoard() {
  if (isResolving) return;
  isResolving = true;

  let chain = 1;
  let preferred = lastSwapDest;
  lastSwapDest = null;

  try {
    let pass = 0;
    const maxPasses = 80;

    while (pass < maxPasses) {
      pass++;

      const matches = findMatches(board);
      console.log(`[resolveBoard] pass=${pass} matches=${matches.length}`);
      if (matches.length === 0) break;

      const specialUsed = usedSpecialGem(board, matches);

      // Slow motion ONLY when a special is actually being cleared
      const flashMs = specialUsed ? SLOW_FLASH_MS : FLASH_MS;
      const pulseMs = specialUsed ? SLOW_PULSE_MS : PULSE_MS;
      const pauseMs = specialUsed ? SLOW_CASCADE_PAUSE_MS : CASCADE_PAUSE_MS;

      await flashMatches(matches, flashMs);

      const basePoints = clearAndScore(board, matches, preferred);
      preferred = null;

      if (specialUsed) {
        await animatePulse(1.06, pulseMs);
      }

      if (basePoints > 0) {
        score += basePoints * chain;
        if (score > high) high = maybeUpdateHighScore(score);
      }

      collapse(board);
      refill(board);

      renderBoard(ctx, board, { gameOver });

      chain++;
      await delay(pauseMs);
    }
  } catch (e) {
    console.warn("[resolveBoard] error:", e);
  } finally {
    isResolving = false;

    gameOver = !hasAnyValidMove(board);

    updateHUD();
    renderBoard(ctx, board, { gameOver });

    if (gameOver) {
      hud.textContent += " | No moves – Game Over";
    }
  }
}

// ---- Input: tap or slide to attempt a swap ----
function handlePointerDown(ev: MouseEvent | PointerEvent | TouchEvent) {
  console.log("pointerdown fired", { isResolving, firstPick, gameOver, type: (ev as any).type });

  if (isResolving || gameOver) return;

  const picked = pickCellAt(board, canvas!, ev);
  if (!picked) {
    console.warn("[handlePointerDown] No cell picked.");
    dragStart = null;
    return;
  }

  dragStart = picked;
}

async function handlePointerUp(ev: MouseEvent | PointerEvent | TouchEvent) {
  console.log("pointerup fired", { isResolving, firstPick, gameOver, type: (ev as any).type });

  if (isResolving || gameOver) return;

  const endCell = pickCellAt(board, canvas!, ev);
  if (!endCell) {
    dragStart = null;
    return;
  }

  const start = dragStart ?? endCell;
  dragStart = null;

  const dr = endCell.r - start.r;
  const dc = endCell.c - start.c;
  const manhattan = Math.abs(dr) + Math.abs(dc);

  if (manhattan === 0) {
    const cell = endCell;

    if (!firstPick) {
      firstPick = cell;
      renderBoard(ctx, board, { selected: cell, gameOver });
      return;
    }

    const a = firstPick;
    const b = cell;

    if (a.r === b.r && a.c === b.c) {
      firstPick = null;
      renderBoard(ctx, board, { gameOver });
      return;
    }

    const tapDist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    if (tapDist !== 1) {
      firstPick = b;
      renderBoard(ctx, board, { selected: b, gameOver });
      return;
    }

    firstPick = null;
    await doSwapAndResolve(a, b);
    return;
  }

  if (manhattan === 1) {
    firstPick = null;
    await doSwapAndResolve(start, endCell);
    return;
  }

  firstPick = endCell;
  renderBoard(ctx, board, { selected: endCell, gameOver });
}

// ---- Wire up events ----
canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointerup", handlePointerUp);

document.getElementById("clear-data")?.addEventListener("click", () => {
  clearHighScore();
  high = 0;
  updateHUD();
});

document.getElementById("restart-btn")?.addEventListener("click", () => {
  board = createBoard();
  score = 0;
  moves = 0;
  firstPick = null;
  lastSwapDest = null;
  gameOver = false;
  dragStart = null;

  renderBoard(ctx, board, { gameOver });
  resolveBoard()
    .then(() => console.log("[restart] resolve complete"))
    .catch((e) => console.warn("[restart] resolve failed:", e))
    .finally(() => updateHUD());
});

// ---- Initial draw ----
renderBoard(ctx, board, { gameOver });
updateHUD();
