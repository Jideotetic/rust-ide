import { useCallback, useEffect, useRef, useState } from "react";
import { start } from "./utils/worker";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import init, { format_rust_code } from "../../rustfmt/pkg/rustfmt_wasm.js";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";

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

    // useEffect(() => {
    //     if (monacoElementRef) {
    //         console.log(monacoElementRef);
    //         setEditor(async (editor) => {
    //             if (editor) return editor;

    //             // await init();

    //             const { myEditor, model } = await start(
    //                 monacoElementRef,
    //                 setEditorContent
    //             );
    //             setLoading(false);
    //             setMonacoEditor(model);

    //             return myEditor;
    //         });
    //     }

    //     return () => {
    //         if (editor) {
    //             editor.dispose();
    //         }
    //     };
    //     // eslint-disable-next-line
    // }, [monacoElementRef.current]);

    // SET THE CONTENT OF THE EDITOR

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

    // useEffect(() => {
    //     if (!monacoEditor || !selectedTabId) return;

    //     // Update the tab content whenever editorContent changes
    //     setActiveEditorTabs((tabs) =>
    //         tabs.map((tab) =>
    //             tab.id === selectedTabId
    //                 ? { ...tab, content: editorContent }
    //                 : tab
    //         )
    //     );
    // }, [editorContent, selectedTabId, monacoEditor]);

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

    // const handleCompile = useCallback(async () => {
    //     console.log("Compiling code...");
    // }, []);

    async function handleOpenFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            setLoadingFiles(true);
            const children = await readDirectoryTree(dirHandle);
            const root = {
                id: Date.now(),
                type: "folder",
                name: dirHandle.name || "root",
                children,
                handle: dirHandle,
            };
            setFileTree(root);
            setLoadingFiles(false);
        } catch (err) {
            console.error("Error reading directory:", err);
        }
    }

    async function handleOpenFile() {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            const file = await fileHandle.getFile();
            const text = await file.text();

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
            // setActiveEditorTabs([
            //     {
            //         id: fileNode.id,
            //         name: fileNode.name,
            //         content: fileNode.data,
            //     },
            // ]);
            // setSelectedTabId(fileNode.id);
            handleActiveEditorTabs(fileNode.id, fileNode.name, fileNode.data);
        } catch (err) {
            console.error("Error opening file:", err);
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
        // setActiveEditorTabs([
        //     ...activeEditorTabs,
        //     { id: newFile.id, name: newFile.name, data: newFile.data },
        // ]);
        // setSelectedTabId(newFile.id);
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
                    // setLoading(false);

                    // Set content after initialization
                    // if (tabData) {
                    model.setValue(tabData || "");
                    setEditorContent(tabData || "");
                    // }
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
