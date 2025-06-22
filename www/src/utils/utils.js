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

    return children;
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

const handleFileClick = async (fileNode) => {
    if (fileNode.type !== "file" || !fileNode.file) return;

    try {
        const content = await fileNode.file.text(); // read text content
        setFileContent(content);
        setSelectedFileName(fileNode.name);
    } catch (err) {
        console.error("Failed to read file:", err);
        alert("Failed to read file content");
    }
};

async () => {
    if (fileNode.type === "file" && fileNode.file) {
        const content = await fileNode.file.text(); // read actual text
        handleActiveEditorTabs(fileNode.id, fileNode.name, content);
    }
};
