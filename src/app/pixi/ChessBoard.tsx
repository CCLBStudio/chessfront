import * as pixi from "pixi.js";
import { BoardCell } from "./BoardCell";

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
    public whiteDown: boolean;

    constructor(app: pixi.Application, settings: BoardSettings | null) {
        this.app = app;
        this.globalContainer = new pixi.Container();
        this.cellsContainer = new pixi.Container();
        this.piecesContainer = new pixi.Container();
        this.cells = [];
        this.idToCell = {};
        this.whiteDown = true;

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
}