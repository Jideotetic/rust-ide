import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
                    src: "node_modules/monaco-editor/min/vs",
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
            "Cross-Origin-Resource-Policy": "same-site",
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
        target: "esnext",
    },
    worker: {
        format: "es",
    },
});
