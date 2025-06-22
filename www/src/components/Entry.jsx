/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import {
    buildFileTreeFromInputWebKitDirectory,
    updateUrlWithProjectId,
} from "../utils/utils";
import { useRef } from "react";

function Entry({ handleOpenFile, setFileTree, setLoadingFiles }) {
    const folderInputRef = useRef();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const abortControllerRef = useRef(null);

    const handleOpenFolder = async () => {
        setLoadingFiles(true);
        alert(
            "Reading files from folder… This may take a few seconds for large folders."
        );
        folderInputRef.current?.click();
    };

    const handleFolderFromInputChange = async (event) => {
        const files = event.target.files;

        console.log(files);

        if (!files || files.length === 0) {
            alert("Load a project with at least one file");
            return;
        }

        // Build UI tree
        const rootName = files[0].webkitRelativePath.split("/")[0];

        const treePromise = (async () => {
            const children = buildFileTreeFromInputWebKitDirectory(files);
            const fileTree = {
                id: Date.now(),
                type: "folder",
                name: rootName,
                path: "/" + rootName,
                children,
            };
            setFileTree(fileTree);
            setLoadingFiles(false); // Immediate UI feedback
        })();

        const uploadPromise = (async () => {
            setUploadProgress(0);
            setIsUploading(true);
            abortControllerRef.current = new AbortController();

            try {
                // Create the project metadata
                const projectInitRes = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ files: rootName }),
                    signal: abortControllerRef.current.signal,
                });

                if (!projectInitRes.ok)
                    throw new Error("Failed to sync project...kindly retry");
                const { projectId } = await projectInitRes.json();
                updateUrlWithProjectId(projectId);

                // Upload files in batches
                await uploadFilesInBatches(files, projectId);

                alert(`Project created successfully! ID: ${projectId}`);
            } catch (err) {
                console.error("Upload error:", err);
                alert("Failed to upload project");
            }
        })();

        await treePromise;
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
