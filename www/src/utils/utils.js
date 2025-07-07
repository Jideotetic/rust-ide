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
                        fullPath: file.webkitRelativePath,
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
                        fullPath: file.webkitRelativePath,
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

export const removeProjectIdFromUrl = () => {
    const url = new URL(window.location);
    url.searchParams.delete("projectId");
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
    const res = await fetch(
        `${import.meta.env.VITE_BASE_URL}/api/projects/create`,
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

export async function uploadAsZip(files) {
    try {
        const zip = new JSZip();

        const folderName = getFolderNameFromWebkitRelativePath(files[0]);

        // Add files to the zip
        Array.from(files).forEach((file) => {
            zip.file(file.webkitRelativePath || file.name, file);
        });

        const content = await zip.generateAsync({ type: "blob" });

        const formData = new FormData();
        formData.append(
            "file",
            content,
            `${folderName ? folderName : "New Folder"}.zip`
        );

        const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/api/projects/upload-zip`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Upload failed");

        return response.json();
    } catch (error) {
        console.error("Upload failed:", error);
        alert(`Upload failed...Kindly retry`);
    }
}

export async function downloadProjectAsZip(projectId) {
    try {
        const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/api/projects/${projectId}/load`
        );

        if (response.status === 404) {
            alert("No project found...Kindly upload a project");
            removeProjectIdFromUrl();
            return null;
        }

        if (!response.ok) {
            throw new Error(`${response.statusText}`);
        }

        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);

        const extractedFiles = {};

        await Promise.all(
            Object.keys(zip.files).map(async (filename) => {
                const file = zip.files[filename];
                if (!file.dir) {
                    const content = await file.async("string");
                    const cleanPath = filename.replace(
                        new RegExp(`^${projectId}/?`),
                        ""
                    );
                    extractedFiles[cleanPath] = content;
                }
            })
        );

        return buildTreeFromFiles(extractedFiles, projectId);
    } catch (err) {
        console.error("Failed to download project", err);
        alert(`Failed to load project`);
    }
}

export function buildTreeFromFiles(files, projectId) {
    const root = {
        id: uuidv4(),
        type: "folder",
        name: "New Folder",
        children: [],
        handle: null,
    };

    for (const [filePath, content] of Object.entries(files)) {
        const parts = filePath.split("/").filter(Boolean);
        let currentLevel = root.children;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            let node = currentLevel.find((item) => item.name === part);

            if (!node) {
                node = {
                    id: `${projectId}-${filePath}-${index}`,
                    name: part,
                    type: isFile ? "file" : "folder",
                    path: parts.slice(0, index + 1).join("/"),
                    data: isFile ? content : undefined,
                    children: isFile ? undefined : [],
                };
                currentLevel.push(node);
            }

            if (!isFile) {
                currentLevel = node.children;
            }
        });
    }

    sortTreeByTypeAndName(root.children);

    return root.children.length === 1 ? root.children[0] : root;
}

export async function populateFileTreeWithData(node) {
    if (node.type === "folder") {
        for (const child of node.children || []) {
            await populateFileTreeWithData(child);
        }
    } else if (node.type === "file" && !node.data) {
        // Read content only if not already present
        node.data = await node.file.text(); // Assumes File API
    }
}

export async function zipFileTree(fileTree) {
    const zip = new JSZip();

    const addNodeToZip = async (node, parentPath = "") => {
        const currentPath = parentPath
            ? `${parentPath}/${node.name}`
            : node.name;

        if (node.type === "folder") {
            for (const child of node.children || []) {
                await addNodeToZip(child, currentPath);
            }
        } else if (node.type === "file") {
            const content = node.data ?? "";
            zip.file(currentPath, content);
        }
    };

    await addNodeToZip(fileTree);
    return zip;
}

export async function uploadAsZipForBuild(fileTree) {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        throw new Error("No project ID provided");
    }

    await populateFileTreeWithData(fileTree);

    const zip = await zipFileTree(fileTree);
    const content = await zip.generateAsync({ type: "blob" });

    const rootFolderName = fileTree.name || "New Folder";

    const formData = new FormData();
    formData.append("file", content, `${rootFolderName}.zip`);
    try {
        const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/api/projects/${projectId}/build`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Build failed");
        alert("Build successful");
        return response.json();
    } catch (error) {
        console.error("Build failed", error);
        alert("Build failed...kindly try again");
    }
}

export async function uploadAsZipForDB(fileTree) {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        throw new Error("No project ID provided");
    }

    await populateFileTreeWithData(fileTree);

    const zip = await zipFileTree(fileTree);
    const content = await zip.generateAsync({ type: "blob" });

    const rootFolderName = fileTree.name || "New Folder";

    const formData = new FormData();
    formData.append("file", content, `${rootFolderName}.zip`);
    try {
        const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/api/projects/${projectId}/update`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Upload failed");

        return response.json();
    } catch (error) {
        console.error("Upload failed", error);
        alert("Upload failed...kindly try again");
    }
}

export async function uploadAsZipForTest(fileTree) {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        throw new Error("No project ID provided");
    }

    await populateFileTreeWithData(fileTree);

    const zip = await zipFileTree(fileTree);
    const content = await zip.generateAsync({ type: "blob" });

    const rootFolderName = fileTree.name || "New Folder";

    const formData = new FormData();
    formData.append("file", content, `${rootFolderName}.zip`);
    try {
        const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/api/projects/${projectId}/test`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) throw new Error("Test failed");
        alert("Test successful");
        return response.json();
    } catch (error) {
        console.error("Test failed", error);
        alert("Test failed...kindly try again");
    }
}

export const findFilePathById = (node, id) => {
    if (node.id === id) {
        return node.fullPath || node.path || null;
    }

    if (node.children) {
        for (const child of node.children) {
            const result = findFilePathById(child, id);
            if (result) return result;
        }
    }

    return null;
};

export const getProjectIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("projectId");
};

export const findFileNodeById = (node, id) => {
    if (!node) return null;

    if (node.id === id) {
        return node;
    }

    if (node.children) {
        for (const child of node.children) {
            const result = findFileNodeById(child, id);
            if (result) return result;
        }
    }

    return null;
};

export const findFirstRsFile = (node) => {
    if (!node) return null;

    if (node.type === "file" && node.name.endsWith(".rs")) {
        return node;
    }

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const found = findFirstRsFile(child);
            if (found) return found;
        }
    }

    return null;
};

export const findFileInSrcFolder = (node) => {
    if (!node || !node.children) return null;

    const srcFolder = node.children.find(
        (child) => child.type === "folder" && child.name === "src"
    );

    if (srcFolder && srcFolder.children) {
        return findFirstRsFile(srcFolder);
    }

    return null;
};

export const findFirstFile = (node) => {
    if (!node) return null;

    if (node.type === "file") return node;

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const found = findFirstFile(child);
            if (found) return found;
        }
    }

    return null;
};

export const getFolderNameFromWebkitRelativePath = (path) => {
    return path.webkitRelativePath.split("/")[0];
};

export const closeDefaultMainTab = async (
    tree,
    handleActiveEditorTabs,
    setActiveTabs,
    selectedTabId,
    setSelectedTabId,
    MAIN_DOT_RS_ID
) => {
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
};
