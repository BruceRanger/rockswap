// ============================================================
// File: src/systems/renderer.ts
// RockSwap board renderer
// ------------------------------------------------------------
// Draws a grid of rocks onto a canvas with support for:
// - Normal rocks
// - Star rocks (★)
// - Diamond rocks (◆, wild)
// - Optional selection + hover highlights
// - Optional swell effect for special events
//
// Naming avoids terminology from other matching games.
// ============================================================`

import {
  CellKind,
  isRock,
  isStarRock,
  isDiamondRock,
  isEmpty,
} from "../core/cell";
import type { Cell } from "../core/cell";

/** Two-dimensional array of cells. */
export type Board = Cell[][];

export interface CellPos {
  r: number;
  c: number;
}

/**
 * Parameters for rendering a single frame.
 */
export interface RenderParams {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  board: Board;

  /** Selected cell (e.g., first rock tapped). */
  selected?: CellPos | null;

  /** Hovered cell (e.g., pointer over). */
  hover?: CellPos | null;

  /**
   * Swell factor for the board (1.0 = normal).
   * Values slightly above 1.0 (like 1.05–1.12) make the board appear
   * to swell outward for a brief effect.
   */
  swell?: number;
}

// -------------------- Color helpers --------------------

/**
 * Simple fixed palette for rocks.
 * Index must match cell.color (0..N-1).
 * Adjust colors to match your existing style if desired.
 */
const ROCK_COLORS: Array<{ r: number; g: number; b: number }> = [
  { r: 220, g: 80, b: 80 },   // color 0
  { r: 80, g: 160, b: 220 },  // color 1
  { r: 110, g: 200, b: 110 }, // color 2
  { r: 230, g: 200, b: 90 },  // color 3
  { r: 180, g: 120, b: 220 }, // color 4
  { r: 230, g: 140, b: 90 },  // color 5
];

/**
 * Get the base fill color for a rock.
 */
function rockFillColor(cell: Cell): string {
  const idx = Math.max(0, Math.min(ROCK_COLORS.length - 1, cell.color));
  const { r, g, b } = ROCK_COLORS[idx];
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Inverse of the base color, used as an overlay for special rocks.
 */
function rockInverseColor(cell: Cell): string {
  const idx = Math.max(0, Math.min(ROCK_COLORS.length - 1, cell.color));
  const { r, g, b } = ROCK_COLORS[idx];
  const ir = 255 - r;
  const ig = 255 - g;
  const ib = 255 - b;
  return `rgb(${ir}, ${ig}, ${ib})`;
}

// -------------------- Main render entry --------------------

export function renderGame(params: RenderParams): void {
  const { canvas, ctx, board } = params;
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  if (rows === 0 || cols === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const swell = params.swell ?? 1.0;

  // Compute cell size to fit board nicely inside canvas.
  const cellSize = Math.floor(
    Math.min(canvas.width / cols, canvas.height / rows)
  );

  const boardWidth = cellSize * cols;
  const boardHeight = cellSize * rows;

  // Top-left corner to center the board
  const offsetX = (canvas.width - boardWidth) / 2;
  const offsetY = (canvas.height - boardHeight) / 2;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply swell transform around board center
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.translate(centerX, centerY);
  ctx.scale(swell, swell);
  ctx.translate(-centerX, -centerY);

  // Draw background behind board
  ctx.fillStyle = "rgba(10, 10, 20, 1)";
  ctx.fillRect(offsetX - 8, offsetY - 8, boardWidth + 16, boardHeight + 16);

  // Draw cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;

      drawCell(ctx, cell, x, y, cellSize);
    }
  }

  // Selection + hover overlays
  if (params.selected) {
    highlightCell(
      ctx,
      params.selected,
      offsetX,
      offsetY,
      cellSize,
      "rgba(255, 255, 255, 0.7)",
      board
    );
  }

  if (params.hover) {
    highlightCell(
      ctx,
      params.hover,
      offsetX,
      offsetY,
      cellSize,
      "rgba(255, 255, 255, 0.4)",
      board
    );
  }

  ctx.restore();
}

// -------------------- Per-cell drawing --------------------

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number
): void {
  if (isEmpty(cell)) {
    // Empty slot: draw a faint tile background.
    ctx.fillStyle = "rgba(40, 40, 60, 1)";
    ctx.fillRect(x, y, size, size);
    return;
  }

  if (!isRock(cell)) {
    // Unknown kind; just draw the tile background.
    ctx.fillStyle = "rgba(40, 40, 60, 1)";
    ctx.fillRect(x, y, size, size);
    return;
  }

  // Tile background
  ctx.fillStyle = "rgba(40, 40, 60, 1)";
  ctx.fillRect(x, y, size, size);

  // Main rounded rock
  const pad = size * 0.12;
  const rx = x + pad;
  const ry = y + pad;
  const rw = size - 2 * pad;
  const rh = size - 2 * pad;

  drawRoundedRect(ctx, rx, ry, rw, rh, size * 0.22);
  ctx.fillStyle = rockFillColor(cell);
  ctx.fill();

  // Slight inner highlight
  ctx.save();
  ctx.clip();
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  grad.addColorStop(0, "rgba(255,255,255,0.30)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.05)");
  grad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.restore();

  // Special overlays
  if (isStarRock(cell)) {
    drawStarRockOverlay(ctx, cell, x, y, size);
  } else if (isDiamondRock(cell)) {
    drawDiamondRockOverlay(ctx, cell, x, y, size);
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// -------------------- Special rock overlays --------------------

function drawStarRockOverlay(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number
): void {
  const overlayColor = rockInverseColor(cell);

  // Soft overlay
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = overlayColor;
  const pad = size * 0.16;
  ctx.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad);
  ctx.restore();

  // Star symbol
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `${Math.floor(size * 0.6)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", x + size / 2, y + size / 2 + size * 0.03);
  ctx.restore();
}

function drawDiamondRockOverlay(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  size: number
): void {
  const overlayColor = rockInverseColor(cell);

  // Soft overlay
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = overlayColor;
  const pad = size * 0.16;
  ctx.fillRect(x + pad, y + pad, size - 2 * pad, size - 2 * pad);
  ctx.restore();

  // Diamond shape in the center (vector, not text)
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.26; // radius from center to corners

  ctx.beginPath();
  ctx.moveTo(cx, cy - r);     // top
  ctx.lineTo(cx + r, cy);     // right
  ctx.lineTo(cx, cy + r);     // bottom
  ctx.lineTo(cx - r, cy);     // left
  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();

  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.stroke();
  ctx.restore();
}


// -------------------- Highlights --------------------

function highlightCell(
  ctx: CanvasRenderingContext2D,
  pos: CellPos,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  color: string,
  board: Board
): void {
  const { r, c } = pos;
  if (r < 0 || c < 0) return;
  if (r >= board.length || board[0] == null || c >= board[0].length) return;

  const x = offsetX + c * cellSize;
  const y = offsetY + r * cellSize;

  ctx.save();
  ctx.lineWidth = Math.max(2, cellSize * 0.08);
  ctx.strokeStyle = color;
  ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
  ctx.restore();
}
