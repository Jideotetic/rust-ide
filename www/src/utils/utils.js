import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
export const generateId = () => uuidv4();
import * as monaco from "monaco-editor";

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
            `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/upload-zip`,
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

export const getRustModel = (uri) =>
    monaco.editor.getModel(uri) ?? monaco.editor.createModel("", "rust", uri);

// const loadProject = useCallback(async () => {
//     try {
//         setLoadingFiles(true);

//         const projectId = getProjectIdFromUrl();

//         const res = await fetch(
//             `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/download`
//         );

//         if (!res.ok) throw new Error("Failed to load project");

//         const blob = await res.blob();
//         const zip = await JSZip.loadAsync(blob);

//         const extractedFiles = {};
//         await Promise.all(
//             Object.keys(zip.files).map(async (filename) => {
//                 const file = zip.files[filename];
//                 if (!file.dir) {
//                     const content = await file.async("string");
//                     const cleanPath = filename.replace(
//                         new RegExp(`^${projectId}/?`),
//                         ""
//                     );
//                     extractedFiles[cleanPath] = content;
//                 }
//             })
//         );

//         const buildTree = (files) => {
//             const root = {
//                 id: Date.now(),
//                 type: "folder",
//                 name: "",
//                 children: [],
//                 handle: null,
//             };

//             Object.entries(files).forEach(([filePath, content]) => {
//                 const parts = filePath.split("/").filter(Boolean);
//                 let currentLevel = root.children;

//                 parts.forEach((part, index) => {
//                     const existing = currentLevel.find(
//                         (item) => item.name === part
//                     );
//                     if (existing) {
//                         currentLevel = existing.children || [];
//                     } else {
//                         const isFile = index === parts.length - 1;
//                         const newNode = {
//                             id: `${projectId}-${filePath}-${index}`,
//                             type: isFile ? "file" : "folder",
//                             name: part,
//                             path: parts.slice(0, index + 1).join("/"),
//                             fullPath: filePath,
//                             data: isFile ? content : undefined,
//                             children: isFile ? undefined : [],
//                         };
//                         currentLevel.push(newNode);
//                         if (!isFile) {
//                             currentLevel = newNode.children;
//                         }
//                     }
//                 });
//             });

//             return root.children.length === 1
//                 ? sortTreeByTypeAndName([root.children[0]])[0]
//                 : {
//                       ...root,
//                       children: sortTreeByTypeAndName(root.children),
//                   };
//         };

//         const extractedTree = buildTree(extractedFiles);
//         setFileTree(extractedTree);

//         setLoadingFiles(false);
//         setResult("Build successful");
//         alert("Project loaded successfully");
//     } catch (error) {
//         console.error("Error compiling contract:", error);

//         const message =
//             error instanceof Error ? error.message : JSON.stringify(error);

//         alert(message);
//         setResult(message);
//         setBuilding(false);
//         setLoadingFiles(false);
//     }
// }, []);

// useEffect(() => {
//     const projectId = getProjectIdFromUrl();
//     if (projectId) {
//         loadProject(projectId);
//     }
// }, [loadProject]);

// useEffect(() => {
//     if (!monacoEditor || !selectedTabId) {
//         return;
//     }

//     const activeFile = activeEditorTabs.find(
//         (tab) => tab.id === selectedTabId
//     );
//     if (activeFile) {
//         const currentContent = monacoEditor.getValue();
//         if (currentContent !== activeFile.content) {
//             monacoEditor.setValue(activeFile.content || "");
//             setEditorContent(activeFile.content || "");
//         }
//     }
// }, [selectedTabId, activeEditorTabs, monacoEditor]);

// const handleSave = useCallback(async () => {
//     setSaving(true);
//     if (!selectedTabId || !monacoEditor || loadingFiles) return;

//     const projectId = getProjectIdFromUrl();

//     const content = monacoEditor.getValue();
//     setEditorContent(content);

//     const activeFile = activeEditorTabs.find(
//         (tab) => tab.id === selectedTabId
//     );
//     if (!activeFile || !activeFile.path) {
//         console.log("Missing file path:", activeFile);
//         alert("File path not found. Cannot save.");
//         setSaving(false);
//         return;
//     }

//     try {
//         const res = await fetch(
//             `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/save`,
//             {
//                 method: "PUT",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     path: activeFile.path,
//                     content,
//                 }),
//             }
//         );

//         if (!res.ok) {
//             throw new Error("Failed to save file.");
//         }

//         const result = await res.json();
//         const formattedContent = result.content;

//         // Update the Monaco editor and state with formatted content
//         monacoEditor.setValue(formattedContent);
//         setEditorContent(formattedContent);

//         setActiveEditorTabs((tabs) =>
//             tabs.map((tab) =>
//                 tab.id === selectedTabId
//                     ? { ...tab, content: formattedContent }
//                     : tab
//             )
//         );
//     } catch (error) {
//         console.error("Save error:", error);
//         alert("Failed to save file.");
//     } finally {
//         setSaving(false);
//     }
// }, [selectedTabId, monacoEditor, activeEditorTabs, loadingFiles]);

// useEffect(() => {
//     const handleBeforeUnload = (e) => {
//         if (hasBuilt) {
//             e.preventDefault();
//             e.returnValue =
//                 "You have unsaved changes. Are you sure you want to leave?";
//             return e.returnValue;
//         }
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);
//     return () => {
//         window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
// }, [hasBuilt]);

// useEffect(() => {
//     const handleRouteChange = () => {
//         if (
//             hasUnsavedChanges &&
//             !window.confirm(
//                 "You have unsaved changes. Are you sure you want to leave?"
//             )
//         ) {
//             throw "Route change aborted by user";
//         }
//     };

//     // If using React Router:
//     // const unblock = history.block(handleRouteChange);

