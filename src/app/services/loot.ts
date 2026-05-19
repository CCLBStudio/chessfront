import { GameOverReason } from "./chessEngine";

// Loot types
const Loots = {
    PAWN: "pawn",
    KNIGHT: "knight",
    BISHOP: "bishop",
    ROOK: "rook",
    QUEEN: "queen",
} as const;

export type Loot = typeof Loots[keyof typeof Loots];

// Probability weights for each game over reason
// Higher weight = higher chance
const PROBABILITIES = {
    // Basic loot: mostly pawns, small chance of rare
    BASIC: {
        [Loots.PAWN]: 60,
        [Loots.KNIGHT]: 15,
        [Loots.BISHOP]: 15,
        [Loots.ROOK]: 9,
        [Loots.QUEEN]: 1,
    },
    // Increased chances: more rare, small chance of epic
    INCREASED: {
        [Loots.PAWN]: 35,
        [Loots.KNIGHT]: 25,
        [Loots.BISHOP]: 25,
        [Loots.ROOK]: 10,
        [Loots.QUEEN]: 5,
    },
    // Assured epic or legendary: only rook or queen
    HIGH_TIER: {
        [Loots.PAWN]: 0,
        [Loots.KNIGHT]: 0,
        [Loots.BISHOP]: 0,
        [Loots.ROOK]: 60,
        [Loots.QUEEN]: 40,
    },
} as const satisfies Record<string, Record<Loot, number>>;

const loots: Loot[] = [
    Loots.PAWN,
    Loots.KNIGHT,
    Loots.BISHOP,
    Loots.ROOK,
    Loots.QUEEN,
];

function getRandomLoot(probabilities: Record<Loot, number>): Loot {
    const totalWeight = loots.reduce((sum, loot) => sum + probabilities[loot], 0);
    let random = Math.random() * totalWeight;
    console.log("random:", random);

    for (const loot of loots) {
        random -= probabilities[loot];
        if (random <= 0) {
            return loot;
        }
    }

    // Fallback to first item if something goes wrong
    return loots[0];
}

export function roll(gameOverReason: GameOverReason): Loot {
    let probabilities: Record<string, number>;

    switch (gameOverReason) {
        case "CHECKMATE":
            // Assured epic or legendary loot
            probabilities = PROBABILITIES.HIGH_TIER;
            break;

        case "STALEMATE":
        case "INSUFFICIENT_MATERIAL":
            // Increased chances
            probabilities = PROBABILITIES.INCREASED;
            break;

        case "THREEFOLD_REPETITION":
        case "DRAW":
            // Basic loot
            probabilities = PROBABILITIES.BASIC;
            break;

        case "UNKNOWN":
        default:
            // Default to basic loot
            probabilities = PROBABILITIES.BASIC;
            break;
    }

    return getRandomLoot(probabilities);
}
