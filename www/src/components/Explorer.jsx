/* eslint-disable react/prop-types */

import useTree from "../hooks/useTree";
import { v4 as uuidv4 } from "uuid";
import { sortTreeByTypeAndName } from "../utils/utils";
import Entry from "./Entry";
import FileTree from "./FileTree";

export default function Explorer({
    setFileTree,
    fileTree,
    setActiveTabs,
    activeTabs,
    selectedTabId,
    setSelectedTabId,
    handleActiveEditorTabs,
    MAIN_DOT_RS_ID,
    setExpandedFolderIds,
    expandedFolderIds,
}) {
    const { insertNode, deleteNode, updateNode } = useTree();

    const handleRename = (id, newName) => {
        setFileTree(updateNode(fileTree, id, newName));
        setActiveTabs(
            activeTabs.map((tab) =>
                tab.id === id ? { ...tab, name: newName } : tab
            )
        );
    };

    const handleDelete = (id) => {
        const updatedTree = deleteNode(fileTree, id);
        setFileTree(updatedTree);
        setActiveTabs(activeTabs.filter((tab) => tab.id !== id));
    };

    const handleAddFile = (parentId, fileName) => {
        const newFile = {
            id: uuidv4(),
            type: "file",
            name: fileName,
            data: "",
        };

        setFileTree(insertNode(fileTree, parentId, newFile));
    };

    const handleAddFolder = (parentId, folderName) => {
        const newFolder = {
            id: uuidv4(),
            type: "folder",
            name: folderName,
            children: [],
        };

        const updatedTree = insertNode(fileTree, parentId, newFolder);

        const sortedTree = {
            ...updatedTree,
            children: sortTreeByTypeAndName(updatedTree.children),
        };

        setFileTree(sortedTree);
    };
    return (
        <>
            <div className="px-4 pt-3 pb-2 border-b border-b-white">
                <h3 className="text-xs uppercase text-white">Explorer</h3>
            </div>
            <div className="p-2 overflow-auto h-full">
                {!fileTree ? (
                    <Entry
                        setFileTree={setFileTree}
                        setActiveTabs={setActiveTabs}
                        selectedTabId={selectedTabId}
                        setSelectedTabId={setSelectedTabId}
                        handleActiveEditorTabs={handleActiveEditorTabs}
                        MAIN_DOT_RS_ID={MAIN_DOT_RS_ID}
                        setExpandedFolderIds={setExpandedFolderIds}
                    />
                ) : (
                    <FileTree
                        handleDelete={handleDelete}
                        handleAddFile={handleAddFile}
                        handleAddFolder={handleAddFolder}
                        handleRename={handleRename}
                        fileTree={fileTree}
                        selectedTabId={selectedTabId}
                        handleActiveEditorTabs={handleActiveEditorTabs}
                        expandedFolderIds={expandedFolderIds}
                    />
                )}
            </div>
        </>
    );
}
