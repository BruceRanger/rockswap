// ============================================================
// File: src/core/scoring.ts
// Purpose: Scoring + clearing logic, with support for
//          Power Gems (★) and Hypercubes (◎).
//
// API used by main.ts:
//   - USER_SCORING: describes scoring rules
//   - clearAndScore(board, matches) -> basePoints
//
// "matches" here is a flat list of {r,c} for all matched cells
// in a single cascade pass (from findMatches(board)).
// ============================================================

import type { Board } from "./grid";
import { baseColorOf, makePowerGem, makeHypercube, isPowerGem } from "./cell";

// Same shape main.ts expects:
export interface UserScoring {
  perCell: number;
  bonuses?: {
    exact?: Record<number, number>; // bonus for exactly N in a run
    atLeast?: Record<number, number>; // bonus for at least N in a run
  };
}

export const USER_SCORING: UserScoring = {
  perCell: 10,
  bonuses: {
    exact: {
      4: 10, // +10 points for exactly 4 in a run
      5: 25 // +25 points for exactly 5 in a run
    },
    atLeast: {
      // Example: 6+: +40, 7+: +60, etc. You can tweak as desired.
      6: 40,
      7: 60
    }
  }
};

export type CellRC = { r: number; c: number };

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

/**
 * Build a boolean mask from a flat list of matched cells.
 */
function buildMask(board: Board, cells: CellRC[]): boolean[][] {
  const { rows, cols } = dims(board);
  const mask: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    mask[r] = new Array(cols).fill(false);
  }

  for (const { r, c } of cells) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
    mask[r][c] = true;
  }
  return mask;
}

/**
 * Calculate run-based scoring bonuses based on length and USER_SCORING.
 */
function runBonus(len: number): number {
  const exact = USER_SCORING.bonuses?.exact ?? {};
  const atLeast = USER_SCORING.bonuses?.atLeast ?? {};

  let bonus = 0;

  // Exact match bonus:
  if (typeof exact[len] === "number") {
    bonus += exact[len]!;
  }

  // "At least" bonus: take the largest threshold <= len
  let best = 0;
  for (const kStr of Object.keys(atLeast)) {
    const k = Number(kStr) | 0;
    if (!Number.isFinite(k)) continue;
    if (len >= k && k >= best) {
      best = k;
    }
  }
  if (best > 0) {
    bonus += atLeast[best] ?? 0;
  }

  return bonus;
}

/**
 * Given a mask of matched cells, find horizontal and vertical runs.
 * Used for both scoring bonuses and special gem (power/hypercube) placement.
 */
interface FoundRun {
  cells: CellRC[];
  length: number;
  isHorizontal: boolean;
}

function findRuns(board: Board, mask: boolean[][]): FoundRun[] {
  const { rows, cols } = dims(board);
  const runs: FoundRun[] = [];

  if (rows === 0 || cols === 0) return runs;

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (!mask[r][c]) {
        c++;
        continue;
      }
      const base = baseColorOf(board[r][c]);
      if (base < 0) {
        c++;
        continue;
      }
      let start = c;
      c++;
      while (c < cols && mask[r][c] && baseColorOf(board[r][c]) === base) {
        c++;
      }
      const len = c - start;
      if (len >= 3) {
        const cells: CellRC[] = [];
        for (let x = start; x < c; x++) {
          cells.push({ r, c: x });
        }
        runs.push({ cells, length: len, isHorizontal: true });
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      if (!mask[r][c]) {
        r++;
        continue;
      }
      const base = baseColorOf(board[r][c]);
      if (base < 0) {
        r++;
        continue;
      }
      let start = r;
      r++;
      while (r < rows && mask[r][c] && baseColorOf(board[r][c]) === base) {
        r++;
      }
      const len = r - start;
      if (len >= 3) {
        const cells: CellRC[] = [];
        for (let y = start; y < r; y++) {
          cells.push({ r: y, c });
        }
        runs.push({ cells, length: len, isHorizontal: false });
      }
    }
  }

  return runs;
}

/**
 * Main: clear matched cells, handle Power Gems & Hypercubes creation,
 * and return base points earned for this cascade pass.
 *
 * NOTE: This function only handles:
 *  - scoring per cleared cell
 *  - bonuses for longer runs
 *  - creating special gems (★ / ◎)
 *  - Power Gem explosions when a power gem is matched
 *
 * Hypercube "color wipe" activation (when swapped) will be wired up later.
 */
export function clearAndScore(board: Board, matches: CellRC[]): number {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return 0;
  if (!matches || matches.length === 0) return 0;

  // 1) Build a mask of all matched cells
  const mask = buildMask(board, matches);

  // 2) If any matched cell is a Power Gem, extend mask to its 3x3 neighborhood
  for (const { r, c } of matches) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
    const val = board[r][c];
    if (typeof val === "number" && val >= 0 && isPowerGem(val)) {
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
            mask[rr][cc] = true;
          }
        }
      }
    }
  }

  // 3) Count unique cleared cells for base per-cell scoring
  let uniqueCount = 0;
  for (let r = 0; r < rows; r++) {
    const rowMask = mask[r];
    if (!rowMask) continue;
    for (let c = 0; c < cols; c++) {
      if (rowMask[c]) uniqueCount++;
    }
  }

  const perCell = USER_SCORING.perCell ?? 10;
  let total = uniqueCount * perCell;

  // 4) Discover runs for bonuses and placement of special gems
  const runs = findRuns(board, mask);

  // For special gem placement, we will create at most one special per run.
  interface SpecialPlacement {
    r: number;
    c: number;
    make: "power" | "hyper";
    color?: number; // for power gem only
  }
  const specials: SpecialPlacement[] = [];

  for (const run of runs) {
    const len = run.length;
    if (len < 3) continue;

    // Bonuses based on run length
    total += runBonus(len);

    // Determine if we should place a special gem
    if (len >= 4) {
      const midIndex = Math.floor(run.cells.length / 2);
      const pos = run.cells[midIndex];
      const base = baseColorOf(board[pos.r][pos.c]);

      if (len >= 5) {
        // Hypercube in center
        specials.push({ r: pos.r, c: pos.c, make: "hyper" });
      } else {
        // run4 → Power Gem in center
        specials.push({ r: pos.r, c: pos.c, make: "power", color: base });
      }
    }
  }

  // 5) Clear all cells indicated in mask
  for (let r = 0; r < rows; r++) {
    const rowMask = mask[r];
    if (!rowMask) continue;
    for (let c = 0; c < cols; c++) {
      if (rowMask[c]) {
        board[r][c] = -1;
      }
    }
  }

  // 6) Place special gems AFTER clearing
  for (const sp of specials) {
    const { r, c } = sp;
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;

    if (sp.make === "hyper") {
      board[r][c] = makeHypercube();
    } else if (sp.make === "power") {
      const base = typeof sp.color === "number" ? sp.color : baseColorOf(board[r][c]);
      if (base >= 0) {
        board[r][c] = makePowerGem(base);
      }
    }
  }

  return total;
}
