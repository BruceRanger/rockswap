// ============================================================
// File: src/core/swap.ts
// Purpose: Attempt a swap. Commit only if it creates a match,
//          EXCEPT for Hypercubes, which trigger color wipes.
// Returns: true if swap committed (created at least one match
//          or fired a Hypercube power).
// Strict-mode safe.
// ============================================================

import type { Board } from "./grid";
import { findMatches } from "./match";
import { isEmpty, isPowerGem, isHypercube, baseColor } from "./cell";

import { collapse } from "./collapse";
import { refill } from "./refill";

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
 * Try to swap (r1,c1) with (r2,c2).
 *
 * - If out-of-bounds or not adjacent → false
 * - If either cell is EMPTY → false
 *
 * Hypercube behavior:
 * - Hypercube + normal gem:
 *     - Swap is always allowed
 *     - All gems of the *other* gem's color are cleared
 *     - Both the hypercube and its partner are also cleared
 *     - collapse(board) + refill(board) are called
 * - Hypercube + Hypercube:
 *     - Swap is always allowed
 *     - Entire board is cleared (all non-empty cells)
 *     - collapse(board) + refill(board) are called
 *
 * Normal behavior (no hypercube involved):
 * - Tentatively swap the two cells, then:
 *   - If NO matches anywhere → revert swap, return false
 *   - If YES matches → keep swap, return true
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
  // `findMatches` now uses `baseColor`, so stars/power gems count
  // as their base color in lines.
  const matches = findMatches(board);
  const madeMatch = matches.length > 0;

  if (madeMatch) {
    // Keep the swap; resolveBoard() will handle clears & cascades.
    return true;
  }

  // No match: undo the swap and reject the move
  row1[c1] = a;
  row2[c2] = b;
  return false;
}


  // =========================================================
  // Hypercube behavior
  // =========================================================
  if (aHyper || bHyper) {
    // Commit the swap visually/structurally first
    row1[c1] = b as number;
    row2[c2] = a as number;

    const { rows, cols } = dims(board);

    if (aHyper && bHyper) {
      // Hypercube + Hypercube:
      // Clear the entire board (all non-empty cells)
      for (let r = 0; r < rows; r++) {
        const row = board[r];
        if (!row) continue;
        for (let c = 0; c < cols; c++) {
          if (!isEmpty(row[c])) {
            row[c] = -1;
          }
        }
      }
    } else {
      // Exactly one hypercube
      // Determine the target color from the *non-hyper* partner
      let targetColor = -1;
      if (aHyper && !bHyper) {
        targetColor = baseColor(b);
      } else if (bHyper && !aHyper) {
        targetColor = baseColor(a);
      }

      // Clear:
      //  - all gems of targetColor
      //  - the hypercube itself
      for (let r = 0; r < rows; r++) {
        const row = board[r];
        if (!row) continue;
        for (let c = 0; c < cols; c++) {
          const v = row[c];
          if (isEmpty(v)) continue;

          if (isHypercube(v)) {
            // Hypercube removes itself
            row[c] = -1;
          } else {
            if (targetColor >= 0 && baseColor(v) === targetColor) {
              row[c] = -1;
            }
          }
        }
      }
    }

    // After the wipe, let gravity + refill do their job.
    collapse(board);
    refill(board);

    // From the user's perspective, this is always a valid move.
    return true;
  }

  // =========================================================
  // Normal (non-hypercube) behavior: must create a match
  // =========================================================

  // Tentative swap
  row1[c1] = b as number;
  row2[c2] = a as number;

  // Any match created anywhere?
  const createdMatch = findMatches(board).length > 0;

  if (!createdMatch) {
    // Revert
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
