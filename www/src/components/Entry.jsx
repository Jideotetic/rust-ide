/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import { useRef } from "react";
import {
    buildFileTreeFromInputWebKitDirectory,
    findFileInSrcFolder,
    findFirstFile,
    findFirstRsFile,
    updateUrlWithProjectId,
    uploadAsZip,
} from "../utils/utils";

function Entry({
    setFileTree,
    setActiveTabs,
    selectedTabId,
    handleActiveEditorTabs,
    MAIN_DOT_RS_ID,
    setSelectedTabId,
}) {
    const folderInputRef = useRef();
    const fileInputRef = useRef();

    const handleOpenFolder = () => {
        folderInputRef.current?.click();
    };

    const handleFolderFromInputChange = async (event) => {
        const files = Array.from(event.target.files);

        if (!files || files.length === 0) {
            alert("Load a project with at least one file");
            return;
        }

        const rootName = files[0].webkitRelativePath.split("/")[0];

        try {
            const children = buildFileTreeFromInputWebKitDirectory(files);
            const tree = {
                id: Date.now(),
                type: "folder",
                name: rootName,
                path: "/" + rootName,
                children,
            };

            setFileTree(tree);

            const fileInSrc = findFileInSrcFolder(tree);
            const fallbackRsFile = findFirstRsFile(tree);
            const firstFile = findFirstFile(tree);

            const fileToOpen = fileInSrc || fallbackRsFile || firstFile;

            if (fileToOpen) {
                await handleActiveEditorTabs(
                    fileToOpen.id,
                    fileToOpen.name,
                    fileToOpen.data,
                    tree
                );

                setActiveTabs((tabs) => {
                    const withoutMain = tabs.filter(
                        (tab) => tab.id !== MAIN_DOT_RS_ID
                    );
                    if (selectedTabId === MAIN_DOT_RS_ID) {
                        setSelectedTabId(fileToOpen.id);
                    }
                    return withoutMain;
                });
            }

            alert(`${rootName} folder uploaded successfully`);

            const res = await uploadAsZip(files);

            console.log("Folder upload response:", res);

            updateUrlWithProjectId(res.projectId);
        } catch (err) {
            console.error("Folder upload failed:", err);
            alert(`Folder upload failed: ${err.message}`);
        }
    };

    const handleOpenFile = async () => {
        fileInputRef.current?.click();
    };

    const handleFileFromInputChange = async (event) => {
        const files = Array.from(event.target.files);

        if (!files || files.length === 0) {
            alert("Load a project with at least one file");
            return;
        }

        try {
            const file = files[0];

            const tree = {
                id: Date.now(),
                type: "folder",
                name: "New Folder",
                path: "/New Folder",
                children: [
                    {
                        id: Date.now() + 1,
                        type: "file",
                        name: file.name,
                        path: `/${file.name}`,
                        file,
                    },
                ],
            };

            setFileTree(tree);
            const fileInSrc = findFileInSrcFolder(tree);
            const fallbackRsFile = findFirstRsFile(tree);
            const firstFile = findFirstFile(tree);

            const fileToOpen = fileInSrc || fallbackRsFile || firstFile;

            console.log("File to open:", fileToOpen);

            if (fileToOpen) {
                await handleActiveEditorTabs(
                    fileToOpen.id,
                    fileToOpen.name,
                    fileToOpen.data,
                    tree
                );

                setActiveTabs((tabs) => {
                    const withoutMain = tabs.filter(
                        (tab) => tab.id !== MAIN_DOT_RS_ID
                    );
                    if (selectedTabId === MAIN_DOT_RS_ID) {
                        setSelectedTabId(fileToOpen.id);
                    }
                    return withoutMain;
                });
            }

            alert(`${file.name} file uploaded successfully!`);

            const res = await uploadAsZip(files);

            console.log("Folder upload response:", res);

            updateUrlWithProjectId(res.projectId);
        } catch (error) {
            console.error("File upload failed:", error);
            alert(`File upload failed: ${error.message}`);
        }
    };

    return (
        <div className="w-full h-full flex justify-center items-center flex-col gap-8">
            <div className="flex flex-col justify-center items-center gap-2 text-sm text-white">
                <div className="flex items-center justify-around px-4 py-2 gap-4">
                    <FiFilePlus className="text-7xl" />
                    <FiArrowRight className="text-4xl" />
                    <BiFolderOpen className="text-7xl" />
                </div>

                <p>
                    Open a new{" "}
                    <button
                        onClick={handleOpenFile}
                        className="text-blue-500 cursor-pointer"
                    >
                        file
                    </button>{" "}
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        onChange={handleFileFromInputChange}
                    />
                    or{" "}
                    <button
                        onClick={handleOpenFolder}
                        className="text-blue-500 cursor-pointer"
                    >
                        folder
                    </button>{" "}
                    <input
                        type="file"
                        ref={folderInputRef}
                        webkitdirectory="true"
                        className="hidden"
                        onChange={handleFolderFromInputChange}
                    />
                    to get started.
                </p>
            </div>
        </div>
    );
}

export default Entry;
