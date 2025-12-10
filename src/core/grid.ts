// ============================================================
// File: src/core/grid.ts
// RockSwap board creation + gravity + refill
// ------------------------------------------------------------
// - Creates an initial board with normal rocks only
// - Avoids starting matches
// - Drops rocks downward to fill empty spaces
// - Refills emptied cells with fresh rocks
//
// No terminology from other matching games is used.
// ============================================================

import { CellKind, type Cell, isRock } from "./cell";
import type { Board } from "../systems/renderer";

const BOARD_ROWS = 8;
const BOARD_COLS = 8;

/**
 * Create a random normal rock.
 */
function makeRandomRock(): Cell {
  const color = Math.floor(Math.random() * 6); // 0..5 palette
  return {
    kind: CellKind.Rock,
    color,
  };
}

/**
 * Check if placing this rock at (r,c) creates a horizontal or vertical
 * run of 3 equal-colored rocks.
 */
function wouldCreateMatch(board: Board, r: number, c: number): boolean {
  const cell = board[r][c];
  if (!isRock(cell)) return false;

  const color = cell.color;

  // Horizontal check
  if (
    c >= 2 &&
    isRock(board[r][c - 1]) &&
    isRock(board[r][c - 2]) &&
    board[r][c - 1].color === color &&
    board[r][c - 2].color === color
  ) {
    return true;
  }

  // Vertical check
  if (
    r >= 2 &&
    isRock(board[r - 1][c]) &&
    isRock(board[r - 2][c]) &&
    board[r - 1][c].color === color &&
    board[r - 2][c].color === color
  ) {
    return true;
  }

  return false;
}

/**
 * Fill the board randomly but avoid initial matches.
 */
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({
      kind: CellKind.Empty,
      color: 0,
    }))
  );

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      while (true) {
        board[r][c] = makeRandomRock();
        if (!wouldCreateMatch(board, r, c)) break;
      }
    }
  }

  return board;
}

/**
 * Apply downward gravity: for each column, slide rocks down
 * to fill empty spaces.
 */
function applyGravity(board: Board): void {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;

    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][c].kind !== CellKind.Empty) {
        if (writeRow !== r) {
          board[writeRow][c] = board[r][c];
        }
        writeRow--;
      }
    }

    // Fill remaining cells at top with Empty
    for (let r = writeRow; r >= 0; r--) {
      board[r][c] = { kind: CellKind.Empty, color: 0 };
    }
  }
}

/**
 * After gravity, refill empty cells with fresh rocks.
 */
function refillBoard(board: Board): void {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].kind === CellKind.Empty) {
        board[r][c] = makeRandomRock();
      }
    }
  }
}

/**
 * Drop rocks and refill the board after clearing matches.
 */
export function dropAndRefillBoard(board: Board): void {
  applyGravity(board);
  refillBoard(board);
}
