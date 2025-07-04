import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Entry from "./components/Entry.jsx";
import FileTree from "./components/FileTree.jsx";
import useTree from "./hooks/useTree.js";
import TabButton from "./components/TabButton.jsx";
import ActionsDropdown from "./components/ActionsDropDown.jsx";
import {
    findFileNodeById,
    findFilePathById,
    readFileAsText,
    sortTreeByTypeAndName,
} from "./utils/utils.js";
import * as monaco from "monaco-editor";
import * as vscode from "vscode";

const UNTITLED_ID = "62d83479-32c6-45db-bc52-054482a5fa38";

export default function App() {
    const [activeTabs, setActiveTabs] = useState([
        {
            content: `fn main() {\n println!("Hello, World!" );\n}`,
            id: UNTITLED_ID,
            name: "main.rs",
            path: "main.rs",
        },
    ]);
    const [selectedTabId, setSelectedTabId] = useState(UNTITLED_ID);
    const [fileTree, setFileTree] = useState(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const editorRef = useRef(null);
    const { insertNode, deleteNode, updateNode } = useTree();

    const mountEditor = useCallback(async (node) => {
        if (!node || editorRef.current) return;

        editorRef.current = monaco.editor.create(node, {
            model: monaco.editor.createModel(
                ``,
                "rust",
                vscode.Uri.file(`root/sorobuild-ide-backend/src/main.rs`)
            ),
            theme: "vs-dark",
            automaticLayout: true,
        });
    }, []);

    useEffect(() => {
        if (!editorRef.current) return;

        const tab = activeTabs.find((t) => t.id === selectedTabId);
        if (tab) editorRef.current.setValue(tab.content ?? "");
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
            id: Date.now(),
            type: "file",
            name: fileName,
            data: "",
        };

        setFileTree(insertNode(fileTree, parentId, newFile));

        // handleActiveEditorTabs(newFile.id, newFile.name, newFile.data);
    };

    const handleAddFolder = (parentId, folderName) => {
        const newFolder = {
            id: Date.now(),
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

    const handleActiveEditorTabs = async (tabId, tabName, tabData) => {
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

        const fileNode = findFileNodeById(fileTree, tabId);
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
            path: fileTree ? findFilePathById(fileTree, tabId) : `/${tabName}`,
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
    };

    const handleSaveFile = useCallback(() => {
        if (!editorRef.current || !selectedTabId || !fileTree) return;

        const updatedContent = editorRef.current.getValue();

        // Update active tab content
        setActiveTabs((tabs) =>
            tabs.map((tab) =>
                tab.id === selectedTabId
                    ? { ...tab, content: updatedContent }
                    : tab
            )
        );

        // Update fileTree
        const updateFileContent = (node) => {
            if (!node) return null;
            if (node.id === selectedTabId && node.type === "file") {
                return { ...node, data: updatedContent };
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

        console.log(`Saved content for file ID: ${selectedTabId}`);
    }, [editorRef, selectedTabId, fileTree]);

    return (
        <PanelGroup className="h-full" direction="horizontal">
            <Panel
                collapsedSize={0}
                collapsible
                style={{ width: "280px", minWidth: "280px", maxWidth: "280px" }}
                className="flex flex-col border-r border-r-white"
            >
                <div className="px-4 pt-3 pb-2 border-b border-b-white">
                    <h3 className="text-xs uppercase text-white">Explorer</h3>
                </div>
                <div className="p-2 overflow-auto h-full">
                    {loadingFiles ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                            <div className="border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin" />
                        </div>
                    ) : !fileTree ? (
                        <Entry
                            setFileTree={setFileTree}
                            setLoadingFiles={setLoadingFiles}
                        />
                    ) : (
                        <FileTree
                            handleDelete={handleDelete}
                            handleAddFile={handleAddFile}
                            handleAddFolder={handleAddFolder}
                            handleRename={handleRename}
                            fileTree={fileTree}
                            loadingFiles={loadingFiles}
                            handleActiveEditorTabs={handleActiveEditorTabs}
                        />
                    )}
                </div>
            </Panel>
            <PanelResizeHandle className="w-[0.1px] bg-white" />
            <Panel>
                {activeTabs.length === 0 ? (
                    <Entry
                        setFileTree={setFileTree}
                        setLoadingFiles={setLoadingFiles}
                    />
                ) : (
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
                                                // handleBuild={handleBuild}
                                                // handleTest={handleTest}
                                                // saving={saving}
                                                // building={building}
                                                // fileTree={fileTree}
                                                // downloading={downloading}
                                                // testing={testing}
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
                )}
            </Panel>
        </PanelGroup>
    );
}
