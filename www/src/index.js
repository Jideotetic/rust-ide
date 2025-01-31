import * as monaco from "monaco-editor";
import { conf, grammar } from "../rust-grammar";

self.MonacoEnvironment = {
    getWorker: () => "monaco-editor/esm/vs/editor/editor.worker?worker",
};

export const modeId = "rust";
monaco.languages.register({
    id: modeId,
});

monaco.languages.onLanguage(modeId, async () => {
    console.log(modeId);

    monaco.languages.setLanguageConfiguration(modeId, conf);
    monaco.languages.setMonarchTokensProvider(modeId, grammar);
});
