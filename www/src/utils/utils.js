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

export async function uploadInBatches(
    files,
    projectId,
    folderName,
    progressCb
) {
    const total = files.length;
    let sent = 0;

    for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
        const chunk = files.slice(i, i + MAX_BATCH_SIZE);
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                const fd = new FormData();
                fd.append("projectId", projectId);
                fd.append("folderName", folderName);
                chunk.forEach((f) => {
                    fd.append("files", f);
                    fd.append("paths", f.webkitRelativePath);
                });

                const res = await fetch(
                    "https://sorobuild-ide-backend-1.onrender.com/api/projects/upload",
                    {
                        method: "POST",
                        body: fd,
                    }
                );

                if (!res.ok) throw new Error("Batch upload failed");

                sent += chunk.length;
                progressCb(Math.round((sent / total) * 100));
                break;
            } catch (err) {
                attempt++;
                if (attempt >= MAX_RETRIES) throw err;
            }
        }
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
        "https://sorobuild-ide-backend-1.onrender.com/api/projects/create",
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
