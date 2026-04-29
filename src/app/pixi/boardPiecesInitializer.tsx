import { ChessBoard } from "./ChessBoard";
import * as pixi from "pixi.js";

const initialBoardWhiteDown: Record<string, string> = {
    // white pieces
    a1: "white_rook",
    b1: "white_knight",
    c1: "white_bishop",
    d1: "white_queen",
    e1: "white_king",
    f1: "white_bishop",
    g1: "white_knight",
    h1: "white_rook",

    a2: "white_pawn",
    b2: "white_pawn",
    c2: "white_pawn",
    d2: "white_pawn",
    e2: "white_pawn",
    f2: "white_pawn",
    g2: "white_pawn",
    h2: "white_pawn",

    // black pieces
    a8: "black_rook",
    b8: "black_knight",
    c8: "black_bishop",
    d8: "black_queen",
    e8: "black_king",
    f8: "black_bishop",
    g8: "black_knight",
    h8: "black_rook",

    a7: "black_pawn",
    b7: "black_pawn",
    c7: "black_pawn",
    d7: "black_pawn",
    e7: "black_pawn",
    f7: "black_pawn",
    g7: "black_pawn",
    h7: "black_pawn",
};


export async function InitBoardPieces(board: ChessBoard, folderUrl: string) {

    for (const [position, piece] of Object.entries(initialBoardWhiteDown)) {
        const cell = board.idToCell[position];
        if (cell) {
            const pieceContainer = new pixi.Container();
            const pieceTex = await pixi.Assets.load(folderUrl + piece + ".png");
            const pieceSprite = new pixi.Sprite(pieceTex);

            pieceContainer.addChild(pieceSprite);
            pieceSprite.setSize(cell.size * 0.65);

            pieceContainer.pivot.set(pieceSprite.width / 2, pieceSprite.height / 2);

            board.piecesContainer.addChild(pieceContainer);
            cell.centerContainerInCell(pieceContainer);
        }
    }
}