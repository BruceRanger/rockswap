// ============================================================
// File: src/core/cell.ts
// Purpose: Bit-flags for special gem types (power gem, hypercube)
// ============================================================

// Base gem values are 0..(KINDS-1).
// We encode special gems by adding bit flags above the color index.
//
// Example:
//   value = color | FLAG_POWER
//   value = color | FLAG_HYPERCUBE
//
// The renderer can check these flags to draw differently.
// The board logic can check these flags to apply special effects.

export const FLAG_POWER = 1 << 8;       // 256
export const FLAG_HYPERCUBE = 1 << 9;   // 512

// Mask out only the base gem color
export const COLOR_MASK = 0xff;

// Utility helpers
export function isPowerGem(v: number): boolean {
  return (v & FLAG_POWER) !== 0;
}

export function isHypercube(v: number): boolean {
  return (v & FLAG_HYPERCUBE) !== 0;
}

export function baseColor(v: number): number {
  return v & COLOR_MASK;
}
