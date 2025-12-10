// ============================================================
// File: src/core/swap.ts
// RockSwap cell-swapping helpers
// ------------------------------------------------------------
// - areAdjacent: checks if two cells are next to each other
// - swapCells: swaps two cells in-place
// - canSwap: basic rule check before swapping
//
// No terminology from other matching games is used.
// ============================================================

import type { Board } from "../systems/renderer";
import type { Cell } from "./cell";
import { isEmpty } from "./cell";

/**
 * Returns true if (r1,c1) and (r2,c2) are orthogonally adjacent.
 */
export function areAdjacent(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr + dc === 1;
}

/**
 * Perform an in-place swap of two cells on the board.
 */
export function swapCells(
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): void {
  const temp: Cell = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = temp;
}

/**
 * Basic rule check before swapping:
 * - cells must be adjacent
 * - neither cell may be empty
 */
export function canSwap(
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  if (!areAdjacent(r1, c1, r2, c2)) return false;

  const a = board[r1][c1];
  const b = board[r2][c2];

  if (isEmpty(a) || isEmpty(b)) return false;

  return true;
}
