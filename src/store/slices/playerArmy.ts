import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Army = {
    fen: string;
    piecesTextureFolderUrl: string;
}

const initialState: Army = {
    fen: "",
    piecesTextureFolderUrl: "assets/pieces/default/"
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
    },
})

export const { setFen, setPiecesTextureFolderUrl } = playerArmySlice.actions;
export default playerArmySlice.reducer;