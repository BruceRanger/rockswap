// ============================================================
// File: src/core/grid.ts
// Purpose: Board creation & helpers for the match-3 grid
// ------------------------------------------------------------
// - Board cells are integers:
//     0..KINDS-1  = rock color/type
//     -1          = empty cell (after clears, before collapse/refill)
// - Exports a simple board factory with a "no-starting-matches" pass.
// - Strict-mode safe: all indexed accesses are guarded.
// ============================================================

import { BOARD_SIZE, COUNT_OF_ROCK_TYPES } from "../config";

export type Board = number[][];
export const ROWS = BOARD_SIZE;
export const COLS = BOARD_SIZE;
export const KINDS = COUNT_OF_ROCK_TYPES;

/** Create an empty board filled with -1. */
export function makeEmpty(rows = ROWS, cols = COLS): Board {
  const out: number[][] = new Array(rows);
  for (let r = 0; r < rows; r++) out[r] = new Array(cols).fill(-1);
  return out;
}

/** Safe bounds check. */
export function inBounds(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/** Safe getter: returns board[r][c] or undefined if out of range. */
function getCell(b: Board, r: number, c: number): number | undefined {
  const row = b[r];
  if (!row) return undefined;
  if (c < 0 || c >= row.length) return undefined;
  return row[c];
}

/** Safe setter (no-op if out of range). */
function setCell(b: Board, r: number, c: number, v: number): void {
  const row = b[r];
  if (!row) return;
  if (c < 0 || c >= row.length) return;
  row[c] = v;
}

/**
 * Create a fresh board with random rocks and *attempt* to avoid
 * immediate 3+ matches on generation (re-rolls the single cell).
 */
export function createBoard(rows = ROWS, cols = COLS, kinds = KINDS): Board {
  const b = makeEmpty(rows, cols);
  const pick = () => Math.floor(Math.random() * kinds);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let tries = 0;
      while (true) {
        const v = pick();

        // neighbors (strict-safe)
        const left1 = getCell(b, r, c - 1);
        const left2 = getCell(b, r, c - 2);
        const up1 = getCell(b, r - 1, c);
        const up2 = getCell(b, r - 2, c);

        const makesHRun = left1 === v && left2 === v;
        const makesVRun = up1 === v && up2 === v;

        if (!makesHRun && !makesVRun) {
          setCell(b, r, c, v);
          break;
        }
        tries++;
        if (tries > 12) {
          // Give up being perfect; accept to avoid rare infinite loops.
          setCell(b, r, c, v);
          break;
        }
      }
    }
  }
  return b;
}
