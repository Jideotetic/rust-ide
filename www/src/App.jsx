import { useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";

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
                        console.log("start");
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
                <div className="w-screen h-screen flex items-center justify-center bg-[#d4d4d4]">
                    <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-16 h-16 animate-spin" />
                </div>
            )}

            {!loading && (
                <div className="w-screen h-screen" ref={monacoElement}></div>
            )}
        </>
    );
}
