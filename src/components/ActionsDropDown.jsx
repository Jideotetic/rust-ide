/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { GoKebabHorizontal } from "react-icons/go";
import {
    findFileNodeById,
    saveOnTabChange,
    uploadAsZipForBuild,
    uploadAsZipForFormatting,
    uploadAsZipForTest,
} from "../utils/utils";

export default function ActionsDropdown({
    formatting,
    building,
    testing,
    setFormatting,
    setLoading,
    editorRef,
    selectedTabId,
    setActiveTabs,
    fileTree,
    setFileTree,
    setResult,
    activeTabs,
    setBuilding,
    setTesting,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleFormat = async () => {
        if (!editorRef.current || !selectedTabId) return;

        setFormatting(true);
        setLoading(true);

        const updatedTree = saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );

        const formattedTree = await uploadAsZipForFormatting(
            updatedTree,
            setResult
        );

        if (formattedTree) {
            setFileTree(formattedTree);

            const updatedTabs = activeTabs.map((tab) => {
                const formattedNode = findFileNodeById(formattedTree, tab.id);
                if (formattedNode?.data) {
                    if (tab.id === selectedTabId) {
                        editorRef.current.setValue(formattedNode.data);
                    }
                    return { ...tab, content: formattedNode.data };
                }
                return tab;
            });

            setActiveTabs(updatedTabs);
        }

        setFormatting(false);
        setLoading(false);
    };

    const handleBuild = async () => {
        setBuilding(true);
        setLoading(true);

        const updatedTree = saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );
        await uploadAsZipForBuild(updatedTree, setResult);

        setBuilding(false);
        setLoading(false);
    };

    const handleTest = async () => {
        setTesting(true);
        setLoading(true);

        const updatedTree = saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );

        await uploadAsZipForTest(updatedTree, setResult);

        setTesting(false);
        setLoading(false);
    };

    return (
        <div
            className="p-2 bg-green-700 text-white absolute rounded bottom-10 right-4 z-40 hover:bg-green-600 flex items-center gap-1"
            ref={dropdownRef}
        >
            {formatting ? (
                "Formatting..."
            ) : building ? (
                "Building..."
            ) : testing ? (
                "Running test..."
            ) : (
                <>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full block cursor-pointer"
                    >
                        <GoKebabHorizontal />
                    </button>

                    {isOpen && (
                        <div className="absolute bottom-14 right-4 bg-[#1e1e1e] shadow-lg rounded border border-gray-600 z-50 min-w-32">
                            <button
                                onClick={handleTest}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Test
                            </button>
                            <button
                                onClick={handleBuild}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Build
                            </button>
                            <button
                                onClick={handleFormat}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Format
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
