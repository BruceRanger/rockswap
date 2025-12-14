// ============================================================
// File: src/core/match.ts
// Purpose: Find horizontal/vertical matches on the board
// ------------------------------------------------------------
// Wildcard rule (Hypercube / diamond):
// - A hypercube can stand in for ANY color when detecting runs.
// - A valid run is either:
//     * 3+ non-wild of the same color, OR
//     * 2+ non-wild of the same color + 1+ wild
// - A run of only wilds does NOT count.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isEmpty, isHypercube } from "./cell";

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

function isWild(v: number): boolean {
  return isHypercube(v);
}

function isUsable(v: number): boolean {
  return typeof v === "number" && !isEmpty(v) && v >= 0;
}

/**
 * Scan a line (row or column) and mark any matching runs.
 * Implementation is duplicated for clarity/perf.
 */
export function findMatchesMask(board: Board): boolean[][] {
  const rows = board.length;
  if (rows === 0) return [];
  const cols = board[0]!.length;
  if (cols === 0) return makeMask(0, 0);

  const mask = makeMask(rows, cols);

  // --------------------------
  // Horizontal
  // --------------------------
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    let c = 0;

    while (c < cols) {
      const v0 = row[c]!;
      if (!isUsable(v0)) {
        c++;
        continue;
      }

      // Build a maximal segment where:
      // - empties break
      // - non-wild color mismatch breaks (wilds never break)
      let start = c;
      let runColor: number | null = null;
      let wildCount = 0;
      let nonWildCount = 0;

      // Initialize with first cell
      if (isWild(v0)) wildCount++;
      else {
        runColor = baseColor(v0);
        nonWildCount++;
      }

      c++;

      while (c < cols) {
        const v = row[c]!;
        if (!isUsable(v)) break;

        if (isWild(v)) {
          wildCount++;
          c++;
          continue;
        }

        const bc = baseColor(v);
        if (runColor === null) {
          runColor = bc;
          nonWildCount++;
          c++;
          continue;
        }

        if (bc !== runColor) break;

        nonWildCount++;
        c++;
      }

      const runLen = c - start;

      // Valid run rules:
      // - Must have a real color (not all wilds)
      // - Either 3+ non-wild, OR 2+ non-wild plus at least 1 wild
      const valid =
        runColor !== null &&
        runLen >= 3 &&
        (nonWildCount >= 3 || (nonWildCount >= 2 && wildCount >= 1));

      if (valid) {
        markRow(mask, r, start, c - 1);
      }
    }
  }

  // --------------------------
  // Vertical
  // --------------------------
  for (let c = 0; c < cols; c++) {
    let r = 0;

    while (r < rows) {
      const v0 = board[r]![c]!;
      if (!isUsable(v0)) {
        r++;
        continue;
      }

      let start = r;
      let runColor: number | null = null;
      let wildCount = 0;
      let nonWildCount = 0;

      if (isWild(v0)) wildCount++;
      else {
        runColor = baseColor(v0);
        nonWildCount++;
      }

      r++;

      while (r < rows) {
        const v = board[r]![c]!;
        if (!isUsable(v)) break;

        if (isWild(v)) {
          wildCount++;
          r++;
          continue;
        }

        const bc = baseColor(v);
        if (runColor === null) {
          runColor = bc;
          nonWildCount++;
          r++;
          continue;
        }

        if (bc !== runColor) break;

        nonWildCount++;
        r++;
      }

      const runLen = r - start;

      const valid =
        runColor !== null &&
        runLen >= 3 &&
        (nonWildCount >= 3 || (nonWildCount >= 2 && wildCount >= 1));

      if (valid) {
        markCol(mask, c, start, r - 1);
      }
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
