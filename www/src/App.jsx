import { useCallback, useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";
import JSZip from "jszip";

export default function App() {
    const [fileTree, setFileTree] = useState(null);
    const [activeEditorTabs, setActiveEditorTabs] = useState([]);
    const [selectedTabId, setSelectedTabId] = useState(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [editor, setEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editorContent, setEditorContent] = useState("");
    const monacoElementRef = useRef(null);
    const [monacoEditor, setMonacoEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [building, setBuilding] = useState(false);
    const { insertNode, deleteNode, updateNode } = useTree();
    const [result, setResult] = useState("");

    // Loads project from backend
    // const loadProject = useCallback(async (projectId) => {
    //     try {
    //         setLoadingFiles(true);

    //         const res = await fetch(
    //             `http://localhost:4000/api/projects/${projectId}/download`
    //         );

    //         if (!res.ok) throw new Error("Failed to load project");

    //         const blob = await res.blob();
    //         const zip = await JSZip.loadAsync(blob);

    //         // 3. Extract files with progress tracking
    //         const extractedFiles = {};
    //         const fileNames = Object.keys(zip.files);

    //         for (const filename of fileNames) {
    //             const file = zip.files[filename];
    //             if (!file.dir) {
    //                 const content = await file.async("string");
    //                 const cleanPath = filename.replace(
    //                     new RegExp(`^${projectId}/?`),
    //                     ""
    //                 ); // Remove any root folder
    //                 extractedFiles[cleanPath] = content;
    //             }
    //         }

    //         const buildTree = (files) => {
    //             const root = {
    //                 id: Date.now(),
    //                 type: "folder",
    //                 name: "Project",
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

    //             return root;
    //         };

    //         const fileTree = buildTree(extractedFiles);

    //         // const files = await res.json();

    //         // const buildTree = (files) => {
    //         //     const root = {
    //         //         id: Date.now(),
    //         //         type: "folder",
    //         //         name: "New Folder",
    //         //         children: [],
    //         //         handle: null,
    //         //     };

    //         //     Object.entries(files).forEach(([filePath, content]) => {
    //         //         const parts = filePath.split("/").filter((p) => p);
    //         //         let currentLevel = root.children;

    //         //         parts.forEach((part, index) => {
    //         //             const existingPath = currentLevel.find(
    //         //                 (item) => item.name === part
    //         //             );

    //         //             if (existingPath) {
    //         //                 currentLevel = existingPath.children || [];
    //         //             } else {
    //         //                 const isFile = index === parts.length - 1;
    //         //                 const newNode = {
    //         //                     id: `${projectId}-${filePath}-${index}`,
    //         //                     type: isFile ? "file" : "folder",
    //         //                     name: part,
    //         //                     path: parts.slice(0, index + 1).join("/"),
    //         //                     handle: null,
    //         //                     data: isFile ? content : undefined,
    //         //                     children: isFile ? undefined : [],
    //         //                 };

    //         //                 currentLevel.push(newNode);
    //         //                 currentLevel = isFile
    //         //                     ? currentLevel
    //         //                     : newNode.children;
    //         //             }
    //         //         });
    //         //     });

    //         //     return root;
    //         // };

    //         // const fileTree = buildTree(files);

    //         setFileTree(fileTree);
    //         updateUrlWithProjectId(projectId);
    //         setLoadingFiles(false);
    //         setResult("Project loaded successfully");
    //         alert("Project loaded successfully");
    //     } catch (err) {
    //         console.error("Error loading project:", err);
    //         setLoadingFiles(false);
    //         alert(err);
    //         setResult(err);
    //     }
    // }, []);

    // const loadProject = useCallback(async (projectId) => {
    //     try {
    //         setLoadingFiles(true);

    //         // 1. Download the project as ZIP
    //         const res = await fetch(
    //             `http://localhost:4000/api/projects/${projectId}/download`
    //         );

    //         if (!res.ok) {
    //             const errorText = await res.text();
    //             throw new Error(errorText || "Failed to load project");
    //         }

    //         // 2. Process the ZIP file
    //         const blob = await res.blob();

    //         try {
    //             const zip = await JSZip.loadAsync(blob, {
    //                 checkCRC32: true,
    //                 optimizedBinaryString: true,
    //             });

    //             // 3. Extract files with structure preservation
    //             const extractedFiles = {};
    //             const fileNames = Object.keys(zip.files);

    //             for (const filename of fileNames) {
    //                 const file = zip.files[filename];
    //                 if (!file.dir && !filename.match(/__MACOSX|\.DS_Store/)) {
    //                     try {
    //                         const content = await file.async("text");
    //                         // Preserve original path structure
    //                         const cleanPath = filename.replace(
    //                             new RegExp(`^${projectId}/?`),
    //                             ""
    //                         );
    //                         if (cleanPath) {
    //                             extractedFiles[cleanPath] = content;
    //                         }
    //                     } catch (fileErr) {
    //                         console.warn(
    //                             `Failed to extract ${filename}:`,
    //                             fileErr
    //                         );
    //                     }
    //                 }
    //             }

    //             // 4. Build the file tree
    //             const buildTree = (files) => {
    //                 const root = {
    //                     id: Date.now(),
    //                     type: "folder",
    //                     name: "Project",
    //                     children: [],
    //                     handle: null,
    //                 };

    //                 Object.entries(files).forEach(([filePath, content]) => {
    //                     const parts = filePath.split("/").filter(Boolean);
    //                     let currentLevel = root.children;

    //                     parts.forEach((part, index) => {
    //                         const existing = currentLevel.find(
    //                             (item) => item.name === part
    //                         );
    //                         if (existing) {
    //                             currentLevel = existing.children || [];
    //                         } else {
    //                             const isFile = index === parts.length - 1;
    //                             const newNode = {
    //                                 id: `${projectId}-${filePath}-${index}`,
    //                                 type: isFile ? "file" : "folder",
    //                                 name: part,
    //                                 path: parts.slice(0, index + 1).join("/"),
    //                                 data: isFile ? content : undefined,
    //                                 children: isFile ? undefined : [],
    //                             };
    //                             currentLevel.push(newNode);
    //                             if (!isFile) {
    //                                 currentLevel = newNode.children;
    //                             }
    //                         }
    //                     });
    //                 });

    //                 return root;
    //             };

    //             const fileTree = buildTree(extractedFiles);
    //             setFileTree(fileTree);
    //             updateUrlWithProjectId(projectId);
    //             setResult("Project loaded successfully");
    //         } catch (zipErr) {
    //             console.error("ZIP processing error:", zipErr);
    //             throw new Error("Invalid project file format");
    //         }
    //     } catch (err) {
    //         console.error("Error loading project:", err);
    //         setResult(err.message || "Failed to load project");
    //     } finally {
    //         setLoadingFiles(false);
    //     }
    // }, []);

    // const loadProject = useCallback(async (projectId) => {
    //     try {
    //         setLoadingFiles("Loading project...");

    //         // 1. Download the project as ZIP
    //         const response = await fetch(
    //             `http://localhost:4000/api/projects/${projectId}/download`
    //         );

    //         if (!response.ok) {
    //             let errorMsg = "Failed to load project";
    //             try {
    //                 const errorData = await response.json();
    //                 errorMsg = errorData.error || errorMsg;
    //                 if (errorData.details) {
    //                     console.error(
    //                         "Server error details:",
    //                         errorData.details
    //                     );
    //                 }
    //             } catch (e) {
    //                 console.error("Failed to parse error response:", e);
    //             }
    //             throw new Error(errorMsg);
    //         }

    //         // 2. Process the ZIP file
    //         const blob = await response.blob();

    //         try {
    //             setLoadingFiles("Extracting files...");
    //             const zip = await JSZip.loadAsync(blob, {
    //                 checkCRC32: true,
    //                 optimizedBinaryString: true,
    //             });

    //             // 3. Extract files with progress
    //             const extractedFiles = {};
    //             const fileNames = Object.keys(zip.files);
    //             let processedCount = 0;

    //             for (const filename of fileNames) {
    //                 const file = zip.files[filename];
    //                 if (!file.dir && !filename.match(/__MACOSX|\.DS_Store/)) {
    //                     try {
    //                         const content = await file.async("text");
    //                         const cleanPath = filename.replace(
    //                             new RegExp(`^${projectId}/?`),
    //                             ""
    //                         );
    //                         if (cleanPath) {
    //                             extractedFiles[cleanPath] = content;
    //                         }
    //                     } catch (fileErr) {
    //                         console.warn(`Skipped ${filename}:`, fileErr);
    //                     }
    //                 }
    //                 processedCount++;
    //                 setLoadingFiles(
    //                     `Processing files... ${Math.round(
    //                         (processedCount / fileNames.length) * 100
    //                     )}%`
    //                 );
    //             }

    //             // 4. Build the file tree
    //             setLoadingFiles("Building file tree...");
    //             const fileTree = buildFileTree(projectId, extractedFiles);

    //             setFileTree(fileTree);
    //             updateUrlWithProjectId(projectId);
    //             setResult("Project loaded successfully");
    //         } catch (zipErr) {
    //             console.error("ZIP processing failed:", zipErr);
    //             throw new Error("Invalid project file format");
    //         }
    //     } catch (err) {
    //         console.error("Project load failed:", err);
    //         setResult(err.message || "Failed to load project");
    //         // Show user-friendly error
    //         alert(
    //             `Error: ${err.message}\n\nPlease try again or contact support.`
    //         );
    //     } finally {
    //         setLoadingFiles(false);
    //     }
    // }, []);

    // Helper function for building file tree
    // const buildFileTree = (projectId, files) => {
    //     const root = {
    //         id: Date.now(),
    //         type: "folder",
    //         name: "Project",
    //         children: [],
    //         handle: null,
    //     };

    //     Object.entries(files).forEach(([filePath, content]) => {
    //         const parts = filePath.split("/").filter(Boolean);
    //         let currentLevel = root.children;

    //         parts.forEach((part, index) => {
    //             const existing = currentLevel.find(
    //                 (item) => item.name === part
    //             );
    //             if (existing) {
    //                 currentLevel = existing.children || [];
    //             } else {
    //                 const isFile = index === parts.length - 1;
    //                 const newNode = {
    //                     id: `${projectId}-${filePath}-${index}`,
    //                     type: isFile ? "file" : "folder",
    //                     name: part,
    //                     path: parts.slice(0, index + 1).join("/"),
    //                     data: isFile ? content : undefined,
    //                     children: isFile ? undefined : [],
    //                 };
    //                 currentLevel.push(newNode);
    //                 if (!isFile) currentLevel = newNode.children;
    //             }
    //         });
    //     });

    //     return root;
    // };

    // Check for project ID in URL when component mounts and load the project from backend

    const loadProject = useCallback(async () => {
        try {
            setLoadingFiles(true);

            const projectId = getProjectIdFromUrl();

            const res = await fetch(
                `http://localhost:4000/api/projects/${projectId}/download`
            );

            if (!res.ok) throw new Error("Failed to load project");

            const blob = await res.blob();
            console.log("ZIP raw content (as text)", blob.slice(0, 100));
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

            const buildTree = (files) => {
                const root = {
                    id: Date.now(),
                    type: "folder",
                    name: "New Folder",
                    children: [],
                    handle: null,
                };

                Object.entries(files).forEach(([filePath, content]) => {
                    const parts = filePath.split("/").filter(Boolean);
                    let currentLevel = root.children;

                    parts.forEach((part, index) => {
                        const existing = currentLevel.find(
                            (item) => item.name === part
                        );
                        if (existing) {
                            currentLevel = existing.children || [];
                        } else {
                            const isFile = index === parts.length - 1;
                            const newNode = {
                                id: `${projectId}-${filePath}-${index}`,
                                type: isFile ? "file" : "folder",
                                name: part,
                                path: parts.slice(0, index + 1).join("/"),
                                data: isFile ? content : undefined,
                                children: isFile ? undefined : [],
                            };
                            currentLevel.push(newNode);
                            if (!isFile) {
                                currentLevel = newNode.children;
                            }
                        }
                    });
                });

                return root;
            };

            const extractedTree = buildTree(extractedFiles);
            setFileTree(extractedTree);

            console.log("Build successful");
            setLoadingFiles(false);
            setResult("Build successful");
            alert("Project loaded successfully");
        } catch (error) {
            console.error("Error compiling contract:", error);

            const message =
                error instanceof Error ? error.message : JSON.stringify(error);

            alert(message);
            setResult(message);
            setBuilding(false);
        }
    }, []);

    useEffect(() => {
        const projectId = getProjectIdFromUrl();
        if (projectId) {
            loadProject(projectId);
        }
    }, [loadProject]);

    useEffect(() => {
        if (!monacoEditor || !selectedTabId) {
            return;
        }

        const activeFile = activeEditorTabs.find(
            (tab) => tab.id === selectedTabId
        );
        if (activeFile) {
            const currentContent = monacoEditor.getValue();
            if (currentContent !== activeFile.content) {
                monacoEditor.setValue(activeFile.content || "");
                setEditorContent(activeFile.content || "");
            }
        }
    }, [selectedTabId, activeEditorTabs, monacoEditor]);

    const handleFormat = useCallback(async () => {
        console.log("Formatting code...");

        if (!monacoEditor) return;

        try {
            const res = await fetch("http://localhost:4000/format", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: editorContent,
            });

            if (!res.ok) throw new Error("Failed to format code");

            const formatted = await res.text();
            monacoEditor.setValue(formatted);
            setEditorContent(formatted);
        } catch (err) {
            console.error("Error formatting code:", err);
        }
    }, [editorContent, monacoEditor]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        if (!selectedTabId || !monacoEditor) return;

        const projectId = getProjectIdFromUrl();

        const content = monacoEditor.getValue();
        setEditorContent(content);
        const activeFile = activeEditorTabs.find(
            (tab) => tab.id === selectedTabId
        );
        if (!activeFile || !activeFile.path) {
            console.log("Missing file path:", activeFile);
            alert("File path not found. Cannot save.");
            return;
        }

        try {
            const res = await fetch(
                `http://localhost:4000/api/projects/${projectId}/files`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        path: activeFile.path,
                        content,
                    }),
                }
            );

            if (!res.ok) {
                throw new Error("Failed to save file.");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save file.");
            setSaving(false);
        }

        setActiveEditorTabs((tabs) =>
            tabs.map((tab) =>
                tab.id === selectedTabId ? { ...tab, content } : tab
            )
        );
        setSaving(false);
    }, [selectedTabId, monacoEditor, activeEditorTabs]);

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                (event.key === "s" || event.key === "S")
            ) {
                event.preventDefault();
                handleSave();
            }
        };

        document.addEventListener("keydown", handleKeyPress);

        return () => {
            document.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleSave]);

    const handleBuild = useCallback(async () => {
        console.log("Building contract...");

        if (!monacoEditor) return;

        const projectId = getProjectIdFromUrl();

        setBuilding(true);
        try {
            const res = await fetch(
                `http://localhost:4000/api/projects/${projectId}/build`,
                {
                    method: "POST",
                }
            );

            if (!res.ok) {
                throw new Error(await res.text());
            }

            const blob = await res.blob();
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

            const buildTree = (files) => {
                const root = {
                    id: Date.now(),
                    type: "folder",
                    name: "New Folder",
                    children: [],
                    handle: null,
                };

                Object.entries(files).forEach(([filePath, content]) => {
                    const parts = filePath.split("/").filter(Boolean);
                    let currentLevel = root.children;

                    parts.forEach((part, index) => {
                        const existing = currentLevel.find(
                            (item) => item.name === part
                        );
                        if (existing) {
                            currentLevel = existing.children || [];
                        } else {
                            const isFile = index === parts.length - 1;
                            const newNode = {
                                id: `${projectId}-${filePath}-${index}`,
                                type: isFile ? "file" : "folder",
                                name: part,
                                path: parts.slice(0, index + 1).join("/"),
                                data: isFile ? content : undefined,
                                children: isFile ? undefined : [],
                            };
                            currentLevel.push(newNode);
                            if (!isFile) {
                                currentLevel = newNode.children;
                            }
                        }
                    });
                });

                return root;
            };

            const extractedTree = buildTree(extractedFiles);
            setFileTree(extractedTree);

            // if (!result.success) {
            //     throw new Error(result.error || "Compilation failed");
            // }

            console.log("Build successful");
            setBuilding(false);
            setResult("Build successful");
        } catch (err) {
            console.error("Error compiling contract:", err);

            const message =
                err instanceof Error ? err.message : JSON.stringify(err);

            alert(message);
            setResult(message);
            setBuilding(false);
        }
    }, [monacoEditor]);

    const handleTest = useCallback(async () => {
        console.log("Testing code...");

        if (!monacoEditor) return;

        try {
            const res = await fetch("http://localhost:4000/test", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: editorContent,
            });

            if (!res.ok) throw new Error("Failed to run tests");

            const testResults = await res.json();
            console.log("Test results:", testResults);

            // Here you can display the test results in your UI
            // For example, you might want to show them in one of your panels
            alert(
                `Tests ${testResults.passed ? "passed" : "failed"}:\n${
                    testResults.output
                }`
            );
        } catch (err) {
            console.error("Error running tests:", err);
            alert("Error running tests: " + err.message);
        }
    }, [editorContent, monacoEditor]);

    // async function readDirectoryFiles(dirHandle, path = "") {
    //     const files = {};
    //     for await (const [name, handle] of dirHandle.entries()) {
    //         if (handle.kind === "file") {
    //             const filePath = path ? `${path}/${name}` : name;
    //             files[filePath] = await (await handle.getFile()).text();
    //         } else if (handle.kind === "directory") {
    //             const nestedFiles = await readDirectoryFiles(
    //                 handle,
    //                 path ? `${path}/${name}` : name
    //             );
    //             Object.assign(files, nestedFiles);
    //         }
    //     }
    //     return files;
    // }

    const findFilePathById = useCallback((node, id) => {
        if (node.id === id && node.path) return node.path;

        if (node.children) {
            for (const child of node.children) {
                const result = findFilePathById(child, id);
                if (result) return result;
            }
        }

        return null;
    }, []);

    const handleActiveEditorTabs = useCallback(
        async (tabId, tabName, tabData) => {
            if (monacoEditor && selectedTabId) {
                const currentContent = monacoEditor.getValue();
                setActiveEditorTabs((tabs) =>
                    tabs.map((tab) =>
                        tab.id === selectedTabId
                            ? { ...tab, content: currentContent }
                            : tab
                    )
                );
            }

            const newTab = {
                id: tabId,
                name: tabName,
                content: tabData,
                path: fileTree
                    ? findFilePathById(fileTree, tabId)
                    : `/${tabName}`,
            };

            const isAlreadyOpened = activeEditorTabs.some(
                (activeTab) => activeTab.id === tabId
            );

            if (!isAlreadyOpened) {
                setActiveEditorTabs([...activeEditorTabs, newTab]);
            }

            setSelectedTabId(tabId);

            if (!monacoElementRef.current) {
                const waitForRef = () => {
                    return new Promise((resolve) => {
                        const check = () => {
                            if (monacoElementRef.current) {
                                resolve();
                            } else {
                                requestAnimationFrame(check);
                            }
                        };
                        check();
                    });
                };

                await waitForRef();
            }

            if (!editor) {
                try {
                    const { myEditor, model } = await start(
                        monacoElementRef,
                        (newContent) => {
                            // Only update editorContent, not tabs
                            setEditorContent(newContent);
                        }
                    );
                    setEditor(myEditor);
                    setMonacoEditor(model);

                    model.setValue(tabData || "");
                    setEditorContent(tabData || "");
                } catch (error) {
                    console.error("Editor initialization failed:", error);
                } finally {
                    setLoading(false);
                }
            } else if (tabData) {
                const currentTab = activeEditorTabs.find(
                    (tab) => tab.id === tabId
                );
                const contentToShow = currentTab?.content || tabData || "";
                monacoEditor.setValue(contentToShow);
                setEditorContent(contentToShow);
            }
        },
        [
            activeEditorTabs,
            editor,
            monacoEditor,
            selectedTabId,
            findFilePathById,
            fileTree,
        ]
    );

    const readDirectoryTree = useCallback(async (dirHandle, path = "") => {
        const tree = [];
        for await (const [name, handle] of dirHandle.entries()) {
            const id = Date.now() + Math.random();
            if (handle.kind === "file") {
                tree.push({
                    id,
                    type: "file",
                    name,
                    path: path + "/" + name,
                    handle,
                    data: await (await handle.getFile()).text(),
                });
            } else if (handle.kind === "directory") {
                tree.push({
                    id,
                    type: "folder",
                    name,
                    path: path + "/" + name,
                    handle,
                    children: await readDirectoryTree(
                        handle,
                        path + "/" + name
                    ),
                });
            }
        }
        return tree;
    }, []);

    const updateUrlWithProjectId = async (projectId) => {
        const url = new URL(window.location);
        url.searchParams.set("projectId", projectId);
        window.history.pushState({}, "", url);
    };

    const uploadFilesRecursively = useCallback(
        async (dirHandle, projectId, path = "") => {
            for await (const [name, handle] of dirHandle.entries()) {
                const currentPath = path ? `${path}/${name}` : name;

                if (handle.kind === "file") {
                    try {
                        const file = await handle.getFile();
                        const content = await file.text();

                        await fetch(
                            `http://localhost:4000/api/projects/${projectId}/files`,
                            {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    path: currentPath,
                                    content,
                                }),
                            }
                        );
                    } catch (error) {
                        console.error(`Error uploading ${currentPath}:`, error);
                    }
                } else if (handle.kind === "directory") {
                    await uploadFilesRecursively(
                        handle,
                        projectId,
                        currentPath
                    );
                }
            }
        },
        []
    );

    const getProjectIdFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get("projectId");
    };

    const handleOpenFolder = useCallback(async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            setLoadingFiles(true);

            // CREATE AN EMPTY PROJECT IN THE BACKEND
            const projectRes = await fetch(
                "http://localhost:4000/api/projects",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ files: {} }),
                }
            );

            if (!projectRes.ok) throw new Error("Failed to create project");

            const { projectId } = await projectRes.json();
            updateUrlWithProjectId(projectId);

            // Then upload files one by one
            await uploadFilesRecursively(dirHandle, projectId);

            // Build UI tree
            const children = await readDirectoryTree(dirHandle);
            setFileTree({
                id: Date.now(),
                type: "folder",
                name: dirHandle.name || "root",
                children,
                handle: dirHandle,
            });

            setLoadingFiles(false);
            setResult("Project loaded successfully");
            alert("Project loaded successfully");
        } catch (err) {
            console.error("Error reading directory:", err);
            setLoadingFiles(false);
            setResult(err);
            alert(err);
        }
    }, [readDirectoryTree, uploadFilesRecursively]);

    const handleOpenFile = useCallback(async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            setLoadingFiles(true);
            const file = await fileHandle.getFile();
            const text = await file.text();

            const projectRes = await fetch(
                "http://localhost:4000/api/projects",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ files: { [file.name]: text } }),
                }
            );

            if (!projectRes.ok) throw new Error("Failed to create project");

            const { projectId } = await projectRes.json();
            updateUrlWithProjectId(projectId);

            // BUILD UI TREE
            const fileNode = {
                id: Date.now(),
                type: "file",
                name: file.name,
                path: "/" + file.name,
                handle: fileHandle,
                data: text,
            };

            const root = {
                id: Date.now() + 1,
                type: "folder",
                name: "New Folder",
                children: [fileNode],
                handle: null,
            };

            setFileTree(root);
            console.log(fileTree);
            setLoadingFiles(false);

            handleActiveEditorTabs(fileNode.id, fileNode.name, fileNode.data);

            setResult("Project loaded successfully");
            alert("Project loaded successfully");
        } catch (err) {
            console.error("Error opening file:", err);
            setLoadingFiles(false);
            setResult(err);
            alert(err);
        }
    }, [handleActiveEditorTabs, fileTree]);

    const handleRename = (id, newName) => {
        setFileTree(updateNode(fileTree, id, newName));
        setActiveEditorTabs(
            activeEditorTabs.map((tab) =>
                tab.id === id ? { ...tab, name: newName } : tab
            )
        );
    };

    const handleDelete = (id) => {
        const updatedTree = deleteNode(fileTree, id);
        setFileTree(updatedTree);
        setActiveEditorTabs(activeEditorTabs.filter((tab) => tab.id !== id));
    };

    const handleAddFile = (parentId, fileName) => {
        const newFile = {
            id: Date.now(),
            type: "file",
            name: fileName,
            data: "",
        };

        setFileTree(insertNode(fileTree, parentId, newFile));

        handleActiveEditorTabs(newFile.id, newFile.name, newFile.data);
    };

    const handleAddFolder = (parentId, folderName) => {
        const newFolder = {
            id: Date.now(),
            type: "folder",
            name: folderName,
            children: [],
        };

        setFileTree(insertNode(fileTree, parentId, newFolder));
    };

    const handleCloseTab = useCallback(
        (tabId) => {
            if (monacoEditor && selectedTabId === tabId) {
                const currentContent = monacoEditor.getValue();
                setEditorContent(currentContent);
                setActiveEditorTabs((tabs) =>
                    tabs.map((tab) =>
                        tab.id === tabId
                            ? { ...tab, content: currentContent }
                            : tab
                    )
                );
            }

            const updatedActiveEditorTabs = activeEditorTabs.filter(
                (tab) => tab.id !== tabId
            );

            setActiveEditorTabs(updatedActiveEditorTabs);

            if (activeEditorTabs.length !== 1) {
                setSelectedTabId(updatedActiveEditorTabs.at(-1).id);
            } else {
                setSelectedTabId(null);
            }
        },
        [activeEditorTabs, monacoEditor, selectedTabId]
    );

    useEffect(() => {
        return () => {
            if (editor) {
                editor.dispose();
            }
        };
    }, [editor]);

    return (
        <PanelGroup className="h-full" direction="horizontal">
            <Panel
                collapsedSize={0}
                collapsible
                style={{ width: "280px", minWidth: "280px", maxWidth: "280px" }}
                className="flex flex-col border-r border-r-white"
            >
                <div className="px-4 py-2 border-b border-b-white">
                    <h3 className="text-xs uppercase text-white">Explorer</h3>
                </div>
                <div className="p-2 overflow-auto h-full">
                    <FileTree
                        handleDelete={handleDelete}
                        handleAddFile={handleAddFile}
                        handleAddFolder={handleAddFolder}
                        handleRename={handleRename}
                        fileTree={fileTree}
                        loadingFiles={loadingFiles}
                        handleActiveEditorTabs={handleActiveEditorTabs}
                    />
                </div>
            </Panel>
            <PanelResizeHandle className="w-[0.1px] bg-white" />
            <Panel>
                {activeEditorTabs.length === 0 ? (
                    <Entry
                        handleOpenFolder={handleOpenFolder}
                        handleOpenFile={handleOpenFile}
                    />
                ) : (
                    <PanelGroup direction="vertical">
                        <Panel>
                            <PanelGroup direction="horizontal">
                                <Panel>
                                    <div className="flex">
                                        {activeEditorTabs.map((tab) => (
                                            <TabButton
                                                key={tab.id}
                                                tab={tab}
                                                handleCloseTab={handleCloseTab}
                                                isSelected={
                                                    tab.id === selectedTabId
                                                }
                                                onClick={() =>
                                                    setSelectedTabId(tab.id)
                                                }
                                            />
                                        ))}
                                    </div>
                                    <div
                                        className="h-full w-full relative"
                                        ref={monacoElementRef}
                                    >
                                        {loading ? (
                                            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                                                <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-16 h-16 animate-spin" />
                                            </div>
                                        ) : (
                                            <ActionsDropdown
                                                handleFormat={handleFormat}
                                                handleBuild={handleBuild}
                                                handleTest={handleTest}
                                                saving={saving}
                                                building={building}
                                            />
                                        )}
                                    </div>
                                </Panel>
                                <PanelResizeHandle className="w-1 bg-black" />
                                <Panel
                                    collapsedSize={0}
                                    collapsible
                                    defaultSize={0}
                                    minSize={0}
                                    maxSize={100}
                                >
                                    <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                                </Panel>
                            </PanelGroup>
                        </Panel>

                        <PanelResizeHandle className="h-1 bg-black" />

                        <Panel
                            collapsedSize={0}
                            collapsible
                            defaultSize={0}
                            minSize={0}
                            maxSize={100}
                        >
                            <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll">
                                {result}
                            </div>
                        </Panel>
                    </PanelGroup>
                )}
            </Panel>
        </PanelGroup>
    );
}
