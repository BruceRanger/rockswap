// ============================================================
// File: src/core/cell.ts
// Purpose: Bit-flags and helpers for special gem types
//          (power gem, hypercube, etc.).
// ============================================================
//
// Base gem values are 0..(KINDS-1).
// We encode special gems by adding bit flags above the color index.
//
// Example:
//    value = color | FLAG_POWER
//    value = color | FLAG_HYPERCUBE
//
// The renderer can check these flags to draw differently.
// The board logic can check these flags to apply special effects.
//
// ============================================================

// --- Flag bits ------------------------------------------------

export const FLAG_POWER = 1 << 8;      // 256
export const FLAG_HYPERCUBE = 1 << 9;  // 512

// Mask for the base gem color (low byte only).
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
export function isPowerGem(value: number): boolean {
  return (value & FLAG_POWER) !== 0;
}

export function isHypercube(value: number): boolean {
  return (value & FLAG_HYPERCUBE) !== 0;
}
