   // ============================================================
// File: src/core/match.ts
// Purpose: Find horizontal/vertical matches on the board
// ------------------------------------------------------------
// - A match is any run length >= 3 of the same base color,
//   but:
//     * Power gems (★) match as their base color (flags ignored)
//     * Hypercube/Diamond (◆) is a TRUE wildcard:
//         - It matches ANY color in a run
//         - If a run starts with wildcards, it "adopts" the first
//           real color it encounters
// - Strict-mode safe.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isHypercube } from "./cell";

export type CellRC = { r: number; c: number };

function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) out[r] = new Array<boolean>(cols).fill(false);
  return out;
}

export function hasAny(mask: boolean[][]): boolean {
  for (let r = 0; r < mask.length; r++) {
    const row = mask[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === true) return true;
    }
  }
  return false;
}

function markRow(mask: boolean[][], r: number, start: number, end: number): void {
  const row = mask[r]!;
  for (let c = start; c <= end; c++) row[c] = true;
}

function markCol(mask: boolean[][], c: number, start: number, end: number): void {
  for (let r = start; r <= end; r++) mask[r]![c] = true;
}

/**
 * Scan a 1D line (array of cell values) and return segments [start,end]
 * that are matches under wildcard rules.
 *
 * Rule:
 *  - Negative = break (empty)
 *  - Wildcard matches any color
 *  - Run color is the first non-wild cell's baseColor encountered
 *    (wilds at the beginning don't decide the color)
 */
function findWildcardRunsInLine(line: number[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  const n = line.length;

  // Collect all base colors that appear in this line (ignoring wildcards and empties)
  const colors = new Set<number>();
  for (let i = 0; i < n; i++) {
    const v = line[i]!;
    if (v < 0) continue;           // empty
    if (!isHypercube(v)) {
      colors.add(baseColor(v));
    }
  }

  // Special case: line is all wildcards / empties
  // Then any contiguous non-empty run of length >= 3 counts
  if (colors.size === 0) {
    let i = 0;
    while (i < n) {
      // skip empties
      while (i < n && line[i]! < 0) i++;
      if (i >= n) break;
      const start = i;
      i++;
      while (i < n && line[i]! >= 0) i++;
      const end = i - 1;
      if (end - start + 1 >= 3) {
        runs.push({ start, end });
      }
    }
    return runs;
  }

  // For each possible color, find "wild-or-that-color" segments
  for (const color of colors) {
    let i = 0;
    while (i < n) {
      // Skip cells that cannot belong to this color's run
      while (i < n) {
        const v = line[i]!;
        if (v < 0) {          // empty breaks any run
          i++;
          continue;
        }
        if (isHypercube(v) || baseColor(v) === color) {
          break;              // good start for this color
        }
        i++;
      }
      if (i >= n) break;

      // We are at the start of a run for this color
      const start = i;
      i++;
      while (i < n) {
        const v = line[i]!;
        if (v < 0) break;     // empty ends the run
        if (isHypercube(v) || baseColor(v) === color) {
          i++;                // stays in the run
        } else {
          break;              // different color ends the run
        }
      }
      const end = i - 1;
      if (end - start + 1 >= 3) {
        runs.push({ start, end });
      }
    }
  }

  return runs;
}

export function findMatchesMask(board: Board): boolean[][] {
  const rows = board.length;
  if (rows === 0) return [];
  const cols = board[0]!.length;
  if (cols === 0) return makeMask(0, 0);

  const mask = makeMask(rows, cols);

  // ---------------------------
  // Horizontal runs
  // ---------------------------
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    const line = row.map((v) => (typeof v === "number" ? v : -1));
    const runs = findWildcardRunsInLine(line);
    for (const run of runs) {
      markRow(mask, r, run.start, run.end);
    }
  }

  // ---------------------------
  // Vertical runs
  // ---------------------------
  for (let c = 0; c < cols; c++) {
    const line: number[] = [];
    for (let r = 0; r < rows; r++) {
      const v = board[r]![c]!;
      line.push(typeof v === "number" ? v : -1);
    }
    const runs = findWildcardRunsInLine(line);
    for (const run of runs) {
      markCol(mask, c, run.start, run.end);
    }
  }

  return mask;
}

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