//     // For general navigation:
//     window.addEventListener("popstate", handleRouteChange);

//     return () => {
//         // if (unblock) unblock();
//         window.removeEventListener("popstate", handleRouteChange);
//     };
// }, [hasUnsavedChanges]);

// useEffect(() => {
//     const handleKeyPress = (event) => {
//         if (
//             !loadingFiles &&
//             (event.ctrlKey || event.metaKey) &&
//             (event.key === "s" || event.key === "S")
//         ) {
//             event.preventDefault();
//             handleSave();
//         }
//     };

//     document.addEventListener("keydown", handleKeyPress);

//     return () => {
//         document.removeEventListener("keydown", handleKeyPress);
//     };
// }, [handleSave, loadingFiles]);

// const generateZipFromFileTree = useCallback(async () => {
//     const zip = new JSZip();

//     // Recursive function to add files to ZIP
//     const addFilesToZip = (node, currentPath = "") => {
//         const nodePath = currentPath
//             ? `${currentPath}/${node.name}`
//             : node.name;

//         if (node.type === "file") {
//             zip.file(nodePath, node.data || "");
//         } else if (node.children) {
//             node.children.forEach((child) =>
//                 addFilesToZip(child, nodePath)
//             );
//         }
//     };

//     if (fileTree) {
//         addFilesToZip(fileTree);
//         return await zip.generateAsync({ type: "blob" });
//     }
//     return null;
// }, [fileTree]);

// const handleDownloadProject = useCallback(async () => {
//     try {
//         setDownloading(true);
//         const projectId = getProjectIdFromUrl() || "project";
//         const zipBlob = await generateZipFromFileTree();

//         if (!zipBlob) {
//             throw new Error("No files to download");
//         }

//         const url = window.URL.createObjectURL(zipBlob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `${projectId}-${new Date()
//             .toISOString()
//             .slice(0, 10)}.zip`;
//         document.body.appendChild(a);
//         a.click();
//         window.URL.revokeObjectURL(url);
//         document.body.removeChild(a);
//         setDownloading(false);
//     } catch (error) {
//         console.error("Download failed:", error);
//         alert("Failed to create download: " + error.message);
//         setDownloading(false);
//     }
// }, [generateZipFromFileTree]);

// const handleBuild = useCallback(async () => {
//     console.log("Building contract...");

//     if (!monacoEditor) return;

//     const projectId = getProjectIdFromUrl();

//     setBuilding(true);
//     try {
//         const res = await fetch(
//             `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/build`,
//             {
//                 method: "POST",
//             }
//         );

//         if (!res.ok) {
//             throw new Error(await res.text());
//         }

//         const blob = await res.blob();
//         const zip = await JSZip.loadAsync(blob);

//         const extractedFiles = {};
//         await Promise.all(
//             Object.keys(zip.files).map(async (filename) => {
//                 const file = zip.files[filename];
//                 if (!file.dir) {
//                     const content = await file.async("string");
//                     const cleanPath = filename.replace(
//                         new RegExp(`^${projectId}/?`),
//                         ""
//                     );
//                     extractedFiles[cleanPath] = content;
//                 }
//             })
//         );

//         const buildTree = (files) => {
//             const root = {
//                 id: Date.now(),
//                 type: "folder",
//                 name: "",
//                 children: [],
//                 handle: null,
//             };

//             Object.entries(files).forEach(([filePath, content]) => {
//                 const parts = filePath.split("/").filter(Boolean);
//                 let currentLevel = root.children;

//                 parts.forEach((part, index) => {
//                     const existing = currentLevel.find(
//                         (item) => item.name === part
//                     );
//                     if (existing) {
//                         currentLevel = existing.children || [];
//                     } else {
//                         const isFile = index === parts.length - 1;
//                         const newNode = {
//                             id: `${projectId}-${filePath}-${index}`,
//                             type: isFile ? "file" : "folder",
//                             name: part,
//                             path: parts.slice(0, index + 1).join("/"),
//                             fullPath: filePath,
//                             data: isFile ? content : undefined,
//                             children: isFile ? undefined : [],
//                         };
//                         currentLevel.push(newNode);
//                         if (!isFile) {
//                             currentLevel = newNode.children;
//                         }
//                     }
//                 });
//             });

//             return root.children.length === 1
//                 ? sortTreeByTypeAndName([root.children[0]])[0]
//                 : {
//                       ...root,
//                       children: sortTreeByTypeAndName(root.children),
//                   };
//         };

//         const extractedTree = buildTree(extractedFiles);
//         setFileTree(extractedTree);

//         // if (!result.success) {
//         //     throw new Error(result.error || "Compilation failed");
//         // }

//         alert("Build successful");
//         setBuilding(false);
//         setResult("Build successful");
//         setHasBuilt(true);
//     } catch (err) {
//         console.error("Error compiling contract:", err);

//         const message =
//             err instanceof Error ? err.message : JSON.stringify(err);

//         alert(message);
//         setResult(message);
//         setBuilding(false);
//     }
// }, [monacoEditor]);

// const handleTest = useCallback(async () => {
//     setTesting(true);
//     if (!monacoEditor) return;

//     const projectId = getProjectIdFromUrl();

//     try {
//         const res = await fetch(
//             `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/test`,
//             {
//                 method: "POST",
//             }
//         );

//         if (!res.ok) throw new Error("Failed to run tests");

//         const testResults = await res.json();

//         alert(testResults.output);
//         setTesting(false);
//         setResult(testResults.output);
//     } catch (err) {
//         console.error("Error running tests:", err);
//         alert("Error running tests: " + err.message);
//         setTesting(false);
//     }
// }, [monacoEditor]);

// const handleEditorChange = useCallback((newContent) => {
//     setEditorContent(newContent);
// }, []);
