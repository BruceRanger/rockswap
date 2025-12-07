// ============================================================
// File: src/systems/renderer.ts
// Purpose: Draw the RockSwap board.
// ============================================================

import type { Board } from "../core/grid";
import { baseColor, isPowerGem, isHypercube } from "../core/cell";
import { ROCK_COLORS } from "../config";

// Simple row/col type used by the renderer
export type CellRC = { r: number; c: number };

// Compute board dimensions safely
function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

// Convert "rgb(r, g, b)" or "rgba(r, g, b, a)" into its inverse
// "rgba(255-r, 255-g, 255-b, a)".
function invertRGBA(rgba: string): string {
  const match = rgba.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/
  );
  if (!match) {
    // Fallback if parsing fails
    return "white";
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] !== undefined ? Number(match[4]) : 1;

  const ir = 255 - r;
  const ig = 255 - g;
  const ib = 255 - b;

  return `rgba(${ir}, ${ig}, ${ib}, ${a})`;
}

// Choose a color for the gem at (r, c).
// IMPORTANT: use baseColor(...) so flags (Power/Hypercube) don't
// shift the color index.
function colorFor(board: Board, r: number, c: number): string {
  const row = board[r];
  const v = row ? row[c] : undefined;
  if (typeof v !== "number" || v < 0) {
    // Empty cell (e.g. after clears, before refill)
    return "#222";
  }

  // Strip off FLAG_POWER / FLAG_HYPERCUBE bits, keep base 0..N-1
  const colorIndex = baseColor(v);
  const color = ROCK_COLORS[colorIndex];

  return typeof color === "string" ? color : "#888";
}

// ------------------------------------------------------------
// Main board renderer
// ------------------------------------------------------------
export function renderBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  opts?: {
    highlight?: CellRC[];
    alpha?: number;
    selected?: CellRC | null;
  }
): void {
  const { rows, cols } = dims(board);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.clearRect(0, 0, W, H);
  if (rows === 0 || cols === 0) return;

  const cell = Math.floor(Math.min(W / cols, H / rows));
  const ox = Math.floor((W - cols * cell) / 2);
  const oy = Math.floor((H - rows * cell) / 2);

  // ----------------------------
  // Draw gem colors & borders
  // ----------------------------
  for (let r = 0; r < rows; r++) {
    const row = board[r];
    if (!row) continue;

    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;

      const color = colorFor(board, r, c);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cell, cell);

      ctx.strokeStyle = "#111";
      ctx.strokeRect(x, y, cell, cell);

      // ======================================================
      // SPECIAL GEM OVERLAY (★ Power Gem, ◎ Hypercube)
      // ======================================================
      const v = row[c];
      if (typeof v === "number" && v >= 0) {
        const baseIndex = baseColor(v);
        const baseColorCss = ROCK_COLORS[baseIndex] ?? "rgba(128,128,128,1)";
        const iconColor = invertRGBA(baseColorCss);

        ctx.fillStyle = iconColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.floor(cell * 0.6)}px sans-serif`;

        if (isPowerGem(v)) {
          ctx.fillText("★", x + cell / 2, y + cell / 2);
        } else if (isHypercube(v)) {
          ctx.fillText("◎", x + cell / 2, y + cell / 2);
        }
      }
      // ======================================================
    }
  }

  // ----------------------------
  // Highlight matched cells
  // ----------------------------
  if (opts && opts.highlight && opts.highlight.length > 0) {
    const alpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,0,1)";

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const cellRC of opts.highlight) {
      if (!cellRC) continue;
      const rr = cellRC.r;
      const cc = cellRC.c;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;

      const x = ox + cc * cell;
      const y = oy + rr * cell;
      ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }

    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  // ----------------------------
  // Draw selected outline
  // ----------------------------
  if (opts && opts.selected) {
    const rr = opts.selected.r;
    const cc = opts.selected.c;
    if (
      Number.isInteger(rr) &&
      Number.isInteger(cc) &&
      rr >= 0 &&
      cc >= 0 &&
      rr < rows &&
      cc < cols
    ) {
      const x = ox + cc * cell;
      const y = oy + rr * cell;
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.restore();
    }
  }
}

// ----------------------------
// Convert pointer → board cell
// ----------------------------
function getClientXY(ev: MouseEvent | PointerEvent | TouchEvent) {
  if ("clientX" in ev && "clientY" in ev) return { x: ev.clientX, y: ev.clientY };
  const te = ev as TouchEvent;
  const t = te.changedTouches && te.changedTouches[0];
  return t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 };
}

export function pickCellAt(
  board: Board,
  canvas: HTMLCanvasElement,
  ev: MouseEvent | PointerEvent | TouchEvent
) {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return null;

  const rect = canvas.getBoundingClientRect();
  const { x: cx, y: cy } = getClientXY(ev);

  // Account for CSS scaling: convert screen pixels to logical canvas coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (cx - rect.left) * scaleX;
  const y = (cy - rect.top) * scaleY;

  const W = canvas.width;
  const H = canvas.height;
  const cell = Math.floor(Math.min(W / cols, H / rows));
  const ox = Math.floor((W - cols * cell) / 2);
  const oy = Math.floor((H - rows * cell) / 2);

  const c = Math.floor((x - ox) / cell);
  const r = Math.floor((y - oy) / cell);

  if (r >= 0 && r < rows && c >= 0 && c < cols) return { r, c };
  return null;
}
