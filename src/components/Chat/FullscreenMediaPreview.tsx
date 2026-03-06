import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface FullscreenMediaPreviewProps {
    activePreview: { url: string; type: 'image' | 'video' } | null;
    onClose: () => void;
}

const FullscreenMediaPreview: React.FC<FullscreenMediaPreviewProps> = ({ activePreview, onClose }) => {
    return (
        <AnimatePresence>
            {activePreview && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10"
                    onClick={onClose}
                >
                    <motion.button
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-[110]"
                    >
                        <X className="w-5 h-5" />
                    </motion.button>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {activePreview.type === 'image' ? (
                            <img
                                src={activePreview.url}
                                alt="Fullscreen preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/5"
                            />
                        ) : (
                            <video
                                src={activePreview.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-white/5"
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FullscreenMediaPreview;
