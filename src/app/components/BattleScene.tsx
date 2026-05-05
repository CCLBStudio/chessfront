"use client";

import { useEffect, useRef, useState } from 'react';
import * as pixi from 'pixi.js';
import { Chess } from 'chess.js';
import { BoardSettings, ChessBoard } from '../pixi/ChessBoard';
import { SyncBoardPieces, type BoardPieceMap } from '../pixi/boardPiecesInitializer';
import { BoardOpeningAnimation } from '../pixi/BoardOpeningAnimation';
import { chessStateToBoardMap } from '../pixi/fenToBoardMap';
import { ChessEngine } from '../services/chessEngine';
import { IBoardAnimation } from '../pixi/IBoardAnimation';

const DEFAULT_ENGINE_DEPTH = 10;
const DEFAULT_SKILL_LEVEL = 10;
const TURN_DELAY_MS = 350;

type ComputedTurn = {
    fen: string;
    san: string;
    boardMap: BoardPieceMap;
};

export default function BattleScene() {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const appRef = useRef<pixi.Application | null>(null);
    const boardRef = useRef<ChessBoard | null>(null);
    const openingAnimRef = useRef<IBoardAnimation | null>(null);
    const chessRef = useRef(new Chess());
    const engineRef = useRef<ChessEngine | null>(null);

    const [fen, setFen] = useState(chessRef.current.fen());
    const [lastMove, setLastMove] = useState<string | null>(null);
    const [thinking, setThinking] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<string | null>(null);

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

    function getGameOverReason(chess: Chess): string | null {
        if (!chess.isGameOver()) return null;
        if (chess.isCheckmate()) return "Checkmate";
        if (chess.isStalemate()) return "Stalemate";
        if (chess.isThreefoldRepetition()) return "Threefold repetition";
        if (chess.isInsufficientMaterial()) return "Insufficient material";
        if (chess.isDraw()) return "Draw";
        return "Game over";
    }

    async function computeWholeGame(engine: ChessEngine, chess: Chess, isCancelled: () => boolean): Promise<ComputedTurn[]> {
        const turns: ComputedTurn[] = [];

        engine.newGame();

        while (!isCancelled() && !chess.isGameOver()) {
            const bestMoveUci = await engine.getBestMove(chess.fen(), { depth: DEFAULT_ENGINE_DEPTH });

            if (!bestMoveUci || bestMoveUci === "(none)" || bestMoveUci.length < 4) {
                break;
            }

            const from = bestMoveUci.slice(0, 2);
            const to = bestMoveUci.slice(2, 4);
            const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

            const playedMove = chess.move({ from, to, promotion });
            if (!playedMove) break;

            turns.push({
                fen: chess.fen(),
                san: playedMove.san,
                boardMap: chessStateToBoardMap(chess),
            });
        }

        return turns;
    }

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;
        let cancelled = false;

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
            boardRef.current = board;
            await SyncBoardPieces(board, boardSettings.piecesFolderUrl, chessStateToBoardMap(chessRef.current));

            app.stage.addChild(board.globalContainer);

            const openingAnim: IBoardAnimation = new BoardOpeningAnimation();
            openingAnimRef.current = openingAnim;
            
            const openingAnimationCompleted = new Promise<void>((resolve) => {
                openingAnim.play(board, {
                    onComplete: () => {
                        console.log("opening animation complete");
                        resolve();
                    }
                });
            });

            const engine = new ChessEngine();
            engineRef.current = engine;
            await engine.init({ depth: DEFAULT_ENGINE_DEPTH, skillLevel: DEFAULT_SKILL_LEVEL });

            setThinking(true);
            const computedTurns = await computeWholeGame(engine, chessRef.current, () => cancelled);
            setThinking(false);

            await openingAnimationCompleted;
            if (cancelled) return;

            for (const turn of computedTurns) {
                if (cancelled) break;
                setLastMove(turn.san);
                setFen(turn.fen);
                await SyncBoardPieces(board, boardSettings.piecesFolderUrl, turn.boardMap);
                await new Promise((resolve) => setTimeout(resolve, TURN_DELAY_MS));
            }

            setThinking(false);
            setGameOverReason(getGameOverReason(chessRef.current));
        })();

        return () => {
            cancelled = true;
            openingAnimRef.current?.kill();
            openingAnimRef.current = null;
            engineRef.current?.terminate();
            engineRef.current = null;
            boardRef.current = null;
            appRef.current?.destroy(true);
            appRef.current = null;
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    background: 'rgba(18,18,18,0.75)',
                    color: '#fff',
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 12,
                }}
            >
                <div>Status: {thinking ? 'Engine thinking' : gameOverReason ?? 'Running'}</div>
                <div>Last move: {lastMove ?? '-'}</div>
                <div>FEN: {fen}</div>
            </div>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100vh', position: 'relative' }}
            />
        </div>
    );
}
