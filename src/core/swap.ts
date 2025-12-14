// ============================================================
// File: src/core/swap.ts
// Purpose: Attempt a swap; keep it only if it creates a match
//         involving one of the swapped cells.
// Notes:
//   - Uses findMatches(...) so wildcard rules are consistent.
// ============================================================

import type { Board } from "./grid";
import { isEmpty } from "./cell";
import { findMatches } from "./match";

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

function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function trySwap(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent(r1, c1, r2, c2)) return false;

  const row1 = board[r1];
  const row2 = board[r2];
  if (!row1 || !row2) return false;

  const a = row1[c1];
  const b = row2[c2];

  if (typeof a !== "number" || typeof b !== "number") return false;
  if (isEmpty(a) || isEmpty(b)) return false;

  // swap
  row1[c1] = b;
  row2[c2] = a;

  const matches = findMatches(board);

  const created = matches.some(
    (m) => (m.r === r1 && m.c === c1) || (m.r === r2 && m.c === c2)
  );

  if (!created) {
    // revert
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
