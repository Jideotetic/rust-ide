/* eslint-disable react/prop-types */

import { FiFile } from "react-icons/fi";
import { IoIosClose } from "react-icons/io";
import { findAncestorsById, saveOnTabChange } from "../utils/utils";

export default function TabButton({
    tab,
    isSelected,
    activeTabs,
    editorRef,
    selectedTabId,
    setActiveTabs,
    setSelectedTabId,
    fileTree,
    setFileTree,
    setExpandedFolderIds,
}) {
    const handleCloseTab = (tabId) => {
        if (activeTabs.length === 1) return;
        if (editorRef.current && selectedTabId === tabId) {
            const currentContent = editorRef.current.getValue();

            setActiveTabs((tabs) =>
                tabs.map((tab) =>
                    tab.id === tabId ? { ...tab, content: currentContent } : tab
                )
            );
        }

        const updatedActiveEditorTabs = activeTabs.filter(
            (tab) => tab.id !== tabId
        );

        setActiveTabs(updatedActiveEditorTabs);

        if (activeTabs.length !== 1) {
            setSelectedTabId(updatedActiveEditorTabs.at(-1).id);
        } else {
            setSelectedTabId(null);
        }
    };

    const handleOpenTab = () => {
        saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );
        setSelectedTabId(tab.id);
        const ancestorIds = findAncestorsById(fileTree, tab.id);

        setExpandedFolderIds(ancestorIds);
    };

    const activeClass = isSelected
        ? "bg-black text-white"
        : "bg-transparent text-white";

    return (
        <div
            role="button"
            onClick={handleOpenTab}
            className={`${activeClass} cursor-pointer px-4 py-2 text-xs border-r border-b flex items-center gap-3 hover:bg-black`}
        >
            <div className="flex items-center gap-1.5">
                <span className="flex items-center">
                    <FiFile size={12} />
                </span>
                <span>{tab.name}</span>
            </div>
            <button
                className="min-w-5 min-h-5  cursor-pointer flex justify-center transition active:translate-y-[1px] items-center"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                }}
            >
                <IoIosClose size={12} />
            </button>
        </div>
    );
}
