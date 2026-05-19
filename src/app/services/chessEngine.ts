type ComputeMoveOptions = {
    depth?: number;
};

export type WorkerOptions = {
    depth: number;
    skillLevel: number;
};

 const GameOverReason = {
    Checkmate: "CHECKMATE",
    Stalemate: "STALEMATE",
    InsufficientMaterial: "INSUFFICIENT_MATERIAL",
    ThreeforldRepetition: "THREEFOLD_REPETITION",
    Draw: "DRAW",
    Unknown: "UNKNOWN",
} as const;

export type GameOverReason = typeof GameOverReason[keyof typeof GameOverReason];

type WorkerResponse =
    | { type: "ready" }
    | { type: "bestmove"; requestId: string; bestmove: string }
    | { type: "info"; line: string }
    | { type: "error"; error: string };

export class ChessEngine {
    private playerWorker: Worker;
    private opponentWorker: Worker;
    private requestResolvers = new Map<string, (bestmove: string) => void>();

    constructor() {
        this.playerWorker = this.createWorker();
        this.opponentWorker = this.createWorker();

        this.setupWorker(this.playerWorker);
        this.setupWorker(this.opponentWorker);
    }

    private createWorker(): Worker {
        return new Worker(new URL("../workers/stockfishWorker.ts", import.meta.url), { type: "module" });
    }

    private setupWorker(worker: Worker) {
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const data = event.data;

            if (data.type === "bestmove") {
                const resolver = this.requestResolvers.get(data.requestId);
                if (resolver) {
                    resolver(data.bestmove);
                    this.requestResolvers.delete(data.requestId);
                }
            }

            if (data.type === "error") {
                console.error("[stockfish-worker]", data.error);
            }
        };

        worker.onerror = (event: ErrorEvent) => {
            const msg = event.message || "Unknown worker error";
            console.error("[stockfish-worker]", msg);
            // if (!this.isReady) {
            //     this.rejectReady(new Error(`Stockfish worker runtime error: ${msg}`));
            // }
        };
    }

    async init(playerWorkerOptions: WorkerOptions, opponentWorkerOptions: WorkerOptions) {
        this.playerWorker.postMessage({ type: "init", ...playerWorkerOptions });
        this.opponentWorker.postMessage({ type: "init", ...opponentWorkerOptions });
    }

    newGame() {
        this.playerWorker.postMessage({ type: "newGame" });
        this.opponentWorker.postMessage({type: "newGame" })
    }

    setSkillLevel(worker: "p" | "o", skillLevel: number) {
        this.playerWorker.postMessage({ type: "setSkillLevel", skillLevel });
    }

    async getBestMove(fen: string, isPlayerTurn: boolean, options: ComputeMoveOptions = {}): Promise<string> {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const worker = isPlayerTurn ? this.playerWorker : this.opponentWorker;

        const bestMovePromise = new Promise<string>((resolve) => {
            this.requestResolvers.set(requestId, resolve);
        });

        worker.postMessage({
            type: "computeBestMove",
            requestId,
            fen,
            ...options,
        });

        return bestMovePromise;
    }

    terminate() {
        this.playerWorker.postMessage({ type: "terminate" });
        this.opponentWorker.postMessage({ type: "terminate" });
        this.playerWorker.terminate();
        this.opponentWorker.terminate();
        this.requestResolvers.clear();
    }
}
