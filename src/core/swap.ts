// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     involving one of the swapped cells.
//   - If no match is created, revert the swap.
// Notes:
//   - We use baseColor(...) so Power Gems count as their
//     underlying color for match detection.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isEmpty } from "./cell";

// Basic board helpers
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
  // Manhattan distance 1
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

/**
 * Check for a horizontal or vertical line of length >= 3
 * passing through (r, c), using baseColor(...) and ignoring
 * empties / invalid cells.
 */
function hasLineThrough(board: Board, r: number, c: number): boolean {
  if (!inBounds(board, r, c)) return false;
  const v0 = board[r]![c]!;
  if (typeof v0 !== "number" || isEmpty(v0)) return false;

  const color = baseColor(v0);
  if (color < 0) return false;

  const { rows, cols } = dims(board);

  // ---- Horizontal count ----
  let countH = 1;

  // Left
  let cc = c - 1;
  while (cc >= 0) {
    const v = board[r]![cc]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (baseColor(v) !== color) break;
    countH++;
    cc--;
  }

  // Right
  cc = c + 1;
  while (cc < cols) {
    const v = board[r]![cc]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (baseColor(v) !== color) break;
    countH++;
    cc++;
  }

  if (countH >= 3) return true;

  // ---- Vertical count ----
  let countV = 1;

  // Up
  let rr = r - 1;
  while (rr >= 0) {
    const v = board[rr]![c]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (baseColor(v) !== color) break;
    countV++;
    rr--;
  }

  // Down
  rr = r + 1;
  while (rr < rows) {
    const v = board[rr]![c]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (baseColor(v) !== color) break;
    countV++;
    rr++;
  }

  return countV >= 3;
}

/**
 * Try to swap (r1, c1) with (r2, c2).
 *
 * Rules:
 *  - If out-of-bounds or not adjacent -> false
 *  - If either cell is empty -> false
 *  - Otherwise:
 *      - Perform the swap on the board.
 *      - If it creates at least one horizontal/vertical line of
 *        length >= 3 through either swapped cell, keep it and return true.
 *      - If it creates no such line, revert and return false.
 */
export function trySwap(
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  // Bounds + adjacency
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return false;

  const row1 = board[r1];
  const row2 = board[r2];
  if (!row1 || !row2) return false;

  const a = row1[c1];
  const b = row2[c2];

  // Must be valid numbers and not empties
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (isEmpty(a) || isEmpty(b)) return false;

  // --- Do the swap optimistically ---
  row1[c1] = b;
  row2[c2] = a;

  // Check only local lines through the swapped cells.
  const createdMatch =
    hasLineThrough(board, r1, c1) ||
    hasLineThrough(board, r2, c2);

  if (!createdMatch) {
    // No match: undo the swap and reject
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  // Swap is valid; keep it. resolveBoard() will handle clears & cascades.
  return true;
}
