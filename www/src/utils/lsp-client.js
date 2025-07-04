import {
    WebSocketMessageReader,
    WebSocketMessageWriter,
    toSocket,
} from "vscode-ws-jsonrpc";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import { MonacoLanguageClient } from "monaco-languageclient";

const LS_WS_URL = "http://154.53.44.134:3000/rust-analyzer";
export async function connectToLs() {
    return new Promise((resolve, reject) => {
        const webSocket = new WebSocket(LS_WS_URL);

        webSocket.onopen = () => {
            console.log("LS WebSocket connection Open");
            const socket = toSocket(webSocket);
            const reader = new WebSocketMessageReader(socket);
            const writer = new WebSocketMessageWriter(socket);
            const languageClient = new MonacoLanguageClient({
                id: "rust",
                name: `Rust Language Client`,
                clientOptions: {
                    documentSelector: ["rust"],
                    errorHandler: {
                        error: () => ({ action: ErrorAction.Continue }),
                        closed: () => ({ action: CloseAction.DoNotRestart }),
                    },
                },
                messageTransports: { reader, writer },
            });

            languageClient.start();
            resolve(languageClient);
        };

        webSocket.onerror = (error) => {
            console.log("LS WebSocket connection error:", error);
            reject(error);
        };
    });
}
