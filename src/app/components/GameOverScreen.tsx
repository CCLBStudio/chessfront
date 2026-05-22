"use client";

import { GameOverReason } from "../services/chessEngine";
import { Loot } from "../services/loot";
import style from "../styles/gameOverMessageStyle.module.css";
import * as pixi from 'pixi.js';
import { useEffect, useState } from "react";
import { revealLoot } from "../pixi/PieceRevealAnimation";

interface GameOverScreenProps {
  gameOverReason: GameOverReason;
  playerWon: boolean;
  loot: Loot | null;
  piecesFolderUrl: string;
  uiApp: pixi.Application | null;
  onNewBattle?: () => void;
  onEditArmy?: () => void;
}

const GAME_OVER_MESSAGES: Record<GameOverReason, string> = {
  CHECKMATE: "Checkmate!",
  STALEMATE: "Stalemate",
  INSUFFICIENT_MATERIAL: "Insufficient Material",
  THREEFOLD_REPETITION: "Threefold Repetition",
  DRAW: "Draw",
  UNKNOWN: "Game Over",
};

async function displayLootSprite(loot: Loot, piecesFolderUrl: string, uiApp: pixi.Application) {
  const textureUrl = `${piecesFolderUrl}white_${loot}.png`;
  const texture = await pixi.Assets.load(textureUrl);
  const sprite = new pixi.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  const w = 250;
  const h = w * sprite.height / sprite.width;
  sprite.setSize(w, h);
  sprite.position.set(uiApp.renderer.width / 2, uiApp.renderer.height / 2);

  uiApp.stage.addChild(sprite);
  await revealLoot(sprite);
}

export default function GameOverMessage(props: GameOverScreenProps) {
  const message = GAME_OVER_MESSAGES[props.gameOverReason] || "Game Over";
  const lootMessage = props.loot ? `You have a new piece:` : "Nothing obtained this time.";
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (props.uiApp && props.loot) {
        await displayLootSprite(props.loot, props.piecesFolderUrl, props.uiApp);
      }

      if (isMounted) {
        setShowButtons(true);
      }

    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={style.container}>
      <span className={style.message}>
        {message}
      </span>
      <span className={style.lootMessage}>
        {lootMessage}
      </span>

      {showButtons && (
        <div className={style.buttonsContainer}>
          <button className={style.button}>
            New Battle
          </button>
          <button className={style.button}>
            Edit Army
          </button>
        </div>
      )}
    </div>
  );
}
