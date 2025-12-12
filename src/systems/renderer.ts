// ============================================================
// File: src/systems/renderer.ts
// Purpose: Draw the RockSwap board, highlights, selection,
//          special-gem symbols, optional pulse, and Game Over overlay.
// ============================================================

import type { Board } from "../core/grid";
import { baseColor, isPowerGem, isHypercube } from "../core/cell";
import { ROCK_COLORS } from "../config";
import type { CellRC } from "../core/match";

// ---------- Helpers ----------

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

// Choose a color for the gem at (r, c).
// IMPORTANT: use baseColor(...) so flags (Power/Hypercube) don't
// shift the color index.
function colorFor(board: Board, r: number, c: number): string {
  const row = board[r];
  const v = row ? row[c] : undefined;
  if (typeof v !== "number" || v < 0) {
    return "#222"; // empty/background
  }

  const idx = baseColor(v);
  const raw = ROCK_COLORS[idx];
  return typeof raw === "string" ? raw : "#888";
}

// Invert an rgba()/rgb() color for star / hypercube glyphs.
function invertRgba(color: string): string {
  const nums = color.match(/[\d.]+/g);
  if (!nums || nums.length < 3) {
    return "white";
  }

  const r = 255 - Number(nums[0] || 0);
  const g = 255 - Number(nums[1] || 0);
  const b = 255 - Number(nums[2] || 0);
  const a = nums[3] !== undefined ? Number(nums[3]) : 1;

  const rr = Math.min(255, Math.max(0, Math.round(r)));
  const gg = Math.min(255, Math.max(0, Math.round(g)));
  const bb = Math.min(255, Math.max(0, Math.round(b)));

  return `rgba(${rr},${gg},${bb},${a})`;
}

// ============================================================
// Main board renderer
// ============================================================

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  opts?: {
    highlight?: CellRC[];
    alpha?: number;
    selected?: CellRC | null;
    gameOver?: boolean;
    pulse?: number; // 1.0 = normal, >1 = scaled up
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

  const pulse = opts?.pulse ?? 1;

  // Global transform for pulse: scale about canvas center
  ctx.save();
  if (pulse !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-W / 2, -H / 2);
  }

  // ----------------------------
  // Draw gem colors & borders
  // ----------------------------
  for (let r = 0; r < rows; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;

      const fill = colorFor(board, r, c);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, cell, cell);

      ctx.strokeStyle = "#111";
      ctx.strokeRect(x, y, cell, cell);

      // ======================================================
      // SPECIAL GEM OVERLAY (★ Power Gem, ◎ Hypercube)
      // ======================================================
      const v = row[c];
      if (typeof v === "number" && v >= 0) {
        const baseIdx = baseColor(v);
        const baseCol = ROCK_COLORS[baseIdx];
        const baseStr = typeof baseCol === "string" ? baseCol : "#888";
        const glyphColor = invertRgba(baseStr);

        ctx.fillStyle = glyphColor;
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

  // ----------------------------
  // Game Over overlay (if requested)
  // ----------------------------
  if (opts && opts.gameOver) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const titleSize = Math.floor(Math.min(W, H) * 0.12);
    const msgSize = Math.floor(Math.min(W, H) * 0.06);

    ctx.font = `${titleSize}px sans-serif`;
    ctx.fillText("NO MOVES – GAME OVER", W / 2, H / 2 - titleSize * 0.3);

    ctx.font = `${msgSize}px sans-serif`;
    ctx.fillText("Tap New Game to play again", W / 2, H / 2 + msgSize * 0.9);

    ctx.restore();
  }

  ctx.restore(); // undo pulse transform
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
