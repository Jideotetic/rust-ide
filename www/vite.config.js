import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
// import { fileURLToPath } from "url";
// import path from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const projectRoot = new URL(".", import.meta.url).pathname
    .split("/")
    .splice(1, 6)
    .join("/");

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        viteStaticCopy({
            targets: [
                {
                    src: "node_modules/monaco-editor/esm/vs",
                    dest: "assets/monaco-editor",
                },
            ],
        }),
    ],
    server: {
        fs: {
            allow: [projectRoot],
            strict: true,
        },
        mimeTypes: {
            ".wasm": "application/wasm",
        },
        headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    monaco: ["monaco-editor"],
                },
            },
        },
    },
    worker: {
        format: "es",
    },
});
