import { useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";

export default function App() {
    const [editor, setEditor] = useState(null);
    const monacoElement = useRef(null);

    useEffect(() => {
        if (monacoElement) {
            setEditor((editor) => {
                if (editor) return editor;

                const myEditor = start(monacoElement).then(() => {
                    console.log("start");
                });

                return myEditor;
            });
        }

        return () => editor?.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monacoElement.current]);

    return (
        <>
            <button onClick={() => console.log(editor.getModel().getValue())}>
                Run
            </button>
            <div className="w-screen h-screen" ref={monacoElement} />;
        </>
    );
}
