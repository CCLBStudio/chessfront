"use client";

import { GameOverReason } from "../services/chessEngine";
import style from "../styles/gameOverMessageStyle.module.css";

interface GameOverMessageProps {
    gameOverReason: GameOverReason;
}

const GAME_OVER_MESSAGES: Record<GameOverReason, string> = {
    CHECKMATE: "Checkmate!",
    STALEMATE: "Stalemate",
    INSUFFICIENT_MATERIAL: "Insufficient Material",
    THREEFOLD_REPETITION: "Threefold Repetition",
    DRAW: "Draw",
    UNKNOWN: "Game Over",
};

export default function GameOverMessage({ gameOverReason }: GameOverMessageProps) {
    const message = GAME_OVER_MESSAGES[gameOverReason] || "Game Over";

    return (
        <div className={style.container}>
            <span className={style.message}>
                {message}
            </span>
        </div>
    );
}
