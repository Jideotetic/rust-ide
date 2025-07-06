/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import { useRef } from "react";
import {
    buildFileTreeFromInputWebKitDirectory,
    findFileInSrcFolder,
    findFirstFile,
    findFirstRsFile,
    getFolderNameFromWebkitRelativePath,
    updateUrlWithProjectId,
    uploadAsZip,
} from "../utils/utils";
import { v4 as uuidv4 } from "uuid";

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
        try {
            const files = Array.from(event.target.files);

            if (!files || files.length === 0) {
                alert("Load a project with at least one file");
                return;
            }

            // Get the folder name
            const folderName = getFolderNameFromWebkitRelativePath(files[0]);

            // Build file tree
            const children = buildFileTreeFromInputWebKitDirectory(files);
            const tree = {
                id: uuidv4(),
                type: "folder",
                name: folderName,
                path: "/" + folderName,
                children,
            };
            setFileTree(tree);

            // Find the first file to open
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

                // Remove the default main.rs tab if it exists
                setActiveTabs((tabs) => {
                    const filteredOutDefaultMain = tabs.filter(
                        (tab) => tab.id !== MAIN_DOT_RS_ID
                    );
                    if (selectedTabId === MAIN_DOT_RS_ID) {
                        setSelectedTabId(fileToOpen.id);
                    }
                    return filteredOutDefaultMain;
                });
            }

            alert(`Uploading ${folderName} folder...`);

            const res = await uploadAsZip(files);

            updateUrlWithProjectId(res.projectId);

            alert(`${folderName} uploaded successfully`);
        } catch (err) {
            console.error("Upload failed:", err);
            alert(`Upload failed...Kindly retry`);
        }
    };

    const handleOpenFile = async () => {
        fileInputRef.current?.click();
    };

    const handleFileFromInputChange = async (event) => {
        try {
            const files = Array.from(event.target.files);

            if (!files || files.length === 0) {
                alert("Load a project with at least one file");
                return;
            }

            const children = files.map((file) => ({
                id: uuidv4(),
                type: "file",
                name: file.name,
                path: `/${file.name}`,
                file,
            }));

            const tree = {
                id: uuidv4(),
                type: "folder",
                name: "New Folder",
                path: "/New Folder",
                children,
            };
            setFileTree(tree);

            // Find the first file to open
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

                // Remove the default main.rs tab if it exists
                setActiveTabs((tabs) => {
                    const filteredOutDefaultMain = tabs.filter(
                        (tab) => tab.id !== MAIN_DOT_RS_ID
                    );
                    if (selectedTabId === MAIN_DOT_RS_ID) {
                        setSelectedTabId(fileToOpen.id);
                    }
                    return filteredOutDefaultMain;
                });
            }

            alert(`Uploading files...`);

            const res = await uploadAsZip(files);

            updateUrlWithProjectId(res.projectId);

            alert(`Files uploaded successfully`);
        } catch (error) {
            console.error("Upload failed:", error);
            alert(`Upload failed...Kindly retry`);
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
