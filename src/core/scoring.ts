// ============================================================
// File: src/core/scoring.ts
// Purpose:
//   - Turn a list of matched cells into a clear-mask.
//   - Expand that mask for power gems and hypercubes.
//   - Clear those cells on the board.
//   - Return base points for this pass (before chain multiplier).
//
// Notes:
//   - Power gem: clears its entire row and column.
//   - Hypercube: clears ALL gems of its base color on the board.
//   - Chain multiplier is applied in main.ts (resolveBoard).
// ============================================================

import type { Board } from "./grid";
import type { CellRC } from "./match";
import { isPowerGem, isHypercube, baseColor as getBaseColor } from "./cell";

export type RunBonusTable = { [runLen: number]: number };

export interface UserScoringConfig {
  /** points per cleared gem */
  perCell: number;
  /** bonus tables (not heavily used in this simple version) */
  bonuses?: {
    exact?: RunBonusTable;
    atLeast?: RunBonusTable;
  };
}

/**
 * Basic user-visible scoring config. main.ts uses this only for
 * displaying a summary in the HUD hover text.
 */
export const USER_SCORING: UserScoringConfig = {
  perCell: 10,
  bonuses: {
    exact: {
      // e.g. a 4-match might give a small bonus if we ever want it.
      4: 20,
      5: 50
    },
    atLeast: {
      // Could say: any 6+ run yields an extra 100, etc.
      6: 100
    }
  }
};

// ---- Internal helpers ---------------------------------------------------

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = new Array<boolean>(cols).fill(false);
  }
  return out;
}

function inBounds(board: Board, r: number, c: number): boolean {
  const { rows, cols } = dims(board);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/**
 * Build an initial mask from the list of matched cells.
 * (Just mark every matched {r,c} as true if it's in-bounds.)
 */
function buildBaseMask(board: Board, matches: CellRC[]): boolean[][] {
  const { rows, cols } = dims(board);
  const mask = makeMask(rows, cols);

  for (const cell of matches) {
    const r = cell.r | 0;
    const c = cell.c | 0;
    if (!inBounds(board, r, c)) continue;
    mask[r]![c] = true;
  }

  return mask;
}

/**
 * Expand the mask for power gems:
 *   - For any cell that is both in the mask and a power gem,
 *     mark its entire row and column as true.
 */
function expandForPowerGems(board: Board, mask: boolean[][]): void {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return;

  // Collect positions of power gems that are already in the mask
  const centers: CellRC[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r]![c]) continue;
      const v = board[r]?.[c];
      if (typeof v === "number" && v >= 0 && isPowerGem(v)) {
        centers.push({ r, c });
      }
    }
  }

  // For each power gem, mark its 3x3 neighborhood (8 surrounding + center)
  for (const cell of centers) {
    const cr = cell.r;
    const cc = cell.c;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = cr + dr;
        const cc2 = cc + dc;
        if (rr < 0 || rr >= rows || cc2 < 0 || cc2 >= cols) continue;
        mask[rr]![cc2] = true;
      }
    }
  }
}


/**
 * Expand the mask for hypercubes:
 *   - For any cell that is in the mask and a hypercube,
 *     determine its base color, then mark EVERY gem on the board
 *     of that base color as true in the mask.
 *
 * This is a simplified classic-Bejeweled behavior: "destroy all gems
 * of the chosen color."
 */
function expandForHypercubes(board: Board, mask: boolean[][]): void {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return;

  const colorsToWipe: number[] = [];

  // First pass: find which hypercube colors are involved
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r]![c]) continue;
      const v = board[r]?.[c];
      if (typeof v === "number" && v >= 0 && isHypercube(v)) {
        const base = getBaseColor(v);
        if (!colorsToWipe.includes(base)) {
          colorsToWipe.push(base);
        }
      }
    }
  }

  if (colorsToWipe.length === 0) return;

  // Second pass: mark all gems of those colors
  for (let r = 0; r < rows; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const v = row[c];
      if (typeof v !== "number" || v < 0) continue;
      const base = getBaseColor(v);
      if (colorsToWipe.includes(base)) {
        mask[r]![c] = true;
      }
    }
  }
}

/**
 * Count how many cells will be cleared (mask=true and board>=0),
 * and set those board cells to -1.
 */
function applyClearMask(board: Board, mask: boolean[][]): number {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return 0;

  let cleared = 0;

  for (let r = 0; r < rows; r++) {
    const row = board[r];
    const mrow = mask[r];
    if (!row || !mrow) continue;
    for (let c = 0; c < cols; c++) {
      if (!mrow[c]) continue;
      const v = row[c];
      if (typeof v === "number" && v >= 0) {
        // Clear this cell
        row[c] = -1;
        cleared++;
      }
    }
  }

  return cleared;
}

// ---- Public API ---------------------------------------------------------

/**
 * Clear all matched cells on the board, expanding for power gems
 * and hypercubes, and return the base points earned for this pass.
 *
 * The caller (main.ts) is responsible for:
 *   - applying chain multipliers
 *   - collapsing and refilling the board
 */
export function clearAndScore(board: Board, matches: CellRC[]): number {
  if (!board || board.length === 0) return 0;
  if (!matches || matches.length === 0) return 0;

  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return 0;

  // 1) Base mask from raw matches
  const mask = buildBaseMask(board, matches);

  // 2) Expand for special gems
  expandForPowerGems(board, mask);
  expandForHypercubes(board, mask);

  // 3) Clear and count
  const cleared = applyClearMask(board, mask);
  if (cleared <= 0) return 0;

  const perCell = USER_SCORING?.perCell ?? 10;

  // You can add bonus logic here later if you want, based on
  // shapes/runs. For now we keep it very simple:
  const basePoints = cleared * perCell;

  return basePoints;
}
