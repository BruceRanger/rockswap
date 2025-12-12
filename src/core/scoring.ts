// ============================================================
// File: src/core/scoring.ts
// Purpose:
//   - Classic-style Bejeweled 2 scoring & special gems.
//   - Clear matched cells using mask logic.
//   - Create Power Gems (4-in-a-row only) and Hypercubes (5-in-a-row).
//   - Ensure newly created specials do NOT explode immediately.
//   - Expand clears for existing Power Gems / Hypercubes.
//   - Return base points earned for this pass.
// ============================================================

import type { Board } from "./grid";
import type { CellRC } from "./match";
import {
  baseColor as getBaseColor,
  isPowerGem,
  isHypercube,
  FLAG_POWER,
  FLAG_HYPERCUBE
} from "./cell";

const DEBUG_SPECIALS = true;

// ------------------------------------------------------------
// User-visible scoring config (for HUD summary)
// ------------------------------------------------------------

export const USER_SCORING = {
  perCell: 10,
  bonuses: {
    exact: { 4: 0, 5: 0 },
    atLeast: {}
  }
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) out[r] = new Array(cols).fill(false);
  return out;
}

function inBounds(board: Board, r: number, c: number): boolean {
  const { rows, cols } = dims(board);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function buildBaseMask(board: Board, matches: CellRC[]): boolean[][] {
  const { rows, cols } = dims(board);
  const mask = makeMask(rows, cols);
  for (const cell of matches) {
    if (inBounds(board, cell.r, cell.c)) mask[cell.r]![cell.c] = true;
  }
  return mask;
}

// ------------------------------------------------------------
// Run detection (3/4/5 runs for power & hypercube)
// ------------------------------------------------------------

type Run = {
  kind: "H" | "V";
  color: number;
  row: number;
  col: number;
  start: number;
  len: number;
};

function findAllRuns(board: Board): Run[] {
  const { rows, cols } = dims(board);
  const runs: Run[] = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const v = board[r]?.[c];
      if (typeof v !== "number" || v < 0) {
        c++;
        continue;
      }
      const color = getBaseColor(v);
      let start = c;
      c++;
      while (
        c < cols &&
        typeof board[r]?.[c] === "number" &&
        getBaseColor(board[r]![c]!) === color
      ) {
        c++;
      }
      const len = c - start;
      if (len >= 3) runs.push({ kind: "H", color, row: r, col: -1, start, len });
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const v = board[r]?.[c];
      if (typeof v !== "number" || v < 0) {
        r++;
        continue;
      }
      const color = getBaseColor(v);
      let start = r;
      r++;
      while (
        r < rows &&
        typeof board[r]?.[c] === "number" &&
        getBaseColor(board[r]![c]!) === color
      ) {
        r++;
      }
      const len = r - start;
      if (len >= 3) runs.push({ kind: "V", color, row: -1, col: c, start, len });
    }
  }

  return runs;
}

// ------------------------------------------------------------
// Special-gem selection
// Uses optional `preferred` cell to override where to place the gem.
// ------------------------------------------------------------

type SpecialGem = { r: number; c: number; type: "power" | "hypercube" };

