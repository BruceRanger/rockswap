// ============================================================
// File: src/core/cell.ts
// RockSwap core cell definitions
// ------------------------------------------------------------
// Terminology (no Bejeweled words):
// - Rock:         normal colored rock
// - Star rock ★:  special rock created by 4-in-a-row
// - Diamond rock ◎: wild rock that can match any color
//
// The display symbol for the diamond rock may later change
// from ◎ to a true diamond shape — code name stays the same.
// ============================================================

export const enum CellKind {
  Empty,
  Rock,         // formerly Gem
  StarRock,     // formerly PowerGem
  DiamondRock,  // formerly Hypercube (wild)
}

export interface Cell {
  kind: CellKind;
  color: number; // index 0..N-1 for base color
}

/** True if it's any kind of rock (normal or special). */
export function isRock(cell: Cell): boolean {
  return (
    cell.kind === CellKind.Rock ||
    cell.kind === CellKind.StarRock ||
    cell.kind === CellKind.DiamondRock
  );
}

/** True only for a normal rock (not special). */
export function isNormalRock(cell: Cell): boolean {
  return cell.kind === CellKind.Rock;
}

/** Is this a star rock (★)? */
export function isStarRock(cell: Cell): boolean {
  return cell.kind === CellKind.StStarRock; // ❌ wrong
}
