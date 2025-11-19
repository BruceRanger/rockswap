// -------------------------------------------
// Bejeweled 2 Classic Scoring Logic (TypeScript)
// -------------------------------------------

export type MatchType = "match3" | "match4" | "match5";

export interface MatchEvent {
    type: MatchType;
    gemsCleared: number;  // 3,4,5
}

export interface ExplosionEvent {
    gemsDestroyed: number;
}

export interface HypercubeEvent {
    gemsDestroyed: number;     // number destroyed by chosen color
    doubleHypercube?: boolean; // true if Hypercube+Hypercube swap
}

export interface CascadeResult {
    cascadeIndex: number; // 1st = 1, 2nd = 2,...
    score: number;
}

//
// --- Base scoring constants ---
//

function scoreMatch(evt: MatchEvent, level: number): number {
    switch (evt.type) {
        case "match3": return 30 * level;    // 3 × 10 × Level
        case "match4": return 60 * level;    // 4 × 15 × Level
        case "match5": return 100 * level;   // 5 × 20 × Level
    }
}

//
// --- Power Gem explosion scoring ---
//

export function scorePowerGemExplosion(evt: ExplosionEvent, level: number): number {
    // In Classic: 20 × Level per gem destroyed
    return evt.gemsDestroyed * 20 * level;
}

//
// --- Hypercube scoring ---
//

export function scoreHypercube(evt: HypercubeEvent, level: number): number {
    if (evt.doubleHypercube) {
        // Entire board wipe: roughly 64 gems on an 8×8 board
        // Score = 20 × Level × gemsDestroyed
        return evt.gemsDestroyed * 20 * level;
    } else {
        // Standard Hypercube activation (destroy all of one color)
        return evt.gemsDestroyed * 20 * level;
    }
}

//
// --- Cascade multiplier logic ---
//

export function applyCascadeMultiplier(baseScore: number, cascadeIndex: number): number {
    // Cascade #1 = ×1
    // Cascade #2 = ×2
    // Cascade #3 = ×3 ...
    return baseScore * cascadeIndex;
}

//
// --- Level threshold logic (Classic Mode) ---
//

export function pointsNeededForLevel(level: number): number {
    // Level 1 → 2 requires 1000
    // Level N requires 1000 * 2^(N-1)
    if (level < 1) level = 1;
    return 1000 * Math.pow(2, level - 1);
}

//
// --- Example: Score simultaneous matches (initial swap) ---
//

export function scoreSimultaneousMatches(matches: MatchEvent[], level: number): number {
    // No multipliers for the initial swap
    let total = 0;
    for (const m of matches) {
        total += scoreMatch(m, level);
    }
    return total;
}

//
// --- Example: Score cascades ---
//

export function scoreCascades(cascadeEvents: MatchEvent[][], level: number): number {
    // cascadeEvents is an array where:
    // cascadeEvents[0] = matches from first cascade
    // cascadeEvents[1] = matches from second cascade
    // etc.
    let total = 0;

    cascadeEvents.forEach((events, index) => {
        const cascadeIndex = index + 1;
        let baseScore = 0;

        for (const evt of events) {
            baseScore += scoreMatch(evt, level);
        }

        total += applyCascadeMultiplier(baseScore, cascadeIndex);
    });

    return total;
}
