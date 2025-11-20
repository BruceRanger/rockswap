// ============================================================
// File: src/core/match.ts
// Purpose: Find match-3/4/5 runs AND identify where to place
//          Power Gems (run4) and Hypercubes (run5).
// ------------------------------------------------------------
// Returns FoundMatch[] containing:
//    - cells[]: all cells in the run
//    - length: 3,4, or >=5
//    - kind: "run3" | "run4" | "run5"
//    - specialPos?: where to place special gem (only for run4/run5)
// ============================================================

import type { Board } from "./grid";

export type CellRC = { r: number; c: number };

export interface FoundMatch {
  cells: CellRC[];            // all cells in this one run
  length: number;             // 3,4, or >=5
  kind: "run3" | "run4" | "run5";
  specialPos?: CellRC;        // position where power/hyper gem is created
}

function inBounds(board: Board, r: number, c: number): boolean {
  const rows = board.length;
  const cols = rows > 0 ? board[0]!.length : 0;
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

// ==============================================================
// Helper: record a match of length >= 3
// ==============================================================

function recordRun(
  out: FoundMatch[],
  cells: CellRC[],
  length: number
) {
  let kind: "run3" | "run4" | "run5" =
    length >= 5 ? "run5" : length === 4 ? "run4" : "run3";

  let specialPos: CellRC | undefined;

  // Bejeweled-simple rule:
  //   run4  → power gem in center of the 4-run
  //   run5+ → hypercube in center of the 5-run
  if (kind === "run4" || kind === "run5") {
    // pick the middle cell
    const mid = Math.floor(cells.length / 2);
    specialPos = {
      r: cells[mid].r,
      c: cells[mid].c
    };
  }

  out.push({
    cells,
    length,
    kind,
    specialPos
  });
}

// ==============================================================
// MAIN: findMatches(board)
// ==============================================================

export function findMatches(board: Board): FoundMatch[] {
  const rows = board.length;
  const cols = rows > 0 ? board[0]!.length : 0;

  const out: FoundMatch[] = [];

  if (rows === 0 || cols === 0) return out;

  // ------------------------------------------------------------
  // Horizontal runs
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const v = board[r]![c];
      if (v < 0) {
        c++;
        continue;
      }

      let start = c;
      c++;
      while (c < cols && board[r]![c] === v) {
        c++;
      }

      const runLen = c - start;
      if (runLen >= 3) {
        const cells: CellRC[] = [];
        for (let x = start; x < c; x++) {
          cells.push({ r, c: x });
        }
        recordRun(out, cells, runLen);
      }
    }
  }

  // ------------------------------------------------------------
  // Vertical runs
  // ------------------------------------------------------------
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const v = board[r]![c];
      if (v < 0) {
        r++;
        continue;
      }

      let start = r;
      r++;
      while (r < rows && board[r]![c] === v) {
        r++;
      }

      const runLen = r - start;
      if (runLen >= 3) {
        const cells: CellRC[] = [];
        for (let y = start; y < r; y++) {
          cells.push({ r: y, c });
        }
        recordRun(out, cells, runLen);
      }
    }
  }

  return out;
}
