/* eslint-disable react/prop-types */
import { BiFolderOpen } from "react-icons/bi";
import { FiFilePlus, FiArrowRight } from "react-icons/fi";

function Entry({ handleOpenFolder, handleOpenFile }) {
    return (
        <div className="w-full h-full flex justify-center items-center flex-col gap-8">
            <div className="flex flex-col justify-center items-center gap-2 text-sm text-white">
                <div className="flex items-center justify-around px-4 py-2 gap-4">
                    <FiFilePlus className="text-8xl" />
                    <FiArrowRight className="text-4xl" />
                    <BiFolderOpen className="text-8xl" />
                </div>
                <p>
                    Open a new{" "}
                    <button
                        onClick={handleOpenFile}
                        className="text-blue-500 cursor-pointer"
                    >
                        file
                    </button>{" "}
                    or{" "}
                    <button
                        onClick={handleOpenFolder}
                        className="text-blue-500 cursor-pointer"
                    >
                        folder
                    </button>{" "}
                    to get started.
                </p>
            </div>
        </div>
    );
}

export default Entry;
