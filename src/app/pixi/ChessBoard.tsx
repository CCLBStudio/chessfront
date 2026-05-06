import * as pixi from "pixi.js";
import gsap from "gsap";
import { BoardCell } from "./BoardCell";
import { ChessPiece } from "./ChessPiece";

const cols = ["h", "g", "f", "e", "d", "c", "b", "a"];
const rows = [8, 7, 6, 5, 4, 3, 2, 1];


export type BoardSettings = {
    hexWhiteColor: number;
    hexBlackColor: number;
    cellSize: number;
    piecesFolderUrl: string;
    whiteDown: boolean;
}

export class ChessBoard {
    public app: pixi.Application;
    public globalContainer: pixi.Container;
    public cellsContainer: pixi.Container;
    public piecesContainer: pixi.Container;
    public cells: BoardCell[];
    public idToCell: Record<string, BoardCell>;
    public pieces: ChessPiece[];
    public whiteDown: boolean;
    private piecesFolderUrl: string;
    private pieceByCellId: Record<string, ChessPiece>;

    constructor(app: pixi.Application, settings: BoardSettings | null) {
        this.app = app;
        this.globalContainer = new pixi.Container();
        this.cellsContainer = new pixi.Container();
        this.piecesContainer = new pixi.Container();
        this.cells = [];
        this.idToCell = {};
        this.pieces = [];
        this.whiteDown = true;
        this.piecesFolderUrl = "/assets/pieces/default/";
        this.pieceByCellId = {};

        if (settings === null) {
            settings = {
                hexWhiteColor: 0xffffff,
                hexBlackColor: 0x000000,
                cellSize: 100,
                piecesFolderUrl: "/assets/pieces/default/",
                whiteDown: true
            }
        }

        this.whiteDown = settings.whiteDown;
        this.piecesFolderUrl = settings.piecesFolderUrl;

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = new BoardCell(cols[i] + rows[j], settings, (i + j) % 2 === 0 ? "white" : "black");
                this.cellsContainer.addChild(cell.container);

                cell.setPosition(i * settings.cellSize + settings.cellSize / 2, j * settings.cellSize + settings.cellSize / 2);
                this.cells.push(cell);
                this.idToCell[cell.id] = cell;
            }
        }

        this.cellsContainer.pivot.set(this.cellsContainer.width / 2, this.cellsContainer.height / 2);

        if (settings.whiteDown === false) {
            this.cellsContainer.angle = 180;
        }

        this.globalContainer.addChild(this.cellsContainer);
        this.globalContainer.addChild(this.piecesContainer);

        this.globalContainer.pivot.set(this.globalContainer.width / 2, this.globalContainer.height / 2);
        this.globalContainer.position.set(app.screen.width / 2, app.screen.height / 2);
        this.cellsContainer.position.set(this.cellsContainer.width / 2, this.cellsContainer.height / 2);
    }

    public clearPieces() {
        for (const piece of this.pieces) {
            piece.container.destroy({ children: true });
        }
        this.piecesContainer.removeChildren();
        this.pieces = [];
        this.pieceByCellId = {};
    }

    public registerPieceAtCell(cell: BoardCell, piece: ChessPiece) {
        this.piecesContainer.addChild(piece.container);
        cell.centerContainerInCell(piece.container);
        piece.container.visible = true;
        piece.container.alpha = 1;
        piece.container.scale.set(1);
        this.pieces.push(piece);
        this.pieceByCellId[cell.id] = piece;
    }

    public getCellById(cellId: string): BoardCell | null {
        return this.idToCell[cellId] ?? null;
    }

    public getPieceAtCell(cell: BoardCell): ChessPiece | null {
        return this.pieceByCellId[cell.id] ?? null;
    }

    public async movePiece(fromCell: BoardCell, toCell: BoardCell, duration = 0.25): Promise<void> {
        const piece = this.getPieceAtCell(fromCell);
        if (!piece) return;
        if (!piece.container.parent) return;

        const targetGlobal = toCell.container.toGlobal(new pixi.Point(0, 0));
        const targetLocal = piece.container.parent.toLocal(targetGlobal);
        delete this.pieceByCellId[fromCell.id];
        this.pieceByCellId[toCell.id] = piece;

        await new Promise<void>((resolve) => {
            gsap.to(piece.container, {
                x: targetLocal.x,
                y: targetLocal.y,
                duration,
                ease: "power2.out",
                onComplete: resolve,
            });
        });
    }

    public async capturePieceAtCell(cell: BoardCell, duration = 0.2, delay = 0.1): Promise<void> {
        const piece = this.getPieceAtCell(cell);
        if (!piece) return;

        await new Promise<void>((resolve) => {
            gsap.to(piece.container, {
                delay: delay,
                alpha: 0,
                duration,
                ease: "power1.in",
                onComplete: resolve,
            });
        });

        piece.container.visible = false;
        delete this.pieceByCellId[cell.id];
    }

    public hidePieceAtCell(cell: BoardCell) {
        const piece = this.getPieceAtCell(cell);
        if (!piece) return;
        piece.container.visible = false;
        delete this.pieceByCellId[cell.id];
    }

    public async promotePieceAtCell(cell: BoardCell, pieceId: string): Promise<void> {
        const piece = this.getPieceAtCell(cell);
        if (!piece) return;
        await piece.setTexture(this.piecesFolderUrl, pieceId, cell.size);
    }
}