function pickSpecialGem(
  board: Board,
  mask: boolean[][],
  preferred: CellRC | null
): SpecialGem | null {
  const runs = findAllRuns(board);

  if (runs.length === 0) return null;

  // Helper
  const isMatched = (r: number, c: number) => inBounds(board, r, c) && mask[r]![c] === true;

  // If player moved a gem into place, we will prefer that cell
  // *AS LONG AS it is part of a suitable run*.

  // ------------------------------
  // 1) Hypercube = 5+ run
  // ------------------------------
  for (const run of runs) {
    if (run.len >= 5) {
      let r, c;

      if (preferred) {
        if (
          run.kind === "H" &&
          preferred.r === run.row &&
          preferred.c >= run.start &&
          preferred.c < run.start + run.len &&
          isMatched(preferred.r, preferred.c)
        ) {
          r = preferred.r;
          c = preferred.c;
        } else if (
          run.kind === "V" &&
          preferred.c === run.col &&
          preferred.r >= run.start &&
          preferred.r < run.start + run.len &&
          isMatched(preferred.r, preferred.c)
        ) {
          r = preferred.r;
          c = preferred.c;
        } else {
          // fallback: center of run
          if (run.kind === "H") {
            r = run.row;
            c = run.start + Math.floor((run.len - 1) / 2);
          } else {
            c = run.col;
            r = run.start + Math.floor((run.len - 1) / 2);
          }
        }
      } else {
        // no preferred at all → center of run
        if (run.kind === "H") {
          r = run.row;
          c = run.start + Math.floor((run.len - 1) / 2);
        } else {
          c = run.col;
          r = run.start + Math.floor((run.len - 1) / 2);
        }
      }

      if (isMatched(r, c)) {
        if (DEBUG_SPECIALS) console.log("SPECIAL: HYPERCUBE @", { r, c });
        return { r, c, type: "hypercube" };
      }
    }
  }

  // -----------------------------------
  // 2) Power Gem = 4-in-a-row (ONLY)
  // -----------------------------------
  for (const run of runs) {
    if (run.len === 4) {
      let r, c;

      if (preferred) {
        if (
          run.kind === "H" &&
          preferred.r === run.row &&
          preferred.c >= run.start &&
          preferred.c < run.start + run.len &&
          isMatched(preferred.r, preferred.c)
        ) {
          r = preferred.r;
          c = preferred.c;
        } else if (
          run.kind === "V" &&
          preferred.c === run.col &&
          preferred.r >= run.start &&
          preferred.r < run.start + run.len &&
          isMatched(preferred.r, preferred.c)
        ) {
          r = preferred.r;
          c = preferred.c;
        } else {
          // fall back: run.start + 1
          if (run.kind === "H") {
            r = run.row;
            c = run.start + 1;
          } else {
            c = run.col;
            r = run.start + 1;
          }
        }
      } else {
        // no preferred → run.start + 1
        if (run.kind === "H") {
          r = run.row;
          c = run.start + 1;
        } else {
          c = run.col;
          r = run.start + 1;
        }
      }

      if (isMatched(r, c)) {
        if (DEBUG_SPECIALS) console.log("SPECIAL: POWER @", { r, c });
        return { r, c, type: "power" };
      }
    }
  }

  return null;
}

// ------------------------------------------------------------
// Apply special (write it to board)
// ------------------------------------------------------------

function applySpecialCreation(board: Board, mask: boolean[][], special: SpecialGem | null) {
  if (!special) return;

  const { r, c, type } = special;
  if (!inBounds(board, r, c)) return;

  const v = board[r]![c];
  if (typeof v !== "number" || v < 0) return;

  const color = getBaseColor(v);
  mask[r]![c] = false; // prevent immediate clearing

  board[r]![c] = type === "power" ? color | FLAG_POWER : color | FLAG_HYPERCUBE;
}

// ------------------------------------------------------------
// Power Gem (3x3) and Hypercube expansion
// ------------------------------------------------------------

function expandForPowerGems(board: Board, mask: boolean[][]) {
  const { rows, cols } = dims(board);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] && isPowerGem(board[r]![c]!)) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (inBounds(board, r + dr, c + dc)) mask[r + dr]![c + dc] = true;
      }
    }
  }
}

function expandForHypercubes(board: Board, mask: boolean[][]) {
  const { rows, cols } = dims(board);
  const wipe: number[] = [];

  // Which hypercubes are being cleared?
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (mask[r]![c] && isHypercube(board[r]![c]!)) {
        const color = getBaseColor(board[r]![c]!);
        if (!wipe.includes(color)) wipe.push(color);
      }

  if (wipe.length === 0) return;

  // Wipe all gems of those colors
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = board[r]![c];
      if (typeof v === "number" && v >= 0 && wipe.includes(getBaseColor(v))) {
        mask[r]![c] = true;
      }
    }
}

// ------------------------------------------------------------
// Apply clear
// ------------------------------------------------------------

function applyClearMask(board: Board, mask: boolean[][]): number {
  const { rows, cols } = dims(board);
  let cleared = 0;

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (mask[r]![c] && typeof board[r]![c] === "number" && board[r]![c]! >= 0) {
        board[r]![c] = -1;
        cleared++;
      }

  return cleared;
}

// ------------------------------------------------------------
// PUBLIC — clear + score + special gem placement
// ------------------------------------------------------------

export function clearAndScore(
  board: Board,
  matches: CellRC[],
  preferred: CellRC | null = null
): number {
  if (!matches.length) return 0;

  const mask = buildBaseMask(board, matches);

  const special = pickSpecialGem(board, mask, preferred);
  applySpecialCreation(board, mask, special);

  expandForPowerGems(board, mask);
  expandForHypercubes(board, mask);

  const cleared = applyClearMask(board, mask);
  return cleared * USER_SCORING.perCell;
}
