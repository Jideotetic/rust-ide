/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import { buildFileTreeFromInputWebKitDirectory } from "../utils/utils";

function Entry({
    handleOpenFile,
    folderInputRef,
    setFileTree,
    setLoadingFiles,
}) {
    const handleOpenFolder = async () => {
        setLoadingFiles(true);
        alert(
            "Reading files from folder… This may take a few seconds for large folders."
        );
        folderInputRef.current?.click();
    };

    const handleFolderFromInputChange = (event) => {
        const files = event.target.files;

        if (!files || files.length === 0) {
            alert("Load a project with at least one file");
            return;
        }

        // Build UI tree
        const children = buildFileTreeFromInputWebKitDirectory(files);
        setFileTree({
            id: Date.now(),
            type: "folder",
            name: files[0].webkitRelativePath.split("/")[0],
            path: "/" + files[0].webkitRelativePath.split("/")[0],
            children,
        });

        setLoadingFiles(false);
    };

    return (
        <div className="w-full h-full flex justify-center items-center flex-col gap-8">
            <div className="flex flex-col justify-center items-center gap-2 text-sm text-white">
                <div className="flex items-center justify-around px-4 py-2 gap-4">
                    <FiFilePlus className="text-8xl" />
                    <FiArrowRight className="text-4xl" />
                    <BiFolderOpen className="text-8xl" />
                </div>

                <p>
                    Open a new{" "}
                    <button
                        onClick={handleOpenFile}
                        className="text-blue-500 cursor-pointer"
                    >
                        file
                    </button>{" "}
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
