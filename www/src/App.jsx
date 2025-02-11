import { useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export default function App() {
    const [editor, setEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editorContent, setEditorContent] = useState(null);
    const monacoElementRef = useRef(null);

    useEffect(() => {
        if (monacoElementRef) {
            setEditor(async (editor) => {
                if (editor) return editor;

                const myEditor = await start(
                    monacoElementRef,
                    setEditorContent
                );
                setLoading(false);

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

    const handleCompile = () => {
        console.log(editorContent);
    };

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
                                    <button
                                        disabled={loading}
                                        onClick={handleCompile}
                                        className="p-2 bg-green-700 text-white absolute rounded bottom-2 right-4 z-50 cursor-pointer disabled:cursor-not-allowed disabled:bg-green-200"
                                    >
                                        Compile
                                    </button>
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
