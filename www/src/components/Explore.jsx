import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function Explore() {
    const [fileTree, setFileTree] = useState([]);
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);

    async function handleOpenFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const tree = await readDirectoryTree(dirHandle);
            setFileTree(tree);
        } catch (err) {
            console.error("Error reading directory:", err);
        }
    }

    async function readDirectoryTree(dirHandle, path = "") {
        const tree = [];
        for await (const [name, handle] of dirHandle.entries()) {
            if (handle.kind === "file") {
                tree.push({
                    type: "file",
                    name,
                    path: path + "/" + name,
                    handle,
                });
            } else if (handle.kind === "directory") {
                tree.push({
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

    async function handleFileClick(file) {
        const fileData = await file.handle.getFile();
        const content = await fileData.text();

        const existingTab = openTabs.find((tab) => tab.path === file.path);
        if (!existingTab) {
            setOpenTabs((prev) => [...prev, { ...file, content }]);
        }
        setActiveTab(file.path);
    }

    async function handleSaveFile() {
        const tab = openTabs.find((tab) => tab.path === activeTab);
        if (!tab || !tab.handle) return;

        const writable = await tab.handle.createWritable();
        await writable.write(tab.content);
        await writable.close();
        alert("File saved!");
    }

    function handleCreateFile() {
        const name = prompt("Enter file name:");
        if (!name) return;
        const newFile = {
            type: "file",
            name,
            path: "/" + name,
            handle: null,
        };
        setFileTree((prev) => [...prev, newFile]);
        setOpenTabs((prev) => [...prev, { ...newFile, content: "" }]);
        setActiveTab(newFile.path);
    }

    function handleCreateFolder() {
        const name = prompt("Enter folder name:");
        if (!name) return;
        const newFolder = {
            type: "folder",
            name,
            path: "/" + name,
            children: [],
        };
        setFileTree((prev) => [...prev, newFolder]);
    }

    function handleTabChange(path) {
        setActiveTab(path);
    }

    function handleEditorChange(val) {
        setOpenTabs((prev) =>
            prev.map((tab) =>
                tab.path === activeTab ? { ...tab, content: val } : tab
            )
        );
    }

    function handleCloseTab(path) {
        setOpenTabs((prev) => prev.filter((tab) => tab.path !== path));
        if (activeTab === path) {
            const remainingTabs = openTabs.filter((tab) => tab.path !== path);
            setActiveTab(
                remainingTabs.length > 0 ? remainingTabs[0].path : null
            );
        }
    }

    function renderTree(tree) {
        return (
            <ul>
                {tree.map((item, index) => (
                    <li key={index}>
                        {item.type === "folder" ? (
                            <>
                                <strong>{item.name}</strong>
                                {renderTree(item.children || [])}
                            </>
                        ) : (
                            <span
                                style={{ cursor: "pointer", color: "blue" }}
                                onClick={() => handleFileClick(item)}
                            >
                                {item.name}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        );
    }

    const currentTab = openTabs.find((tab) => tab.path === activeTab);

    return (
        <>
            <div className="h-full flex">
                <div className="min-w-50 text-white border-r border-r-vsdark-3 flex flex-col items-start p-4 h-screen overflow-auto">
                    <button onClick={handleOpenFolder}>Open Folder</button>
                    <button onClick={handleCreateFile}>+ File</button>
                    <button onClick={handleCreateFolder}>+ Folder</button>
                    {renderTree(fileTree)}
                </div>

                <div
                    className="border-2 border-red-500"
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            background: "#eee",
                            borderBottom: "1px solid #ccc",
                        }}
                    >
                        {openTabs.map((tab) => (
                            <div
                                key={tab.path}
                                onClick={() => handleTabChange(tab.path)}
                                style={{
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    backgroundColor:
                                        tab.path === activeTab
                                            ? "#ddd"
                                            : "transparent",
                                }}
                            >
                                {tab.name}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTab(tab.path);
                                    }}
                                    style={{ marginLeft: "5px" }}
                                >
                                    x
                                </button>
                            </div>
                        ))}
                        {activeTab && (
                            <button
                                onClick={handleSaveFile}
                                style={{
                                    marginLeft: "auto",
                                    marginRight: "10px",
                                }}
                            >
                                Save
                            </button>
                        )}
                    </div>
                    <Editor
                        height="100%"
                        defaultLanguage="rust"
                        value={currentTab?.content || ""}
                        onChange={handleEditorChange}
                    />
                </div>
            </div>
        </>
    );
}
