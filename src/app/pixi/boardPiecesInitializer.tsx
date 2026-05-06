import { ChessBoard } from "./ChessBoard";
import { ChessPiece } from "./ChessPiece";
export type BoardPieceMap = Record<string, string>;

export async function SyncBoardPieces(board: ChessBoard, folderUrl: string, piecesBySquare: BoardPieceMap) {
    board.clearPieces();

    for (const [position, piece] of Object.entries(piecesBySquare)) {
        const cell = board.idToCell[position];
        if (cell) {
            const chessPiece = new ChessPiece(piece);
            await chessPiece.loadAndSetup(folderUrl, cell.size);

            board.registerPieceAtCell(cell, chessPiece);
        }
    }
}