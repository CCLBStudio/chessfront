"use client";

import { useEffect, useRef } from 'react';
import * as pixi from 'pixi.js';
import { BoardSettings, ChessBoard } from '../pixi/ChessBoard';
import { InitBoardPieces } from '../pixi/boardPiecesInitializer';

export default function ChessScene() {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const appRef = useRef<pixi.Application | null>(null);

    async function InitPixiApp(): Promise<pixi.Application | null> {
        if (!containerRef.current) return null;

        const app = new pixi.Application();
        await app.init({
            resizeTo: containerRef.current,
            backgroundAlpha: 0,
            antialias: true,
        });

        containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
        appRef.current = app;
        return app;
    }

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        (async () => {
            const app = await InitPixiApp();
            if (app === null) return;

            const w = containerRef.current!.clientWidth;
            const h = containerRef.current!.clientHeight;

            const boardSettings: BoardSettings = {
                hexWhiteColor: 0xebecd0,
                hexBlackColor: 0x739552,
                cellSize: w < h ? w / 8 : h / 8,
                piecesFolderUrl: "/assets/pieces/default/",
                whiteDown: true
            }

            const board = new ChessBoard(app, boardSettings);
            await InitBoardPieces(board, boardSettings.piecesFolderUrl);

            app.stage.addChild(board.globalContainer);
        })();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100vh', position: 'relative' }}>
        </div>
    );
}