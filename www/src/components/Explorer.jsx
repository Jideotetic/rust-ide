/* eslint-disable react/prop-types */
import { useState } from "react";
import FileTree from "./FileTree";
// import filesData from "../data";
// import useTree from "../hooks/useTree";
import { virtualFS } from "../utils/virtual-file-server";

function Explorer({
    handleActiveEditorTabs,
    setActiveEditorTabs,
    activeEditorTabs,
    setSelectedTabId,
}) {
    const [fileTree, setFileTree] = useState(null);
    // const { insertNode, deleteNode, updateNode } = useTree();

    // useEffect(() => {
    //     if (!fileTree || (Array.isArray(fileTree) && fileTree.length === 0)) {
    //         const newFolder = {
    //             id: Date.now(),
    //             type: "folder",
    //             name: "welcome",
    //             children: [],
    //         };
    //         setFileTree(newFolder);
    //     }
    // }, [fileTree]);

    const handleRename = (id, newName) => {
        const renamedItem = virtualFS.rename(id, newName);
        setFileTree({ ...virtualFS.getFile("root") });
        // setFileTree(updateNode(fileTree, id, newName));
        setActiveEditorTabs(
            activeEditorTabs.map((tab) =>
                tab.id === id ? { ...tab, name: newName } : tab
            )
        );
    };

    const handleDelete = (id) => {
        virtualFS.delete(id);
        setFileTree({ ...virtualFS.getFile("root") });
        // const updatedTree = deleteNode(fileTree, id);
        // setFileTree(updatedTree);
        setActiveEditorTabs(activeEditorTabs.filter((tab) => tab.id !== id));
        if (setSelectedTabId === id) {
            setSelectedTabId(activeEditorTabs[0]?.id || null);
        }
    };

    const handleAddFile = (parentId, fileName) => {
        const newFile = virtualFS.createFile(parentId, fileName);
        setFileTree({ ...virtualFS.getFile("root") });
        // const newFile = {
        //     id: Date.now(),
        //     type: "file",
        //     name: fileName,
        //     data: "// Start typing your code here",
        // };

        // setFileTree(insertNode(fileTree, parentId, newFile));
        setActiveEditorTabs([
            ...activeEditorTabs,
            { id: newFile.id, name: newFile.name, data: newFile.content },
        ]);
        setSelectedTabId(newFile.id);
    };

    const handleAddFolder = (parentId, folderName) => {
        virtualFS.createFolder(parentId, folderName);
        // const newFolder = {
        //     id: Date.now(),
        //     type: "folder",
        //     name: folderName,
        //     children: [],
        // };
        setFileTree({ ...virtualFS.getFile("root") });

        // setFileTree(insertNode(fileTree, parentId, newFolder));
    };

    return (
        <>
            <div className="min-w-70 border-r border-r-vsdark-3 flex flex-col">
                <div className="px-4 py-2 border-b border-b-vsdark-3">
                    <h3 className="text-xs uppercase text-white">Explorer</h3>
                </div>
                <div className="p-2 overflow-auto h-full">
                    <FileTree
                        handleDelete={handleDelete}
                        handleAddFile={handleAddFile}
                        handleAddFolder={handleAddFolder}
                        handleRename={handleRename}
                        fileTree={fileTree}
                        handleCloseTab
                        handleActiveEditorTabs={handleActiveEditorTabs}
                    />
                </div>
            </div>
        </>
    );
}

export default Explorer;
