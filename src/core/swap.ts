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

  console.log(`\n=== trySwap(${r1},${c1}) <-> (${r2},${c2}) ===`);

  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) {
    console.log(" ❌ Reject: out of bounds");
    return false;
  }
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) {
    console.log(" ❌ Reject: not adjacent");
    return false;
  }

  const a = board[r1]?.[c1];
  const b = board[r2]?.[c2];

  console.log(` Values before swap = A=${a}, B=${b}`);

  if (typeof a !== "number" || typeof b !== "number") {
    console.log(" ❌ Reject: non-number value");
    return false;
  }
  if (isEmpty(a) || isEmpty(b)) {
    console.log(" ❌ Reject: empty gem value");
    return false;
  }

  // Perform swap
  board[r1][c1] = b;
  board[r2][c2] = a;

  console.log(" Board after tentative swap:");
  console.table(board);

  const mask = findMatchesMask(board);
  const ok = hasAny(mask);

  console.log(" Match mask:");
  console.table(mask);
  console.log(` createdMatch = ${ok}`);

  if (!ok) {
    // Undo
    board[r1][c1] = a;
    board[r2][c2] = b;
    console.log(" ❌ Swap rejected — no matches. Undoing swap.");
    return false;
  }

  console.log(" ✅ Swap accepted — at least one match exists.");
  return true;
}

