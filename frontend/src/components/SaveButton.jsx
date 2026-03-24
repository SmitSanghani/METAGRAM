import { FaBookmark, FaRegBookmark } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';

const SaveButton = ({ isSaved, onClick, size = 22, className = "" }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`relative flex items-center justify-center focus:outline-none transition-all duration-300 transform active:scale-75 ${className}`}
            aria-label={isSaved ? "Unsave post" : "Save post"}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={isSaved ? "saved" : "unsaved"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center justify-center"
                >
                    {isSaved ? (
                        <FaBookmark
                            size={size}
                            color="#000000"
                            className="transition-all"
                        />
                    ) : (
                        <FaRegBookmark
                            size={size}
                            color="#000000"
                            className="transition-all opacity-90"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Subtle micro-animation ring on save */}
            {isSaved && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 rounded-full bg-black/10 pointer-events-none"
                />
            )}
        </button>
    );
};

export default SaveButton;
