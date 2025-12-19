// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     anywhere on the board (using wildcard rules).
// Notes:
//   - Power gems match as their base color.
//   - Hypercube/Diamond is a TRUE wildcard in match.ts,
//     so a swap that creates (A, ◆, A) counts as a match.
// ============================================================

import type { Board } from "./grid";
import { isEmpty } from "./cell";
import { findMatchesMask, hasAny } from "./match";

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

function isAdjacent(
  a: { r: number; c: number },
  b: { r: number; c: number }
): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function trySwap(
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  // Bounds + adjacency checks
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return false;

  const a = board[r1]?.[c1];
  const b = board[r2]?.[c2];
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (isEmpty(a) || isEmpty(b)) return false;

  // Perform swap
  board[r1][c1] = b;
  board[r2][c2] = a;

  // Use the wildcard-aware matcher to see if ANY match exists
  const mask = findMatchesMask(board);
  const ok = hasAny(mask);

  if (!ok) {
    // No matches: undo swap
    board[r1][c1] = a;
    board[r2][c2] = b;
    return false;
  }

  // Keep swap
  return true;
}
