// ============================================================
// File: src/core/match.ts
// Purpose: Find horizontal/vertical matches on the board
// ------------------------------------------------------------
// - A match is any run of length >= 3 of the same non-negative
//   *base color*.
// - Wildcard (hypercube / "diamond") cells match any color.
// - Strict-mode safe (no possibly-undefined warnings).
// - Exports both a mask-based finder and a cell-list finder.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isHypercube } from "./cell";

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
 *
 * Matching rule:
 * - Empty (< 0) breaks runs.
 * - Wildcards (isHypercube) fit into any run.
 * - The run's "color" is the first non-wildcard color encountered.
 * - A run of only wildcards is ignored (doesn't count as a match).
 */
export function findMatchesMask(board: Board): boolean[][] {
  const rows = board.length;
  if (rows === 0) return [];
  const cols = board[0]!.length;
  if (cols === 0) return makeMask(0, 0);

  const mask = makeMask(rows, cols);

  // ----------------------------------------------------------
  // Horizontal runs
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

      let color = baseColor(v0);
      let haveColor = !isHypercube(v0);

      const start = c;
      c++;

      while (c < cols) {
        const v = row[c]!;
        if (v < 0) break;

        if (isHypercube(v)) {
          c++;
          continue; // wildcard always fits
        }

        const bc = baseColor(v);

        if (!haveColor) {
          color = bc;          // first real color in this run
          haveColor = true;
          c++;
          continue;
        }

        if (bc !== color) break;
        c++;
      }

      const runLen = c - start;
      if (haveColor && runLen >= 3) {
        markRow(mask, r, start, c - 1);
      }
    }
  }

  // ----------------------------------------------------------
  // Vertical runs
  // ----------------------------------------------------------
  for (let c = 0; c < cols; c++) {
    let r = 0;

    while (r < rows) {
      const v0 = board[r]![c]!;
      if (v0 < 0) {
        r++;
        continue;
      }

      let color = baseColor(v0);
      let haveColor = !isHypercube(v0);

      const start = r;
      r++;

      while (r < rows) {
        const v = board[r]![c]!;
        if (v < 0) break;

        if (isHypercube(v)) {
          r++;
          continue; // wildcard always fits
        }

        const bc = baseColor(v);

        if (!haveColor) {
          color = bc;          // first real color in this run
          haveColor = true;
          r++;
          continue;
        }

        if (bc !== color) break;
        r++;
      }

      const runLen = r - start;
      if (haveColor && runLen >= 3) {
        markCol(mask, c, start, r - 1);
      }
    }
  }

  return mask;
}

/**
 * Public: return matched cells as a list of { r, c }.
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

/**
 * Compatibility alias (some versions call this findMatchesList).
 */
export function findMatchesList(board: Board): CellRC[] {
  return findMatches(board);
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
