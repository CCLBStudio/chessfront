"use client";

import { useEffect, useRef, useState } from 'react';
import * as pixi from 'pixi.js';
import { Chess } from 'chess.js';
import { BoardSettings, ChessBoard } from '../pixi/ChessBoard';
import { SyncBoardPieces } from '../pixi/boardPiecesInitializer';
import { BoardOpeningAnimation } from '../pixi/BoardOpeningAnimation';
import { chessStateToBoardMap } from '../pixi/fenToBoardMap';
import { ChessEngine, WorkerOptions, GameOverReason } from '../services/chessEngine';
import { IBoardAnimation } from '../pixi/IBoardAnimation';
import WaitingMessage from './WaitingMessage';
import { roll, Loot } from '../services/loot';
import GameOverMessage from './GameOverScreen';
import confetti from 'canvas-confetti';
import { wait } from '@/utils/wait';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { addLootToCollection } from '../../store/slices/playerArmy';
import { generateRandomBalancedFen } from '../services/fenGenerator';


const ANIMATION_DURATION = 0.1;
const piecesFolderUrl = "/assets/pieces/default/";

const defaultPlayerStrength: TeamStrength = {
    depth: [10, 12],
    skillLevel: [17, 19]
};
const defaultOpponentStrength: TeamStrength = {
    depth: [8, 10],
    skillLevel: [15, 17]
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

function newChess(fen: string): Chess {
    try {
        const newFen = generateRandomBalancedFen(fen);
        return new Chess(newFen, { skipValidation: false, });
    } catch (e) {
        console.error("Invalid saved FEN, falling back to standard chess starting FEN.", e);
        return new Chess();
    }
}

export default function BattleScene({ onEditArmy }: { onEditArmy?: () => void }) {
    const dispatch = useDispatch();
    const savedFen = useSelector((state: RootState) => state.playerArmy.fen);

    const containerRef = useRef<HTMLDivElement>(null);
    const gameAppRef = useRef<pixi.Application | null>(null);
    const uiAppRef = useRef<pixi.Application | null>(null);
    const boardRef = useRef<ChessBoard | null>(null);
    const openingAnimRef = useRef<IBoardAnimation | null>(null);
    const [isOpeningAnimCompleted, setIsOpeningAnimCompleted] = useState(false);

    const chessRef = useRef<Chess>(null!);
    if (!chessRef.current) {
        chessRef.current = newChess(savedFen);
    }

    const engineRef = useRef<ChessEngine | null>(null);
    const cancelledRef = useRef(false);
    const gameSessionRef = useRef<number>(0);
    const winnerRef = useRef<'p' | 'o' | null>(null);
    const lootRef = useRef<Loot | null>(null);

    const [fen, setFen] = useState(chessRef.current.fen());
    const [lastMove, setLastMove] = useState<string | null>(null);
    const [thinking, setThinking] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<GameOverReason | null>(null);

    async function InitPixiApp(sessionToken: number): Promise<pixi.Application | null> {
        if (!containerRef.current) return null;

        const gameApp = new pixi.Application();
        const uiApp = new pixi.Application();

        await gameApp.init({
            resizeTo: containerRef.current,
            backgroundAlpha: 0,
            antialias: false,
        });

        await uiApp.init({
            resizeTo: containerRef.current,
            backgroundAlpha: 0,
            antialias: true,
        });

        // Prevent memory leaks and duplicate app initializations if the session was cancelled
        if (cancelledRef.current || gameSessionRef.current !== sessionToken) {
            gameApp.destroy(true);
            uiApp.destroy(true);
            return null;
        }

        gameApp.canvas.style.position = "absolute";
        gameApp.canvas.style.zIndex = "1";

        uiApp.canvas.style.position = 'absolute';
        uiApp.canvas.style.zIndex = "100";
        uiApp.canvas.style.pointerEvents = "none";

        // Clean up any existing canvases from prior aborted initialization cycles
        containerRef.current.innerHTML = "";

        containerRef.current.appendChild(gameApp.canvas as HTMLCanvasElement);
        containerRef.current.appendChild(uiApp.canvas as HTMLCanvasElement);

        gameAppRef.current = gameApp;
        uiAppRef.current = uiApp;

        return gameApp;
    }

    function getGameOverReason(chess: Chess): GameOverReason | null {
        if (!chess.isGameOver()) return null;
        if (chess.isCheckmate()) return 'CHECKMATE';
        if (chess.isStalemate()) return 'STALEMATE';
        if (chess.isThreefoldRepetition()) return "THREEFOLD_REPETITION";
        if (chess.isInsufficientMaterial()) return "INSUFFICIENT_MATERIAL";
        if (chess.isDraw()) return "DRAW";
        return "UNKNOWN";
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

            let bestMoveUci = await engine.getBestMove(chess.fen(), currentTurn === "w", { depth: randomIntFromRange(teamStrength.depth) });

            if (!bestMoveUci || bestMoveUci === "(none)" || bestMoveUci.length < 4) {
                console.log("No best move found", bestMoveUci);
                const moves = chess.moves({ verbose: true });


                if (moves.length === 0) {
                    console.log("No legal moves available");
                    break;
                }

                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                bestMoveUci = randomMove.from + randomMove.to + (randomMove.promotion ?? "");
                console.log('random uci move :', bestMoveUci);
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

        if (chess.isCheckmate()) {
            winnerRef.current = chess.turn() === "w" ? "o" : "p";
        }

        return turns;
    }

    async function playGame(computedTurns: ComputedTurn[], board: ChessBoard, isCancelled: () => boolean): Promise<void> {
        for (const turn of computedTurns) {
            if (isCancelled()) break;

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

                if (isCancelled()) break;

                await board.movePiece(fromCell, toCell, ANIMATION_DURATION);

                if (move.promotionPieceId) {
                    await board.promotePieceAtCell(toCell, move.promotionPieceId);
                }
            }

            if (isCancelled()) break;

            setLastMove(turn.san);
            setFen(turn.fen);
        }
    }

    async function playConfetti(): Promise<void> {
        const confettiSettings = [
            { origin: { x: 0.25, y: 0.6 }, particleCount: 150, spread: 100, ticks: 200 },
            { origin: { x: 0.75, y: 0.6 }, particleCount: 150, spread: 100, ticks: 200 },
            { origin: { x: 0.5, y: 0.35 }, particleCount: 150, spread: 100, ticks: 200 },
        ];

        let promise: Promise<unknown> | null = null;
        for (let i = 0; i < confettiSettings.length; i++) {
            const p = confetti(confettiSettings[i]);
            if (p) {
                promise = p;
            }

            await wait(100);
        }

        if (promise) {
            await promise;
        }
    }

    async function startGameSession(app: pixi.Application, sessionToken: number) {
        const isSessionCancelled = () => {
            return cancelledRef.current || gameSessionRef.current !== sessionToken;
        };

        // 1. Reset logic state
        chessRef.current = newChess(savedFen);
        setFen(chessRef.current.fen());
        setLastMove(null);
        setGameOverReason(null);
        setIsOpeningAnimCompleted(false);
        winnerRef.current = null;
        lootRef.current = null;

        // 2. Clear Pixi app stages to clean up the board and any loot sprites on UI
        gameAppRef.current?.stage.removeChildren();
        uiAppRef.current?.stage.removeChildren();

        // 3. Build a new ChessBoard and sync the pieces
        const w = containerRef.current!.clientWidth;
        const h = containerRef.current!.clientHeight;

        const boardSettings: BoardSettings = {
            hexWhiteColor: 0xebecd0,
            hexBlackColor: 0x739552,
            cellSize: w < h ? w / 8 : h / 8,
            piecesFolderUrl: piecesFolderUrl,
            whiteDown: true
        };

        const board = new ChessBoard(app, boardSettings);
        boardRef.current = board;

        await SyncBoardPieces(board, boardSettings.piecesFolderUrl, chessStateToBoardMap(chessRef.current));

        if (isSessionCancelled()) return;

        app.stage.addChild(board.globalContainer);

        // 4. Set up Opening Animation
        const openingAnim: IBoardAnimation = new BoardOpeningAnimation();
        openingAnimRef.current = openingAnim;

        const openingAnimationCompleted = new Promise<void>((resolve) => {
            openingAnim.play(board, {
                onComplete: () => {
                    if (!isSessionCancelled()) {
                        setIsOpeningAnimCompleted(true);
                    }
                    resolve();
                }
            });
        });

        // 5. Ensure ChessEngine is initialized
        if (!engineRef.current) {
            const engine = new ChessEngine();
            engineRef.current = engine;
            const playerWorkerOptions: WorkerOptions = {
                depth: randomIntFromRange(defaultOpponentStrength.depth),
                skillLevel: randomIntFromRange(defaultPlayerStrength.skillLevel)
            };
            const opponentWorkerOptions: WorkerOptions = {
                depth: randomIntFromRange(defaultOpponentStrength.depth),
                skillLevel: randomIntFromRange(defaultOpponentStrength.skillLevel)
            };
            await engine.init(playerWorkerOptions, opponentWorkerOptions);
        }

        if (isSessionCancelled()) return;

        // 6. Compute Chess moves
        setThinking(true);
        const computedTurns = await computeWholeGame(
            engineRef.current,
            chessRef.current,
            isSessionCancelled,
            defaultPlayerStrength,
            defaultOpponentStrength
        );

        if (isSessionCancelled()) return;
        setThinking(false);

        // 7. Wait for opening animation to complete before starting moves
        await openingAnimationCompleted;
        if (isSessionCancelled()) return;

        // 8. Play out the moves on the board
        await playGame(computedTurns, board, isSessionCancelled);
        if (isSessionCancelled()) return;

        // 9. Process Game Over
        setThinking(false);
        const gameOver = getGameOverReason(chessRef.current);
        if (gameOver) {
            const rolledLoot = roll(gameOver, winnerRef.current === 'p');
            lootRef.current = rolledLoot;
            dispatch(addLootToCollection(rolledLoot));
        }

        if (isSessionCancelled()) return;

        await wait(500);
        if (isSessionCancelled()) return;

        if (winnerRef.current === "p" && !isSessionCancelled()) {
            await playConfetti();
        }
        setGameOverReason(gameOver);

    }

    function resetGame() {
        gameSessionRef.current += 1;
        const app = gameAppRef.current;
        if (app) {
            startGameSession(app, gameSessionRef.current);
        }
    }

    useEffect(() => {
        cancelledRef.current = false;

        (async () => {
            gameSessionRef.current += 1;
            const currentSession = gameSessionRef.current;

            const app = await InitPixiApp(currentSession);
            if (app === null) return;

            await startGameSession(app, currentSession);
        })();

        return () => {
            cancelledRef.current = true;
            openingAnimRef.current?.kill();
            openingAnimRef.current = null;
            engineRef.current?.terminate();
            engineRef.current = null;
            boardRef.current = null;
            gameAppRef.current?.destroy(true);
            uiAppRef.current?.destroy(true);
            gameAppRef.current = null;
            uiAppRef.current = null;
        };
    }, []);

    return (
        <>
            {(thinking && isOpeningAnimCompleted) && <WaitingMessage />}
            <div style={{ width: '100%', height: 'calc(100vh - 55px)', position: 'relative' }}>
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
                    style={{ width: '100%', height: '100%', position: 'relative', justifySelf: 'center' }}
                />
            </div>
            {gameOverReason && <GameOverMessage
                gameOverReason={gameOverReason}
                winner={winnerRef.current}
                loot={lootRef.current}
                piecesFolderUrl={piecesFolderUrl}
                uiApp={uiAppRef.current}
                onNewBattle={resetGame}
                onEditArmy={onEditArmy}
            />}
        </>

    );
}
