export class VirtualFS {
    constructor() {
        this.files = this.loadFromLocalStorage() || {};
        this.currentProject = null;
    }

    // Save state to localStorage
    persist() {
        localStorage.setItem("virtual-file-server", JSON.stringify(this.files));
    }

    // Load state from localStorage
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem("virtual-file-server");
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error("Failed to load from local storage", error);
            return null;
        }
    }

    initNewProject() {
        this.files = {};
        this.currentProject = {
            id: "project_" + Date.now(),
            name: "Untitled Project",
            root: null,
        };
        this.persist();
    }

    // File operations
    getFile(id) {
        return this.files[id];
    }

    createFile(parentId, name, content = "") {
        const id = `${parentId}/${name}`;
        this.files[id] = {
            id,
            type: "file",
            name,
            content,
        };

        // Add to parent's children
        if (this.files[parentId]) {
            this.files[parentId].children = [
                ...(this.files[parentId].children || []),
                id,
            ];
        }

        this.persist();
        return this.files[id];
    }

    createFolder(parentId, name) {
        const id = parentId ? `${parentId}/${name}` : name;
        this.files[id] = {
            id,
            type: "folder",
            name,
            children: [],
        };

        if (!parentId) {
            this.currentProject.root = id;
        }

        // Add to parent's children
        if (this.files[parentId]) {
            this.files[parentId].children = [
                ...(this.files[parentId].children || []),
                id,
            ];
        }

        this.persist();
        return this.files[id];
    }

    rename(id, newName) {
        const item = this.files[id];
        if (item) {
            item.name = newName;
            this.persist();
        }
        return item;
    }

    uploadFiles(parentId, files) {
        const uploaded = [];

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const filePath = parentId
                    ? `${parentId}/${file.name}`
                    : file.name;
                this.files[filePath] = {
                    id: filePath,
                    type: "file",
                    name: file.name,
                    content: event.target.result,
                };

                if (parentId && this.files[parentId]) {
                    this.files[parentId].children = [
                        ...(this.files[parentId].children || []),
                        filePath,
                    ];
                }

                uploaded.push(this.files[filePath]);
                this.persist();
            };
            reader.readAsText(file);
        });

        return uploaded;
    }

    delete(id) {
        const item = this.files[id];
        if (item) {
            // Recursively delete children if folder
            if (item.type === "folder" && item.children) {
                item.children.forEach((childId) => this.delete(childId));
            }

            // Remove from parent's children
            const parentId = id.split("/").slice(0, -1).join("/");
            if (this.files[parentId]) {
                this.files[parentId].children = this.files[
                    parentId
                ].children.filter((childId) => childId !== id);
            }

            delete this.files[id];
            this.persist();
        }
    }

    updateContent(id, content) {
        const file = this.files[id];
        if (file && file.type === "file") {
            file.content = content;
            this.persist();
        }
    }
}

// Singleton instance
export const virtualFS = new VirtualFS();
