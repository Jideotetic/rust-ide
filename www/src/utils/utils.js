import JSZip from "jszip";
import PQueue from "p-queue";
import { v4 as uuidv4 } from "uuid";
export const generateId = () => uuidv4();

export const buildFileTreeFromInputWebKitDirectory = (files) => {
    const children = [];

    for (const file of files) {
        const parts = file.webkitRelativePath.split("/");

        let current = children;
        let currentPath = "";

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            currentPath += "/" + part;

            let existing = current.find((child) => child.name === part);

            if (i === parts.length - 1) {
                if (!existing) {
                    current.push({
                        id: generateId(),
                        type: "file",
                        name: part,
                        path: currentPath,
                        file,
                        handle: file,
                    });
                }
            } else {
                if (!existing) {
                    existing = {
                        id: generateId(),
                        type: "folder",
                        name: part,
                        path: currentPath,
                        children: [],
                    };
                    current.push(existing);
                }
                current = existing.children;
            }
        }
    }

    return sortTreeByTypeAndName(children);
};

export const sortTreeByTypeAndName = (nodes) => {
    nodes.sort((a, b) => {
        // Folders first
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;

        // Then sort alphabetically
        return a.name.localeCompare(b.name);
    });

    // Recursively sort children if it's a folder
    for (const node of nodes) {
        if (node.type === "folder" && node.children) {
            sortTreeByTypeAndName(node.children);
        }
    }

    return nodes;
};

export const buildFileTreeFromFileSystemApi = async (dirHandle, path = "") => {
    const tree = [];
    for await (const [name, handle] of dirHandle.entries()) {
        const id = generateId();
        const entry = {
            id,
            type: handle.kind === "directory" ? "folder" : "file",
            name,
            path: path + "/" + name,
            handle,
        };

        if (handle.kind === "directory") {
            entry.children = await buildFileTreeFromFileSystemApi(
                handle,
                path + "/" + name
            );
        }

        tree.push(entry);
        // if (handle.kind === "file") {
        //     tree.push({
        //         id,
        //         type: "file",
        //         name,
        //         path: path + "/" + name,
        //         handle,
        //         data: await (await handle.getFile()).text(),
        //     });
        // } else if (handle.kind === "directory") {
        //     tree.push({
        //         id,
        //         type: "folder",
        //         name,
        //         path: path + "/" + name,
        //         handle,
        //         children: await readDirectoryTree(
        //             handle,
        //             path + "/" + name
        //         ),
        //     });
        // }
    }
    return tree;
};

export const updateUrlWithProjectId = (projectId) => {
    const url = new URL(window.location);
    url.searchParams.set("projectId", projectId);
    window.history.pushState({}, "", url);
};

const MAX_BATCH_SIZE = 20;
const MAX_RETRIES = 3;

export async function uploadInBatches(files, projectId, progressCb) {
    const total = files.length;
    let sent = 0;

    for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
        const chunk = files.slice(i, i + MAX_BATCH_SIZE);
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                await Promise.all(
                    chunk.map(async (file) => {
                        const content = await file.text();
                        const path = file.webkitRelativePath;

                        const res = await fetch(
                            `https://sorobuild-ide-backend.fly.dev/api/projects/${projectId}/files`,
                            {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    path: path,
                                    content,
                                }),
                            }
                        );

                        if (!res.ok) throw new Error("File upload failed");
                    })
                );

                sent += chunk.length;
                progressCb(Math.round((sent / total) * 100));
                break;
            } catch (err) {
                attempt++;
                if (attempt >= MAX_RETRIES) throw err;
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * attempt)
                );
            }
        }
    }
}

export async function uploadFiles(files, projectId, progressCb) {
    const formData = new FormData();
    formData.append("projectId", projectId);

    // Add all files with their paths
    files.forEach((file) => {
        formData.append("paths[]", file.webkitRelativePath);
        formData.append("files", file);
    });

    const xhr = new XMLHttpRequest();

    // Progress tracking
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressCb(percent);
        }
    };

    return new Promise((resolve, reject) => {
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(new Error("Upload failed"));
            }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open(
            "POST",
            "https://sorobuild-ide-backend.fly.dev/api/projects/upload-files",
            true
        );
        xhr.send(formData);
    });
}

