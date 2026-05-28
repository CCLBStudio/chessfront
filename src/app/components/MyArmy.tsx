"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setFen, updateCollection, resetArmy, Collection } from "../../store/slices/playerArmy";
import { Loot } from "../services/loot";
import style from "../styles/myArmyStyle.module.css";

// --- HELPERS FOR FEN & BOARD MAP CONVERSIONS ---

const colsList = ["h", "g", "f", "e", "d", "c", "b", "a"];
const rowsList = [8, 7, 6, 5, 4, 3, 2, 1];

const pieceMap: Record<string, string> = {
    P: "white_pawn",
    N: "white_knight",
    B: "white_bishop",
    R: "white_rook",
    Q: "white_queen",
    K: "white_king",
    p: "black_pawn",
    n: "black_knight",
    b: "black_bishop",
    r: "black_rook",
    q: "black_queen",
    k: "black_king",
};

const charMap: Record<string, string> = {
    white_pawn: "P",
    white_knight: "N",
    white_bishop: "B",
    white_rook: "R",
    white_queen: "Q",
    white_king: "K",
    black_pawn: "p",
    black_knight: "n",
    black_bishop: "b",
    black_rook: "r",
    black_queen: "q",
    black_king: "k",
};

// Convert FEN string to standard Record<Square, PieceName> board map
function parseFen(fen: string): Record<string, string> {
    const nextMap: Record<string, string> = {};
    if (!fen) return {};

    const parts = fen.split(" ");
    const placement = parts[0];
    const rows = placement.split("/");

    for (let rIndex = 0; rIndex < 8; rIndex++) {
        const rowString = rows[rIndex];
        const actualRow = 8 - rIndex;
        let colIndex = 0;

        for (let charIndex = 0; charIndex < rowString.length; charIndex++) {
            const char = rowString[charIndex];
            if (/\d/.test(char)) {
                colIndex += parseInt(char, 10);
            } else {
                const colName = colsList[7 - colIndex]; // reverse cols mapping so standard index matches
                const square = colName + actualRow;
                const pieceName = pieceMap[char];
                if (pieceName) {
                    nextMap[square] = pieceName;
                }
                colIndex++;
            }
        }
    }

    return nextMap;
}

// Convert board map to FEN string
function buildFen(boardMap: Record<string, string>): string {
    const fenRows: string[] = [];
    const orderedCols = ["a", "b", "c", "d", "e", "f", "g", "h"];

    for (const r of rowsList) {
        let emptyCount = 0;
        let fenRow = "";
        for (const c of orderedCols) {
            const square = c + r;
            const piece = boardMap[square];
            if (piece) {
                if (emptyCount > 0) {
                    fenRow += emptyCount;
                    emptyCount = 0;
                }
                fenRow += charMap[piece] || "";
            } else {
                emptyCount++;
            }
        }
        if (emptyCount > 0) {
            fenRow += emptyCount;
        }
        fenRows.push(fenRow);
    }

    // Dynamic castling rights
    let castlingRights = "";
    if (boardMap["e1"] === "white_king") {
        if (boardMap["h1"] === "white_rook") castlingRights += "K";
        if (boardMap["a1"] === "white_rook") castlingRights += "Q";
    }
    if (boardMap["e8"] === "black_king") {
        if (boardMap["h8"] === "black_rook") castlingRights += "k";
        if (boardMap["a8"] === "black_rook") castlingRights += "q";
    }
    castlingRights = castlingRights || "-";

    return `${fenRows.join("/")} w ${castlingRights} - 0 1`;
}

interface MyArmyProps {
    onBackToBattle?: () => void;
}

