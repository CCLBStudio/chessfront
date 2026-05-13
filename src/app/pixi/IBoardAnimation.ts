import { ChessBoard } from "./ChessBoard";

export type BoardAnimationOptions = {
    onComplete?: () => void;
}

export interface IBoardAnimation {
    play(board: ChessBoard, options: BoardAnimationOptions): void;
    kill(): void;
    progress(): number;
}
