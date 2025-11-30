// ============================================================
// File: src/core/match.ts
// Purpose: Find horizontal/vertical matches on the board
// ------------------------------------------------------------
// - A match is any run of length >= 3 of the same non-negative value.
// - Strict-mode safe (no possibly-undefined warnings).
// - Exports both a mask-based finder and a cell-list finder.
// ============================================================

import type { Board } from "./grid";

export type CellRC = { r: number; c: number };

/** Allocate a false-filled mask. */
function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = new Array<boolean>(cols).fill(false);
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

/** Mark cells [start..end] in a row on the given mask. */
function markRow(mask: boolean[][], r: number, start: number, end: number): void {
  const row = mask[r]!;
  for (let c = start; c <= end; c++) row[c] = true;
}

/** Mark cells [start..end] in a column on the given mask. */
function markCol(mask: boolean[][], c: number, start: number, end: number): void {
  for (let r = start; r <= end; r++) {
    mask[r]![c] = true;
  }
}

/**
 * Internal: build a boolean mask of matches.
 * Returns a mask: true where the cell should be cleared.
 */
export function findMatchesMask(board: Board): boolean[][] {
  const rows = board.length;
  if (rows === 0) return [];
  const cols = board[0]!.length;
  if (cols === 0) return makeMask(0, 0);

  const mask = makeMask(rows, cols);

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    let c = 0;
    while (c < cols) {
      const val = row[c]!;
      if (val < 0) {
        c++;
        continue;
      }
      let start = c;
      c++;
      while (c < cols && row[c]! === val) c++;
      const runLen = c - start;
      if (runLen >= 3) markRow(mask, r, start, c - 1);
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const val = board[r]![c]!;
      if (val < 0) {
        r++;
        continue;
      }
      let start = r;
      r++;
      while (r < rows && board[r]![c]! === val) r++;
      const runLen = r - start;
      if (runLen >= 3) markCol(mask, c, start, r - 1);
    }
  }

  return mask;
}

/**
 * Public: return matched cells as a list of { r, c }.
 * This is what your resolve loop expects.
 */
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

/** Combine masks if needed. */
export function combineMatches(a: boolean[][], b: boolean[][]): boolean[][] {
  const rows = Math.max(a.length, b.length);
  const cols = rows > 0 ? Math.max(a[0]!.length, b[0]!.length) : 0;
  const out = makeMask(rows, cols);
  for (let r = 0; r < rows; r++) {
    const ar = a[r] || [];
    const br = b[r] || [];
    const or = out[r]!;
    for (let c = 0; c < cols; c++) {
      or[c] = ar[c] === true || br[c] === true;
    }
  }
  return out;
}
