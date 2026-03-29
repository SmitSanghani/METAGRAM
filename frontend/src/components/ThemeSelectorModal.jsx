import React from 'react';
import { THEMES } from '@/utils/themes';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeSelectorModal = ({ isOpen, onClose, onSelect, currentTheme }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-black text-[#262626] tracking-tight">Chat Theme</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest px-1">Choose a background</p>
                            <div className="grid grid-cols-2 gap-3">
                                {THEMES.map((theme) => {
                                    const isSelected = currentTheme?.id === theme.id;
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                onSelect(theme);
                                                onClose();
                                            }}
                                            className={`group relative aspect-[4/5] rounded-[24px] overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-95' : 'border-transparent hover:border-gray-200'}`}
                                        >
                                            {theme.backgroundImage ? (
                                                <img
                                                    src={theme.backgroundImage}
                                                    alt={theme.name}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-400">Default</span>
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            
                                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                                <span className="text-[11px] font-black text-white truncate drop-shadow-md uppercase tracking-tighter">{theme.name}</span>
                                                {isSelected && (
                                                    <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                                        <Check size={10} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>

                                            {!theme.backgroundImage && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-[2px]">
                                                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-[#262626] shadow-sm uppercase">Select</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                             <p className="text-[11px] text-gray-400 font-medium text-center italic">
                                Theme updates instantly for everyone in the chat
                             </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ThemeSelectorModal;
