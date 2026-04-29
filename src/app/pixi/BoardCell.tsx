import * as pixi from "pixi.js";
import { BoardSettings } from "./ChessBoard";

export class BoardCell {
    readonly id: string;
    readonly size: number;
    readonly color: "white" | "black";
    readonly container: pixi.Container;

    private _availablePositionRect: pixi.Graphics;
    private _cellRect: pixi.Graphics;

    constructor(id: string, settings: BoardSettings, color: "white" | "black") {
        this.id = id;
        this.size = settings.cellSize;
        this.color = color;
        this.container = new pixi.Container();

        this._cellRect = new pixi.Graphics().rect(0, 0, settings.cellSize, settings.cellSize)
            .fill({ color: this.color === "white" ? settings.hexWhiteColor : settings.hexBlackColor });

        this._availablePositionRect = new pixi.Graphics().circle(0, 0, 25)
            .fill({ color: 0x404040, alpha: 0.25 });
        this._availablePositionRect.visible = false;

        this.container.addChild(this._cellRect);
        this.container.addChild(this._availablePositionRect);

        this._cellRect.pivot.set(this._cellRect.width / 2, this._cellRect.height / 2);
        this.centerContainerInCell(this._availablePositionRect);
    }

    public setPosition(x: number, y: number) {
        this.container.position.set(x, y);
    }

    public toggleAvailablePosition() {
        this._availablePositionRect.visible = !this._availablePositionRect.visible;
    }

    public centerContainerInCell(toCenter: pixi.Container) {
        const globalCenter = this.container.toGlobal(new pixi.Point(0, 0));

        if (toCenter.parent) {
            const localPos = toCenter.parent.toLocal(globalCenter);
            toCenter.position.set(localPos.x, localPos.y);
        } else {
            toCenter.position.set(globalCenter.x, globalCenter.y);
        }
    }
}