// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     anywhere on the board.
//   - If no match is created, revert the swap.
// Notes:
//   - Special gems (power/hypercube) are handled by the
//     matching + scoring logic (match.ts, scoring.ts).
// ============================================================

import type { Board } from "./grid";
import { findMatches } from "./match";
import { isEmpty } from "./cell";

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
 * Try to swap (r1, c1) with (r2, c2).
 *
 * Rules:
 *  - If out-of-bounds or not adjacent -> false
 *  - If either cell is empty -> false
 *  - Otherwise:
 *      - Perform the swap on the board.
 *      - If it creates at least one match anywhere, keep it and return true.
 *      - If it creates no matches, revert and return false.
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

  // After swapping, check if this created ANY match on the board.
  // match.ts uses baseColor, so special gems count as their base color.
  const matches = findMatches(board);
  const createdMatch = matches.length > 0;

  if (!createdMatch) {
    // No match: undo the swap and reject
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  // Swap is valid; keep it. resolveBoard() will handle clears & cascades.
  return true;
}


  return true;
}
