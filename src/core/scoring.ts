// ============================================================
// File: src/core/scoring.ts
// Purpose:
//   - Classic-style Bejeweled 2 scoring & special gems.
//   - Turn a list of matched cells into a clear-mask.
//   - Create Power Gems (4 / L / T) and Hypercubes (5-line).
//   - Ensure newly created specials do NOT explode immediately.
//   - Expand clears for existing Power Gems / Hypercubes.
//   - Clear those cells on the board and return base points.
//
// Notes:
//   - Base score: 10 points per cleared gem.
//   - Cascade multiplier is handled in main.ts (chain).
//   - Power Gem: when matched, clears 3x3 area.
//   - Hypercube: when matched, clears all gems of its base color.
// ============================================================

import type { Board } from "./grid";
import type { CellRC } from "./match";
import {
  baseColor as getBaseColor,
  isPowerGem,
  isHypercube,
  FLAG_POWER,
  FLAG_HYPERCUBE
} from "./cell";

const DEBUG_SPECIALS = true;

// ------------------------------------------------------------
// User-visible scoring config (for HUD summary)
// ------------------------------------------------------------

export type RunBonusTable = { [runLen: number]: number };

export interface UserScoringConfig {
  /** points per cleared gem */
  perCell: number;
  /** optional bonus tables for HUD display (not heavily used) */
  bonuses?: {
    exact?: RunBonusTable;
    atLeast?: RunBonusTable;
  };
}

/**
 * Classic Bejeweled 2: 10 points per gem.
 * We keep bonuses for possible future use, but the main rule is 10 per gem.
 */
export const USER_SCORING: UserScoringConfig = {
  perCell: 10,
  bonuses: {
    exact: {
      4: 0,  // no extra flat bonus; reward comes from Power Gem explosion later
      5: 0
    },
    atLeast: {}
  }
};

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

/** Allocate a false-filled boolean mask. */
function makeMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = new Array<boolean>(cols).fill(false);
  }
  return out;
}

