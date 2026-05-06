import * as pixi from "pixi.js";

export class ChessPiece {
    public id: string;
    public container: pixi.Container;
    public sprite: pixi.Sprite;

    constructor(id: string) {
        this.id = id;
        this.container = new pixi.Container();
        this.sprite = new pixi.Sprite();
        this.container.addChild(this.sprite);
    }

    public async loadAndSetup(folderUrl: string, targetSize: number) {
        const texture = await pixi.Assets.load(`${folderUrl}${this.id}.png`);
        this.sprite.texture = texture;
        
        this.sprite.setSize(targetSize * 0.65);
        this.container.pivot.set(this.sprite.width / 2, this.sprite.height / 2);
    }

    public async setTexture(folderUrl: string, pieceId: string, targetSize: number) {
        this.id = pieceId;
        const texture = await pixi.Assets.load(`${folderUrl}${pieceId}.png`);
        this.sprite.texture = texture;
        this.sprite.setSize(targetSize * 0.65);
        this.container.pivot.set(this.sprite.width / 2, this.sprite.height / 2);
    }
}
