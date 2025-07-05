/* eslint-disable react/prop-types */

import { FiFile } from "react-icons/fi";
import { IoIosClose } from "react-icons/io";

export default function TabButton({
    tab,
    isSelected,
    onClick,
    handleCloseTab,
}) {
    const activeClass = isSelected
        ? "bg-black text-white"
        : "bg-transparent text-white";

    return (
        <div
            role="button"
            onClick={onClick}
            className={`${activeClass} cursor-pointer px-4 py-2 text-xs border-r border-b flex items-center gap-3 hover:bg-black`}
        >
            <div className="flex items-center gap-1.5">
                <span className="flex items-center">
                    <FiFile size={12} />
                </span>
                <span>{tab.name}</span>
            </div>
            <button
                className="min-w-5 min-h-5  cursor-pointer flex justify-center transition active:translate-y-[1px] items-center"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                }}
            >
                <IoIosClose size={12} />
            </button>
        </div>
    );
}
