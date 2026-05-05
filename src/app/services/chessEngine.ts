type EngineInitOptions = {
    depth?: number;
    skillLevel?: number;
    timeoutMs?: number;
};

type ComputeMoveOptions = {
    depth?: number;
};

type WorkerResponse =
    | { type: "ready" }
    | { type: "bestmove"; requestId: string; bestmove: string }
    | { type: "info"; line: string }
    | { type: "error"; error: string };

export class ChessEngine {
    private static readonly DEFAULT_INIT_TIMEOUT_MS = 20000;
    private worker: Worker;
    private requestResolvers = new Map<string, (bestmove: string) => void>();
    private readyPromise: Promise<void>;
    private resolveReady!: () => void;
    private rejectReady!: (reason?: unknown) => void;
    private isReady = false;
    private lastWorkerError: string | null = null;

    constructor() {
        this.worker = new Worker(new URL("../workers/stockfishWorker.ts", import.meta.url), { type: "module" });
        this.readyPromise = new Promise<void>((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const data = event.data;
            if (data.type === "ready") {
                this.isReady = true;
                this.resolveReady();
                return;
            }

            if (data.type === "bestmove") {
                const resolver = this.requestResolvers.get(data.requestId);
                if (resolver) {
                    resolver(data.bestmove);
                    this.requestResolvers.delete(data.requestId);
                }
            }

            if (data.type === "error") {
                this.lastWorkerError = data.error;
                console.error("[stockfish-worker]", data.error);
                if (!this.isReady) {
                    this.rejectReady(new Error(`Stockfish worker initialization failed: ${data.error}`));
                }
            }

            if(data.type === "info") {
                console.log("stockfish info :", data.line);
            }
        };

        this.worker.onerror = (event: ErrorEvent) => {
            const msg = event.message || "Unknown worker error";
            this.lastWorkerError = msg;
            console.error("[stockfish-worker]", msg);
            if (!this.isReady) {
                this.rejectReady(new Error(`Stockfish worker runtime error: ${msg}`));
            }
        };
    }

    async init(options: EngineInitOptions = {}): Promise<void> {
        const { timeoutMs = ChessEngine.DEFAULT_INIT_TIMEOUT_MS, ...engineOptions } = options;
        this.worker.postMessage({ type: "init", ...engineOptions });

        await Promise.race([
            this.readyPromise,
            new Promise<void>((_, reject) => {
                setTimeout(() => {
                    const details = this.lastWorkerError
                        ? ` Last worker error: ${this.lastWorkerError}`
                        : " No worker error was reported.";
                    reject(
                        new Error(
                            `Stockfish initialization timed out after ${timeoutMs}ms.${details}`
                        )
                    );
                }, timeoutMs);
            }),
        ]);
    }

    newGame() {
        this.worker.postMessage({ type: "newGame" });
    }

    async getBestMove(fen: string, options: ComputeMoveOptions = {}): Promise<string> {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const bestMovePromise = new Promise<string>((resolve) => {
            this.requestResolvers.set(requestId, resolve);
        });

        this.worker.postMessage({
            type: "computeBestMove",
            requestId,
            fen,
            ...options,
        });

        return bestMovePromise;
    }

    terminate() {
        this.worker.postMessage({ type: "terminate" });
        this.worker.terminate();
        this.requestResolvers.clear();
    }
}
