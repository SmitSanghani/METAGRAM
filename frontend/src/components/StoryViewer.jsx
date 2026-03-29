import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Heart, Send, Star, Plus, Loader2, Volume2, VolumeX } from 'lucide-react';
import api from '@/api';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const DEFAULT_STORY_DURATION = 5000; // 5 seconds default for images

const formatTimeAgo = (date) => {
    if (!date) return 'now';
    const now = new Date();
    const then = new Date(date);
    if (isNaN(then.getTime())) return 'now';
    
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 6) return 'now';
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
};

const StoryViewer = ({ stories, onClose, onStoryViewed, onStoryDeleted, onAddStory }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [storyDuration, setStoryDuration] = useState(DEFAULT_STORY_DURATION);
    const [isPaused, setIsPaused] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const [comment, setComment] = useState("");
    const [localLikes, setLocalLikes] = useState([]);
    const [localComments, setLocalComments] = useState([]);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    const progressRef = useRef(progress);
    const isPausedRef = useRef(isPaused);
    const showActivityRef = useRef(showActivity);
    const storyDurationRef = useRef(storyDuration);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    const videoRef = useRef(null);
    const inputRef = useRef(null);

    // Keep refs in sync for the interval
    useEffect(() => {
        progressRef.current = progress;
        isPausedRef.current = isPaused;
        showActivityRef.current = showActivity;
        storyDurationRef.current = storyDuration;
    }, [progress, isPaused, showActivity, storyDuration]);

    useEffect(() => {
        if (isPaused || showActivity) return;

        const duration = storyDuration;
        const startProgress = progress;
        const startTime = Date.now();
        
        let animationFrame;
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const addedProgress = (elapsed / duration) * 100;
            const nextProgress = startProgress + addedProgress;

            if (nextProgress >= 100) {
                setProgress(100);
                handleNext();
            } else {
                setProgress(nextProgress);
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [currentIndex, isPaused, showActivity, storyDuration]);

    useEffect(() => {
        // Reset story duration on index change (progress reset handled in navigation)
        setStoryDuration(DEFAULT_STORY_DURATION);
    }, [currentIndex]);

    // Handle video play/pause sync
    useEffect(() => {
        if (videoRef.current) {
            if (isPaused || showActivity) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(() => {});
            }
        }
    }, [isPaused, showActivity, currentIndex]);

    const viewedSet = useRef(new Set()); // Track viewed story IDs locally

    // Mark as viewed on backend when index changes
    useEffect(() => {
        const currentStory = stories[currentIndex];
        const sid = currentStory?._id?.toString();
        if (sid && !viewedSet.current.has(sid)) {
            viewedSet.current.add(sid);
            api.post(`/story/${sid}/view`, {})
                .then(() => {
                    if (onStoryViewed) onStoryViewed(sid);
                }).catch(console.error);
        }
    }, [currentIndex, stories[currentIndex]?._id, onStoryViewed]);

    // Update local state when current story changes
    useEffect(() => {
        const currentStory = stories[currentIndex];
        if (currentStory) {
            setLocalLikes(currentStory.likes || []);
            setLocalComments(currentStory.comments || []);
        }
    }, [currentIndex, stories]);

    const handleLike = async (e) => {
        e.stopPropagation();
        const currentStory = stories[currentIndex];
        if (!currentStory) return;

        const isLiked = localLikes.includes(user?._id);

        // Optimistic update
        if (isLiked) {
            setLocalLikes(prev => prev.filter(id => id !== user?._id));
        } else {
            setLocalLikes(prev => [...prev, user?._id]);
        }

        try {
            await api.post(`/story/${currentStory._id}/like`, {});
        } catch (error) {
            console.error("Error liking story:", error);
            // Revert on error
            setLocalLikes(currentStory.likes || []);
        }
    };

    const handleStoryReply = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentStory = stories[currentIndex];
        if (!currentStory || !comment.trim() || !user) return;

        const replyText = comment;
        setComment("");

        try {
            const res = await api.post(`/message/send/${currentStory.userId._id}`, {
                message: replyText,
                messageType: 'story_reply',
                storyId: currentStory._id
            });

            if (inputRef.current) {
                inputRef.current.blur();
            }

            if (res.data.success) {
                toast.success("Reply sent to DM");
                // Socket is handled in App.jsx mostly, but if we need a custom event:
                // socket.emit('story_reply_send', res.data.newMessage);
            }
        } catch (error) {
            console.error("Error sending story reply:", error);
            toast.error("Failed to send reply");
        }
    };

    const handleStoryReaction = async (e) => {
        e.stopPropagation();
        const currentStory = stories[currentIndex];
        if (!currentStory || !user) return;

        // Visual feedback
        handleLike(e);

        try {
            await api.post(`/message/send/${currentStory.userId._id}`, {
                message: "❤️",
                messageType: 'story_reaction',
                storyId: currentStory._id
            });
        } catch (error) {
            console.error("Error sending story reaction:", error);
        }
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setProgress(0);
            setCurrentIndex((prev) => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setProgress(0);
            setCurrentIndex((prev) => prev - 1);
        } else {
            setProgress(0);
        }
    };

    const currentStory = stories[currentIndex];

    if (!currentStory) return null;

    const currentUserId = user?._id?.toString();
    const isOwner = currentStory.userId?._id?.toString() === currentUserId;
    const uniqueViewers = currentStory.viewers?.filter((v, i, a) => a.findIndex(t => t._id?.toString() === v._id?.toString()) === i && v._id?.toString() !== currentStory.userId?._id?.toString()) || [];

    const handleDeleteStory = async () => {
        try {
            const res = await api.delete(`/story/${currentStory._id}`);
            if (res.data.success) {
                toast.success(res.data.message);
                if (onStoryDeleted) onStoryDeleted();
                onClose(); // In a real app we'd remove it from the array without closing if there are more
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete story');
        }
    };

    // Swipe detection
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        touchStartX.current = e.targetTouches[0].clientX;
        setIsPaused(true);
    };

    const onTouchMove = (e) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        setIsPaused(false);
        if (!touchStartX.current || !touchEndX.current) return;
        
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-md overflow-hidden">
            {/* Close Button */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
                >
                    {isMuted ? <VolumeX size={24} strokeWidth={2.5} /> : <Volume2 size={24} strokeWidth={2.5} />}
                </button>
                <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
                    <X size={28} strokeWidth={2.5} />
                </button>
            </div>

            {/* Viewer Container */}
            <div
                className="relative w-full max-w-[420px] h-full max-h-[85vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col shadow-2xl"
                onMouseDown={() => !document.activeElement?.closest('input') && setIsPaused(true)}
                onMouseUp={() => !document.activeElement?.closest('input') && setIsPaused(false)}
                onMouseLeave={() => !document.activeElement?.closest('input') && setIsPaused(false)}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Progress Bars Container */}
                <div className="absolute top-0 inset-x-0 p-2 z-20 flex gap-1">
                    {stories.map((story, idx) => (
                        <div key={story._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white"
                                style={{
                                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header (User Identity) */}
                <div className="absolute top-[20px] inset-x-0 px-[12px] z-20 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-[10px] pointer-events-auto">
                        <Avatar 
                            className="w-[32px] h-[32px] border border-white/20 shadow-md cursor-pointer transition-transform active:scale-95"
                            onClick={() => navigate(`/profile/${currentStory.userId._id}`)}
                        >
                            <AvatarImage src={currentStory.userId?.profilePicture} alt="user" className="object-cover" />
                            <AvatarFallback className="bg-white text-black text-[11px] font-black">
                                {currentStory.userId?.username?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-[5px]">
                            <span 
                                className="text-white font-bold text-[14px] hover:underline cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                                onClick={() => navigate(`/profile/${currentStory.userId._id}`)}
                            >
                                {currentStory.userId?.username}
                            </span>
                            <span className="text-[13px] text-white/90 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                                • {formatTimeAgo(currentStory.createdAt)}
                            </span>
                        </div>
                        {currentStory.audience === 'closeFriends' && (
                            <div className="flex items-center gap-1 bg-[#2ecc71] rounded-full px-2 py-0.5 ml-1 shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                                <Star size={10} className="fill-white text-white" />
                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Close Friends</span>
                            </div>
                        )}
                    </div>

                    {/* Add to Story Button (Top Right Header Area) */}
                    {isOwner && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAddStory?.(); }}
                            className="pointer-events-auto p-1 text-white hover:bg-white/20 rounded-full transition-all active:scale-90"
                        >
                            <Plus size={22} className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                        </button>
                    )}
                </div>

                {/* Left Tap Area */}
                <div
                    className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                />

                {/* Right Tap Area */}
                <div
                    className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                />

                {/* Media Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full flex items-center justify-center pointer-events-none"
                    >
                        {currentStory.mediaType === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {isBuffering && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                                        <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                                    </div>
                                )}
                                <video
                                    ref={(el) => {
                                        if (el) {
                                            videoRef.current = el;
                                            if (!isPaused && !showActivity) {
                                                const playPromise = el.play();
                                                if (playPromise !== undefined) {
                                                    playPromise.catch(() => {});
                                                }
                                            }
                                        }
                                    }}
                                    key={currentStory.mediaUrl}
                                    src={currentStory.mediaUrl}
                                    autoPlay
                                    playsInline
                                    muted={isMuted}
                                    preload="auto"
                                    onLoadedMetadata={(e) => {
                                        setIsBuffering(false);
                                        if (e.target.duration && e.target.duration > 0 && e.target.duration !== Infinity) {
                                            setStoryDuration(e.target.duration * 1000);
                                        }
                                    }}
                                    onCanPlay={() => setIsBuffering(false)}
                                    onWaiting={() => setIsBuffering(true)}
                                    onPlaying={() => setIsBuffering(false)}
                                    onEnded={handleNext}
                                    className="w-full h-full object-cover rounded-none sm:rounded-2xl"
                                />
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                    src={currentStory.mediaUrl}
                                    alt="story"
                                    className="w-full h-full object-cover"
                                    onLoad={() => setIsBuffering(false)}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Bottom Bar for Non-Owners (Like & Reply) */}
                {!isOwner && (
                    <div className="absolute bottom-0 inset-x-0 p-4 pb-10 z-30 flex items-center gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                        <div className="flex-1 relative flex items-center rounded-full border border-white/30 bg-black/40 backdrop-blur-lg px-5 py-3 transition-all focus-within:bg-black/60 focus-within:border-white/50" 
                             onClick={(e) => e.stopPropagation()}
                             onMouseDown={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleStoryReply} className="w-full flex">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Send message..."
                                    className="bg-transparent text-white text-[15px] outline-none w-full placeholder:text-white/50"
                                    value={comment}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setComment(val);
                                        // Only pause if there is text being typed
                                        if (val.length > 0) setIsPaused(true);
                                        else setIsPaused(false);
                                    }}
                                    onBlur={() => setIsPaused(false)}
                                />
                                {comment.trim() && (
                                    <button type="submit" className="text-white font-bold text-sm ml-2 animate-in fade-in slide-in-from-right-2 hover:text-[#4F46E5] transition-colors">
                                        Send
                                    </button>
                                )}
                            </form>
                        </div>
                        <button onClick={handleStoryReaction} className="text-white transition-all active:scale-150 transform hover:scale-110 drop-shadow-md">
                            <Heart size={30} className={localLikes.includes(user?._id) ? "fill-red-500 text-red-500" : "text-white"} />
                        </button>
                        <button className="text-white hover:opacity-75 transition-opacity drop-shadow-md">
                            <Send size={26} />
                        </button>
                    </div>
                )}

                {/* Bottom Activity Bar for Owner */}
                {isOwner && !showActivity && (
                    <div
                        className="absolute bottom-0 inset-x-0 p-4 pb-6 z-30 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setShowActivity(true); }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {uniqueViewers.slice(0, 3).map((viewer, i) => (
                                    <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                        <AvatarImage src={viewer?.profilePicture} />
                                        <AvatarFallback>{viewer?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                            <span className="text-white text-xs font-semibold">Activity</span>
                        </div>
                        <div className="flex items-center gap-4 text-white">
                            {/* Stats indicator for owner */}
                            <div className="flex items-center gap-1">
                                <Heart size={16} className={localLikes.length > 0 ? "fill-white" : ""} />
                                <span className="text-xs font-bold">{localLikes.length}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Overlay Panel */}
                <AnimatePresence>
                    {showActivity && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute inset-x-0 bottom-0 h-[70%] z-40 bg-white dark:bg-zinc-900 rounded-t-xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
                                <span className="font-semibold flex items-center gap-2 dark:text-white">
                                    <Eye size={18} /> {uniqueViewers.length}
                                </span>
                                <div className="flex items-center gap-4">
                                    <button onClick={handleDeleteStory} className="text-black dark:text-white hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 p-2 rounded-full transition">
                                        <Trash2 size={20} />
                                    </button>
                                    <button onClick={() => setShowActivity(false)} className="hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white p-2 rounded-full transition">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-zinc-900">
                                <h4 className="font-semibold mb-4 text-sm text-gray-500 dark:text-gray-400">Viewers</h4>
                                {uniqueViewers.map((viewer, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between mb-4 cursor-pointer group/viewer"
                                        onClick={() => {
                                            onClose();
                                            navigate(`/profile/${viewer?._id}`);
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10 border border-gray-200 dark:border-zinc-800 transition-transform group-hover/viewer:scale-105">
                                                <AvatarImage src={viewer?.profilePicture} />
                                                <AvatarFallback>{viewer?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-sm dark:text-white group-hover/viewer:underline">{viewer?.username}</span>
                                        </div>
                                        {localLikes.map(id => String(id)).includes(String(viewer._id)) && (
                                            <Heart size={16} className="fill-red-500 text-red-500 animate-in zoom-in-50 duration-300" />
                                        )}
                                    </div>
                                ))}
                                {uniqueViewers.length === 0 && (
                                    <p className="text-center text-gray-500 text-sm mt-10">No views yet.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>,
        document.body
    );
};

export default StoryViewer;
