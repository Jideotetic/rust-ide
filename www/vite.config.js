import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = new URL(".", import.meta.url).pathname
    .split("/")
    .splice(1, 6)
    .join("/");

console.log(projectRoot);

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
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
});
