import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video, UserPlus, Check, Globe, Users, Search, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import api from '@/api';
import { toast } from 'sonner';

const StoryUploadModal = ({ isOpen, onClose, user, onUploadSuccess }) => {
    const [step, setStep] = useState(1); // 1: Select/Preview, 2: Audience
    const [files, setFiles] = useState([]); // Array of {file, previewUrl, type}
    const [activeIndex, setActiveIndex] = useState(0);
    const [caption, setCaption] = useState("");
    const [audience, setAudience] = useState('all'); // 'all' or 'closeFriends'
    const [isUploading, setIsUploading] = useState(false);

    const [followers, setFollowers] = useState([]);
    const [closeFriends, setCloseFriends] = useState(user?.closeFriends || []);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && step === 2) {
            fetchFollowers();
        }
    }, [isOpen, step, user?._id]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            // Revoke any existing URLs from previous session
            files.forEach(f => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
            
            setFiles([]);
            setStep(1);
            setActiveIndex(0);
            setCaption("");
            setAudience('all');
            setIsUploading(false);
            setSearchTerm("");
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [isOpen]);

    const filesRef = useRef(files);
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    useEffect(() => {
        return () => {
            filesRef.current.forEach(f => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
    }, []);

    const fetchFollowers = async () => {
        try {
            setIsLoadingFollowers(true);
            const authUserId = user?._id || user?.id;
            if (!authUserId) return;

            const res = await api.get(`/user/${authUserId}/profile`);

            if (res.data.success) {
                const profileUser = res.data.user;

                // STRICT RULE: Only real followers are allowed to appear
                const rawFollowers = profileUser.followers || [];

                // Deduplicate and process
                const uniqueFollowersMap = new Map();
                rawFollowers.forEach(follower => {
                    // We need at least an ID and a username to show something meaningful
                    const id = (follower?._id || follower)?.toString();
                    if (id && id !== authUserId.toString()) {
                        // Only add if we have the object details (populated)
                        if (typeof follower === 'object' && follower.username) {
                            uniqueFollowersMap.set(id, follower);
                        }
                    }
                });

                setFollowers(Array.from(uniqueFollowersMap.values()));
                setCloseFriends(profileUser.closeFriends || []);
            }
        } catch (error) {
            console.error("Error fetching followers list:", error);
        } finally {
            setIsLoadingFollowers(false);
        }
    };

    const toggleCloseFriend = async (friendId) => {
        try {
            const res = await api.post(`/story/close-friends`, { targetId: friendId });
            if (res.data.success) {
                const isAdded = res.data.isCloseFriend;
                if (isAdded) {
                    setCloseFriends(prev => [...prev, friendId]);
                } else {
                    setCloseFriends(prev => prev.filter(id => (id._id || id).toString() !== friendId.toString()));
                }
            }
        } catch (error) {
            toast.error("Failed to update Close Friends");
        }
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const currentTotal = files.length;
        const availableSlots = 10 - currentTotal;

        if (availableSlots <= 0) {
            toast.warning("Maximum 10 items allowed.");
            return;
        }

        const filesToAdd = selectedFiles.slice(0, availableSlots);
        if (selectedFiles.length > availableSlots) {
            toast.warning(`Only ${availableSlots} more items could be added.`);
        }

        const newItems = [];
        for (const file of filesToAdd) {
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            const blobUrl = URL.createObjectURL(file);

            if (type === 'video') {
                try {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    
                    const duration = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
                        video.onloadedmetadata = () => {
                            clearTimeout(timeout);
                            resolve(video.duration);
                        };
                        video.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error("Failed to load video"));
                        };
                        video.src = blobUrl;
                    });

                    if (duration > 61) {
                        toast.error(`${file.name} is too long. Max 1 minute allowed.`);
                        URL.revokeObjectURL(blobUrl);
                        continue;
                    }
                } catch (err) {
                    console.error("Video processing error:", err);
                    toast.error(`Could not process ${file.name}`);
                    URL.revokeObjectURL(blobUrl);
                    continue;
                }
            }

            newItems.push({
                file,
                previewUrl: blobUrl,
                type
            });
        }

        if (newItems.length === 0) return;

        const updatedFiles = [...files, ...newItems];
        setFiles(updatedFiles);
        setActiveIndex(files.length); // Focus on the first newly added item
        setStep(1);
        e.target.value = '';
    };

    const removeFile = (index) => {
        const fileToRemove = files[index];
        URL.revokeObjectURL(fileToRemove.previewUrl);

        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);

        if (activeIndex >= newFiles.length) {
            setActiveIndex(Math.max(0, newFiles.length - 1));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        files.forEach(item => formData.append('media', item.file));
        formData.append('audience', audience);
        formData.append('caption', caption);

        try {
            const res = await api.post('/story/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                toast.success("Stories uploaded!");
                onUploadSuccess();
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const filteredFollowers = followers.filter(f =>
        f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 w-full max-w-[450px] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-20">
                    <button
                        onClick={() => step === 2 ? setStep(1) : onClose()}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <X size={24} className="dark:text-white" strokeWidth={2} />
                    </button>
                    <h3 className="font-bold text-[16px] dark:text-white">
                        {step === 1 ? "Create Story" : "Audience"}
                    </h3>
                    {files.length > 0 ? (
                        <Button
                            variant="ghost"
                            className="text-[#0095F6] font-bold hover:bg-transparent text-[14px] px-2"
                            onClick={() => step === 1 ? setStep(2) : handleUpload()}
                            disabled={isUploading}
                        >
                            {step === 1 ? "Next" : "Share"}
                        </Button>
                    ) : <div className="w-8"></div>}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950 no-scrollbar relative min-h-[300px]">
                    {/* Uploading Overlay */}
                    <AnimatePresence>
                        {isUploading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                            >
                                <Loader2 className="w-10 h-10 text-[#0095F6] animate-spin mb-4" />
                                <h4 className="text-[18px] font-bold dark:text-white">Uploading story...</h4>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                                <ImageIcon size={48} className="text-gray-400" strokeWidth={1} />
                            </div>
                            <h4 className="text-[20px] font-medium mb-2 dark:text-white">Add photos and videos</h4>
                            <p className="text-gray-500 text-[14px] mb-8">Up to 10 photos and videos at once.</p>
                            <Button className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold rounded-lg px-8 py-2 h-auto" onClick={() => fileInputRef.current.click()}>
                                Select from computer
                            </Button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {step === 1 ? (
                                <div className="p-4 space-y-6 flex-1 flex flex-col min-h-0">
                                    {/* Main Preview */}
                                    <div className="relative aspect-[9/14] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-black shadow-2xl flex-shrink-0">
                                        {files[activeIndex].type === 'video' ? (
                                            <video src={files[activeIndex].previewUrl} autoPlay loop muted className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={files[activeIndex].previewUrl} alt="preview" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent pointer-events-none"></div>
                                        <div className="absolute top-4 left-4 flex items-center gap-2">
                                            <Avatar className="w-8 h-8 border border-white">
                                                <AvatarImage src={user?.profilePicture} />
                                                <AvatarFallback className="bg-gray-200">U</AvatarFallback>
                                            </Avatar>
                                            <span className="text-white text-xs font-bold shadow-sm">{user?.username}</span>
                                        </div>
                                    </div>

                                    {/* Thumbnail Strip */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-2">
                                        {files.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`relative flex-shrink-0 w-14 h-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${activeIndex === idx ? 'border-[#0095F6] scale-105' : 'border-transparent'}`}
                                                onClick={() => setActiveIndex(idx)}
                                            >
                                                {item.type === 'video' ? (
                                                    <video src={item.previewUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={item.previewUrl} className="w-full h-full object-cover" />
                                                )}
                                                <button
                                                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80"
                                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {files.length < 10 && (
                                            <button
                                                className="flex-shrink-0 w-14 h-24 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                                onClick={() => fileInputRef.current.click()}
                                            >
                                                <Plus size={24} className="text-gray-400" />
                                            </button>
                                        )}
                                    </div>

                                    <textarea
                                        placeholder="Add a caption..."
                                        className="w-full bg-[#FAFAFA] dark:bg-zinc-900 dark:text-white rounded-xl p-4 text-sm outline-none resize-none focus:ring-1 focus:ring-[#0095F6] border border-gray-100 dark:border-zinc-800"
                                        rows={2}
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
                                    <div className="p-5 space-y-5">
                                        <div className="space-y-3">
                                            {/* Everyone Card */}
                                            <div
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${audience === 'all' ? 'border-[#0095F6] bg-blue-50/10' : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                                onClick={() => setAudience('all')}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${audience === 'all' ? 'bg-[#0095F6] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                                                        <Globe size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[15px] dark:text-white">Everyone</p>
                                                        <p className="text-[13px] text-gray-500">Visible to all your followers</p>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${audience === 'all' ? 'bg-[#0095F6] border-[#0095F6]' : 'border-gray-300 dark:border-zinc-700'}`}>
                                                    <AnimatePresence>
                                                        {audience === 'all' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                <Check size={14} className="text-white" strokeWidth={4} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Close Friends Card */}
                                            <div
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${audience === 'closeFriends' ? 'border-[#2ecc71] bg-[#2ecc71]/10' : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                                onClick={() => setAudience('closeFriends')}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${audience === 'closeFriends' ? 'bg-[#2ecc71] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                                                        <Users size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[15px] dark:text-white">Close Friends</p>
                                                        <p className="text-[13px] text-gray-500">Only people on your list</p>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${audience === 'closeFriends' ? 'bg-[#2ecc71] border-[#2ecc71]' : 'border-gray-300 dark:border-zinc-700'}`}>
                                                    <AnimatePresence>
                                                        {audience === 'closeFriends' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                <Check size={14} className="text-white" strokeWidth={4} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Follower List for Close Friends Selection */}
                                    <AnimatePresence>
                                        {audience === 'closeFriends' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex-1 flex flex-col bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800 overflow-hidden"
                                            >
                                                <div className="p-4 bg-white dark:bg-zinc-950 sticky top-0 z-10">
                                                    <div className="relative">
                                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search followers..."
                                                            className="w-full bg-gray-50 dark:bg-zinc-900 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0095F6] dark:text-white transition-all"
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto max-h-[35vh] px-2 pb-4 space-y-1 custom-scrollbar">
                                                    {isLoadingFollowers ? (
                                                        <div className="flex justify-center p-8">
                                                            <div className="w-6 h-6 border-2 border-[#2ecc71] border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    ) : followers.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                                            <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110">
                                                                <Users size={32} className="text-gray-300" strokeWidth={1.5} />
                                                            </div>
                                                            <p className="text-gray-500 font-medium text-[15px]">No friends found</p>
                                                            <p className="text-gray-400 text-xs mt-1">Following others will show them here</p>
                                                        </div>
                                                    ) : filteredFollowers.length === 0 ? (
                                                        <p className="text-center text-gray-500 text-sm py-10">No matches found</p>
                                                    ) : (
                                                        filteredFollowers.map((friend) => {
                                                            const friendId = friend?._id?.toString();
                                                            const isCF = closeFriends.some(id => {
                                                                const cid = (id?._id || id)?.toString();
                                                                return cid === friendId;
                                                            });
                                                            return (
                                                                <motion.div
                                                                    layout
                                                                    key={friendId}
                                                                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer group"
                                                                    onClick={() => toggleCloseFriend(friendId)}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative">
                                                                            <Avatar className="w-11 h-11 border border-gray-100 dark:border-zinc-800 transition-transform group-hover:scale-105">
                                                                                <AvatarImage src={friend.profilePicture} className="object-cover" />
                                                                                <AvatarFallback className="bg-gray-100 dark:bg-zinc-800">{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
                                                                            </Avatar>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-sm dark:text-white">{friend.username}</p>
                                                                            <p className="text-[12px] text-gray-500">{friend.fullName || "Your Follower"}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCF ? 'bg-[#2ecc71] border-[#2ecc71] scale-110' : 'border-gray-300 dark:border-zinc-700'}`}>
                                                                        <AnimatePresence>
                                                                            {isCF && (
                                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                                    <Check size={12} className="text-white" strokeWidth={4} />
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={handleFileSelect} />
            </motion.div>
        </div>,
        document.body
    );
};

export default StoryUploadModal;
