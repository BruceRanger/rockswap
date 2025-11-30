// ============================================================
// File: src/core/cell.ts
// Purpose: Special-gem encoding (normal, power, hypercube)
// ============================================================

// Empty cell
export const EMPTY = -1;

// Bit masks for special gems
const POWER_BIT = 1 << 8; // 256
const HYPER_BIT = 1 << 9; // 512

// ------------------------------------------------------------
// Creation helpers
// ------------------------------------------------------------

/** Normal gem: just a color index 0..255 (low 8 bits). */
export function makeNormal(color: number): number {
  return color & 0xff;
}

/** Power gem: same base color with POWER_BIT added. */
export function makePowerGem(color: number): number {
  return (color & 0xff) | POWER_BIT;
}

/** Hypercube: uses only the hyper flag. */
export function makeHypercube(): number {
  return HYPER_BIT;
}

// ------------------------------------------------------------
// Detection helpers
// ------------------------------------------------------------

export function isEmpty(v: number): boolean {
  return v === EMPTY;
}

export function isHypercube(v: number): boolean {
  return (v & HYPER_BIT) !== 0;
}

export function isPowerGem(v: number): boolean {
  return !isHypercube(v) && (v & POWER_BIT) !== 0;
}

export function isSpecial(v: number): boolean {
  return isPowerGem(v) || isHypercube(v);
}

/** Base color 0..255 extracted from low byte. */
export function baseColorOf(v: number): number {
  if (v < 0) return EMPTY;
  return v & 0xff;
}
