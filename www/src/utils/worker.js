import "@codingame/monaco-vscode-rust-default-extension";
import "@codingame/monaco-vscode-theme-defaults-default-extension";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import textMateWorker from "@codingame/monaco-vscode-textmate-service-override/worker?worker";

import * as monaco from "monaco-editor";
import { initialize } from "@codingame/monaco-vscode-api";
import getConfigurationServiceOverride, {
    updateUserConfiguration,
} from "@codingame/monaco-vscode-configuration-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getBaseServiceOverride from "@codingame/monaco-vscode-base-service-override";
import getHostServiceOverride from "@codingame/monaco-vscode-host-service-override";
import getExtensionServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getFilesServiceOverride from "@codingame/monaco-vscode-files-service-override";
import getQuickAccessServiceOverride from "@codingame/monaco-vscode-quickaccess-service-override";

import "vscode/localExtensionHost";
import { connectToLs } from "./lsp-client";

const workerLoaders = {
    TextEditorWorker: () => new editorWorker(),
    TextMateWorker: () => new textMateWorker(),
};

window.MonacoEnvironment = {
    getWorker: (_moduleId, label) => {
        console.log("getWorker", _moduleId, label);
        const workerFactory = workerLoaders[label];
        if (workerFactory != null) {
            return workerFactory();
        }
        throw new Error(`Worker ${label} not found`);
    },
};

await initialize({
    ...getThemeServiceOverride(),
    ...getTextMateServiceOverride(),
    ...getLanguagesServiceOverride(),
    ...getConfigurationServiceOverride(),
    ...getBaseServiceOverride(),
    ...getHostServiceOverride(),
    ...getExtensionServiceOverride(),
    ...getFilesServiceOverride(),
    ...getQuickAccessServiceOverride(),
});

await updateUserConfiguration(`{
  "workbench.colorTheme": "Default Dark Modern"
}`);

monaco.languages.onLanguage("rust", async () => {
    console.log("Rust language registered → starting LSP");
    // await connectToLs();
});
