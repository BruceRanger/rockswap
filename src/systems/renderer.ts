// ============================================================
// File: src/systems/renderer.ts
// RockSwap board renderer (classic square look)
// ------------------------------------------------------------
// - Draws clean square tiles, no rounding, no glossy gradients.
// - Draws Star Rocks (★) and Diamond Rocks (◆).
// - Fully responsive: main.ts resizes the canvas automatically.
// ============================================================

import {
  CellKind,
  isRock,
  isStarRock,
  isDiamondRock,
  isEmpty
} from "../core/cell";
import type { Cell } from "../core/cell";

export type Board = Cell[][];
export interface CellPos { r: number; c: number; }

export interface RenderParams {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  board: Board;
  selected?: CellPos | null;
  hover?: CellPos | null;
  swell?: number; // used later for animations
}

// -------- Simple rock colors (flat, no gradient) --------

const ROCK_COLORS = [
  { r: 200, g: 50,  b: 50  },
  { r: 50,  g: 150, b: 200 },
  { r: 80,  g: 180, b: 80  },
  { r: 220, g: 190, b: 70  },
  { r: 160, g: 100, b: 200 },
  { r: 220, g: 120, b: 80  }
];

function rockFill(cell: Cell): string {
  const c = ROCK_COLORS[Math.max(0, Math.min(ROCK_COLORS.length - 1, cell.color))];
  return `rgb(${c.r},${c.g},${c.b})`;
}

function inverseColor(cell: Cell): string {
  const c = ROCK_COLORS[cell.color];
  return `rgb(${255 - c.r}, ${255 - c.g}, ${255 - c.b})`;
}

// -------- Main Render --------

export function renderGame(params: RenderParams): void {
  const { canvas, ctx, board } = params;

  const rows = board.length;
  const cols = rows ? board[0].length : 0;
  if (!rows || !cols) return;

  const swell = params.swell ?? 1.0;

  // Compute cell size in pixels based on canvas size
  const cellSize = Math.floor(
    Math.min(canvas.width / cols, canvas.height / rows)
  );

  const totalW = cellSize * cols;
  const totalH = cellSize * rows;

  // Center the board
  const ox = (canvas.width - totalW) / 2;
  const oy = (canvas.height - totalH) / 2;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply swell transform (optional animation)
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.translate(cx, cy);
  ctx.scale(swell, swell);
  ctx.translate(-cx, -cy);

  // Background behind board
  ctx.fillStyle = "rgb(20,20,40)";
  ctx.fillRect(ox - 2, oy - 2, totalW + 4, totalH + 4);

  // Draw cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawCell(ctx, board[r][c], ox + c * cellSize, oy + r * cellSize, cellSize);
    }
  }

  // Selected highlight
  if (params.selected) {
    drawHighlight(ctx, params.selected, ox, oy, cellSize, "rgba(255,255,255,0.5)");
  }
  // Hover highlight
  if (params.hover) {
    drawHighlight(ctx, params.hover, ox, oy, cellSize, "rgba(255,255,255,0.3)");
  }

  ctx.restore();
}

// -------- Draw one cell (square, flat) --------

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number
): void {
  // Tile background (dark)
  ctx.fillStyle = "rgb(40,40,60)";
  ctx.fillRect(x, y, size, size);

  if (isEmpty(cell)) return;
  if (!isRock(cell)) return;

  // Rock square
  ctx.fillStyle = rockFill(cell);
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

  // Special rock overlays (simple icons)
  if (isStarRock(cell)) {
    drawIcon(ctx, "★", x, y, size);
  } else if (isDiamondRock(cell)) {
    drawIcon(ctx, "◆", x, y, size);
  }
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  x: number,
  y: number,
  size: number
): void {
  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(size * 0.6)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, x + size / 2, y + size / 2);
}

// -------- Highlights --------

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  pos: CellPos,
  ox: number,
  oy: number,
  size: number,
  color: string
): void {
  const x = ox + pos.c * size;
  const y = oy + pos.r * size;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.restore();
}
