"use client";

import { useEffect, useRef, useState } from 'react';
import * as pixi from 'pixi.js';
import { Chess } from 'chess.js';
import { BoardSettings, ChessBoard } from '../pixi/ChessBoard';
import { SyncBoardPieces } from '../pixi/boardPiecesInitializer';
import { BoardOpeningAnimation } from '../pixi/BoardOpeningAnimation';
import { chessStateToBoardMap } from '../pixi/fenToBoardMap';
import { ChessEngine, WorkerOptions } from '../services/chessEngine';
import { IBoardAnimation } from '../pixi/IBoardAnimation';
import WaitingMessage from './WaitingMessage';

const ANIMATION_DURATION = 0.1;

const defaultPlayerStrength: TeamStrength = {
    depth: [10, 12],
    skillLevel: [17, 19]
};
const defaultOpponentStrength: TeamStrength = {
    depth: [9, 11],
    skillLevel: [14, 16]
};

type TeamStrength = {
    depth: [number, number];
    skillLevel: [number, number];
};

type Move = {
    from: string;
    to: string;
    capturedCellId?: string | null;
    promotionPieceId?: string | null;
};

type ComputedTurn = {
    moves: Move[];
    fen: string;
    san: string;
};

function randomIntFromRange([a, b]: [number, number]): number {
    let min = Math.ceil(Math.min(a, b));
    let max = Math.floor(Math.max(a, b));

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error("Invalid range: values must be finite numbers");
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function BattleScene() {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const appRef = useRef<pixi.Application | null>(null);
    const boardRef = useRef<ChessBoard | null>(null);
    const openingAnimRef = useRef<IBoardAnimation | null>(null);
    const [isOpeningAnimCompleted, setIsOpeningAnimCompleted] = useState(false);
    const chessRef = useRef(new Chess());
    const engineRef = useRef<ChessEngine | null>(null);
    const cancelledRef = useRef(false);

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

    function getCapturedCellId(from: string, to: string, isEnPassant: boolean): string {
        if (!isEnPassant) return to;
        return `${to[0]}${from[1]}`;
    }

    function getPromotionPieceId(color: "w" | "b", promotion: string | undefined): string | null {
        if (!promotion) return null;
        const colorName = color === "w" ? "white" : "black";
        const promotionNames: Record<string, string> = {
            q: "queen",
            r: "rook",
            b: "bishop",
            n: "knight",
        };
        const pieceName = promotionNames[promotion];
        if (!pieceName) return null;
        return `${colorName}_${pieceName}`;
    }

    async function computeWholeGame(
        engine: ChessEngine,
        chess: Chess,
        isCancelled: () => boolean,
        playerTeamStrength: TeamStrength,
        opponentTeamStrength: TeamStrength
    ): Promise<ComputedTurn[]> {
        const turns: ComputedTurn[] = [];

        engine.newGame();

        let i = 0;
        while (!isCancelled() && !chess.isGameOver()) {
            const currentTurn = chess.turn();
            const teamStrength = currentTurn === "w" ? playerTeamStrength : opponentTeamStrength;

            const bestMoveUci = await engine.getBestMove(chess.fen(), currentTurn === "w", { depth: randomIntFromRange(teamStrength.depth) });

            if (!bestMoveUci || bestMoveUci === "(none)" || bestMoveUci.length < 4) {
                console.log("No best move found", bestMoveUci);
                break;
            }

            const from = bestMoveUci.slice(0, 2);
            const to = bestMoveUci.slice(2, 4);
            const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

            const playedMove = chess.move({ from, to, promotion });
            if (!playedMove) {
                break;
            }

            const moves: Move[] = [];

            const capturedCellId = playedMove.captured
                ? getCapturedCellId(playedMove.from, playedMove.to, playedMove.isEnPassant())
                : null;

            moves.push({
                from: playedMove.from,
                to: playedMove.to,
                capturedCellId,
                promotionPieceId: getPromotionPieceId(playedMove.color, playedMove.promotion)
            });

            if (playedMove.isKingsideCastle()) {
                moves.push({
                    from: playedMove.color === "w" ? "h1" : "h8",
                    to: playedMove.color === "w" ? "f1" : "f8"
                });
            }

            else if (playedMove.isQueensideCastle()) {
                moves.push({
                    from: playedMove.color === "w" ? "a1" : "a8",
                    to: playedMove.color === "w" ? "d1" : "d8"
                });
            }

            turns.push({
                moves,
                fen: chess.fen(),
                san: playedMove.san,
            });
            i++;
        }

        return turns;
    }

    async function playGame(computedTurns: ComputedTurn[], board: ChessBoard, cancelled: boolean): Promise<void> {
        for (const turn of computedTurns) {
            if (cancelled) break;

            for (const move of turn.moves) {
                const fromCell = board.getCellById(move.from);
                const toCell = board.getCellById(move.to);

                if (!fromCell || !toCell) continue;

                if (move.capturedCellId) {
                    const capturedCell = board.getCellById(move.capturedCellId);
                    if (capturedCell) {
                        await board.capturePieceAtCell(capturedCell, ANIMATION_DURATION, ANIMATION_DURATION / 2);
                    }
                }

                await board.movePiece(fromCell, toCell, ANIMATION_DURATION);

                if (move.promotionPieceId) {
                    await board.promotePieceAtCell(toCell, move.promotionPieceId);
                }
            }

            setLastMove(turn.san);
            setFen(turn.fen);
        }

    }

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;
        cancelledRef.current = false;

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
                        setIsOpeningAnimCompleted(true);
                        resolve();
                    }
                });
            });

            const engine = new ChessEngine();
            engineRef.current = engine;
            const playerWorkerOptions : WorkerOptions = {
                depth: randomIntFromRange(defaultOpponentStrength.depth),
                skillLevel: randomIntFromRange(defaultPlayerStrength.skillLevel)
            }
            const opponentWorkerOptions : WorkerOptions = {
                depth: randomIntFromRange(defaultOpponentStrength.depth),
                skillLevel: randomIntFromRange(defaultOpponentStrength.skillLevel)
            }
            await engine.init(playerWorkerOptions, opponentWorkerOptions);
            //await engine.init({ depth: DEFAULT_ENGINE_DEPTH, skillLevel: DEFAULT_SKILL_LEVEL });

            setThinking(true);
            cancelledRef.current = false;

            const computedTurns = await computeWholeGame(engine, chessRef.current, () => cancelledRef.current, defaultPlayerStrength, defaultOpponentStrength);

            setThinking(false);

            await openingAnimationCompleted;
            if (cancelledRef.current) return;

            await playGame(computedTurns, board, cancelledRef.current);

            setThinking(false);
            setGameOverReason(getGameOverReason(chessRef.current));
        })();

        return () => {
            cancelledRef.current = true;
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
        <>
            {(thinking && isOpeningAnimCompleted) && <WaitingMessage />}
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

        </>

    );
}
