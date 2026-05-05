import type { Chess, Piece } from "chess.js";
import type { BoardPieceMap } from "./boardPiecesInitializer";

const pieceTypeToName: Record<Piece["type"], string> = {
    p: "pawn",
    r: "rook",
    n: "knight",
    b: "bishop",
    q: "queen",
    k: "king",
};

export function chessStateToBoardMap(chess: Chess): BoardPieceMap {
    const nextMap: BoardPieceMap = {};

    for (const row of chess.board()) {
        for (const piece of row) {
            if (!piece) continue;

            const colorName = piece.color === "w" ? "white" : "black";
            nextMap[piece.square] = `${colorName}_${pieceTypeToName[piece.type]}`;
        }
    }

    return nextMap;
}
