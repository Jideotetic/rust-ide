/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";
import {
    buildFileTreeFromInputWebKitDirectory,
    createProjectWithFile,
    readFileAsText,
    updateUrlWithProjectId,
    uploadInBatches,
} from "../utils/utils";
import { useRef } from "react";

function Entry({
    setFileTree,
    setLoadingFiles,
    setUploadProgress,
    setIsUploading,
    isUploading,
}) {
    const folderInputRef = useRef();
    const fileInputRef = useRef();

    // const abortControllerRef = useRef(null);

    const handleOpenFolder = async () => {
        setLoadingFiles(true);
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

        // Build UI tree
        const rootName = files[0].webkitRelativePath.split("/")[0];

        setLoadingFiles(true);
        setUploadProgress(0);
        setIsUploading(true);

        try {
            await Promise.all([
                // Tree building
                (async () => {
                    const children =
                        buildFileTreeFromInputWebKitDirectory(files);
                    const fileTree = {
                        id: Date.now(),
                        type: "folder",
                        name: rootName,
                        path: "/" + rootName,
                        children,
                    };
                    setFileTree(fileTree);
                    setLoadingFiles(false);
                })(),

                // File uploading
                (async () => {
                    const projectInitRes = await fetch(
                        "https://sorobuild-ide-backend-1.onrender.com/api/projects/create",
                        {
                            method: "POST",
                        }
                    );

                    if (!projectInitRes.ok) {
                        throw new Error(
                            "Failed to create project...kindly retry"
                        );
                    }
                    const { projectId } = await projectInitRes.json();
                    updateUrlWithProjectId(projectId);

                    await uploadInBatches(
                        files,
                        projectId,
                        rootName,
                        (percent) => setUploadProgress(percent)
                    );

                    alert(`Project created successfully!`);
                    setIsUploading(false);
                })(),
            ]);
        } catch (err) {
            if (err.name === "AbortError") {
                alert("Project creation cancelled");
            } else {
                console.error("Failed to create project successfully:", err);
                alert("Failed to create project successfully...kindly retry");
            }
            setIsUploading(false);
            setLoadingFiles(false);
        }

        // const treePromise = (async () => {
        //     const children = buildFileTreeFromInputWebKitDirectory(files);
        //     const fileTree = {
        //         id: Date.now(),
        //         type: "folder",
        //         name: rootName,
        //         path: "/" + rootName,
        //         children,
        //     };
        //     setFileTree(fileTree);
        //     setLoadingFiles(false);
        // })();

        // const uploadPromise = (async () => {
        //     setUploadProgress(0);
        //     setIsUploading(true);
        //     // abortControllerRef.current = new AbortController();

        //     try {
        //         // Create the project metadata
        //         const projectInitRes = await fetch(
        //             "http://localhost:4000/api/projects/create",
        //             {
        //                 method: "POST",
        //                 headers: { "Content-Type": "application/json" },
        //                 // body: JSON.stringify({ folderName: rootName }),
        //                 // signal: abortControllerRef.current.signal,
        //             }
        //         );

        //         if (!projectInitRes.ok) {
        //             throw new Error("Failed to create project...kindly retry");
        //         }
        //         const { projectId } = await projectInitRes.json();
        //         updateUrlWithProjectId(projectId);

        //         // Upload files in batches
        //         await uploadInBatches(files, projectId, rootName, (percent) =>
        //             setUploadProgress(percent)
        //         );

        //         alert(`Project created successful!`);
        //         setIsUploading(false);
        //     } catch (err) {
        //         if (err.name === "AbortError") {
        //             alert("Project creation cancelled");
        //         } else {
        //             console.error(
        //                 "Failed to create project successfully:",
        //                 err
        //             );
        //             alert(
        //                 "Failed to create project successfully...kindly retry"
        //             );
        //         }
        //     }
        // })();

        // await treePromise;
    };

    const handleOpenFile = async () => {
        setLoadingFiles(true);
        fileInputRef.current?.click();
    };

    const handleFileFromInputChange = async (event) => {
        const files = Array.from(event.target.files);

        if (!files || files.length === 0) {
            alert("Load a project with at least one file");
            return;
        }

        setLoadingFiles(false);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const file = files[0];
            const content = await readFileAsText(file);
            const { projectId } = await createProjectWithFile(
                file.name,
                content
            );

            const fileTree = {
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

            setFileTree(fileTree);
            updateUrlWithProjectId(projectId);
            alert("File uploaded successfully!");
        } catch (error) {
            console.error("File upload failed:", error);
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            setLoadingFiles(false);
            setIsUploading(false);
        }
    };

    // const cancel = () => abortControllerRef.current.abort();

    return (
        <div className="w-full h-full flex justify-center items-center flex-col gap-8">
            <div className="flex flex-col justify-center items-center gap-2 text-sm text-white">
                <div className="flex items-center justify-around px-4 py-2 gap-4">
                    <FiFilePlus className="text-8xl" />
                    <FiArrowRight className="text-4xl" />
                    <BiFolderOpen className="text-8xl" />
                </div>

                {/* <button onClick={cancel}>Cancel Upload</button> */}

                <p>
                    Open a new{" "}
                    <button
                        onClick={handleOpenFile}
                        className="text-blue-500 cursor-pointer"
                        disabled={isUploading}
                    >
                        file
                    </button>{" "}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileFromInputChange}
                    />
                    or{" "}
                    <button
                        onClick={handleOpenFolder}
                        className="text-blue-500 cursor-pointer"
                        disabled={isUploading}
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
