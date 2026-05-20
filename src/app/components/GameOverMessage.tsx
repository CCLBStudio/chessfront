"use client";

import { GameOverReason } from "../services/chessEngine";
import { Loot } from "../services/loot";
import style from "../styles/gameOverMessageStyle.module.css";
import { capitalizeFirst } from "../../utils/textFormat";
import * as pixi from 'pixi.js';
import { useEffect } from "react";
import { gsap } from "gsap";

interface GameOverMessageProps {
  gameOverReason: GameOverReason;
  playerWon: boolean;
  loot: Loot | null;
  piecesFolderUrl: string;
  uiApp: pixi.Application | null;
}

const GAME_OVER_MESSAGES: Record<GameOverReason, string> = {
    CHECKMATE: "Checkmate!",
    STALEMATE: "Stalemate",
    INSUFFICIENT_MATERIAL: "Insufficient Material",
    THREEFOLD_REPETITION: "Threefold Repetition",
    DRAW: "Draw",
    UNKNOWN: "Game Over",
};

async function loadShader(path: string) {
    const response = await fetch(path);
    return response.text();
}

async function displayLootSprite(loot: Loot, piecesFolderUrl: string, uiApp: pixi.Application) {
  const textureUrl = `${piecesFolderUrl}white_${loot}.png`;
  const texture = await pixi.Assets.load(textureUrl);
  const noiseTexture = await pixi.Assets.load("noise/perlin23.png");
  const sprite = new pixi.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  const w = 250;
  const h = w * sprite.height / sprite.width;
  sprite.setSize(w, h);
  sprite.position.set(uiApp.renderer.width / 2, uiApp.renderer.height / 2);

  const vertex = await loadShader("/shaders/dissolve.vert.glsl");
  const fragment = await loadShader("/shaders/dissolve.frag.glsl");
  const dissolve = new pixi.Filter({
      glProgram: new pixi.GlProgram({
          vertex,
          fragment,
      }),
      resources: {
          dissolveUniforms: {
              progress: { value: 1, type: "f32" },
              burnColor: { value: [0.451, 0.584, 0.322], type: "vec3<f32>" },
          },
          uNoise: noiseTexture.source,
      },
  });

  sprite.filters = [dissolve];
  gsap.to(dissolve.resources.dissolveUniforms.uniforms, {
    delay: 0.5,
    progress: 0,
    duration: 3,
    ease: "power4.in",
  });
  uiApp.stage.addChild(sprite);
}

export default function GameOverMessage(props: GameOverMessageProps) {
  const message = GAME_OVER_MESSAGES[props.gameOverReason] || "Game Over";
  const lootMessage = props.loot ? `You have a new piece:` : "Nothing obtained this time.";

  useEffect(() => {
    (async () => {
      if (props.uiApp && props.loot) {
        await displayLootSprite(props.loot, props.piecesFolderUrl, props.uiApp);
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
