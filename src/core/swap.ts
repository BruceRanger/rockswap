// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     OR if either swapped cell is a Hypercube (cash-in special).
// Notes:
//   - We use baseColor(...) so Power Gems count as their
//     underlying color for match detection.
//   - Hypercubes do NOT participate in normal line checks.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isEmpty, isHypercube } from "./cell";

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
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

/**
 * Check for a horizontal or vertical line of length >= 3
 * passing through (r, c), using baseColor(...) and ignoring
 * empties / invalid cells.
 *
 * IMPORTANT: Hypercubes never count as part of a normal run.
 */
function hasLineThrough(board: Board, r: number, c: number): boolean {
  if (!inBounds(board, r, c)) return false;
  const v0 = board[r]![c]!;
  if (typeof v0 !== "number" || isEmpty(v0)) return false;
  if (isHypercube(v0)) return false; // hypercube doesn't form normal runs

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
    if (isHypercube(v)) break; // hypercube breaks runs
    if (baseColor(v) !== color) break;
    countH++;
    cc--;
  }

  // Right
  cc = c + 1;
  while (cc < cols) {
    const v = board[r]![cc]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (isHypercube(v)) break; // hypercube breaks runs
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
    if (isHypercube(v)) break; // hypercube breaks runs
    if (baseColor(v) !== color) break;
    countV++;
    rr--;
  }

  // Down
  rr = r + 1;
  while (rr < rows) {
    const v = board[rr]![c]!;
    if (typeof v !== "number" || isEmpty(v)) break;
    if (isHypercube(v)) break; // hypercube breaks runs
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
 *      - If either swapped cell is a Hypercube -> keep and return true
 *        (resolve loop will "cash it in")
 *      - Else, require a normal match line through either swapped cell.
 */
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

  // --- Do the swap optimistically ---
  row1[c1] = b;
  row2[c2] = a;

  // If a hypercube is involved, always allow the swap (cash-in).
  if (isHypercube(a) || isHypercube(b)) {
    return true;
  }

  // Otherwise, must create a normal match.
  const createdMatch = hasLineThrough(board, r1, c1) || hasLineThrough(board, r2, c2);

  if (!createdMatch) {
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
