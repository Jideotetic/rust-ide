import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useEffect, useRef, useState } from "react";
import exampleCode from "../example-code.rs?raw";
import fake_std from "../fake_std.rs?raw";
import fake_core from "../fake_core.rs?raw";
import fake_alloc from "../fake_alloc.rs?raw";
import { modeId } from ".";

let state;
// eslint-disable-next-line no-unused-vars
let allTokens;

const registerRA = async () => {
    monaco.languages.registerHoverProvider(modeId, {
        provideHover: (_, pos) => state.hover(pos.lineNumber, pos.column),
    });
    monaco.languages.registerCodeLensProvider(modeId, {
        async provideCodeLenses(m) {
            const code_lenses = await state.code_lenses();
            const lenses = code_lenses.map(({ range, command }) => {
                const position = {
                    column: range.startColumn,
                    lineNumber: range.startLineNumber,
                };

                const references = command.positions.map((pos) => ({
                    range: pos,
                    uri: m.uri,
                }));
                return {
                    range,
                    command: {
                        id: command.id,
                        title: command.title,
                        arguments: [m.uri, position, references],
                    },
                };
            });

            return { lenses, dispose() {} };
        },
    });
    monaco.languages.registerReferenceProvider(modeId, {
        async provideReferences(m, pos, { includeDeclaration }) {
            const references = await state.references(
                pos.lineNumber,
                pos.column,
                includeDeclaration
            );
            if (references) {
                return references.map(({ range }) => ({
                    uri: m.uri,
                    range,
                }));
            }
        },
    });
    monaco.languages.registerInlayHintsProvider(modeId, {
        async provideInlayHints() {
            let hints = await state.inlay_hints();
            return hints.map((hint) => {
                if (hint.hint_type == 1) {
                    return {
                        kind: 1,
                        position: {
                            column: hint.range.endColumn,
                            lineNumber: hint.range.endLineNumber,
                        },
                        text: `: ${hint.label}`,
                    };
                }
                if (hint.hint_type == 2) {
                    return {
                        kind: 2,
                        position: {
                            column: hint.range.startColumn,
                            lineNumber: hint.range.startLineNumber,
                        },
                        text: `${hint.label}:`,
                        whitespaceAfter: true,
                    };
                }
            });
        },
    });
    monaco.languages.registerDocumentHighlightProvider(modeId, {
        async provideDocumentHighlights(_, pos) {
            return await state.references(pos.lineNumber, pos.column, true);
        },
    });
    monaco.languages.registerRenameProvider(modeId, {
        async provideRenameEdits(m, pos, newName) {
            const edits = await state.rename(
                pos.lineNumber,
                pos.column,
                newName
            );
            if (edits) {
                return {
                    edits: edits.map((edit) => ({
                        resource: m.uri,
                        edit,
                    })),
                };
            }
        },
        async resolveRenameLocation(_, pos) {
            return state.prepare_rename(pos.lineNumber, pos.column);
        },
    });
    monaco.languages.registerCompletionItemProvider(modeId, {
        triggerCharacters: [".", ":", "="],
        async provideCompletionItems(_m, pos) {
            const suggestions = await state.completions(
                pos.lineNumber,
                pos.column
            );
            if (suggestions) {
                return { suggestions };
            }
        },
    });
    monaco.languages.registerSignatureHelpProvider(modeId, {
        signatureHelpTriggerCharacters: ["(", ","],
        async provideSignatureHelp(_m, pos) {
            const value = await state.signature_help(
                pos.lineNumber,
                pos.column
            );
            if (!value) return null;
            return {
                value,
                dispose() {},
            };
        },
    });
    monaco.languages.registerDefinitionProvider(modeId, {
        async provideDefinition(m, pos) {
            const list = await state.definition(pos.lineNumber, pos.column);
            if (list) {
                return list.map((def) => ({ ...def, uri: m.uri }));
            }
        },
    });
    monaco.languages.registerTypeDefinitionProvider(modeId, {
        async provideTypeDefinition(m, pos) {
            const list = await state.type_definition(
                pos.lineNumber,
                pos.column
            );
            if (list) {
                return list.map((def) => ({ ...def, uri: m.uri }));
            }
        },
    });
    monaco.languages.registerImplementationProvider(modeId, {
        async provideImplementation(m, pos) {
            const list = await state.goto_implementation(
                pos.lineNumber,
                pos.column
            );
            if (list) {
                return list.map((def) => ({ ...def, uri: m.uri }));
            }
        },
    });
    monaco.languages.registerDocumentSymbolProvider(modeId, {
        async provideDocumentSymbols() {
            return await state.document_symbols();
        },
    });
    monaco.languages.registerOnTypeFormattingEditProvider(modeId, {
        autoFormatTriggerCharacters: [".", "="],
        async provideOnTypeFormattingEdits(_, pos, ch) {
            return await state.type_formatting(pos.lineNumber, pos.column, ch);
        },
    });
    monaco.languages.registerFoldingRangeProvider(modeId, {
        async provideFoldingRanges() {
            return await state.folding_ranges();
        },
    });

    // eslint-disable-next-line no-unused-vars
    class TokenState {
        constructor(line = 0) {
            this.line = line;
            this.equals = () => true;
        }

        clone() {
            const res = new TokenState(this.line);
            res.line += 1;
            return res;
        }
    }

    // eslint-disable-next-line no-unused-vars
    function fixTag(tag) {
        switch (tag) {
            case "builtin":
                return "variable.predefined";
            case "attribute":
                return "key";
            case "macro":
                return "number.hex";
            case "literal":
                return "number";
            default:
                return tag;
        }
    }

    // monaco.languages.setTokensProvider(modeId, {
    //     getInitialState: () => new TokenState(),
    //     tokenize(_, st) {
    //         const filteredTokens = allTokens.filter(
    //             (token) => token.range.startLineNumber === st.line
    //         );

    //         const tokens = filteredTokens.map((token) => ({
    //             startIndex: token.range.startColumn - 1,
    //             scopes: fixTag(token.tag),
    //         }));
    //         tokens.sort((a, b) => a.startIndex - b.startIndex);

    //         return {
    //             tokens,
    //             endState: new TokenState(st.line + 1),
    //         };
    //     },
    // });
};

