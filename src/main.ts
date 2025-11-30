console.log("[RockSwap] main.ts loaded");
// ============================================================
// File: src/main.ts
// Purpose: Draw the board, active piece, and "next" preview
// ------------------------------------------------------------
// Adds optional highlight overlay for matched cells.
// ============================================================

import packageInfo from "../package.json";

import { createBoard } from "./core/grid";
import { findMatches, hasAny } from "./core/match";
import { collapse } from "./core/collapse";
import { refill } from "./core/refill";
import { trySwap } from "./core/swap";
import { clearAndScore, USER_SCORING } from "./core/scoring";
import { renderBoard, pickCellAt } from "./systems/renderer";
import { loadHighScore, maybeUpdateHighScore, clearHighScore } from "./systems/highscore";

// Grab document elements
const canvas = document.getElementById("board") as HTMLCanvasElement;
const hud = document.getElementById("hud") as HTMLDivElement;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;

if (versionEl) {
  const updated = new Date(document.lastModified).toISOString().split("T")[0];
  versionEl.textContent = ` • Version: ${packageInfo.version} • Updated: ${updated}`;
}

if (!canvas || !hud || !versionEl) {
  throw new Error(
    "Missing required DOM elements. Ensure canvas, hud, and version exist in index.html."
  );
}

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D canvas context not available");

// Make sure canvas actually receives pointer events (helps on mobile)
canvas.style.touchAction = "none"; // prevents browser gestures from swallowing events
canvas.style.pointerEvents = "auto"; // in case any CSS accidentally disabled it
canvas.tabIndex = 0; // optional: allow focus if you add keyboard later

// ---- Game state ----
let board = createBoard(); // e.g., size 8x8 filled with random cell types
let score = 0;
let moves = 0;
let firstPick: { r: number; c: number } | null = null;
let isResolving = false; // to prevent input during resolution
let high = loadHighScore();

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
  // Hover tooltip to show scoring rules at a glance
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
      renderBoard(ctx!, board, { highlight: matches, alpha });
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

  try {
    let pass = 0;
    const maxPasses = 80;

    while (pass < maxPasses) {
      pass++;

      const matches = findMatches(board); // returns CellRC[]
      console.log(`[resolveBoard] pass=${pass} matches=${matches.length}`);
      if (matches.length === 0) break;

      await flashMatches(matches, 240);

      // base points from clearing
      const basePoints = clearAndScore(board, matches);

      // apply chain multiplier
      const gained = basePoints * chain;
      score += gained;

      // update high immediately after score changes
      const prevHigh = high;
      high = maybeUpdateHighScore(score);

      console.log(
        `[resolveBoard] matches=${matches.length}, basePoints=${basePoints}, chain=${chain}, gained=${gained}, ` +
          (high !== prevHigh ? `NEW HIGH=${high}` : `high=${high}`)
      );

      collapse(board);
      refill(board);
      renderBoard(ctx!, board);

      chain += 1; // next cascade is worth more
      await delay(60);
    }

    if (pass >= maxPasses) {
      console.warn(`[resolveBoard] Hit maxPasses=${maxPasses}. Stopping cascades.`);
    }

    renderBoard(ctx!, board);
    updateHUD();
  } catch (e) {
    console.error("[resolveBoard] error:", e);
  } finally {
    isResolving = false;
    console.log("[resolveBoard] end (normal)");
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

  const cell = pickCellAt(board, canvas!, ev);
  console.log("pickCellAt ->", cell);
  if (!cell) return;

  if (!firstPick) {
    firstPick = cell;
    renderBoard(ctx!, board, { selected: firstPick });
  } else {
    const ok = trySwap(board, firstPick.r, firstPick.c, cell.r, cell.c);
    console.log("trySwap ->", ok);
    if (ok) {
      moves += 1;
      firstPick = null;
      renderBoard(ctx!, board);
      await resolveBoard();
    } else {
      firstPick = null;
      renderBoard(ctx!, board);
    }
  }

  updateHUD();
}

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

  // Redraw and resolve
  renderBoard(ctx, board);
  resolveBoard()
    .then(() => console.log("[restart] resolve complete"))
    .catch((e) => console.warn("[restart] resolve failed:", e))
    .finally(() => updateHUD());
});

// ---- Initial draw (resolve any accidental starting matches) ----
renderBoard(ctx, board);
resolveBoard()
  .then(() => console.log("[init] resolve complete"))
  .catch((e) => console.warn("[init] resolve failed:", e))
  .finally(() => updateHUD());

// Register SW (only in production, and only if supported)
if ("serviceWorker" in navigator) {
  const base = import.meta.env.BASE_URL || "/";
  const buildId = (import.meta as any).env?.VITE_BUILD_ID || Date.now().toString();
  // e.g. /rockswap/service-worker.js?v=abcdef1
  const swUrl = `${base}service-worker.js?v=${encodeURIComponent(buildId)}`;
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.warn("SW register failed:", err);
  });
}

console.log("[RockSwap] main.ts boot", {
  BASE_URL: (import.meta as any).env?.BASE_URL,
  VITE_BUILD_ID: (import.meta as any).env?.VITE_BUILD_ID
});
