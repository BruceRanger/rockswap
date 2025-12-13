// ============================================================
// File: src/core/match.ts
// Purpose: Find horizontal/vertical matches on the board
// ------------------------------------------------------------
// - A match is any run of length >= 3 of the same non-negative
//   *base color*.
// - Hypercubes act as WILDCARDS: they match any color.
// - Strict-mode safe.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isHypercube } from "./cell";

export type CellRC = { r: number; c: number };

/** Allocate a false-filled mask. */
function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) out[r] = new Array<boolean>(cols).fill(false);
  return out;
}

/** Mark cells [start..end] in a row on the given mask. */
function markRow(mask: boolean[][], r: number, start: number, end: number): void {
  const row = mask[r]!;
  for (let c = start; c <= end; c++) row[c] = true;
}

/** Mark cells [start..end] in a column on the given mask. */
function markCol(mask: boolean[][], c: number, start: number, end: number): void {
  for (let r = start; r <= end; r++) mask[r]![c] = true;
}

/**
 * Choose a "run color" starting at (r,c) when the first cell may be a wildcard.
 * If the start is a hypercube, we look ahead to find the first non-hypercube
 * in the run and use its baseColor. If none exists, return -1.
 */
function pickRunColorRow(row: number[], startC: number, cols: number): number {
  const v0 = row[startC]!;
  if (!isHypercube(v0)) return baseColor(v0);

  for (let cc = startC + 1; cc < cols; cc++) {
    const v = row[cc]!;
    if (v < 0) break; // end of segment
    if (!isHypercube(v)) return baseColor(v);
  }
  return -1;
}

function pickRunColorCol(board: Board, startR: number, c: number, rows: number): number {
  const v0 = board[startR]![c]!;
  if (!isHypercube(v0)) return baseColor(v0);

  for (let rr = startR + 1; rr < rows; rr++) {
    const v = board[rr]![c]!;
    if (v < 0) break; // end of segment
    if (!isHypercube(v)) return baseColor(v);
  }
  return -1;
}

function matchesColor(v: number, color: number): boolean {
  if (v < 0) return false;
  return isHypercube(v) || baseColor(v) === color;
}

/** Build a boolean mask of matches. */
export function findMatchesMask(board: Board): boolean[][] {
  const rows = board.length;
  if (rows === 0) return [];
  const cols = board[0]!.length;
  if (cols === 0) return makeMask(0, 0);

  const mask = makeMask(rows, cols);

  // ----------------------------------------------------------
  // Horizontal runs (hypercube wildcard)
  // ----------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    let c = 0;

    while (c < cols) {
      const v0 = row[c]!;
      if (v0 < 0) {
        c++;
        continue;
      }

      const color = pickRunColorRow(row, c, cols);
      if (color < 0) {
        // segment is only hypercubes until an empty; can't form a colored match
        c++;
        continue;
      }

      const start = c;
      c++;

      while (c < cols) {
        const v = row[c]!;
        if (v < 0) break;
        if (!matchesColor(v, color)) break;
        c++;
      }

      const runLen = c - start;
      if (runLen >= 3) markRow(mask, r, start, c - 1);
    }
  }

  // ----------------------------------------------------------
  // Vertical runs (hypercube wildcard)
  // ----------------------------------------------------------
  for (let c = 0; c < cols; c++) {
    let r = 0;

    while (r < rows) {
      const v0 = board[r]![c]!;
      if (v0 < 0) {
        r++;
        continue;
      }

      const color = pickRunColorCol(board, r, c, rows);
      if (color < 0) {
        r++;
        continue;
      }

      const start = r;
      r++;

      while (r < rows) {
        const v = board[r]![c]!;
        if (v < 0) break;
        if (!matchesColor(v, color)) break;
        r++;
      }

      const runLen = r - start;
      if (runLen >= 3) markCol(mask, c, start, r - 1);
    }
  }

  return mask;
}

/** Return matched cells as a list of { r, c }. */
export function findMatches(board: Board): CellRC[] {
  const mask = findMatchesMask(board);
  const out: CellRC[] = [];
  for (let r = 0; r < mask.length; r++) {
    const row = mask[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === true) out.push({ r, c });
    }
  }
  return out;
}

/** True if any cell in the mask is true. */
export function hasAny(mask: boolean[][]): boolean {
  for (let r = 0; r < mask.length; r++) {
    const row = mask[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === true) return true;
    }
  }
  return false;
}

/** Combine masks if needed. */
export function combineMatches(a: boolean[][], b: boolean[][]): boolean[][] {
  const rows = Math.max(a.length, b.length);
  const cols = rows > 0 ? Math.max(a[0]!.length, b[0]!.length) : 0;
  const out = makeMask(rows, cols);

  for (let r = 0; r < rows; r++) {
    const ar = a[r] || [];
    const br = b[r] || [];
    const or = out[r]!;
    for (let c = 0; c < cols; c++) or[c] = ar[c] === true || br[c] === true;
  }

  return out;
}
