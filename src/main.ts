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
//import { isPowerGem, isHypercube } from "./core/cell";
import {
  isPowerGem,
  isHypercube,
  FLAG_POWER,
  FLAG_HYPERCUBE
} from "./core/cell";


let score = 0;
let moves = 0;
let firstPick: { r: number; c: number } | null = null;
let isResolving = false; // to prevent input during resolution
let high = loadHighScore();
let lastSwapDest: { r: number; c: number } | null = null;
let gameOver = false;
let dragStart: { r: number; c: number } | null = null;

// Base color aliases (from config.ts order)
const R = 0, G = 1, O = 2, P = 3, B = 4, Y = 5, W = 6;

// ================= DEBUG TEST BOARD =================
function useTestBoardFromURL(): boolean {
  return new URLSearchParams(window.location.search).has("test");
}

// Base color aliases (from config.ts order)
const R = 0, G = 1, O = 2, P = 3, B = 4, Y = 5, W = 6;

// Flags
const S = FLAG_POWER;     // ★
const D = FLAG_HYPERCUBE; // ◆

function makeTestBoard(): number[][] {
  return [
    [R, G, O, P, B, Y, W, R],
    [G, O, P, B, Y, W, R, G],
    [O, P, G, Y, W, R, G, O],
    [P, B, Y, W, R, G, O, P],
    [B, Y, W, R, D | W, O, P, B],
    [Y, W, R, G, O, P, B, Y],
    [W, R, G, O, P, B, Y, W],
    [R, G, O, P, B, Y, W, R],
  ];
}

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
  hud.textContent = `Score: ${score} | High: ${high} | Moves: ${moves} | Speed: ${speed.name} (press S)`;
  hud.title = scoringSummary();
}

// ---- Small async helpers ----
function delay(ms: number) {
  // Global speed factor affects all cascade pacing
  return new Promise<void>((resolve) => setTimeout(resolve, Math.round(ms * speed.factor)));
}

function flashMatches(matches: { r: number; c: number }[], durationMs = 220): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (durationMs * speed.factor));
      // Pulsing alpha from 0.4 to 1.0
      const alpha = 0.4 + 0.6 * Math.sin(t * Math.PI * 3);
      renderBoard(ctx, board, { highlight: matches, alpha, gameOver });
      if (t >= 1) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  });
}

// ---- Pulse animation when cashing in a special gem ----
function animatePulse(maxScale = 1.06, durationMs = 160): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (durationMs * speed.factor));

      // Grow then shrink in one cycle: 0 → 1 → 0
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2; // 0..1..0
      const scale = 1 + (maxScale - 1) * phase;

      renderBoard(ctx, board, { gameOver, pulse: scale });

      if (t >= 1) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
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
    if (isPowerGem(v) || isHypercube(v)) {
      return true;
    }
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

      // Only need to test right and down neighbors to cover all pairs
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

        // Work on a copy so we don't disturb the real board
        const copy = cloneBoard(b);
        if (trySwap(copy as any, r, c, r2, c2)) {
          return true;
        }
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

      // 1) show what is about to clear
      await flashMatches(matches, 240);

      // 2) CLEAR and PAUSE so you can see the “holes”
      const basePoints = clearAndScore(board, matches, preferred);
      preferred = null;

      renderBoard(ctx, board, { gameOver });
      await delay(250);

      // Optional “special used” pulse (also slowed)
      if (specialUsed) {
        await animatePulse(1.06, 160);
        await delay(160);
      }

      // scoring
      if (basePoints > 0) {
        score += basePoints * chain;
        if (score > high) {
          high = maybeUpdateHighScore(score);
        }
      }
      updateHUD();

      // 3) COLLAPSE and PAUSE so you can see rocks drop
      collapse(board);
      renderBoard(ctx, board, { gameOver });
      await delay(350);

      // 4) REFILL and PAUSE so you can see new rocks appear
      refill(board);
      renderBoard(ctx, board, { gameOver });
      await delay(350);

      chain++;
      await delay(120); // between cascade passes
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

// Pointer down: remember where the drag started
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

// Pointer up: decide if this was a tap or a slide, then act
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

  // Case 1: tap
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

  // Case 2: slide to adjacent cell
  if (manhattan === 1) {
    firstPick = null;
    await doSwapAndResolve(start, endCell);
    return;
  }

  // Case 3: slide farther than 1 cell -> treat like select end cell
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
board = USE_TEST_BOARD ? makeTestBoard() : createBoard();
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
