// ============================================================
// File: src/core/match.ts
// RockSwap matching logic
// ------------------------------------------------------------
// A "match" is any straight horizontal or vertical line of
// length >= 3 with the same base color.
// ============================================================

import type { Cell } from "./cell";
import { baseColor } from "./cell";

/** Row/column index for a cell on the board. */
export interface CellRC {
  r: number;
  c: number;
}

/** Two-dimensional board type (rows x columns). */
export type Board = Cell[][];

/**
 * Allocate a 2D boolean mask initialized to false.
 */
function makeMask(rows: number, cols: number): boolean[][] {
  const mask: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(false);
    }
    mask.push(row);
  }
  return mask;
}

/**
 * Find all cells that belong to any horizontal or vertical
 * line of 3 or more rocks with the same base color.
 *
 * Returns:
 * - A flat list of {r,c} coordinates. Cells that belong to
 *   both a horizontal and vertical line are included once.
 */
export function findMatchesList(board: Board): CellRC[] {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  if (rows === 0 || cols === 0) {
    return [];
  }

  const mask = makeMask(rows, cols);

  // ----- Horizontal runs -----
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const color = baseColor(board[r][c]);
      if (color == null) {
        c++;
        continue;
      }

      let len = 1;
      while (c + len < cols) {
        const nextColor = baseColor(board[r][c + len]);
        if (nextColor !== color) break;
        len++;
      }

      if (len >= 3) {
        for (let k = 0; k < len; k++) {
          mask[r][c + k] = true;
        }
      }

      c += len;
    }
  }

  // ----- Vertical runs -----
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const color = baseColor(board[r][c]);
      if (color == null) {
        r++;
        continue;
      }

      let len = 1;
      while (r + len < rows) {
        const nextColor = baseColor(board[r + len][c]);
        if (nextColor !== color) break;
        len++;
      }

      if (len >= 3) {
        for (let k = 0; k < len; k++) {
          mask[r + k][c] = true;
        }
      }

      r += len;
    }
  }

  // ----- Collect all marked cells -----
  const out: CellRC[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r][c]) {
        out.push({ r, c });
      }
    }
  }

  return out;
}