export async function uploadInChunks(files, projectId, progressCb) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const MAX_RETRIES = 3;
    const PARALLEL_UPLOADS = 3; // Limit concurrent uploads

    const uploadQueue = new PQueue({ concurrency: PARALLEL_UPLOADS });
    let uploadedBytes = 0;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    const uploadFile = async (file, attempt = 0) => {
        try {
            const fileKey = `${projectId}/${file.webkitRelativePath}`;
            const chunkCount = Math.ceil(file.size / CHUNK_SIZE);

            for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(file.size, start + CHUNK_SIZE);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append("fileKey", fileKey);
                formData.append("chunkIndex", chunkIndex);
                formData.append("chunkCount", chunkCount);
                formData.append("chunk", chunk);
                formData.append("projectId", projectId);

                const res = await fetch(
                    "https://sorobuild-ide-backend.fly.dev/api/upload-chunk",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (!res.ok) throw new Error("Chunk upload failed");

                uploadedBytes += end - start;
                progressCb(Math.round((uploadedBytes / totalBytes) * 100));
            }

            // Finalize file
            await fetch(
                "https://sorobuild-ide-backend.fly.dev/api/finalize-file",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileKey, projectId }),
                }
            );
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
                return uploadFile(file, attempt + 1);
            }
            throw error;
        }
    };

    try {
        await Promise.all(
            files.map((file) => uploadQueue.add(() => uploadFile(file)))
        );
    } catch (error) {
        console.error("Upload failed:", error);
        throw error;
    }
}

export const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

export const createProjectWithFile = async (filename, content) => {
    const res = await fetch(
        "https://sorobuild-ide-backend.fly.dev/api/projects/create",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                files: { [filename]: content },
            }),
        }
    );
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
};

export async function uploadAsZip(files, projectId, progressCb) {
    // try {
    const zip = new JSZip();

    const firstFilePath = files[0].webkitRelativePath;
    const folderName = firstFilePath.split("/")[0];

    Array.from(files).forEach((file) => {
        zip.file(file.webkitRelativePath || file.name, file);
    });

    const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        progressCb(Math.round(metadata.percent * 0.9));
    });

    console.log(content);

    const formData = new FormData();
    formData.append("file", content, `${folderName}.zip`);
    try {
        const response = await fetch(
            `https://sorobuild-ide-backend.fly.dev/api/projects/${projectId}/upload-zip`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Upload failed");
        progressCb(100);
        return response.json();
    } catch (error) {
        console.error("Zip upload failed:", error);
        throw error;
    }

    //     await Promise.all(
    //         files.map(async (file) => {
    //             const content = await file.text();
    //             zip.file(file.webkitRelativePath, content);
    //         })
    //     );

    //     const zipContent = await zip.generateAsync(
    //         { type: "blob" },
    //         (metadata) => {
    //             progressCb(Math.round(metadata.percent * 0.9));
    //         }
    //     );

    //     const formData = new FormData();
    //     formData.append("zip", zipContent, `${folderName}.zip`);
    //     formData.append("projectId", projectId);

    //     const response = await fetch(
    //         `https://sorobuild-ide-backend.fly.dev/api/projects/${projectId}/upload-zip`,
    //         {
    //             method: "POST",
    //             body: formData,
    //         }
    //     );

    //     if (!response.ok) throw new Error("Upload failed");
    //     progressCb(100);
    //     return response.json();
    // } catch (error) {
    //     console.error("Zip upload failed:", error);
    //     throw error;
    // }
}

// export const uploadFilesRecursively = async (
//     dirHandle,
//     projectId,
//     path = ""
// ) => {
//     for await (const [name, handle] of dirHandle.entries()) {
//         const currentPath = path ? `${path}/${name}` : name;

//         if (handle.kind === "file") {
//             try {
//                 const file = await handle.getFile();
//                 const content = await file.text();

//                 await fetch(
//                     `https://sorobuild-ide-backend.fly.dev/api/projects/${projectId}/files`,
//                     {
//                         method: "PUT",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify({
//                             path: currentPath,
//                             content,
//                         }),
//                     }
//                 );
//             } catch (error) {
//                 console.error(`Error uploading ${currentPath}:`, error);
//             }
//         } else if (handle.kind === "directory") {
//             await uploadFilesRecursively(handle, projectId, currentPath);
//         }
//     }
// };
