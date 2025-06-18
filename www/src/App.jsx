import { useCallback, useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import init, { format_rust_code } from "../../rustfmt/pkg/rustfmt_wasm.js";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";
import { getProjectIdFromUrl } from "./utils/project-id.js";

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
    const { insertNode, deleteNode, updateNode } = useTree();

    const loadProject = useCallback(async (projectId) => {
        try {
            setLoadingFiles(true);

            const res = await fetch(
                `https://sorobuild-ide-backend.onrender.com/api/projects/${projectId}/files`
            );

            if (!res.ok) throw new Error("Failed to load project");

            const files = await res.json();
            console.log(files);

            const buildTree = (files) => {
                const root = {
                    id: Date.now(),
                    type: "folder",
                    name: "New Folder",
                    children: [],
                    handle: null,
                };

                Object.entries(files).forEach(([filePath, content]) => {
                    const parts = filePath.split("/").filter((p) => p);
                    let currentLevel = root.children;

                    parts.forEach((part, index) => {
                        const existingPath = currentLevel.find(
                            (item) => item.name === part
                        );

                        if (existingPath) {
                            currentLevel = existingPath.children || [];
                        } else {
                            const isFile = index === parts.length - 1;
                            const newNode = {
                                id: `${projectId}-${filePath}-${index}`,
                                type: isFile ? "file" : "folder",
                                name: part,
                                path: parts.slice(0, index + 1).join("/"),
                                handle: null,
                                data: isFile ? content : undefined,
                                children: isFile ? undefined : [],
                            };

                            currentLevel.push(newNode);
                            currentLevel = isFile
                                ? currentLevel
                                : newNode.children;
                        }
                    });
                });

                return root;
            };

            const fileTree = buildTree(files);

            setFileTree(fileTree);
            updateUrlWithProjectId(projectId);
            setLoadingFiles(false);
        } catch (err) {
            console.error("Error loading project:", err);
            setLoadingFiles(false);
            alert("Something went wrong");
        }
    }, []);

    // Check for project ID in URL when component mounts and load the project from backend
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
            const res = await fetch(
                "https://sorobuild-ide-backend.onrender.com/format",
                {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: editorContent,
                }
            );

            if (!res.ok) throw new Error("Failed to format code");

            const formatted = await res.text();
            monacoEditor.setValue(formatted);
            setEditorContent(formatted);
        } catch (err) {
            console.error("Error formatting code:", err);
        }
    }, [editorContent, monacoEditor]);

    const handleSave = useCallback(() => {
        if (!selectedTabId || !monacoEditor) return;

        const content = monacoEditor.getValue();
        setEditorContent(content);
        setActiveEditorTabs((tabs) =>
            tabs.map((tab) =>
                tab.id === selectedTabId ? { ...tab, content } : tab
            )
        );
    }, [selectedTabId, monacoEditor]);

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

    const handleCompile = useCallback(async () => {
        console.log("Compiling contract...");

        if (!monacoEditor) return;

        try {
            const res = await fetch(
                "https://sorobuild-ide-backend.onrender.com/compile",
                {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: editorContent,
                }
            );

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.error || "Compilation failed");
            }

            console.log("Compilation successful", result.output);
            // setCompilationOutput(result.output);

            // Convert base64 WASM to a downloadable file
            const byteCharacters = atob(result.wasm);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            // const byteArray = new Uint8Array(byteNumbers);
            // const blob = new Blob([byteArray], { type: "application/wasm" });
            // setWasmFile(URL.createObjectURL(blob));
        } catch (err) {
            console.error("Error compiling contract:", err);
            // setCompilationOutput(err.output || err.message);
        }
    }, [editorContent, monacoEditor]);

    const handleTest = useCallback(async () => {
        console.log("Testing code...");

        if (!monacoEditor) return;

        try {
            const res = await fetch(
                "https://sorobuild-ide-backend.onrender.com/test",
                {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: editorContent,
                }
            );

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

    const updateUrlWithProjectId = (projectId) => {
        const url = new URL(window.location);
        url.searchParams.set("projectId", projectId);
        window.history.pushState({}, "", url);
    };

    // const removeProjectIdFromUrl = () => {
    //     const url = new URL(window.location);
    //     url.searchParams.delete("projectId");
    //     window.history.pushState({}, "", url);
    // };

    // async function getDirectoryStructure(dirHandle, path = "") {
    //     const structure = {};
    //     for await (const [name, handle] of dirHandle.entries()) {
    //         const currentPath = path ? `${path}/${name}` : name;
    //         if (handle.kind === "directory") {
    //             Object.assign(
    //                 structure,
    //                 await getDirectoryStructure(handle, currentPath)
    //             );
    //         } else {
    //             const file = await handle.getFile();
    //             structure[currentPath] = { size: file.size };
    //         }
    //     }
    //     return structure;
    // }

    // async function getFileFromPath(dirHandle, pathArray) {
    //     let currentHandle = dirHandle;
    //     for (let i = 0; i < pathArray.length - 1; i++) {
    //         currentHandle = await currentHandle.getDirectoryHandle(
    //             pathArray[i]
    //         );
    //     }
    //     return await currentHandle.getFileHandle(
    //         pathArray[pathArray.length - 1]
    //     );
    // }

    // async function handleOpenFolder() {
    //     try {
    //         const dirHandle = await window.showDirectoryPicker();
    //         setLoadingFiles(true);

    //         const fileStructure = await getDirectoryStructure(dirHandle);
    //         console.log("Directory structure:", fileStructure);

    //         // const files = await readDirectoryFiles(dirHandle);
    //         const files = {};
    //         let totalSize = 0;
    //         const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit

    //         for await (const [path, { size }] of Object.entries(
    //             fileStructure
    //         )) {
    //             if (size === undefined) continue; // Skip directories

    //             if (totalSize + size > MAX_SIZE) {
    //                 console.log(`Skipping large file: ${path} (${size} bytes)`);
    //                 files[path] = "[file too large]";
    //                 continue;
    //             }

    //             try {
    //                 const file = await getFileFromPath(
    //                     dirHandle,
    //                     path.split("/")
    //                 );
    //                 files[path] = await file.text();
    //                 totalSize += size;
    //             } catch (error) {
    //                 console.log(`Error reading file ${path}:`, error);
    //                 files[path] = "[read error]";
    //             }
    //         }

    //         const projectRes = await fetch(
    //             "https://sorobuild-ide-backend.onrender.com/api/projects",
    //             {
    //                 method: "POST",
    //                 headers: { "Content-Type": "application/json" },
    //                 body: JSON.stringify({ files }),
    //             }
    //         );

    //         if (!projectRes.ok) throw new Error("Failed to create project");

    //         const { projectId } = await projectRes.json();

    //         updateUrlWithProjectId(projectId);

    //         const children = await readDirectoryTree(dirHandle);

    //         const root = {
    //             id: Date.now(),
    //             type: "folder",
    //             name: dirHandle.name || "root",
    //             children,
    //             handle: dirHandle,
    //         };
    //         setFileTree(root);
    //         setLoadingFiles(false);
    //     } catch (err) {
    //         console.error("Error reading directory:", err);
    //         setLoadingFiles(false);
    //     }
    // }

    async function handleOpenFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            setLoadingFiles(true);

            // First create empty project
            const projectRes = await fetch(
                "https://sorobuild-ide-backend.onrender.com/api/projects",
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
        } catch (err) {
            console.error("Error reading directory:", err);
            setLoadingFiles(false);
        }
    }

    async function uploadFilesRecursively(dirHandle, projectId, path = "") {
        for await (const [name, handle] of dirHandle.entries()) {
            const currentPath = path ? `${path}/${name}` : name;

            if (handle.kind === "file") {
                try {
                    const file = await handle.getFile();
                    const content = await file.text();

                    await fetch(
                        `https://sorobuild-ide-backend.onrender.com/api/projects/${projectId}/files`,
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
                await uploadFilesRecursively(handle, projectId, currentPath);
            }
        }
    }

    async function handleOpenFile() {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            setLoadingFiles(true);
            const file = await fileHandle.getFile();
            const text = await file.text();

            const projectRes = await fetch(
                "https://sorobuild-ide-backend.onrender.com/api/projects",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ files: { [file.name]: text } }),
                }
            );

            if (!projectRes.ok) throw new Error("Failed to create project");

            const { projectId } = await projectRes.json();
            updateUrlWithProjectId(projectId);

            const fileNode = {
                id: Date.now(),
                type: "file",
                name: file.name,
                path: "/" + file.name,
                handle: fileHandle,
                data: text,
            };

            // You could use a similar tree structure like when opening a folder
            const root = {
                id: Date.now() + 1,
                type: "folder",
                name: "New Folder",
                children: [fileNode],
                handle: null,
            };

            setFileTree(root);
            setLoadingFiles(false);

            handleActiveEditorTabs(fileNode.id, fileNode.name, fileNode.data);
        } catch (err) {
            console.error("Error opening file:", err);
            setLoadingFiles(false);
        }
    }

    async function readDirectoryTree(dirHandle, path = "") {
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
    }

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

    const handleCloseTab = (tabId) => {
        const updatedActiveEditorTabs = activeEditorTabs.filter(
            (tab) => tab.id !== tabId
        );

        setActiveEditorTabs(updatedActiveEditorTabs);

        if (activeEditorTabs.length !== 1) {
            setSelectedTabId(updatedActiveEditorTabs.at(-1).id);
        } else {
            setSelectedTabId(null);
        }
    };

    const handleActiveEditorTabs = useCallback(
        async (tabId, tabName, tabData) => {
            const newTab = {
                id: tabId,
                name: tabName,
                content: tabData,
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
        [activeEditorTabs, editor, monacoEditor]
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
                                                handleCompile={handleCompile}
                                                handleTest={handleTest}
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
                            <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-y-scroll"></div>
                        </Panel>
                    </PanelGroup>
                )}
            </Panel>
        </PanelGroup>
    );
}
