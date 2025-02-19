import { useCallback, useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import init, { format_rust_code } from "../../rustfmt/pkg/rustfmt_wasm.js";

export default function App() {
    const [editor, setEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editorContent, setEditorContent] = useState("");
    const monacoElementRef = useRef(null);
    const [monacoEditor, setMonacoEditor] = useState(null);

    useEffect(() => {
        if (monacoElementRef) {
            setEditor(async (editor) => {
                if (editor) return editor;

                await init();

                const { myEditor, model } = await start(
                    monacoElementRef,
                    setEditorContent
                );
                setLoading(false);
                setMonacoEditor(model);

                return myEditor;
            });
        }

        return () => {
            if (editor) {
                editor.dispose();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monacoElementRef.current]);

    const handleFormat = useCallback(async () => {
        console.log("Formatting code...");

        if (monacoEditor) {
            const formattedCode = format_rust_code(editorContent);

            monacoEditor.setValue(formattedCode);
        }
    }, [editorContent, monacoEditor]);

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                (event.key === "s" || event.key === "S")
            ) {
                event.preventDefault();
                handleFormat();
            }
        };

        document.addEventListener("keydown", handleKeyPress);

        return () => {
            document.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleFormat]);

    const handleCompile = useCallback(async () => {
        console.log("Compiling code...");
    }, []);

    return (
        <>
            <PanelGroup className="text-white" direction="vertical">
                <Panel>
                    <PanelGroup direction="horizontal">
                        <Panel>
                            <div
                                className="h-full w-full relative"
                                ref={monacoElementRef}
                            >
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                                        <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-16 h-16 animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            disabled={loading}
                                            onClick={handleCompile}
                                            className="p-2 bg-green-700 text-white absolute rounded bottom-2 right-4 z-50 cursor-pointer disabled:cursor-not-allowed disabled:bg-green-200"
                                        >
                                            Run
                                        </button>
                                    </>
                                )}
                            </div>
                        </Panel>
                        <PanelResizeHandle className="w-1 bg-black" />
                        <Panel
                            collapsedSize={0}
                            collapsible
                            defaultSize={0}
                            minSize={0}
                            maxSize={100}
                        >
                            <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                        </Panel>
                    </PanelGroup>
                </Panel>
                <PanelResizeHandle className="h-1 bg-black" />
                <Panel
                    collapsedSize={0}
                    collapsible
                    defaultSize={0}
                    minSize={0}
                    maxSize={100}
                >
                    <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                </Panel>
            </PanelGroup>
        </>
    );
}
