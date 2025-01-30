import {
  MonacoLanguageClient,
  CloseAction,
  ErrorAction,
} from "monaco-languageclient";
import {
  WebSocketMessageReader,
  WebSocketMessageWriter,
  toSocket,
} from "vscode-ws-jsonrpc";
import ReconnectingWebSocket from "reconnecting-websocket";

export function createLanguageClient(socketUrl) {
  const socket = new ReconnectingWebSocket(socketUrl);
  const socketReader = new WebSocketMessageReader(toSocket(socket));
  const socketWriter = new WebSocketMessageWriter(toSocket(socket));

  return new MonacoLanguageClient({
    name: "Rust Language Client",
    clientOptions: {
      documentSelector: ["rust"],
      errorHandler: {
        error: () => ({ action: ErrorAction.Continue }),
        closed: () => ({ action: CloseAction.Restart }),
      },
    },
    connectionProvider: {
      get: () => {
        return Promise.resolve({
          reader: socketReader,
          writer: socketWriter,
        });
      },
    },
  });
}
