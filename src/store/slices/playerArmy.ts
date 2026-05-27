import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Loot } from '../../app/services/loot';

export type Collection = {
    pawn: number;
    knight: number;
    bishop: number;
    rook: number;
    queen: number;
}

export type Army = {
    fen: string;
    piecesTextureFolderUrl: string;
    collection: Collection;
}

const initialState: Army = {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    piecesTextureFolderUrl: "assets/pieces/default/",
    collection: {
        pawn: 2,
        knight: 1,
        bishop: 1,
        rook: 0,
        queen: 0,
    }
}

export const playerArmySlice = createSlice({
    name: 'playerArmy',
    initialState,
    reducers: {
        setFen: (state, action: PayloadAction<string>) => {
            state.fen = action.payload;
        },
        setPiecesTextureFolderUrl: (state, action: PayloadAction<string>) => {
            state.piecesTextureFolderUrl = action.payload;
        },
        addLootToCollection: (state, action: PayloadAction<Loot>) => {
            const piece = action.payload;
            if (state.collection[piece] !== undefined) {
                state.collection[piece] += 1;
            }
        },
        updateCollection: (state, action: PayloadAction<Collection>) => {
            state.collection = action.payload;
        },
        resetArmy: (state) => {
            state.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            state.collection = {
                pawn: 2,
                knight: 1,
                bishop: 1,
                rook: 0,
                queen: 0,
            };
        }
    },
})

export const {
    setFen,
    setPiecesTextureFolderUrl,
    addLootToCollection,
    updateCollection,
    resetArmy
} = playerArmySlice.actions;

export default playerArmySlice.reducer;