/** Safe in-bounds check. */
function inBounds(board: Board, r: number, c: number): boolean {
  const { rows, cols } = dims(board);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/** Build a mask from the raw matches list. */
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

// ------------------------------------------------------------
// Run detection (for 4/L/T/5 shapes)
// ------------------------------------------------------------

type Run = {
  kind: "H" | "V";
  color: number;
  row: number;      // for H: row index
  col: number;      // for V: col index
  start: number;    // start index along the run direction
  len: number;
};

/**
 * Scan the board and return all horizontal & vertical runs
 * of length >= 3 by base color.
 */
function findAllRuns(board: Board): Run[] {
  const { rows, cols } = dims(board);
  const runs: Run[] = [];

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    const row = board[r];
    if (!row) continue;

    let c = 0;
    while (c < cols) {
      const v = row[c];
      if (typeof v !== "number" || v < 0) {
        c++;
        continue;
      }
      const color = getBaseColor(v);
      let start = c;
      c++;
      while (c < cols) {
        const v2 = row[c];
        if (typeof v2 !== "number" || v2 < 0) break;
        if (getBaseColor(v2) !== color) break;
        c++;
      }
      const len = c - start;
      if (len >= 3) {
        runs.push({
          kind: "H",
          color,
          row: r,
          col: -1,
          start,
          len
        });
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const v = board[r]?.[c];
      if (typeof v !== "number" || v < 0) {
        r++;
        continue;
      }
      const color = getBaseColor(v);
      let start = r;
      r++;
      while (r < rows) {
        const v2 = board[r]?.[c];
        if (typeof v2 !== "number" || v2 < 0) break;
        if (getBaseColor(v2) !== color) break;
        r++;
      }
      const len = r - start;
      if (len >= 3) {
        runs.push({
          kind: "V",
          color,
          row: -1,
          col: c,
          start,
          len
        });
      }
    }
  }

  return runs;
}

// ------------------------------------------------------------
// Special-gem creation (Power Gem / Hypercube)
// ------------------------------------------------------------

type SpecialType = "power" | "hypercube";
type SpecialGem = { r: number; c: number; type: SpecialType };

/**
 * Pick at most one special gem to create, based on the
 * current runs and match mask, following Bejeweled 2 priorities:
 *
 * 1) 5-in-a-row (straight) -> Hypercube
 * 2) L / T shapes (overlap of H & V runs) -> Power Gem
 * 3) 4-in-a-row (straight) -> Power Gem
 */
function pickSpecialGem(board: Board, mask: boolean[][]): SpecialGem | null {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return null;

  const runs = findAllRuns(board);
  if (runs.length === 0) return null;

  // Helper: check if mask[r][c] is true and in-bounds.
  const isMatched = (r: number, c: number): boolean => {
    return r >= 0 && r < rows && c >= 0 && c < cols && mask[r]![c] === true;
  };

  // ----------------------
  // 1) 5-in-a-row (or longer) -> Hypercube
  // We'll take the first such run and place the cube near the center.
  // ----------------------
  for (const run of runs) {
    if (run.len < 5) continue;
    if (run.kind === "H") {
      const r = run.row;
      const midIndex = run.start + Math.floor((run.len - 1) / 2);
      const c = midIndex;
      if (isMatched(r, c)) {
        return { r, c, type: "hypercube" };
      }
    } else {
      const c = run.col;
      const midIndex = run.start + Math.floor((run.len - 1) / 2);
      const r = midIndex;
      if (isMatched(r, c)) {
        return { r, c, type: "hypercube" };
      }
    }
  }

  // ----------------------
  // 2) L / T shapes -> Power Gem
  // Intersection of a horizontal and vertical run of same color.
  // ----------------------
  const hRuns = runs.filter((r) => r.kind === "H");
  const vRuns = runs.filter((r) => r.kind === "V");

  for (const hr of hRuns) {
    for (const vr of vRuns) {
      if (hr.color !== vr.color) continue;

      // Intersection cell: row = hr.row, col = vr.col
      const r = hr.row;
      const c = vr.col;

      if (r < 0 || c < 0) continue;

      const inH = c >= hr.start && c < hr.start + hr.len;
      const inV = r >= vr.start && r < vr.start + vr.len;
      if (!inH || !inV) continue;

      if (isMatched(r, c)) {
        return { r, c, type: "power" };
      }
    }
  }

  // ----------------------
// 3) 4-in-a-row (straight) -> Power Gem
// We'll pick the second gem in the run as the special location.
// ----------------------
for (const run of runs) {
  if (run.len !== 4) continue;

  if (run.kind === "H") {
    const r = run.row;
    const c = run.start + 1; // slightly inward, not edge
    if (isMatched(r, c)) {
      if (DEBUG_SPECIALS) {
        const v = board[r]?.[c];
        console.log("SPECIAL: FOUR-RUN HORIZONTAL", {
          runKind: run.kind,
          row: r,
          col: c,
          runStart: run.start,
          runLen: run.len,
          rawValue: v,
          baseColor: typeof v === "number" ? getBaseColor(v) : null
        });
      }
      return { r, c, type: "power" };
    }
  } else {
    const c = run.col;
    const r = run.start + 1;
    if (isMatched(r, c)) {
      if (DEBUG_SPECIALS) {
        const v = board[r]?.[c];
        console.log("SPECIAL: FOUR-RUN VERTICAL", {
          runKind: run.kind,
          row: r,
          col: c,
          runStart: run.start,
          runLen: run.len,
          rawValue: v,
          baseColor: typeof v === "number" ? getBaseColor(v) : null
        });
      }
      return { r, c, type: "power" };
    }
  }
}


/**
 * Actually write the special gem into the board and ensure
 * it is NOT cleared in this pass (so it won't explode immediately).
 */
function applySpecialCreation(board: Board, mask: boolean[][], special: SpecialGem | null): void {
  if (!special) return;

  const { r, c, type } = special;
  if (!inBounds(board, r, c)) return;

  const row = board[r];
  if (!row) return;

  const v = row[c];
  if (typeof v !== "number" || v < 0) return;

  const color = getBaseColor(v);

  // Remove this cell from the clear mask for this pass
  mask[r]![c] = false;

  if (type === "power") {
    row[c] = (color | FLAG_POWER) as number;
  } else {
    // hypercube
    row[c] = (color | FLAG_HYPERCUBE) as number;
  }
}

// ------------------------------------------------------------
// Special-gem expansion (Power 3x3, Hypercube color wipe)
// ------------------------------------------------------------

/**
 * For any cell that is both in the mask and a Power Gem,
 * mark its 3x3 neighborhood (center + 8 neighbors).
 */
function expandForPowerGems(board: Board, mask: boolean[][]): void {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return;

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
 * For any cell that is both in the mask and a Hypercube,
 * wipe all gems of its base color across the board.
 *
 * NOTE: Classic Bejeweled 2 activates Hypercubes when SWAPPED with
 * a gem, not by simple matching. Here we approximate by color-wiping
 * when a Hypercube is part of the matched mask. To get exact
 * "swap-to-fire" behavior, we'd add logic in swap.ts.
 */
function expandForHypercubes(board: Board, mask: boolean[][]): void {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return;

  const colorsToWipe: number[] = [];

  // First, discover which colors are associated with hypercubes in this mask
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!mask[r]![c]) continue;
      const v = board[r]?.[c];
      if (typeof v === "number" && v >= 0 && isHypercube(v)) {
        const color = getBaseColor(v);
        if (!colorsToWipe.includes(color)) {
          colorsToWipe.push(color);
        }
      }
    }
  }

  if (colorsToWipe.length === 0) return;

  // Then mark all gems of those colors
  for (let r = 0; r < rows; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const v = row[c];
      if (typeof v !== "number" || v < 0) continue;
      const color = getBaseColor(v);
      if (colorsToWipe.includes(color)) {
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
        row[c] = -1;
        cleared++;
      }
    }
  }

  return cleared;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Clear all matched cells on the board, expanding for Power Gems
 * and Hypercubes, creating new special gems when appropriate,
 * and return the base points earned for this pass.
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

  // 1) Build initial mask from the raw matches
  const mask = buildBaseMask(board, matches);

  // 2) Identify one special gem to create (Power / Hypercube)
  const special = pickSpecialGem(board, mask);

  // 3) Apply that creation, making sure it is NOT cleared this pass
  applySpecialCreation(board, mask, special);

  // 4) Expand for existing Power Gems (3x3) and Hypercubes (color wipe)
  expandForPowerGems(board, mask);
  expandForHypercubes(board, mask);

  // 5) Clear and count
  const cleared = applyClearMask(board, mask);
  if (cleared <= 0) return 0;

  const perCell = USER_SCORING.perCell;
  const basePoints = cleared * perCell;

  return basePoints;
}
