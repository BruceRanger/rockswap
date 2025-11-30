// ============================================================
// File: src/core/refill.ts
// Purpose: Fill empty (-1) cells at the top with new random rocks
// ------------------------------------------------------------
// - Avoids making an *immediate* 3-run at the filled cell by
//   re-rolling a few times. This keeps the board lively.
// - Strict-mode safe: all indexed accesses are guarded.
// ============================================================

import type { Board } from "./grid";
import { KINDS } from "./grid";

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function getCell(b: Board, r: number, c: number): number | undefined {
  const row = b[r];
  if (!row) return undefined;
  if (c < 0 || c >= row.length) return undefined;
  return row[c];
}

function setCell(b: Board, r: number, c: number, v: number): void {
  const row = b[r];
  if (!row) return;
  if (c < 0 || c >= row.length) return;
  row[c] = v;
}

export function refill(board: Board, kinds: number = KINDS): void {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return;

  const pick = () => Math.floor(Math.random() * kinds);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cur = getCell(board, r, c);
      if (cur !== -1) continue;

      let tries = 0;
      while (true) {
        const v = pick();

        // neighbors (strict-safe)
        const left1 = getCell(board, r, c - 1);
        const left2 = getCell(board, r, c - 2);
        const up1 = getCell(board, r - 1, c);
        const up2 = getCell(board, r - 2, c);

        const makesHRun = left1 === v && left2 === v;
        const makesVRun = up1 === v && up2 === v;

        if (!makesHRun && !makesVRun) {
          setCell(board, r, c, v);
          break;
        }
        tries++;
        if (tries > 10) {
          // Accept to avoid rare loops; slight chance of instant match is fine.
          setCell(board, r, c, v);
          break;
        }
      }
    }
  }
}
