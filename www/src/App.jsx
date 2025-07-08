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
    findAncestorsById,
    findFileNodeById,
    findFilePathById,
    getProjectIdFromUrl,
    readFileAsText,
    saveOnTabChange,
    sortTreeByTypeAndName,
    uploadAsZipForBuild,
    uploadAsZipForDB,
    uploadAsZipForFormatting,
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
    const [formatting, setFormatting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [expandedFolderIds, setExpandedFolderIds] = useState([]);
    const [result, setResult] = useState("");
    const editorRef = useRef(null);
    const { insertNode, deleteNode, updateNode } = useTree();
    const fileTreeRef = useRef();

    useEffect(() => {
        fileTreeRef.current = fileTree;
    }, [fileTree]);

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
                    MAIN_DOT_RS_ID,
                    setExpandedFolderIds
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
        if (tab) {
            const model = editorRef.current.getModel?.();
            if (model && tab?.content !== undefined) {
                model.setValue(tab.content);
            }
        }
    }, [selectedTabId, activeTabs]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const projectId = getProjectIdFromUrl();
            if (fileTreeRef.current && projectId) {
                e.preventDefault();
                e.returnValue = "";

                fetch(
                    `${
                        import.meta.env.VITE_BASE_URL
                    }/api/projects/${projectId}/delete`,
                    {
                        method: "POST",
                        keepalive: true,
                    }
                );
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

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

    const handleFormat = useCallback(async () => {
        if (!editorRef.current || !selectedTabId) return;

        setFormatting(true);
        setLoading(true);

        const updatedTree = saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );

        const formattedTree = await uploadAsZipForFormatting(
            updatedTree,
            setResult
        );

        if (formattedTree) {
            setFileTree(formattedTree);

            const updatedTabs = activeTabs.map((tab) => {
                const formattedNode = findFileNodeById(formattedTree, tab.id);
                if (formattedNode?.data) {
                    if (tab.id === selectedTabId) {
                        editorRef.current.setValue(formattedNode.data);
                    }
                    return { ...tab, content: formattedNode.data };
                }
                return tab;
            });

            setActiveTabs(updatedTabs);
        }

        setFormatting(false);
        setLoading(false);
    }, [selectedTabId, fileTree, activeTabs]);

    const handleBuild = useCallback(async () => {
        setBuilding(true);
        setLoading(true);

        const updatedTree = saveOnTabChange(
            editorRef,
            setActiveTabs,
            selectedTabId,
            fileTree,
            setFileTree
        );
        await uploadAsZipForBuild(updatedTree, setResult);

        setBuilding(false);
        setLoading(false);
    }, [fileTree, selectedTabId]);

    const handleTest = useCallback(async () => {
        setTesting(true);
        setLoading(true);
        const res = await uploadAsZipForTest(fileTree);

        alert(res.output);

        setTesting(false);
        setLoading(false);
    }, [fileTree]);

    const handleUpload = useCallback(async () => {
        setUploading(true);
        setLoading(true);
        await uploadAsZipForDB(fileTree);

        alert(`Project uploaded successfully`);

        setUploading(false);
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
                defaultSize={25}
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
                            setExpandedFolderIds={setExpandedFolderIds}
                        />
                    ) : (
                        <FileTree
                            handleDelete={handleDelete}
                            handleAddFile={handleAddFile}
                            handleAddFolder={handleAddFolder}
                            handleRename={handleRename}
                            fileTree={fileTree}
                            selectedTabId={selectedTabId}
                            handleActiveEditorTabs={handleActiveEditorTabs}
                            expandedFolderIds={expandedFolderIds}
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
                                            onClick={() => {
                                                saveOnTabChange(
                                                    editorRef,
                                                    setActiveTabs,
                                                    selectedTabId,
                                                    fileTree,
                                                    setFileTree
                                                );
                                                setSelectedTabId(tab.id);
                                                const ancestorIds =
                                                    findAncestorsById(
                                                        fileTree,
                                                        tab.id
                                                    );

                                                setExpandedFolderIds(
                                                    ancestorIds
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                                <div
                                    className="h-full w-full relative pt-2.5"
                                    ref={mountEditor}
                                >
                                    {fileTree && (
                                        <ActionsDropdown
                                            handleFormat={handleFormat}
                                            handleUpload={handleUpload}
                                            handleBuild={handleBuild}
                                            building={building}
                                            handleTest={handleTest}
                                            formatting={formatting}
                                            uploading={uploading}
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
                    <PanelResizeHandle className="h-[0.5px] bg-white" />
                    <Panel
                        collapsedSize={0}
                        collapsible
                        minSize={0}
                        defaultSize={20}
                        maxSize={30}
                        className="flex flex-col"
                    >
                        <pre
                            className="whitespace-pre-wrap text-white text-xs overflow-y-scroll p-4"
                            style={{ minHeight: 0 }}
                        >
                            {result}
                        </pre>
                    </Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
    );
}
