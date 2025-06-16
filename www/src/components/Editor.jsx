/* eslint-disable react/prop-types */
// import { FileIcon, XIcon } from "@primer/octicons-react";
import { useCallback, useEffect, useState } from "react";
import Entry from "./Entry";
import { FiFile } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { virtualFS } from "../utils/virtual-file-server";

function Editor({
    activeEditorTabs,
    selectedTabId,
    setSelectedTabId,
    handleCloseTab,
    monacoEditor,
}) {
    const [selectedTabData, setSelectedTabData] = useState(null);

    const handleSave = useCallback(() => {
        if (!selectedTabId || !monacoEditor) return;
        virtualFS.updateContent(selectedTabId, monacoEditor.getValue());
    }, [selectedTabId, monacoEditor]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedTabId, monacoEditor, handleSave]);

    useEffect(() => {
        if (selectedTabId) {
            const file = virtualFS.getFile(selectedTabId);
            setSelectedTabData(file?.content || "");

            if (monacoEditor && file?.content !== undefined) {
                monacoEditor.setValue(file.content);
            }
        } else {
            setSelectedTabData(null);
        }
    }, [selectedTabId, monacoEditor]);

    // useEffect(() => {
    //     const data = activeEditorTabs.find((tab) => tab.id === selectedTabId);
    //     setSelectedTabData(data?.data || "");
    // }, [activeEditorTabs, selectedTabId]);

    return (
        <div className="flex flex-col w-full h-full">
            {activeEditorTabs.length !== 0 ? (
                <>
                    <div className="border-b border-b-vsdark-3 scrollbar-thin flex items-center flex-nowrap overflow-x-auto overflow-y-hidden">
                        {activeEditorTabs.map((tab) => (
                            <TabButton
                                key={tab.id}
                                tab={tab}
                                handleCloseTab={handleCloseTab}
                                isSelected={tab.id === selectedTabId}
                                onClick={() => setSelectedTabId(tab.id)}
                            />
                        ))}
                    </div>
                    <div className="flex-1 h-full max-h-full flex-grow font-mono font-semibold scrollbar-thin whitespace-pre py-6 p-12 text-vsdark-5 overflow-auto outline-none">
                        {selectedTabData}
                    </div>
                </>
            ) : (
                <Entry />
            )}
        </div>
    );
}

function TabButton({ tab, isSelected, onClick, handleCloseTab }) {
    const activeClass = isSelected
        ? "bg-black text-vsdark-5"
        : "bg-transparent text-vsdark-4";

    return (
        <div
            role="button"
            onClick={onClick}
            className={`${activeClass} px-4 py-2 text-xs border-r border-vsdark-3 flex items-center gap-3 hover:bg-black hover:text-vsdark-5`}
        >
            <div className="flex items-center gap-1.5">
                <span className="flex items-center">
                    <FiFile size={12} />
                </span>
                <span>{tab.name}</span>
            </div>
            <button
                className="min-w-5 min-h-5 rounded hover:bg-vsdark-3 flex justify-center transition active:translate-y-[1px] items-center"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                }}
            >
                <IoMdClose size={12} />
            </button>
        </div>
    );
}

export default Editor;
