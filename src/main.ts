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

// Grab document elements
const canvas = document.getElementById("board") as HTMLCanvasElement | null;
const hud = document.getElementById("hud") as HTMLDivElement | null;
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

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("2D canvas context not available");
}

// Make sure canvas actually receives pointer events (helps on mobile)
canvas.style.touchAction = "none";
canvas.style.pointerEvents = "auto";
canvas.tabIndex = 0;

// ---- Game state ----
let board = createBoard(); // e.g., size 8x8 filled with random cell types
let score = 0;
let moves = 0;
let firstPick: { r: number; c: number } | null = null;
let isResolving = false; // to prevent input during resolution
let high = loadHighScore();
let lastSwapDest: { r: number; c: number } | null = null;

// ---- Scoring summary (display only) ----
function scoringSummary(): string {
  const per = USER_SCORING?.perCell ?? 10;

  const exact = USER_SCORING?.bonuses?.exact || {};
  const atLeast = USER_SCORING?.bonuses?.atLeast || {};

  const exactKeys = Object.keys(exact).sort((a, b) => Number(a) - Number(b));
  const atLeastKeys = Object.keys(atLeast).sort((a, b) => Number(a) - Number(b));

  const exactText =
    exactKeys.length > 0 ? exactKeys.map((k) => `for ${k}: ${exact[k]} pts`).join(", ") : "none";

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
      // Pulsing alpha from 0.4 to 1.0
      const alpha = 0.4 + 0.6 * Math.sin(t * Math.PI * 3);
      renderBoard(ctx, board, { highlight: matches, alpha });
      if (t >= 1) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  });
}

// ---- Resolve helper: match -> flash -> clear -> collapse -> refill (repeat until stable) ----
async function resolveBoard() {
  if (isResolving) return;
  isResolving = true;

  let chain = 1; // increases for each cascade pass
  let preferred = lastSwapDest;
  lastSwapDest = null;

  try {
    let pass = 0;
    const maxPasses = 80;

    while (pass < maxPasses) {
      pass++;

      const matches = findMatches(board); // returns CellRC[]
      console.log(`[resolveBoard] pass=${pass} matches=${matches.length}`);
      if (matches.length === 0) break;

      await flashMatches(matches, 240);

      // base points from clearing (give preferred only on first pass)
      const basePoints = clearAndScore(board, matches, preferred);
      preferred = null; // cascades don't care about the original swap location

      if (basePoints > 0) {
        score += basePoints * chain;
        if (score > high) {
          high = maybeUpdateHighScore(score);
        }
      }

      collapse(board);
      refill(board);

      renderBoard(ctx, board);

      chain++;
      await delay(40); // small pause for cascades
    }
  } catch (e) {
    console.warn("[resolveBoard] error:", e);
  } finally {
    isResolving = false;
    updateHUD();
    renderBoard(ctx, board);
  }
}

// ---- Input: tap/click two adjacent cells to attempt a swap ----
async function handlePick(ev: MouseEvent | PointerEvent | TouchEvent) {
  console.log("pointerdown fired", { isResolving, firstPick, type: (ev as any).type });

  // If we somehow stayed locked, allow a click after watchdog warning
  if (isResolving) {
    console.warn("[handlePick] Ignored click: still resolving.");
    return;
  }

  const picked = pickCellAt(board, canvas, ev);
  if (!picked) {
    console.warn("[handlePick] No cell picked.");
    return;
  }

  // First click: select a cell
  if (!firstPick) {
    firstPick = picked;
    renderBoard(ctx, board, { selected: picked });
    return;
  }

  // Second click: attempt a swap
  const a = firstPick;
  const b = picked;
  firstPick = null;

  // If player clicked the same cell twice, just clear selection
  if (a.r === b.r && a.c === b.c) {
    renderBoard(ctx, board);
    return;
  }

  console.log("[handlePick] Attempt swap", { a, b });

  const swapped = trySwap(board, a.r, a.c, b.r, b.c);
  if (!swapped) {
    console.log("[handlePick] Swap rejected (no match).");
    renderBoard(ctx, board);
    return;
  }

  // Swap is valid:
  moves++;
  lastSwapDest = { r: b.r, c: b.c }; // the moved-to cell for special gem placement
  updateHUD();

  try {
    await resolveBoard();
  } catch (e) {
    console.warn("[handlePick] resolveBoard failed:", e);
  }
}

// ---- Wire up events ----

// Prefer pointer events (works for mouse + touch without 300ms delay)
canvas.addEventListener("pointerdown", handlePick);

document.getElementById("clear-data")?.addEventListener("click", () => {
  clearHighScore();
  high = 0;
  updateHUD();
});

document.getElementById("restart-btn")?.addEventListener("click", () => {
  // Reset game state
  board = createBoard();
  score = 0;
  moves = 0;
  firstPick = null;
  lastSwapDest = null;

  // Redraw and resolve initial matches (if any)
  renderBoard(ctx, board);
  resolveBoard()
    .then(() => console.log("[restart] resolve complete"))
    .catch((e) => console.warn("[restart] resolve failed:", e))
    .finally(() => updateHUD());
});

// ---- Initial draw ----
renderBoard(ctx, board);
updateHUD();
