// ============================================================
// File: src/core/scoring.ts
// RockSwap scoring helpers
// ------------------------------------------------------------
// Scoring rules:
//
// - Base value per cleared rock: 10 points.
// - A straight line of 3 rocks:
//     3 * 10 = 30 points.
// - A straight line of 4 rocks:
//     4 * 10 + 40 bonus = 80 points
//     (and should create a star rock elsewhere in the logic).
// - A straight line of 5 or more rocks:
//     length * 10 + 50 bonus
//     (and should create a diamond rock elsewhere in the logic).
//
// Cascades:
// - Each time rocks are cleared during a single move, the
//   "chain index" increases (1 for first clear, 2 for second, etc.).
// - The points for that clear are multiplied by the chain index.
//
// Special rock activations:
// - Star rock activation: extra flat bonus per activation.
// - Diamond rock activation: larger flat bonus per activation.
//   (Plus the normal per-rock base value for the cleared rocks).
//
// This file does not modify the board. It only calculates and
// accumulates scores based on counts that other modules provide.
// ============================================================

/**
 * Global scoring state for a game.
 * - total: accumulated points.
 * - chainIndex: 0 when idle, 1+ while resolving a move with cascades.
 */
export interface ScoreState {
  total: number;
  chainIndex: number;
}

/**
 * Create a fresh score state.
 */
export function createScoreState(): ScoreState {
  return {
    total: 0,
    chainIndex: 0,
  };
}

/**
 * Call this when a new player move starts (before any clears).
 */
export function beginMoveScoring(state: ScoreState): void {
  state.chainIndex = 0;
}

/**
 * Call this each time a set of straight-line runs is cleared
 * during the resolution of a single move.
 *
 * Parameters:
 * - state: global score state
 * - runLengths: array of line lengths cleared in this step (e.g. [3,4,5])
 *
 * Returns:
 * - points added to state.total for this step (after cascade multiplier)
 */
export function applyLineClears(
  state: ScoreState,
  runLengths: readonly number[]
): number {
  if (runLengths.length === 0) {
    return 0;
  }

  // Next cascade in the chain
  state.chainIndex += 1;
  const chainMultiplier = state.chainIndex;

  let stepBasePoints = 0;

  for (const len of runLengths) {
    if (len < 3) {
      continue; // not a scoring line
    }

    // Base value per cleared rock
    const base = len * 10;

    // Extra bonus depending on length
    let bonus = 0;

    if (len === 4) {
      // Four in a line: star rock is created elsewhere.
      bonus += 40;
    } else if (len >= 5) {
      // Five or more in a line: diamond rock is created elsewhere.
      bonus += 50;
    }

    stepBasePoints += base + bonus;
  }

  const stepPoints = stepBasePoints * chainMultiplier;
  state.total += stepPoints;
  return stepPoints;
}

/**
 * Score a star rock activation.
 *
 * Parameters:
 * - clearedCount: how many rocks were cleared by this activation
 *
 * Returns:
 * - points added (before cascade multiplier)
 *
 * Use:
 * - Call this, then multiply by the current chainIndex if you want
 *   the same cascade behavior as applyLineClears, or simply add
 *   directly if you prefer a flat award.
 */
export function scoreStarRockActivation(clearedCount: number): number {
  if (clearedCount <= 0) return 0;

  const base = clearedCount * 10;
  const activationBonus = 60; // flat bonus for using a star rock

  return base + activationBonus;
}

/**
 * Score a diamond rock activation.
 *
 * Parameters:
 * - clearedCount: how many rocks of a chosen color were cleared
 *
 * Returns:
 * - points added (before cascade multiplier)
 */
export function scoreDiamondRockActivation(clearedCount: number): number {
  if (clearedCount <= 0) return 0;

  const base = clearedCount * 10;
  const activationBonus = 120; // larger flat bonus for using a diamond rock

  return base + activationBonus;
}