const createRA = async () => {
    const worker = new Worker(new URL("../ra-worker.js", import.meta.url), {
        type: "module",
    });
    const pendingResolve = {};

    let id = 1;
    let ready;

    const callWorker = async (which, ...args) => {
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, _) => {
            pendingResolve[id] = resolve;
            worker.postMessage({
                which: which,
                args: args,
                id: id,
            });
            id += 1;
        });
    };

    const proxyHandler = {
        get: (target, prop, _receiver) => {
            if (prop == "then") {
                return Reflect.get(target, prop, _receiver);
            }
            return async (...args) => {
                return callWorker(prop, ...args);
            };
        },
    };

    worker.onmessage = (e) => {
        if (e.data.id == "ra-worker-ready") {
            ready(new Proxy({}, proxyHandler));
            return;
        }
        const pending = pendingResolve[e.data.id];
        if (pending) {
            pending(e.data.result);
            delete pendingResolve[e.data.id];
        }
    };

    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, _) => {
        ready = resolve;
    });
};

export default function App() {
    const [editor, setEditor] = useState(null);
    const monacoEl = useRef(null);

    useEffect(() => {
        // const start = async () => {
        //     const editorElement = document.getElementById("editor");
        //     const loadingText = document.createTextNode("Loading...");
        //     editorElement.appendChild(loadingText);

        //     let model = monaco.editor.createModel(exampleCode, modeId);
        //     window.editor = monaco.editor;
        //     state = null; //await createRA();

        //     async function update() {
        //         const res = await state.update(model.getValue());
        //         monaco.editor.setModelMarkers(model, modeId, res.diagnostics);
        //         allTokens = res.highlights;
        //     }

        //     monaco.editor.defineTheme("vscode-dark-plus", {
        //         base: "vs-dark",
        //         inherit: true,
        //         colors: {
        //             "editorInlayHint.foreground": "#A0A0A0F0",
        //             "editorInlayHint.background": "#11223300",
        //         },
        //         rules: [
        //             { token: "keyword.control", foreground: "C586C0" },
        //             { token: "variable", foreground: "9CDCFE" },
        //             { token: "support.function", foreground: "DCDCAA" },
        //         ],
        //     });

        //     editorElement.removeChild(loadingText);

        //     const initRA = async () => {
        //         state = await createRA();

        //         await registerRA();
        //         await state.init(
        //             model.getValue(),
        //             fake_std,
        //             fake_core,
        //             fake_alloc
        //         );
        //         await update();
        //         model.onDidChangeContent(update);
        //         console.log(state);
        //     };
        //     initRA();
        //     const myEditor = monaco.editor.create(editorElement, {
        //         theme: "vscode-dark-plus",
        //         model: model,
        //     });

        //     window.onresize = () => myEditor.layout();
        // };

        // start().then(() => {
        //     console.log("start");
        // });

        if (monacoEl) {
            setEditor((editor) => {
                if (editor) return editor;

                return monaco.editor.create(monacoEl.current, {
                    value: exampleCode,
                    language: "rust",
                });
            });
        }

        return () => editor?.dispose();
    }, []);
    return (
        <>
            <div className="w-screen h-screen" id="editor" ref={monacoEl}></div>
        </>
    );
}
