/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { GoKebabHorizontal } from "react-icons/go";

// Replace your current format button with this dropdown component
const ActionsDropdown = ({ handleFormat }) => {
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
            case "format":
                handleFormat();
                break;
            case "test":
                console.log("Running tests...");
                // Add your test logic here
                break;
            case "build":
                console.log("Building project...");
                // Add your build logic here
                break;
            default:
                break;
        }
    };

    return (
        <div
            className="p-2 bg-green-700 text-white absolute rounded bottom-10 right-4 z-50 cursor-pointer hover:bg-green-600 flex items-center gap-1"
            ref={dropdownRef}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                // className="p-2 bg-green-700 text-white absolute rounded bottom-10 right-4 z-50 cursor-pointer hover:bg-green-600 flex items-center gap-1"
            >
                {/* <span>Actions</span> */}
                <GoKebabHorizontal size={14} />
            </button>

            {isOpen && (
                <div className="absolute bottom-14 right-4 bg-[#1e1e1e] shadow-lg rounded border border-gray-600 z-50 min-w-32">
                    <button
                        onClick={() => handleAction("format")}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                    >
                        Format
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
                </div>
            )}
        </div>
    );
};

export default ActionsDropdown;
