// ============================================================
// File: src/main.ts
// RockSwap main entry
// ------------------------------------------------------------
// - Sets up the canvas and HUD.
// - Creates and manages the board.
// - Handles input (tap-to-swap).
// - Resolves matches and cascades.
// - Updates the score and redraws the board.
// ============================================================

import { CellKind, type Cell } from "./core/cell";
import {
  ScoreState,
  createScoreState,
  beginMoveScoring,
  applyLineClears,
} from "./core/scoring";
import { findMatchesList, type CellRC } from "./core/match";
import { swapCells, canSwap, areAdjacent } from "./core/swap";
import { renderGame, type Board, type CellPos } from "./systems/renderer";
import { createInitialBoard, dropAndRefillBoard } from "./core/grid";

// -------------------- Game state --------------------

interface GameState {
  board: Board;
  score: ScoreState;
  selected: CellPos | null;
  hover: CellPos | null;
  // If we later add animations, a flag can go here.
}

const state: GameState = {
  board: [],
  score: createScoreState(),
  selected: null,
  hover: null,
};

// -------------------- DOM setup --------------------

const canvas = document.getElementById("board") as HTMLCanvasElement | null;
const hud = document.getElementById("hud") as HTMLDivElement | null;

if (!canvas || !hud) {
  throw new Error("Missing board canvas or HUD element in index.html.");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Could not get 2D context from canvas.");
}

// Resize canvas to match CSS size and device pixel ratio.
function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

window.addEventListener("resize", () => {
  resizeCanvas();
  drawFrame();
});

// -------------------- Board + score helpers --------------------

function startNewGame(): void {
  state.board = createInitialBoard();
  state.score = createScoreState();
  state.selected = null;
  state.hover = null;
  updateHud();
  drawFrame();
}

/**
 * Convert pointer coordinates to board row/column, if any.
 */
function hitTestBoard(clientX: number, clientY: number): CellPos | null {
  const { board } = state;
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  if (rows === 0 || cols === 0) return null;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const x = (clientX - rect.left) * dpr;
  const y = (clientY - rect.top) * dpr;

  // Layout must match renderer.ts
  const cellSize = Math.floor(
    Math.min(canvas.width / cols, canvas.height / rows)
  );
  const boardWidth = cellSize * cols;
  const boardHeight = cellSize * rows;
  const offsetX = (canvas.width - boardWidth) / 2;
  const offsetY = (canvas.height - boardHeight) / 2;

  if (
    x < offsetX ||
    y < offsetY ||
    x >= offsetX + boardWidth ||
    y >= offsetY + boardHeight
  ) {
    return null;
  }

  const c = Math.floor((x - offsetX) / cellSize);
  const r = Math.floor((y - offsetY) / cellSize);

  if (r < 0 || c < 0 || r >= rows || c >= cols) {
    return null;
  }

  return { r, c };
}

// -------------------- Match resolution + scoring --------------------

/**
 * Remove matched cells, drop rocks down, refill, and score.
 * This function runs all cascades for a single move.
 */
function resolveBoardAfterMove(): void {
  const { board, score } = state;

  // Start a new chain for scoring.
  beginMoveScoring(score);

  let chainHasMatches = false;
  let chainIndex = 0;

  while (true) {
    const matches: CellRC[] = findMatchesList(board);
    if (matches.length === 0) break;

    chainHasMatches = true;
    chainIndex += 1;

    // Very simple scoring: treat all cleared cells as one combined line.
    // This preserves the feel of "more cleared = more points" while
    // keeping main.ts independent of run grouping details.
    const runLengths = [matches.length];

    const stepPoints = applyLineClears(score, runLengths);
    // chainIndex is also tracked inside score, but if we want, we
    // could log or display it here.

    // Clear matched cells.
    for (const { r, c } of matches) {
      const cell = board[r][c];
      // Only clear if it really contains a rock.
      if (cell.kind !== CellKind.Empty) {
        board[r][c] = { kind: CellKind.Empty, color: cell.color };
      }
    }

    // Drop and refill to close gaps.
    dropAndRefillBoard(board);
  }

  if (chainHasMatches) {
    updateHud();
  }
}

// -------------------- Input handling --------------------

function handlePointerDown(ev: PointerEvent): void {
  const pos = hitTestBoard(ev.clientX, ev.clientY);
  if (!pos) {
    state.selected = null;
    state.hover = null;
    drawFrame();
    return;
  }

  if (!state.selected) {
    // First tap: select this rock.
    state.selected = pos;
    state.hover = null;
    drawFrame();
    return;
  }

  // Second tap: attempt a swap if adjacent.
  const from = state.selected;
  const to = pos;

  if (!areAdjacent(from.r, from.c, to.r, to.c)) {
    // Not adjacent: just move selection.
    state.selected = pos;
    state.hover = null;
    drawFrame();
    return;
  }

  if (!canSwap(state.board, from.r, from.c, to.r, to.c)) {
    // Swap not allowed.
    state.selected = null;
    state.hover = null;
    drawFrame();
    return;
  }

  // Perform the swap.
  swapCells(state.board, from.r, from.c, to.r, to.c);

  // Resolve matches and cascades.
  resolveBoardAfterMove();

  // Clear selection after a completed move.
  state.selected = null;
  state.hover = null;
  drawFrame();
}

function handlePointerMove(ev: PointerEvent): void {
  const pos = hitTestBoard(ev.clientX, ev.clientY);
  state.hover = pos;
  drawFrame();
}

function handlePointerLeave(): void {
  state.hover = null;
  drawFrame();
}

// -------------------- HUD + render loop --------------------

function updateHud(): void {
  hud.textContent = `Score: ${state.score.total}`;
}

function drawFrame(): void {
  renderGame({
    canvas,
    ctx,
    board: state.board,
    selected: state.selected,
    hover: state.hover,
    swell: 1.0,
  });
}

// -------------------- Boot --------------------

function boot(): void {
  resizeCanvas();

  // Set up input listeners.
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("pointercancel", handlePointerLeave);
  canvas.addEventListener("pointerup", () => {
    // For now, pointer up does not change behavior separately.
  });

  startNewGame();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
