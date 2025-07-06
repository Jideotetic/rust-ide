import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";
import {
    closeDefaultMainTab,
    downloadProjectAsZip,
    findFileNodeById,
    findFilePathById,
    getProjectIdFromUrl,
    readFileAsText,
    sortTreeByTypeAndName,
    uploadAsZipForBuild,
    uploadAsZipForTest,
} from "./utils/utils.js";
import * as monaco from "monaco-editor";
import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";

const MAIN_DOT_RS_ID = uuidv4();

const initialMainRsContent = `fn main() {\n    println!("Hello, World!");\n}`;

export default function App() {
    const [activeTabs, setActiveTabs] = useState([
        {
            content: initialMainRsContent,
            id: MAIN_DOT_RS_ID,
            name: "main.rs",
            path: "main.rs",
        },
    ]);
    const [selectedTabId, setSelectedTabId] = useState(MAIN_DOT_RS_ID);
    const [fileTree, setFileTree] = useState();
    const [loading, setLoading] = useState(false);
    const [building, setBuilding] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef(null);
    const { insertNode, deleteNode, updateNode } = useTree();

    const mountEditor = (node) => {
        if (!node || editorRef.current) return;

        editorRef.current = monaco.editor.create(node, {
            model: monaco.editor.createModel(
                "",
                "rust",
                vscode.Uri.file(`app/src/main.rs`)
            ),
            theme: "vs-dark",
            automaticLayout: true,
        });
    };

    useEffect(() => {
        const loadProjectFromUrl = async () => {
            const projectId = getProjectIdFromUrl();

            if (projectId) {
                setLoading(true);
                const tree = await downloadProjectAsZip(projectId);

                setFileTree(tree);

                closeDefaultMainTab(
                    tree,
                    handleActiveEditorTabs,
                    setActiveTabs,
                    selectedTabId,
                    setSelectedTabId,
                    MAIN_DOT_RS_ID
                );

                setLoading(false);
            }
        };

        loadProjectFromUrl();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!editorRef.current) return;

        const tab = activeTabs.find((t) => t.id === selectedTabId);
        if (tab) editorRef.current.setValue(tab.content);
    }, [selectedTabId, activeTabs]);

    const handleRename = (id, newName) => {
        setFileTree(updateNode(fileTree, id, newName));
        setActiveTabs(
            activeTabs.map((tab) =>
                tab.id === id ? { ...tab, name: newName } : tab
            )
        );
    };

    const handleDelete = (id) => {
        const updatedTree = deleteNode(fileTree, id);
        setFileTree(updatedTree);
        setActiveTabs(activeTabs.filter((tab) => tab.id !== id));
    };

    const handleAddFile = (parentId, fileName) => {
        const newFile = {
            id: uuidv4(),
            type: "file",
            name: fileName,
            data: "",
        };

        setFileTree(insertNode(fileTree, parentId, newFile));
    };

    const handleAddFolder = (parentId, folderName) => {
        const newFolder = {
            id: uuidv4(),
            type: "folder",
            name: folderName,
            children: [],
        };

        const updatedTree = insertNode(fileTree, parentId, newFolder);

        const sortedTree = {
            ...updatedTree,
            children: sortTreeByTypeAndName(updatedTree.children),
        };

        setFileTree(sortedTree);
    };

    const handleCloseTab = (tabId) => {
        if (activeTabs.length === 1) return;
        if (editorRef.current && selectedTabId === tabId) {
            const currentContent = editorRef.current.getValue();

            setActiveTabs((tabs) =>
                tabs.map((tab) =>
                    tab.id === tabId ? { ...tab, content: currentContent } : tab
                )
            );
        }

        const updatedActiveEditorTabs = activeTabs.filter(
            (tab) => tab.id !== tabId
        );

        setActiveTabs(updatedActiveEditorTabs);

        if (activeTabs.length !== 1) {
            setSelectedTabId(updatedActiveEditorTabs.at(-1).id);
        } else {
            setSelectedTabId(null);
        }
    };

    const handleActiveEditorTabs = useCallback(
        async (tabId, tabName, tabData, treeOverride = null) => {
            const currentTree = treeOverride || fileTree;

            if (editorRef.current && selectedTabId) {
                const currentContent = editorRef.current.getValue();
                setActiveTabs((tabs) =>
                    tabs.map((tab) =>
                        tab.id === selectedTabId
                            ? { ...tab, content: currentContent }
                            : tab
                    )
                );
            }

            const fileNode = findFileNodeById(currentTree, tabId);
            let content = tabData ?? "";

            if (fileNode) {
                if (fileNode.data) {
                    content = fileNode.data; // ✅ Use saved in-memory content
                } else if (fileNode.file) {
                    try {
                        content = await readFileAsText(fileNode.file);
                    } catch (error) {
                        console.error("Error reading file:", error);
                        content = "Error loading file content";
                    }
                }
            }

            const newTab = {
                id: tabId,
                name: tabName,
                content,
                path: fileTree
                    ? findFilePathById(fileTree, tabId)
                    : `/${tabName}`,
            };

            const isAlreadyOpened = activeTabs.some(
                (activeTab) => activeTab.id === tabId
            );

            if (!isAlreadyOpened) {
                setActiveTabs([...activeTabs, newTab]);
            }

            setSelectedTabId(tabId);

            if (editorRef.current) {
                editorRef.current.setValue(content);
            }
        },
        [editorRef, selectedTabId, activeTabs, fileTree]
    );

    const handleSaveFile = useCallback(async () => {
        if (!editorRef.current || !selectedTabId) return;

        setSaving(true);

        const currentContent = editorRef.current.getValue();

        const projectId = getProjectIdFromUrl();

        try {
            const res = await fetch(
                `${
                    import.meta.env.VITE_BASE_URL
                }/api/projects/${projectId}/save`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content: currentContent }),
                }
            );

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Failed to format content");
            }

            const { content: formattedContent } = await res.json();

            // Update active tab content
            setActiveTabs((tabs) =>
                tabs.map((tab) =>
                    tab.id === selectedTabId
                        ? { ...tab, content: formattedContent }
                        : tab
                )
            );

            // Update file tree
            const updateFileContent = (node) => {
                if (!node) return null;
                if (node.id === selectedTabId && node.type === "file") {
                    return { ...node, data: formattedContent };
                }
                if (node.children) {
                    return {
                        ...node,
                        children: node.children.map(updateFileContent),
                    };
                }
                return node;
            };

            const updatedTree = updateFileContent(fileTree);
            setFileTree(updatedTree);

            // Update editor content
            editorRef.current.setValue(formattedContent);

            setSaving(false);
            alert("File saved and formatted successfully!");
        } catch (err) {
            console.error("Formatting failed:", err);
            alert("Formatting failed");
        }
    }, [editorRef, selectedTabId, fileTree]);

    const handleBuild = useCallback(async () => {
        setBuilding(true);
        setLoading(true);
        await uploadAsZipForBuild(fileTree);

        setBuilding(false);
        setLoading(false);
    }, [fileTree]);

    const handleTest = useCallback(async () => {
        setTesting(true);
        setLoading(true);
        const res = await uploadAsZipForTest(fileTree);

        alert(res.output);

        setTesting(false);
        setLoading(false);
    }, [fileTree]);

    return (
        <PanelGroup className="h-full" direction="horizontal">
            {loading && (
                <div className="absolute z-50 flex items-center w-full h-full justify-center bg-[#1e1e1e]/80">
                    <div className="text-white text-2xl text-center p-4">
                        Loading...
                    </div>
                </div>
            )}
            <Panel
                collapsedSize={0}
                collapsible
                defaultSize={30}
                minSize={0}
                maxSize={30}
                className="flex flex-col border-r border-r-white"
            >
                <div className="px-4 pt-3 pb-2 border-b border-b-white">
                    <h3 className="text-xs uppercase text-white">Explorer</h3>
                </div>
                <div className="p-2 overflow-auto h-full">
                    {!fileTree ? (
                        <Entry
                            setFileTree={setFileTree}
                            setActiveTabs={setActiveTabs}
                            selectedTabId={selectedTabId}
                            setSelectedTabId={setSelectedTabId}
                            handleActiveEditorTabs={handleActiveEditorTabs}
                            MAIN_DOT_RS_ID={MAIN_DOT_RS_ID}
                        />
                    ) : (
                        <FileTree
                            handleDelete={handleDelete}
                            handleAddFile={handleAddFile}
                            handleAddFolder={handleAddFolder}
                            handleRename={handleRename}
                            fileTree={fileTree}
                            handleActiveEditorTabs={handleActiveEditorTabs}
                        />
                    )}
                </div>
            </Panel>
            <PanelResizeHandle className="w-[0.1px] bg-white" />
            <Panel>
                <PanelGroup direction="vertical">
                    <Panel className="h-full">
                        <PanelGroup direction="horizontal">
                            <Panel>
                                <div className="flex overflow-x-auto scrollbar-hidden border-b border-white">
                                    {activeTabs.map((tab) => (
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
                                    className="h-full w-full relative pt-2.5"
                                    ref={mountEditor}
                                >
                                    {fileTree && (
                                        <ActionsDropdown
                                            handleSaveFile={handleSaveFile}
                                            // handleDownloadProject={
                                            //     handleDownloadProject
                                            // }
                                            handleBuild={handleBuild}
                                            building={building}
                                            handleTest={handleTest}
                                            saving={saving}
                                            // building={building}
                                            // fileTree={fileTree}
                                            // downloading={downloading}
                                            testing={testing}
                                        />
                                    )}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="w-[0.5px] bg-white" />
                            <Panel
                                collapsedSize={0}
                                collapsible
                                defaultSize={0}
                                minSize={0}
                                maxSize={100}
                            ></Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="h-1 bg-black" />
                    <Panel
                        collapsedSize={0}
                        collapsible
                        defaultSize={0}
                        minSize={0}
                        maxSize={100}
                    ></Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
    );
}
