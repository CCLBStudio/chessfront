import gsap from "gsap";
import { IBoardAnimation, BoardAnimationOptions } from "./IBoardAnimation";
import { ChessBoard } from "./ChessBoard";

export class BoardOpeningAnimation implements IBoardAnimation {
    private tl: gsap.core.Timeline | null = null;

    play(board: ChessBoard, options: BoardAnimationOptions) {
        const tl = gsap.timeline({ onComplete: options.onComplete });

        board.cells.forEach(cell => {
            cell.container.alpha = 0;
            cell.container.y += 30;
        });

        board.pieces.forEach(piece => {
            piece.container.alpha = 0;
            piece.container.y -= 30;
        });

        const cellContainers = board.cells.map(c => c.container);
        tl.to(cellContainers, {
            alpha: 1,
            y: "-=30",
            duration: 0.25,
            stagger: 0.015,
            ease: "back.out(1.2)"
        });

        if (board.pieces.length > 0) {
            const pieceContainers = board.pieces.map(p => p.container);
            tl.to(pieceContainers, {
                alpha: 1,
                y: "+=30",
                duration: 0.4,
                stagger: 0.02,
                ease: "back.out(1.5)"
            }, "-=0.3");
        }
    }

    kill(): void {
        if (this.tl) {
            this.tl.kill();
        }
    }

    progress(): number {
        if (!this.tl) return 0;
        return this.tl.progress();
    }
}