export default function MyArmy({ onBackToBattle }: MyArmyProps) {
    const dispatch = useDispatch();
    const reduxArmy = useSelector((state: RootState) => state.playerArmy);

    // Local States
    const [boardMap, setBoardMap] = useState<Record<string, string>>({});
    const [collection, setCollection] = useState<Collection>({ pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 });
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);
    const [toasts, setToasts] = useState<{ id: string; message: string; exiting?: boolean; exited?: boolean }[]>([]);

    // Initialize from Redux
    useEffect(() => {
        setBoardMap(parseFen(reduxArmy.fen));
        setCollection(reduxArmy.collection);
    }, [reduxArmy.fen, reduxArmy.collection]);

    // Show a floating success toast
    const triggerToast = (message: string) => {
        const id = Date.now().toString() + Math.random().toString();
        setToasts((prev) => [...prev, { id, message, exiting: false, exited: false }]);
        // After 2s: trigger exit animation
        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
            );
            // After animation (300ms): check for removal
            setTimeout(() => {
                setToasts((prev) => {
                    const updated = prev.map(t =>
                        t.id === id ? { ...t, exited: true } : t
                    );

                    if (updated.every(t => t.exited)) {
                        return [];
                    }

                    return updated;
                });
            }, 300);
        }, 2000);
    };

    // Save current states to Redux store
    const saveToRedux = (newBoard: Record<string, string>, newCollection: Collection, message = "Armée synchronisée !") => {
        const newFen = buildFen(newBoard);
        dispatch(setFen(newFen));
        dispatch(updateCollection(newCollection));
        triggerToast(message);
    };

    // Check if cell belongs to placement zone (ranks 1 & 2)
    const isPlacementZone = (square: string) => {
        const row = square[1];
        return row === "1" || row === "2";
    };

    // --- DRAG & DROP HANDLERS ---

    const handleDragStartFromCollection = (e: React.DragEvent, pieceType: Loot) => {
        if (collection[pieceType] <= 0) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", JSON.stringify({
            source: "collection",
            pieceType: pieceType
        }));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragStartFromBoard = (e: React.DragEvent, square: string) => {
        const piece = boardMap[square];
        if (!piece || !piece.startsWith("white_")) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", JSON.stringify({
            source: "board",
            fromSquare: square,
            pieceType: piece.replace("white_", "") as Loot
        }));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, square: string) => {
        // Can only drop on ranks 1 & 2 AND on empty cells
        if (isPlacementZone(square) && !boardMap[square]) {
            e.preventDefault();
            if (dragOverCell !== square) {
                setDragOverCell(square);
            }
        }
    };

    const handleDragLeave = () => {
        setDragOverCell(null);
    };

    const handleDrop = (e: React.DragEvent, targetSquare: string) => {
        e.preventDefault();
        setDragOverCell(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            const { source, pieceType, fromSquare } = data;
            if (targetSquare.includes("1") && pieceType === "pawn") {
                triggerToast("Les pions ne peuvent pas être placés en première ligne !");
                return;
            }

            if (source === "collection") {
                // Drop from collection to board
                if (collection[pieceType as Loot] <= 0) return;

                const nextBoard = { ...boardMap, [targetSquare]: `white_${pieceType}` };
                const nextCollection = {
                    ...collection,
                    [pieceType as Loot]: collection[pieceType as Loot] - 1
                };

                setBoardMap(nextBoard);
                setCollection(nextCollection);
                saveToRedux(nextBoard, nextCollection);
            } else if (source === "board" && fromSquare) {
                // Drop from board to another square on board
                if (fromSquare === targetSquare) return;

                const nextBoard = { ...boardMap };
                delete nextBoard[fromSquare];
                nextBoard[targetSquare] = `white_${pieceType}`;

                setBoardMap(nextBoard);
                saveToRedux(nextBoard, collection);
            }
        } catch (err) {
            console.error("Error parsing drag data:", err);
        }
    };

    // --- ACTION BUTTONS & CLIC DROIT ---

    // Right click removes piece and reclaims it in inventory (King locked)
    const handleCellRightClick = (e: React.MouseEvent, square: string) => {
        e.preventDefault();
        const piece = boardMap[square];

        if (!piece || !piece.startsWith("white_")) return;

        if (piece === "white_king") {
            triggerToast("Sécurité : Le Roi blanc doit rester sur le plateau !");
            return;
        }

        const pieceType = piece.replace("white_", "") as Loot;
        const nextBoard = { ...boardMap };
        delete nextBoard[square];

        const nextCollection = {
            ...collection,
            [pieceType]: collection[pieceType] + 1
        };

        setBoardMap(nextBoard);
        setCollection(nextCollection);
        saveToRedux(nextBoard, nextCollection, `Pièce récupérée : +1 ${getFrenchPieceName(pieceType)}`);
    };

    // Reset to Standard Chess Layout
    const handleReset = () => {
        dispatch(resetArmy());
        triggerToast("Échiquier réinitialisé par défaut !");
    };

    // Clear board and reclaim all pieces except the King
    const handleClearAll = () => {
        const nextBoard: Record<string, string> = {};
        const reclaimedPieces: Record<Loot, number> = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };

        // Retain standard black pieces and locate/keep the white king
        let whiteKingFound = false;
        let whiteKingSquare = "e1";

        for (const [sq, piece] of Object.entries(boardMap)) {
            if (piece.startsWith("black_")) {
                nextBoard[sq] = piece;
            } else if (piece === "white_king") {
                nextBoard[sq] = piece;
                whiteKingSquare = sq;
                whiteKingFound = true;
            } else {
                // Reclaim other white pieces
                const type = piece.replace("white_", "") as Loot;
                reclaimedPieces[type]++;
            }
        }

        // Just in case white king was missing, place it at standard e1
        if (!whiteKingFound) {
            nextBoard["e1"] = "white_king";
        }

        const nextCollection = { ...collection };
        for (const key of Object.keys(reclaimedPieces) as Loot[]) {
            nextCollection[key] += reclaimedPieces[key];
        }

        setBoardMap(nextBoard);
        setCollection(nextCollection);
        saveToRedux(nextBoard, nextCollection, "Plateau vidé. Pièces renvoyées en réserve.");
    };

    // Translate piece key to French UI text
    const getFrenchPieceName = (key: string): string => {
        const trans: Record<string, string> = {
            pawn: "Pion",
            knight: "Cavalier",
            bishop: "Fou",
            rook: "Tour",
            queen: "Reine",
            king: "Roi"
        };
        return trans[key] || key;
    };

    return (
        <div className={style.container}>
            {/* Editor Main Content Area */}
            <div className={style.editorContent}>
                {/* Left Side: Collection reserve panel */}
                <div className={style.collectionSection}>
                    <h3 className={style.collectionTitle}>Réserve</h3>
                    <div className={style.collectionGrid}>
                        {(Object.keys(collection) as Loot[]).map((key) => {
                            const qty = collection[key];
                            const isDisabled = qty <= 0;

                            return (
                                <div
                                    key={key}
                                    draggable={!isDisabled}
                                    onDragStart={(e) => handleDragStartFromCollection(e, key)}
                                    className={`${style.pieceCard} ${isDisabled ? style.disabledCard : ""}`}
                                    title={isDisabled ? "Aucune pièce disponible" : "Glissez sur le plateau"}
                                >
                                    <div className={style.countBadge}>{qty}</div>
                                    <img
                                        src={`/assets/pieces/default/white_${key}.png`}
                                        alt={`white ${key}`}
                                        className={style.cardImage}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Title + Board + Controls Panel */}
                <div className={style.rightColumn}>
                    {/* Title & Help Section */}
                    <div className={style.titleSection}>
                        <h1 className={style.title}>Éditeur d'Armée</h1>
                        <p className={style.subtitle}>
                            Glissez-déposez vos pièces pour configurer vos rangs de départ (Rangs 1 & 2). Clic droit pour renvoyer une pièce en réserve.
                        </p>
                    </div>

                    {/* Chessboard */}
                    <div className={style.boardWrapper}>
                        <div className={style.chessboard}>
                            {rowsList.map((row, rowIndex) => (
                                colsList.map((col, colIndex) => {
                                    const square = col + row;
                                    const piece = boardMap[square];
                                    const isLight = (rowIndex + colIndex) % 2 === 0;
                                    const isDroppable = isPlacementZone(square);
                                    const isCurrentOver = dragOverCell === square;

                                    return (
                                        <div
                                            key={square}
                                            className={`${style.cell} ${isLight ? style.lightCell : style.darkCell} ${isDroppable ? style.activePlacementZone : ""
                                                } ${isCurrentOver ? style.dragOverActive : ""}`}
                                            onDragOver={(e) => handleDragOver(e, square)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, square)}
                                            onContextMenu={(e) => handleCellRightClick(e, square)}
                                        >
                                            {/* Piece sprite */}
                                            {piece && (
                                                <img
                                                    src={`/assets/pieces/default/${piece}.png`}
                                                    alt={piece}
                                                    draggable={piece.startsWith("white_")}
                                                    onDragStart={(e) => handleDragStartFromBoard(e, square)}
                                                    className={`${style.pieceImage} ${piece === "white_king" ? style.kingPiece : ""}`}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className={style.controlsPanel}>
                        <button className={`${style.btn} style.btnSecondary`} onClick={onBackToBattle}>
                            Retour au Combat
                        </button>
                        <button className={`${style.btn} style.btnPrimary`} onClick={handleReset}>
                            Réinitialiser Défaut
                        </button>
                        <button className={`${style.btn} style.btnDanger`} onClick={handleClearAll}>
                            Tout Enlever
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Toast Notification Container */}
            <div className={style.toastContainer}>
                {toasts.map((t) => (
                    <div key={t.id} className={`${style.toast} ${t.exiting ? style.toastExiting : ""}`}>
                        <span>🛡️</span>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
