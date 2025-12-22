// ============================================================
// File: src/core/cell.ts
// Purpose: Bit-flags and helpers for special rock types
//          (star rock, diamond rock, etc.).
// ============================================================
//
// Base rock values are 0..(KINDS-1).
// We encode special rocks by adding bit flags above the color index.
//
// Example:
//    value = color | FLAG_STAR
//    value = color | FLAG_DIAMOND
//
// The renderer can check these flags to draw differently.
// The board logic can check these flags to apply special effects.
//
// ============================================================

// --- Flag bits ------------------------------------------------

export const FLAG_STAR = 1 << 8; // 256
export const FLAG_DIAMOND = 1 << 9; // 512

// Mask for the base rock color (low byte only).
export const COLOR_MASK = 0xff;

// Return just the underlying base color (0..KINDS-1), hiding flags.
// match.ts imports this as `baseColor` and aliases it to getBaseColor.
export function baseColor(value: number): number {
  return value & COLOR_MASK;
}

// An "empty" cell uses a negative value (e.g., -1).
export function isEmpty(value: number): boolean {
  return value < 0;
}

// Convenience helpers for game logic / renderer.
export function isStarRock(value: number): boolean {
  return (value & FLAG_STAR) !== 0;
}

export function isDiamondRock(value: number): boolean {
  return (value & FLAG_DIAMOND) !== 0;
}


