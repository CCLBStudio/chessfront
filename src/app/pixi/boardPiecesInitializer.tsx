import { ChessBoard } from "./ChessBoard";
import { ChessPiece } from "./ChessPiece";
export type BoardPieceMap = Record<string, string>;

export async function SyncBoardPieces(board: ChessBoard, folderUrl: string, piecesBySquare: BoardPieceMap) {
    for (const piece of board.pieces) {
        piece.container.destroy({ children: true });
    }
    board.piecesContainer.removeChildren();
    board.pieces = [];

    for (const [position, piece] of Object.entries(piecesBySquare)) {
        const cell = board.idToCell[position];
        if (cell) {
            const chessPiece = new ChessPiece(piece);
            await chessPiece.loadAndSetup(folderUrl, cell.size);

            board.piecesContainer.addChild(chessPiece.container);
            cell.centerContainerInCell(chessPiece.container);
            
            board.pieces.push(chessPiece);
        }
    }
}