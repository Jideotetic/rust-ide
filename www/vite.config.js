import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
        include: ["vscode-textmate", "vscode-oniguruma"],
        esbuildOptions: {
            plugins: [importMetaUrlPlugin],
        },
    },
    worker: {
        format: "es",
    },
    build: {
        target: "esnext",
    },
});
