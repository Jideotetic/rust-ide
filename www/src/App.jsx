import { useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export default function App() {
    const [editor, setEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const monacoElement = useRef(null);

    useEffect(() => {
        if (monacoElement) {
            setEditor((editor) => {
                if (editor) return editor;

                start(monacoElement)
                    .then((myEditor) => {
                        setLoading(false);
                        setEditor(myEditor);
                    })
                    .catch((error) => {
                        console.error("Failed to initialize editor:", error);
                        setLoading(false);
                    });

                return editor;
            });
        }

        return () => {
            if (editor) {
                editor.dispose();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monacoElement.current]);

    return (
        <>
            {loading && (
                <div className="w-screen h-screen flex items-center justify-center bg-black/85">
                    <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-16 h-16 animate-spin" />
                </div>
            )}

            {!loading && (
                <div className="w-screen h-screen text-white">
                    <PanelGroup direction="vertical">
                        <Panel>
                            <PanelGroup direction="horizontal">
                                <Panel>
                                    <div
                                        className="w-screen h-screen"
                                        ref={monacoElement}
                                    />
                                </Panel>
                                <PanelResizeHandle className="w-1 bg-black" />
                                <Panel
                                    collapsedSize={0}
                                    collapsible
                                    defaultSize={25}
                                    minSize={10}
                                    maxSize={50}
                                >
                                    <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                                </Panel>
                            </PanelGroup>
                        </Panel>
                        <PanelResizeHandle className="h-1 bg-black" />
                        <Panel
                            collapsedSize={0}
                            collapsible
                            defaultSize={20}
                            minSize={10}
                            maxSize={50}
                        >
                            <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                        </Panel>
                    </PanelGroup>
                </div>
            )}
        </>
    );
}
