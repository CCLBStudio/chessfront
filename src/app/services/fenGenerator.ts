type Piece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const PIECE_WEIGHTS: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

function parseFen(fen: string) {
    const [board, turn, castling, ep, halfmove, fullmove] = fen.split(" ");
    return { board, turn, castling, ep, halfmove, fullmove };
}

function boardToArray(board: string): string[][] {
    return board.split("/").map(rank => {
        const row: string[] = [];
        for (const c of rank) {
            if (!isNaN(Number(c))) {
                row.push(...Array(Number(c)).fill('.'));
            } else {
                row.push(c);
            }
        }
        return row;
    });
}

function arrayToBoard(board: string[][]): string {
    return board.map(rank => {
        let result = "";
        let empty = 0;

        for (const cell of rank) {
            if (cell === '.') {
                empty++;
            } else {
                if (empty > 0) {
                    result += empty;
                    empty = 0;
                }
                result += cell;
            }
        }

        if (empty > 0) result += empty;
        return result;
    }).join("/");
}

function computeWhiteWeight(board: string[][]): number {
    let weight = 0;
    for (const row of board) {
        for (const cell of row) {
            if (cell === cell.toUpperCase()) {
                weight += PIECE_WEIGHTS[cell.toLowerCase()] || 0;
            }
        }
    }
    return weight;
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBlackArmy(target: number, tolerance: [number, number]) {
    const min = Math.max(4, Math.ceil(target * (1 - tolerance[0])));
    const max = Math.max(6, Math.ceil(target * (1 + tolerance[1])));
    const maxSlots = 16;

    const pieces: Piece[] = ['p', 'n', 'b', 'r', 'q'];

    // on réserve 1 slot pour le roi
    const maxExtraPieces = 15;

    for (let attempt = 0; attempt < 200; attempt++) {
        const result: Piece[] = ['k'];
        let weight = 0;

        const count = randomInt(
            Math.max(1, Math.floor(maxExtraPieces / 2)),
            maxExtraPieces
        );

        for (let i = 0; i < count; i++) {
            const p = pieces[randomInt(0, pieces.length - 1)];
            result.push(p);
            weight += PIECE_WEIGHTS[p];
        }

        if (weight >= min && weight <= max) {
            return result;
        }
    }

    // fallback : remplissage glouton (garanti de tenir dans les slots)
    const result: Piece[] = ['k'];
    let weight = 0;

    const sorted: Piece[] = ['q', 'r', 'b', 'n', 'p'];

    console.log("entering fallback");
    while (result.length < maxSlots && weight < max) {
        console.log(`result length: ${result.length}, maxSlots: ${maxSlots}, weight: ${weight}, max: ${max}`);
        for (const p of sorted) {
            if (result.length >= maxSlots) break;
            const w = PIECE_WEIGHTS[p];
            if (weight + w <= max) {
                result.push(p);
                weight += w;
                break;
            }
        }
    }

    console.log("exiting fallback");

    return result;
}

function placeBlackPieces(board: string[][], pieces: Piece[]) {
    const pawnPositions: [number, number][] = [];

    for (let c = 0; c < 8; c++) {
        pawnPositions.push([1, c]);
    }
    pawnPositions.sort(() => Math.random() - 0.5);

    const placedPawns: [number, number][] = [];
    let pawnIdx = 0;
    const pawns = pieces.filter(p => p === 'p');

    for (const p of pawns) {
        if (pawnIdx < pawnPositions.length) {
            const pos = pawnPositions[pawnIdx];
            const [r, c] = pos;
            board[r][c] = 'p';
            placedPawns.push(pos);
            pawnIdx++;
        } else {
            break;
        }
    }

    const otherPositions: [number, number][] = [];

    for (let r = 0; r <= 1; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === 'p') {
                continue;
            }

            otherPositions.push([r, c]);
        }
    }

    otherPositions.sort(() => Math.random() - 0.5);
    const otherPieces = pieces.filter(p => p !== 'p');

    let otherIdx = 0;
    for (const p of otherPieces) {
        if (otherIdx < otherPositions.length) {
            const [r, c] = otherPositions[otherIdx];
            board[r][c] = p;
            otherIdx++;
        }
    }

    return board;
}

function computeBlackCastling(board: string[][]): string {
    let castling = "";

    if (board[0][4] === 'k') {
        if (board[0][7] === 'r') castling += "k";
        if (board[0][0] === 'r') castling += "q";
    }

    return castling || "-";
}

export function generateRandomBalancedFen(inputFen: string, tolerance: [number, number] = [0.05, 0.15]): string {
    const { board, turn, castling, ep, halfmove, fullmove } = parseFen(inputFen);
    const grid = boardToArray(board);

    // supprimer les noirs existants
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (grid[r][c] === grid[r][c].toLowerCase()) {
                grid[r][c] = '.';
            }
        }
    }

    const whiteWeight = computeWhiteWeight(grid);

    const blackPieces = generateBlackArmy(
        whiteWeight,
        tolerance,
    );

    placeBlackPieces(grid, blackPieces);
    const newBoard = arrayToBoard(grid);
    const blackCastling = computeBlackCastling(grid);

    const whiteCastling = castling.replace(/[^KQ]/g, '') || '';
    const finalCastling =
        (whiteCastling + blackCastling).replace("-", "") || "-";

    return [
        newBoard,
        turn || "w",
        finalCastling,
        ep || "-",
        halfmove || "0",
        fullmove || "1"
    ].join(" ");
}