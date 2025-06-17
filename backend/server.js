import express from "express";
import bodyParser from "body-parser";
import fs from "fs/promises";
import { exec } from "child_process";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { promisify } from "util";
import cors from "cors";

const execAsync = promisify(exec);
const app = express();
const port = 4000;

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);
app.use(bodyParser.text({ type: "*/*" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTempRustProject(code) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rustfmt-"));
    const projectDir = path.join(tempDir, "proj");

    // Step 1: Create a new cargo project
    await execAsync(`cargo init ${projectDir} --bin`);

    // Step 2: Overwrite the main.rs file
    const mainFilePath = path.join(projectDir, "src", "main.rs");
    await fs.writeFile(mainFilePath, code);

    // Step 3: Run cargo fmt
    await execAsync(`cargo fmt`, { cwd: projectDir });

    // Step 4: Read back the formatted code
    const formattedCode = await fs.readFile(mainFilePath, "utf8");

    return formattedCode;
}

app.post("/format", async (req, res) => {
    const code = req.body;

    console.log(code);

    try {
        const formatted = await createTempRustProject(code);
        console.log(formatted);
        res.send(formatted);
    } catch (err) {
        console.error("Formatting failed:", err);
        res.status(500).send("Formatting error.");
    }
});

app.listen(port, () => {
    console.log(`cargo fmt backend running at http://localhost:${port}`);
});
