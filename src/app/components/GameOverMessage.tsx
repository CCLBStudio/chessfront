"use client";

import { GameOverReason } from "../services/chessEngine";
import { Loot } from "../services/loot";
import style from "../styles/gameOverMessageStyle.module.css";
import { capitalizeFirst } from "../../utils/textFormat";
import * as pixi from 'pixi.js';
import { useEffect } from "react";

interface GameOverMessageProps {
  gameOverReason: GameOverReason;
  playerWon: boolean;
  loot: Loot | null;
  piecesFolderUrl: string;
  pixiApp: pixi.Application | null;
}

const GAME_OVER_MESSAGES: Record<GameOverReason, string> = {
    CHECKMATE: "Checkmate!",
    STALEMATE: "Stalemate",
    INSUFFICIENT_MATERIAL: "Insufficient Material",
    THREEFOLD_REPETITION: "Threefold Repetition",
    DRAW: "Draw",
    UNKNOWN: "Game Over",
};

async function displayLootSprite(loot: Loot, piecesFolderUrl: string, pixiApp: pixi.Application) {
  const textureUrl = `${piecesFolderUrl}white_${loot}.png`;
  const texture = await pixi.Assets.load(textureUrl);
  const sprite = new pixi.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  sprite.position.set(pixiApp.renderer.width / 2, pixiApp.renderer.height / 2);
  pixiApp.stage.addChild(sprite);
}

export default function GameOverMessage(props: GameOverMessageProps) {
  const message = GAME_OVER_MESSAGES[props.gameOverReason] || "Game Over";
  const lootMessage = props.loot ? `You have a new piece: ${capitalizeFirst(props.loot)}` : "Nothing obtained this time.";

  useEffect(() => {
    (async () => {
      if (props.pixiApp && props.loot) {
        await displayLootSprite(props.loot, props.piecesFolderUrl, props.pixiApp);
      }
    })();
  }, [])

    return (
        <div className={style.container}>
          <span className={style.message}>
                {message}
          </span>
          <span className={style.lootMessage}>
            {lootMessage}
          </span>
        </div>
    );
}
