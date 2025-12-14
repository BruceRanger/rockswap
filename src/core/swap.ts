// ============================================================
// File: src/core/swap.ts
// Purpose:
//   - Attempt a swap between two cells.
//   - Commit the swap only if it creates at least one match
//     involving one of the swapped cells.
// Notes:
//   - Power gems match as their base color.
//   - Hypercube/Diamond is a TRUE wildcard for match detection,
//     so a swap that creates (A, ◆, A) counts as a match.
// ============================================================

import type { Board } from "./grid";
import { baseColor, isEmpty, isHypercube } from "./cell";

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

function get(board: Board, r: number, c: number): number | null {
  const v = board[r]?.[c];
  return typeof v === "number" ? v : null;
}

/**
 * For swaps, we must decide if a line exists through (r,c).
 * With wildcards, the line's "color" might be chosen by neighbors.
 *
 * Strategy:
 *  - Look at the contiguous (non-empty) block on that axis.
 *  - Collect candidate colors from all non-wild cells in that block.
 *  - For each candidate color, compute contiguous count including wilds.
 *  - Take max; if >= 3 => valid line.
 */
function bestLineCountAxis(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number
): number {
  const center = get(board, r, c);
  if (center === null || isEmpty(center)) return 0;

  const { rows, cols } = dims(board);

  // Walk to the start of the contiguous non-empty block
  let sr = r;
  let sc = c;
  while (true) {
    const pr = sr - dr;
    const pc = sc - dc;
    if (pr < 0 || pc < 0 || pr >= rows || pc >= cols) break;
    const pv = get(board, pr, pc);
    if (pv === null || isEmpty(pv)) break;
    sr = pr;
    sc = pc;
  }

  // Walk forward collecting the block values + candidate colors
  const block: Array<{ rr: number; cc: number; v: number }> = [];
  const candidates = new Set<number>();

  let rr = sr;
  let cc = sc;
  while (rr >= 0 && cc >= 0 && rr < rows && cc < cols) {
    const v = get(board, rr, cc);
    if (v === null || isEmpty(v)) break;

    block.push({ rr, cc, v });

    if (!isHypercube(v)) {
      candidates.add(baseColor(v));
    }

    rr += dr;
    cc += dc;
  }

  // If everything in the block is wild, then any 3+ is a line
  if (candidates.size === 0) {
    return block.length;
  }

  // Compute best contiguous run that includes (r,c) for each candidate
  let best = 1;

  for (const color of candidates) {
    // Find index of (r,c) in the block
    const idx = block.findIndex((p) => p.rr === r && p.cc === c);
    if (idx < 0) continue;

    // Expand left/backward
    let count = 1;
    let i = idx - 1;
    while (i >= 0) {
      const v = block[i]!.v;
      if (isHypercube(v) || baseColor(v) === color) {
        count++;
        i--;
      } else {
        break;
      }
    }

    // Expand right/forward
    i = idx + 1;
    while (i < block.length) {
      const v = block[i]!.v;
      if (isHypercube(v) || baseColor(v) === color) {
        count++;
        i++;
      } else {
        break;
      }
    }

    if (count > best) best = count;
  }

  return best;
}

function hasLineThrough(board: Board, r: number, c: number): boolean {
  if (!inBounds(board, r, c)) return false;

  const v0 = get(board, r, c);
  if (v0 === null || isEmpty(v0)) return false;

  const bestH = bestLineCountAxis(board, r, c, 0, 1);
  if (bestH >= 3) return true;

  const bestV = bestLineCountAxis(board, r, c, 1, 0);
  return bestV >= 3;
}

export function trySwap(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return false;

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

  const createdMatch = hasLineThrough(board, r1, c1) || hasLineThrough(board, r2, c2);

  if (!createdMatch) {
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
