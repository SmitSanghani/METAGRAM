import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { Heart, MessageCircle, Eye, Video, MoreHorizontal, Send, Grid, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { setPosts, setSelectedPost } from '@/redux/postSlice';
import { updateReelLikes } from '@/redux/reelSlice';
import { toast } from 'sonner';
import CommentDialog from './CommentDialog';
import SharePostModal from './SharePostModal';
import PostModal from './PostModal';

const FeedCard = ({ item, type = 'post', onDelete }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);
    const [openComment, setOpenComment] = useState(false);
    const [openPost, setOpenPost] = useState(false);
    const [openShare, setOpenShare] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const carouselRef = useRef(null);
    const images = (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []);
    const hasMultipleImages = images.length > 1;

    // Preload images
    useEffect(() => {
        if (hasMultipleImages) {
            images.forEach(src => {
                const img = new Image();
                img.src = src;
            });
        }
    }, [images, hasMultipleImages]);

    const lastScrollTime = useRef(0);

    // Improved wheel listener for touchpad horizontal swipe
    useEffect(() => {
        const el = carouselRef.current;
        if (!el || !hasMultipleImages) return;

        const handleWheel = (e) => {
            if (!isHovered) return;

            // Detect horizontal swipe or vertical scroll as fallback
            const dx = Math.abs(e.deltaX);
            const dy = Math.abs(e.deltaY);
            const isHorizontal = dx > dy;

            // If it's a significant movement, prevent page scroll and handle navigation
            if (dx > 5 || dy > 5) {
                // Prevent page scroll to allow image cycling without jumping the page
                e.preventDefault();

                const now = Date.now();
                if (now - lastScrollTime.current < 250) return; // Cooldown to prevent wild spinning

                const threshold = 15;
                if (dx > threshold || dy > threshold) {
                    if (isHorizontal) {
                        if (e.deltaX > 0) {
                            setCurrentIndex(prev => (prev + 1) % images.length);
                        } else {
                            setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
                        }
                    } else {
                        // Keep deltaY as alternative for those without horizontal tilt/swipe
                        if (e.deltaY > 0) {
                            setCurrentIndex(prev => (prev + 1) % images.length);
                        } else {
                            setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
                        }
                    }
                    lastScrollTime.current = now;
                }
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [hasMultipleImages, isHovered, images.length]);

    // Common data mapping
    const isReel = type === 'reel';
    const author = item.author;
    const mediaUrl = isReel ? item.thumbnailUrl || item.videoUrl : item.image;
    const likes = item.likes || [];
    const liked = likes.some(id => (id._id || id) === user?._id);
    const likeCount = likes.length || 0;
    const commentCount = item.comments?.length || 0;
    const viewCount = isReel ? item.viewsCount || 0 : null;

    const handleLike = async (e) => {
        e.stopPropagation();
        
        // Optimistic values for rollback
        const previousPosts = [...posts];
        const wasLiked = liked;
        const previousItem = { ...item };

        try {
            const action = wasLiked ? "dislike" : "like";
            const endpoint = isReel ? `/reels/like/${item._id}` : `/post/${item._id}/${action}`;

            // 1. Optimistic Update UI (Update Redux immediately)
            if (!isReel) {
                const updatedPostData = posts.map(p =>
                    p._id === item._id ? {
                        ...p,
                        likes: wasLiked ? p.likes.filter(id => (id._id || id) !== user._id) : [...(item.likes || []), user._id]
                    } : p
                );
                dispatch(setPosts(updatedPostData));
            } else {
                dispatch(updateReelLikes({
                    reelId: item._id,
                    likes: wasLiked ? item.likes.filter(id => (id._id || id) !== user._id) : [...(item.likes || []), user._id]
                }));
            }

            // 2. Call API (Backend)
            const res = isReel ? await api.post(endpoint) : await api.get(endpoint);

            if (res.data.success) {
                toast.success(res.data.message, { id: `like-${item._id}` });
            } else {
                throw new Error(res.data.message);
            }
        } catch (error) {
            // ROLLBACK on failure
            if (!isReel) {
                dispatch(setPosts(previousPosts));
            } else {
                // For reels rollback logic:
                dispatch(updateReelLikes({
                    reelId: item._id,
                    likes: previousItem.likes
                }));
            }
            console.error(error);
            toast.error(error.message || "Failed to update like", { id: `like-${item._id}` });
        }
    };

    const handleCardClick = () => {
        dispatch(setSelectedPost({ ...item, feedType: type }));
        if (type === 'post') {
            setOpenPost(true);
        } else {
            setOpenComment(true); // For reels or other types
        }
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setCurrentIndex(0); // Reset to first image on leave
                }}
                ref={carouselRef}
                className='feed-card group cursor-pointer animate-soft-in rounded-xl overflow-hidden'
            >
                {/* Media Area - Rounded inside the card */}
                <div className='media-container rounded-lg overflow-hidden bg-gray-50 relative'>
                    {/* Mobile Engagement Overlay (Only visible on mobile grid) */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center gap-4 bg-black/20 opacity-0 active:opacity-100 sm:hidden pointer-events-none">
                        <div className="flex items-center gap-1 text-white text-[10px] font-bold">
                           <Heart size={14} className={liked ? 'fill-white' : ''} /> {likeCount}
                        </div>
                        <div className="flex items-center gap-1 text-white text-[10px] font-bold">
                           <MessageCircle size={14} /> {commentCount}
                        </div>
                    </div>
                    {isReel ? (
                        <div className='relative w-full aspect-[4/5] sm:aspect-[3/4.5] overflow-hidden bg-gray-900 flex items-center justify-center'>
                            <video
                                src={item.videoUrl}
                                poster={item.videoUrl?.replace(/\.[^/.]+$/, ".jpg")}
                                className='w-full h-full object-cover media-zoom transition-opacity duration-300'
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseOver={e => e.target.play()}
                                onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                            />
                            {item.author?._id === user?._id && (
                                <div 
                                    onClick={(e) => { e.stopPropagation(); onDelete && onDelete(item._id, e); }}
                                    className='absolute top-3 left-3 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 z-20 cursor-pointer'
                                    title="Delete Reel"
                                >
                                    <Trash2 size={14} />
                                </div>
                            )}
                            <div className='absolute top-3 right-3 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white z-10'>
                                <Video size={14} />
                            </div>
                        </div>
                    ) : (
                        <div className='w-full overflow-hidden relative bg-gray-50 flex items-center justify-center aspect-square'>
                            {item.author?._id === user?._id && (
                                <div 
                                    onClick={(e) => { e.stopPropagation(); onDelete && onDelete(item._id, e); }}
                                    className='absolute top-3 left-3 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 z-20 cursor-pointer'
                                    title="Delete Post"
                                >
                                    <Trash2 size={14} />
                                </div>
                            )}
                            <AnimatePresence mode='wait'>
                                <motion.img
                                    key={currentIndex}
                                    src={images[currentIndex]}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className='w-full h-full object-cover absolute inset-0'
                                    loading="eager"
                                />
                            </AnimatePresence>

                            {hasMultipleImages && (
                                <>
                                    {/* Navigation Arrows */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length); }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all z-30 transform hover:scale-110 active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all z-30 transform hover:scale-110 active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                    </button>

                                    {/* Image Counter Badge */}
                                    <div className='absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white z-10 flex items-center gap-2 border border-white/10 transition-transform duration-300 scale-90 group-hover:scale-100'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                        <span className='text-[11px] font-black tracking-tighter font-mono'>
                                            {currentIndex + 1} / {images.length}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Overlay with subtle gradient */}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                </div>

                {/* Info Area - Single Row (As per reference image) */}
                <div className='p-2 sm:p-3.5 bg-white info-area'>
                    <div className='flex items-center justify-between gap-1.5'>
                        <div className='flex items-center gap-2 overflow-hidden flex-1'>
                            <Avatar className='w-6 h-6 sm:w-7 sm:h-7 ring-1 ring-gray-100'>
                                <AvatarImage src={author?.profilePicture} className="object-cover" />
                                <AvatarFallback className={cn("font-bold text-[10px] sm:text-xs uppercase", getAvatarColor(author?.username))}>
                                    {author?.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className='text-[12px] sm:text-[13px] font-bold text-gray-900 truncate hover:text-indigo-600 transition-colors' onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author?._id}`); }}>
                                {author?.username}
                            </span>
                        </div>

                        {/* Engagement Info on the right */}
                        <div className='flex items-center gap-2.5'>
                            <div onClick={handleLike} className='flex items-center gap-0.5 cursor-pointer hover:scale-110 active:scale-90 transition-transform'>
                                {liked ? <FaHeart size={13} className='text-red-500' /> : <FaRegHeart size={13} className='text-gray-400' />}
                                <span className='text-[11px] font-bold text-gray-600'>{likeCount.toLocaleString()}</span>
                            </div>
                            <div className='flex items-center gap-0.5 text-gray-400'>
                                <MessageCircle size={13} />
                                <span className='text-[11px] font-bold text-gray-600'>{commentCount.toLocaleString()}</span>
                            </div>
                            <div
                                onClick={(e) => { e.stopPropagation(); setOpenShare(true); }}
                                className='flex items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors'
                            >
                                <Send size={14} className="-rotate-12" />
                            </div>
                            {isReel && (
                                <div className='hidden sm:flex items-center gap-1 text-gray-400'>
                                    <Eye size={12} />
                                    <span className='text-[12px] font-bold text-gray-600'>{viewCount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CommentDialog open={openComment} setOpen={setOpenComment} />
            <PostModal open={openPost} setOpen={setOpenPost} post={item} onOpenComment={() => { setOpenPost(false); setOpenComment(true); }} />
            <SharePostModal open={openShare} setOpen={setOpenShare} post={item} />
        </>
    );
};


export default FeedCard;
