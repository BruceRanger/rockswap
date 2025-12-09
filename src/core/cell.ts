// ============================================================
// File: src/core/cell.ts
// RockSwap cell definitions
// ------------------------------------------------------------
// Terminology:
// - Rock:          normal colored rock
// - Star rock ★:   special rock created during play
// - Diamond rock ◆/◎: wild rock that can match any color
//
// All naming avoids terminology from other matching games.
// ============================================================

export const enum CellKind {
  Empty,
  Rock,
  StarRock,
  DiamondRock,
}

export interface Cell {
  kind: CellKind;
  color: number; // index 0..N-1 for base color
}

/** True if this cell contains a rock of any type. */
export function isRock(cell: Cell): boolean {
  return (
    cell.kind === CellKind.Rock ||
    cell.kind === CellKind.StarRock ||
    cell.kind === CellKind.DiamondRock
  );
}

/** True if this cell contains nothing. */
export function isEmpty(cell: Cell): boolean {
  return cell.kind === CellKind.Empty;
}

/** True only for a normal rock. */
export function isNormalRock(cell: Cell): boolean {
  return cell.kind === CellKind.Rock;
}

/** True for a star rock (★). */
export function isStarRock(cell: Cell): boolean {
  return cell.kind === CellKind.StarRock;
}

/** True for a diamond rock (wild). */
export function isDiamondRock(cell: Cell): boolean {
  return cell.kind === CellKind.DiamondRock;
}

/**
 * Returns the base color used for matching.
 * Diamond rocks return null because they align with any color.
 */
export function baseColor(cell: Cell): number | null {
  if (!isRock(cell)) return null;

  if (isDiamondRock(cell)) {
    return null; // wild rock
  }

  return cell.color;
}
