// ============================================================
// File: src/systems/renderer.ts
// RockSwap board renderer – classic square look
// ------------------------------------------------------------
// - Draws a grid of rocks as simple squares.
// - Shows Star Rocks as ★ and Diamond Rocks as ◆ glyphs.
// - Supports selection + hover highlights.
// - Exports renderGame, Board, CellPos for main.ts.
// ============================================================

import {
  CellKind,
  isRock,
  isStarRock,
  isDiamondRock,
  isEmpty,
} from "../core/cell";
import type { Cell } from "../core/cell";

// Board + position types exported for main.ts and others
export type Board = Cell[][];
export interface CellPos {
  r: number;
  c: number;
}

export interface RenderParams {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  board: Board;
  selected?: CellPos | null;
  hover?: CellPos | null;
  swell?: number; // reserved for future animations
}

// -------- Flat rock colors (no gradients) --------

const ROCK_COLORS: Array<{ r: number; g: number; b: number }> = [
  { r: 200, g: 50, b: 50 }, // 0
  { r: 50, g: 150, b: 200 }, // 1
  { r: 80, g: 180, b: 80 }, // 2
  { r: 220, g: 190, b: 70 }, // 3
  { r: 160, g: 100, b: 200 }, // 4
  { r: 220, g: 120, b: 80 }, // 5
];

function rockFill(cell: Cell): string {
  const idx = Math.max(0, Math.min(ROCK_COLORS.length - 1, cell.color));
  const { r, g, b } = ROCK_COLORS[idx];
  return `rgb(${r},${g},${b})`;
}

// -------- Main render entry --------

export function renderGame(params: RenderParams): void {
  const { canvas, ctx, board } = params;

  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  if (!rows || !cols) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const swell = params.swell ?? 1.0;

  // Compute cell size from canvas dimensions
  const cellSize = Math.floor(
    Math.min(canvas.width / cols, canvas.height / rows)
  );
  const totalW = cellSize * cols;
  const totalH = cellSize * rows;

  // Center the board
  const offsetX = (canvas.width - totalW) / 2;
  const offsetY = (canvas.height - totalH) / 2;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Optional swell transform around canvas center
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.translate(cx, cy);
  ctx.scale(swell, swell);
  ctx.translate(-cx, -cy);

  // Board background
  ctx.fillStyle = "rgb(20,20,40)";
  ctx.fillRect(offsetX - 2, offsetY - 2, totalW + 4, totalH + 4);

  // Draw each cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawCell(ctx, board[r][c], offsetX + c * cellSize, offsetY + r * cellSize, cellSize);
    }
  }

  // Selection + hover highlights
  if (params.selected) {
    drawHighlight(ctx, params.selected, offsetX, offsetY, cellSize, "rgba(255,255,255,0.6)");
  }
  if (params.hover) {
    drawHighlight(ctx, params.hover, offsetX, offsetY, cellSize, "rgba(255,255,255,0.35)");
  }

  ctx.restore();
}

// -------- Draw a single cell (square, flat) --------

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number
): void {
  // Tile background
  ctx.fillStyle = "rgb(40,40,60)";
  ctx.fillRect(x, y, size, size);

  if (isEmpty(cell)) return;
  if (!isRock(cell)) return;

  // Rock square (inset a bit)
  const inset = 2;
  ctx.fillStyle = rockFill(cell);
  ctx.fillRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset);

  // Overlays for special rocks
  if (isStarRock(cell)) {
    drawGlyph(ctx, "★", x, y, size);
  } else if (isDiamondRock(cell)) {
    drawGlyph(ctx, "◆", x, y, size);
  }
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
  size: number
): void {
  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(size * 0.6)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x + size / 2, y + size / 2);
}

// -------- Highlights --------

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  pos: CellPos,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  color: string
): void {
  const x = offsetX + pos.c * cellSize;
  const y = offsetY + pos.r * cellSize;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, cellSize * 0.06);
  ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  ctx.restore();
}
