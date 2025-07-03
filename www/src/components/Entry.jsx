/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import { useRef } from "react";
import { buildFileTreeFromInputWebKitDirectory } from "../utils/utils";

function Entry({ setFileTree, setLoadingFiles }) {
    const folderInputRef = useRef();
    const fileInputRef = useRef();

    const handleOpenFolder = () => {
        alert(
            "Reading files from folder… This may take a few seconds for large folders."
        );
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

            alert(`${rootName} folder uploaded successfully`);
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
            setLoadingFiles(true);
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
            setLoadingFiles(false);
            alert(`${file.name} file uploaded successfully!`);
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
