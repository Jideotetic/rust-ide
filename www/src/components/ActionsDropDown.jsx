/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { GoKebabHorizontal } from "react-icons/go";

// Replace your current format button with this dropdown component
const ActionsDropdown = ({
    handleSaveFile,
    handleDownloadProject,
    handleBuild,
    handleTest,
    saving,
    building,
    fileTree,
    downloading,
    testing,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        switch (action) {
            case "download":
                handleDownloadProject();
                break;
            case "test":
                handleTest();
                break;
            case "build":
                handleBuild();
                break;
            case "save":
                handleSaveFile();
                break;
            default:
                break;
        }
    };

    return (
        <div
            className="p-2 bg-green-700 text-white absolute rounded bottom-10 right-4 z-40 hover:bg-green-600 flex items-center gap-1"
            ref={dropdownRef}
        >
            {saving ? (
                "Saving file..."
            ) : building ? (
                "Building..."
            ) : downloading ? (
                "Downloading"
            ) : testing ? (
                "Running test..."
            ) : (
                <>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full block cursor-pointer"
                    >
                        <GoKebabHorizontal />
                    </button>

                    {isOpen && (
                        <div className="absolute bottom-14 right-4 bg-[#1e1e1e] shadow-lg rounded border border-gray-600 z-50 min-w-32">
                            <button
                                onClick={() => handleAction("download")}
                                disabled={!fileTree}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Download
                            </button>
                            <button
                                onClick={() => handleAction("test")}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Test
                            </button>
                            <button
                                onClick={() => handleAction("build")}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Build
                            </button>
                            <button
                                onClick={() => handleAction("save")}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ActionsDropdown;
