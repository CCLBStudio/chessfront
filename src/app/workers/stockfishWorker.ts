type InitMessage = {
    type: "init";
    depth?: number;
    skillLevel?: number;
};

type ComputeBestMoveMessage = {
    type: "computeBestMove";
    requestId: string;
    fen: string;
    depth?: number;
};

type NewGameMessage = {
    type: "newGame";
};

type SetSkillLevelMessage = {
    type: "setSkillLevel";
    skillLevel: number;
};

type TerminateMessage = {
    type: "terminate";
};

type IncomingMessage = InitMessage | ComputeBestMoveMessage | NewGameMessage | SetSkillLevelMessage | TerminateMessage;

type OutgoingMessage =
    | { type: "ready" }
    | { type: "bestmove"; requestId: string; bestmove: string }
    | { type: "info"; line: string }
    | { type: "error"; error: string };

const DEFAULT_DEPTH = 10;
const DEFAULT_SKILL_LEVEL = 8;
const STOCKFISH_STARTUP_WATCHDOG_MS = 10000;
const STOCKFISH_ENGINE_JS_URL = "/stockfish/stockfish.js";

let stockfishWorker: Worker | null = null;
let stockfishBootstrapPromise: Promise<void> | null = null;
let isReady = false;
let isThinking = false;
let defaultDepth = DEFAULT_DEPTH;
let defaultSkillLevel = DEFAULT_SKILL_LEVEL;
let pendingRequestId: string | null = null;
let hasReceivedStockfishMessage = false;

function postToHost(message: OutgoingMessage) {
    self.postMessage(message);
}

function debugInfo(message: string) {
    //console.log(`[stockfish-wrapper] ${message}`);
}

function sendToStockfish(command: string) {
    if (!stockfishWorker) return;
    debugInfo(`sending to stockfish : ${command}`);
    stockfishWorker.postMessage(command);
}

function createStockfishWorker(): Worker {
    const stockfishScriptUrl = new URL(STOCKFISH_ENGINE_JS_URL, self.location.origin).toString();
    return new Worker(stockfishScriptUrl);
}

async function setupStockfish() {
    if (stockfishWorker) return;
    if (stockfishBootstrapPromise) return stockfishBootstrapPromise;

    stockfishBootstrapPromise = (async () => {
        const stockfishScriptUrl = new URL(STOCKFISH_ENGINE_JS_URL, self.location.origin).toString();
        const stockfishWasmUrl = new URL("/stockfish/stockfish.wasm", self.location.origin).toString();
        debugInfo(`checking assets ${stockfishScriptUrl} and ${stockfishWasmUrl}`);

        const [scriptResponse, wasmResponse] = await Promise.all([
            fetch(stockfishScriptUrl, { method: "HEAD" }),
            fetch(stockfishWasmUrl, { method: "HEAD" }),
        ]);

        if (!scriptResponse.ok || !wasmResponse.ok) {
            throw new Error(
                `Stockfish assets unavailable (script: ${scriptResponse.status}, wasm: ${wasmResponse.status})`
            );
        }

        debugInfo("assets are reachable, creating stockfish worker");
        try {
            stockfishWorker = createStockfishWorker();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "unknown worker constructor error";
            throw new Error(`Failed to construct stockfish worker from ${stockfishScriptUrl}: ${errorMessage}`);
        }
        hasReceivedStockfishMessage = false;
        const startupWatchdog = setTimeout(() => {
            if (!hasReceivedStockfishMessage && !isReady) {
                const diagnostic =
                    "No message received from Stockfish after startup commands. " +
                    "Likely causes: worker script did not execute, wasm bootstrap failed, or worker URL/hash is invalid.";
                postToHost({ type: "error", error: diagnostic });
                stockfishWorker?.terminate();
                stockfishWorker = null;
            }
        }, STOCKFISH_STARTUP_WATCHDOG_MS);

        stockfishWorker.onmessage = (event: MessageEvent<string>) => {
            const line = (event.data ?? "").toString().trim();
            hasReceivedStockfishMessage = true;
            clearTimeout(startupWatchdog);
            //debugInfo(`stockfish worker message : ${line}`);
            if (!line) return;

            postToHost({ type: "info", line });

            if (line === "readyok") {
                isReady = true;
                postToHost({ type: "ready" });
                return;
            }

            if (line.startsWith("bestmove")) {
                isThinking = false;
                const [, bestmove = "(none)"] = line.split(" ");
                if (pendingRequestId) {
                    postToHost({ type: "bestmove", requestId: pendingRequestId, bestmove });
                    pendingRequestId = null;
                }
            }
        };

        stockfishWorker.onerror = (event: ErrorEvent) => {
            clearTimeout(startupWatchdog);
            const msg = event.message || "Unknown stockfish worker error";
            postToHost({ type: "error", error: msg });
        };

        stockfishWorker.onmessageerror = () => {
            clearTimeout(startupWatchdog);
            postToHost({ type: "error", error: "Stockfish worker message could not be deserialized (messageerror)." });
        };

        debugInfo("stockfish worker created, sending UCI init commands");
        sendToStockfish("uci");
        sendToStockfish(`setoption name Skill Level value ${defaultSkillLevel}`);
        sendToStockfish("isready");
    })();

    try {
        await stockfishBootstrapPromise;
    }
    catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown Stockfish worker bootstrap error";
        debugInfo(`stockfish worker bootstrap error : ${errorMessage}`);
        postToHost({ type: "error", error: errorMessage });
    }
    finally {
        stockfishBootstrapPromise = null;
    }
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
    try {
        const msg = event.data;

        if (msg.type === "terminate") {
            stockfishWorker?.terminate();
            stockfishWorker = null;
            stockfishBootstrapPromise = null;
            isReady = false;
            pendingRequestId = null;
            return;
        }

        await setupStockfish();

        if (msg.type === "init") {
            if (typeof msg.depth === "number") 
                {
                    defaultDepth = msg.depth;
                    debugInfo(`stockfish worker depth set to ${defaultDepth}`);
                }
            if (typeof msg.skillLevel === "number") {
                defaultSkillLevel = msg.skillLevel;
                debugInfo(`stockfish worker skill level set to ${defaultSkillLevel}`);
                sendToStockfish(`setoption name Skill Level value ${defaultSkillLevel}`);
            }

            sendToStockfish("isready");
            return;
        }

        if(msg.type === "setSkillLevel") {
            //sendToStockfish("stop");
            defaultSkillLevel = msg.skillLevel;
            debugInfo(`stockfish worker skill level set to ${defaultSkillLevel}`);
            sendToStockfish(`setoption name Skill Level value ${defaultSkillLevel}`);
            return;
        }

        if (msg.type === "newGame") {
            sendToStockfish("ucinewgame");
            sendToStockfish("isready");
            return;
        }

        if (msg.type === "computeBestMove") {
            if (!isReady) {
                sendToStockfish("isready");
            }

            if(isThinking){
                postToHost({
                    type: "error",
                    error: "Engine is already thinking",
                });
                return;
            }

            const depth = msg.depth ?? defaultDepth;
            isThinking = true;
            pendingRequestId = msg.requestId;
            sendToStockfish(`position fen ${msg.fen}`);
            sendToStockfish(`go depth ${depth}`);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown Stockfish worker error";
        postToHost({ type: "error", error: errorMessage });
    }
};
