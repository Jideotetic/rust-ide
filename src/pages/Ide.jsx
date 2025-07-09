import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import TabButton from "../components/TabButton.jsx";
import ActionsDropdown from "../components/ActionsDropDown.jsx";
import {
	closeDefaultMainTab,
	downloadProjectAsZip,
	findFileNodeById,
	findFilePathById,
	getProjectIdFromUrl,
	readFileAsText,
} from "../utils/utils.js";
import * as monaco from "monaco-editor";
import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";
import Explorer from "../components/Explorer.jsx";

const MAIN_DOT_RS_ID = uuidv4();

const initialMainRsContent = `fn main() {\n    println!("Hello, World!");\n}`;

export default function IDE() {
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
	const [expandedFolderIds, setExpandedFolderIds] = useState([]);
	const [result, setResult] = useState("");
	const editorRef = useRef(null);
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
					`${import.meta.env.VITE_BASE_URL}/api/projects/${projectId}/delete`,
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

	const handleActiveEditorTabs = useCallback(
		async (tabId, tabName, tabData, treeOverride = null) => {
			const currentTree = treeOverride || fileTree;

			if (editorRef.current && selectedTabId) {
				const currentContent = editorRef.current.getValue();
				setActiveTabs((tabs) =>
					tabs.map((tab) =>
						tab.id === selectedTabId ? { ...tab, content: currentContent } : tab
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
		},
		[editorRef, selectedTabId, activeTabs, fileTree]
	);

	return (
		<PanelGroup className="h-full" direction="horizontal">
			{loading && (
				<div className="absolute z-50 flex items-center w-full h-full justify-center bg-[#1e1e1e]/80">
					<div className="text-white text-xl text-center p-4">Loading...</div>
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
				<Explorer
					setFileTree={setFileTree}
					fileTree={fileTree}
					setActiveTabs={setActiveTabs}
					activeTabs={activeTabs}
					selectedTabId={selectedTabId}
					setSelectedTabId={setSelectedTabId}
					handleActiveEditorTabs={handleActiveEditorTabs}
					MAIN_DOT_RS_ID={MAIN_DOT_RS_ID}
					setExpandedFolderIds={setExpandedFolderIds}
					expandedFolderIds={expandedFolderIds}
				/>
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
											activeTabs={activeTabs}
											editorRef={editorRef}
											selectedTabId={selectedTabId}
											setActiveTabs={setActiveTabs}
											setSelectedTabId={setSelectedTabId}
											isSelected={tab.id === selectedTabId}
											fileTree={fileTree}
											setFileTree={setFileTree}
											setExpandedFolderIds={setExpandedFolderIds}
										/>
									))}
								</div>
								<div
									className="h-full w-full relative pt-2.5"
									ref={mountEditor}
								>
									{fileTree && (
										<ActionsDropdown
											formatting={formatting}
											building={building}
											testing={testing}
											setFormatting={setFormatting}
											setLoading={setLoading}
											editorRef={editorRef}
											selectedTabId={selectedTabId}
											setActiveTabs={setActiveTabs}
											fileTree={fileTree}
											setFileTree={setFileTree}
											setResult={setResult}
											activeTabs={activeTabs}
											setBuilding={setBuilding}
											setTesting={setTesting}
											setExpandedFolderIds={setExpandedFolderIds}
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
