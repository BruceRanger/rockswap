// ============================================================
// File: src/config.ts
// Purpose: Customizable game settings
// ------------------------------------------------------------
// 🎨 Fork-friendly: Change colors, scoring, or game rules here!
// ============================================================

/**
 * Rock colors used in the game.
 * Fork this project? Change these to customize your version!
 */
export const ROCK_COLORS: string[] = [
  "rgba(128, 128, 128, 1)", // Gray
  "rgba(0, 255, 0, 1)", // Green
  "rgba(255, 128, 0, 1)", // Orange
  "rgba(128, 0, 128, 1)", // Purple
  "rgba(0, 255, 255, 1)", // Blue
  "rgba(255, 255, 0, 1)" // Yellow
];

/**
 * Number of different rock types (derived from colors)
 */
export const COUNT_OF_ROCK_TYPES = ROCK_COLORS.length;

/**
 * Board size (default 8x8)
 */
export const BOARD_SIZE = 8;

// Add more customizable settings here as needed:
// export const ANIMATION_SPEED = 240;
// export const MATCH_MINIMUM = 3;
