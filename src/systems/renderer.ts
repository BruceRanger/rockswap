// ============================================================
// File: src/systems/renderer.ts
// Purpose: Draw the board, selection, and match highlights
// Strict-mode safe: guards all indexed accesses.
// ============================================================

import { ROCK_COLORS, COUNT_OF_ROCK_TYPES } from "../config";

// NEW: special gem detection
import { isPowerGem, isHypercube } from "../core/cell";

export type CellRC = { r: number; c: number };

function dims(board: number[][]) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function colorFor(board: number[][], r: number, c: number): string {
  const row = board[r];
  const v = row ? row[c] : undefined;
  if (typeof v === "number" && v >= 0) {
    const idx = Math.abs(v) % COUNT_OF_ROCK_TYPES;
    const color = ROCK_COLORS[idx];
    return typeof color === "string" ? color : "#888";
  }
  return "#222";
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  board: number[][],
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
        ctx.fillStyle = "white";
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
      const r = cellRC.r;
      const c = cellRC.c;
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue;

      const x = ox + c * cell;
      const y = oy + r * cell;
      ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }

    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  // ----------------------------
  // Draw selected outline
  // ----------------------------
  if (opts && opts.selected) {
    const r = opts.selected.r;
    const c = opts.selected.c;
    if (Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < rows && c < cols) {
      const x = ox + c * cell;
      const y = oy + r * cell;
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
  board: number[][],
  canvas: HTMLCanvasElement,
  ev: MouseEvent | PointerEvent | TouchEvent
) {
  const { rows, cols } = dims(board);
  if (rows === 0 || cols === 0) return null;

  const rect = canvas.getBoundingClientRect();
  const { x: cx, y: cy } = getClientXY(ev);

  // Convert screen → canvas coordinates
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
  

  // highlight matches
  if (opts && opts.highlight && opts.highlight.length > 0) {
    const alpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,0,1)";
    // apply alpha via globalAlpha to ensure strokeStyle is a valid string
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const cellRC of opts.highlight) {
      if (!cellRC) continue;
      const r = cellRC.r;
      const c = cellRC.c;
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue;

      const x = ox + c * cell;
      const y = oy + r * cell;
      ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }

    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  // selected cell outline (if any)
  if (opts && opts.selected) {
    const r = opts.selected.r;
    const c = opts.selected.c;
    if (Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < rows && c < cols) {
      const x = ox + c * cell;
      const y = oy + r * cell;
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

// get client coordinates from MouseEvent | PointerEvent | TouchEvent
function getClientXY(ev: MouseEvent | PointerEvent | TouchEvent) {
  if ("clientX" in ev && "clientY" in ev) return { x: ev.clientX, y: ev.clientY };
  const te = ev as TouchEvent;
  const t = te.changedTouches && te.changedTouches[0];
  return t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 };
}

export function pickCellAt(
  board: number[][],
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
