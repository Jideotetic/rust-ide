import { useCallback, useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";
import JSZip from "jszip";
import { buildFileTreeFromFileSystemApi } from "./utils/utils.js";

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
    const [hasBuilt, setHasBuilt] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [testing, setTesting] = useState(false);
    const fileInputRef = useRef();
    const folderInputRef = useRef();

    const loadProject = useCallback(async () => {
        try {
            setLoadingFiles(true);

            const projectId = getProjectIdFromUrl();

            const res = await fetch(
                `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/download`
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

    console.log(editorContent);

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

    const handleSave = useCallback(async () => {
        setSaving(true);
        if (!selectedTabId || !monacoEditor || loadingFiles) return;

        const projectId = getProjectIdFromUrl();

        const content = monacoEditor.getValue();
        setEditorContent(content);

        const activeFile = activeEditorTabs.find(
            (tab) => tab.id === selectedTabId
        );
        if (!activeFile || !activeFile.path) {
            console.log("Missing file path:", activeFile);
            alert("File path not found. Cannot save.");
            setSaving(false);
            return;
        }

        try {
            const res = await fetch(
                `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/files`,
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

            const result = await res.json();
            const formattedContent = result.content;

            // Update the Monaco editor and state with formatted content
            monacoEditor.setValue(formattedContent);
            setEditorContent(formattedContent);

            setActiveEditorTabs((tabs) =>
                tabs.map((tab) =>
                    tab.id === selectedTabId
                        ? { ...tab, content: formattedContent }
                        : tab
                )
            );
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save file.");
        } finally {
            setSaving(false);
        }
    }, [selectedTabId, monacoEditor, activeEditorTabs, loadingFiles]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasBuilt) {
                e.preventDefault();
                e.returnValue =
                    "You have unsaved changes. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasBuilt]);

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

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (
                !loadingFiles &&
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
    }, [handleSave, loadingFiles]);

    const generateZipFromFileTree = useCallback(async () => {
        const zip = new JSZip();

        // Recursive function to add files to ZIP
        const addFilesToZip = (node, currentPath = "") => {
            const nodePath = currentPath
                ? `${currentPath}/${node.name}`
                : node.name;

            if (node.type === "file") {
                zip.file(nodePath, node.data || "");
            } else if (node.children) {
                node.children.forEach((child) =>
                    addFilesToZip(child, nodePath)
                );
            }
        };

        if (fileTree) {
            addFilesToZip(fileTree);
            return await zip.generateAsync({ type: "blob" });
        }
        return null;
    }, [fileTree]);

    const handleDownloadProject = useCallback(async () => {
        try {
            setDownloading(true);
            const projectId = getProjectIdFromUrl() || "project";
            const zipBlob = await generateZipFromFileTree();

            if (!zipBlob) {
                throw new Error("No files to download");
            }

            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectId}-${new Date()
                .toISOString()
                .slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setDownloading(false);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to create download: " + error.message);
            setDownloading(false);
        }
    }, [generateZipFromFileTree]);

    const handleBuild = useCallback(async () => {
        console.log("Building contract...");

        if (!monacoEditor) return;

        const projectId = getProjectIdFromUrl();

        setBuilding(true);
        try {
            const res = await fetch(
                `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/build`,
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
            setHasBuilt(true);
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
        setTesting(true);
        if (!monacoEditor) return;

        const projectId = getProjectIdFromUrl();

        try {
            const res = await fetch(
                `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/test`,
                {
                    method: "POST",
                }
            );

            if (!res.ok) throw new Error("Failed to run tests");

            const testResults = await res.json();

            alert(testResults.output);
            setTesting(false);
            setResult(testResults.output);
        } catch (err) {
            console.error("Error running tests:", err);
            alert("Error running tests: " + err.message);
            setTesting(false);
        }
    }, [monacoEditor]);

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

    const handleEditorChange = useCallback((newContent) => {
        setEditorContent(newContent);
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
                        handleEditorChange
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
            handleEditorChange,
        ]
    );

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
                            `https://sorobuild-ide-backend-1.onrender.com/api/projects/${projectId}/files`,
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

    const handleOpenFile = useCallback(async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            setLoadingFiles(true);
            const file = await fileHandle.getFile();
            const text = await file.text();

            const projectRes = await fetch(
                "https://sorobuild-ide-backend-1.onrender.com/api/projects",
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
                        handleOpenFile={handleOpenFile}
                        folderInputRef={folderInputRef}
                        setFileTree={setFileTree}
                        setLoadingFiles={setLoadingFiles}
                    />
                ) : (
                    <PanelGroup direction="vertical">
                        <Panel>
                            <PanelGroup direction="horizontal">
                                <Panel>
                                    <div className="flex overflow-x-auto scrollbar-hidden">
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
                                                handleDownloadProject={
                                                    handleDownloadProject
                                                }
                                                handleBuild={handleBuild}
                                                handleTest={handleTest}
                                                saving={saving}
                                                building={building}
                                                fileTree={fileTree}
                                                downloading={downloading}
                                                testing={testing}
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
