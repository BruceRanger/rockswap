// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     involving one of the swapped cells.
// Notes:
//   - Power gems match by baseColor.
//   - Hypercubes are WILDCARDS: they match any color.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isEmpty, isHypercube } from "./cell";

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function inBounds(board: Board, r: number, c: number): boolean {
  if (r < 0 || c < 0) return false;
  const { rows, cols } = dims(board);
  return r < rows && c < cols;
}

function isAdjacent(a: { r: number; c: number }, b: { r: number; c: number }): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function matchesColor(v: number, color: number): boolean {
  if (typeof v !== "number" || isEmpty(v)) return false;
  return isHypercube(v) || baseColor(v) === color;
}

function firstNeighborColor(board: Board, r: number, c: number, dr: number, dc: number): number | null {
  const { rows, cols } = dims(board);
  let rr = r + dr;
  let cc = c + dc;

  while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
    const v = board[rr]![cc]!;
    if (typeof v !== "number" || isEmpty(v)) return null;
    if (!isHypercube(v)) return baseColor(v);
    // skip over hypercubes to find an actual color
    rr += dr;
    cc += dc;
  }
  return null;
}

/**
 * Check for a horizontal or vertical line of length >= 3 through (r,c).
 * Hypercubes count as wildcards.
 */
function hasLineThrough(board: Board, r: number, c: number): boolean {
  if (!inBounds(board, r, c)) return false;

  const v0 = board[r]![c]!;
  if (typeof v0 !== "number" || isEmpty(v0)) return false;

  const { rows, cols } = dims(board);

  // If this is NOT a hypercube, there is a single definite color.
  if (!isHypercube(v0)) {
    const color = baseColor(v0);
    if (color < 0) return false;

    // Horizontal
    let countH = 1;
    let cc = c - 1;
    while (cc >= 0 && matchesColor(board[r]![cc]!, color)) {
      countH++;
      cc--;
    }
    cc = c + 1;
    while (cc < cols && matchesColor(board[r]![cc]!, color)) {
      countH++;
      cc++;
    }
    if (countH >= 3) return true;

    // Vertical
    let countV = 1;
    let rr = r - 1;
    while (rr >= 0 && matchesColor(board[rr]![c]!, color)) {
      countV++;
      rr--;
    }
    rr = r + 1;
    while (rr < rows && matchesColor(board[rr]![c]!, color)) {
      countV++;
      rr++;
    }
    return countV >= 3;
  }

  // If center IS a hypercube, we need to try plausible colors from neighbors.
  const candidates = new Set<number>();

  const left = firstNeighborColor(board, r, c, 0, -1);
  const right = firstNeighborColor(board, r, c, 0, 1);
  const up = firstNeighborColor(board, r, c, -1, 0);
  const down = firstNeighborColor(board, r, c, 1, 0);

  if (left !== null) candidates.add(left);
  if (right !== null) candidates.add(right);
  if (up !== null) candidates.add(up);
  if (down !== null) candidates.add(down);

  for (const color of candidates) {
    // Horizontal with this candidate color
    let countH = 1;
    let cc = c - 1;
    while (cc >= 0 && matchesColor(board[r]![cc]!, color)) {
      countH++;
      cc--;
    }
    cc = c + 1;
    while (cc < cols && matchesColor(board[r]![cc]!, color)) {
      countH++;
      cc++;
    }
    if (countH >= 3) return true;

    // Vertical with this candidate color
    let countV = 1;
    let rr = r - 1;
    while (rr >= 0 && matchesColor(board[rr]![c]!, color)) {
      countV++;
      rr--;
    }
    rr = r + 1;
    while (rr < rows && matchesColor(board[rr]![c]!, color)) {
      countV++;
      rr++;
    }
    if (countV >= 3) return true;
  }

  return false;
}

export function trySwap(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return false;

  const row1 = board[r1];
  const row2 = board[r2];
  if (!row1 || !row2) return false;

  const a = row1[c1];
  const b = row2[c2];

  if (typeof a !== "number" || typeof b !== "number") return false;
  if (isEmpty(a) || isEmpty(b)) return false;

  // Swap optimistically
  row1[c1] = b;
  row2[c2] = a;

  const createdMatch = hasLineThrough(board, r1, c1) || hasLineThrough(board, r2, c2);

  if (!createdMatch) {
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
