import JSZip from "jszip";
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

export const updateUrlWithProjectId = (projectId) => {
    const url = new URL(window.location);
    url.searchParams.set("projectId", projectId);
    window.history.pushState({}, "", url);
};

export const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

export const createProjectWithFile = async (filename, content) => {
    const res = await fetch("http://localhost:4000/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            files: { [filename]: content },
        }),
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
};

export async function uploadAsZip(files, projectId, progressCb) {
    const zip = new JSZip();

    const firstFilePath = files[0].webkitRelativePath;
    const folderName = firstFilePath.split("/")[0];

    Array.from(files).forEach((file) => {
        zip.file(file.webkitRelativePath || file.name, file);
    });

    const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        progressCb(Math.round(metadata.percent * 0.9));
    });

    const formData = new FormData();
    formData.append("file", content, `${folderName}.zip`);
    try {
        const response = await fetch(
            `http://localhost:4000/api/projects/${projectId}/upload-zip`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Upload failed");
        progressCb(100);
        alert("Project created successfully");
        return response.json();
    } catch (error) {
        console.error("Zip upload failed:", error);
        alert("Zip upload failed");
    }
}
