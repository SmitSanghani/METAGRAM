import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { Heart, MessageCircle, Eye, Video, MoreHorizontal, Send, Grid } from 'lucide-react';
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

const FeedCard = ({ item, type = 'post' }) => {
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

    // Non-passive wheel listener to prevent page scroll
    useEffect(() => {
        const el = carouselRef.current;
        if (!el || !hasMultipleImages) return;

        const handleWheel = (e) => {
            if (!isHovered) return;

            // Prevent actual page scroll
            e.preventDefault();

            if (e.deltaY > 0) {
                // Next image
                setCurrentIndex(prev => (prev + 1) % images.length);
            } else if (e.deltaY < 0) {
                // Previous image
                setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
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
        try {
            const action = liked ? "dislike" : "like";
            const endpoint = isReel ? `/reels/like/${item._id}` : `/post/${item._id}/${action}`;

            const res = isReel ? await api.post(endpoint) : await api.get(endpoint);

            if (res.data.success) {
                if (!isReel) {
                    const updatedPostData = posts.map(p =>
                        p._id === item._id ? {
                            ...p,
                            likes: liked ? p.likes.filter(id => (id._id || id) !== user._id) : [...p.likes, user._id]
                        } : p
                    );
                    dispatch(setPosts(updatedPostData));
                } else {
                    // Update reel likes in redux
                    dispatch(updateReelLikes({
                        reelId: item._id,
                        likes: liked ? item.likes.filter(id => (id._id || id) !== user._id) : [...(item.likes || []), user._id]
                    }));
                }
                toast.success(res.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to update like");
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
                <div className='media-container rounded-lg overflow-hidden bg-gray-50'>
                    {isReel ? (
                        <div className='relative w-full aspect-[3.5/5] sm:aspect-[3/4.5] overflow-hidden bg-black flex items-center justify-center'>
                            <video
                                src={item.videoUrl}
                                className='w-full h-full object-cover media-zoom'
                                muted
                                loop
                                playsInline
                                onMouseOver={e => e.target.play()}
                                onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                            />
                            <div className='absolute top-3 right-3 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white'>
                                <Video size={14} />
                            </div>
                        </div>
                    ) : (
                        <div className='w-full overflow-hidden relative bg-gray-50 flex items-center justify-center aspect-square'>
                            <AnimatePresence mode='wait'>
                                <motion.img
                                    key={currentIndex}
                                    src={images[currentIndex]}
                                    alt='post'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className='w-full h-full object-cover'
                                    loading="eager"
                                />
                            </AnimatePresence>

                            {hasMultipleImages && (
                                <>
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
                <div className='p-3.5 bg-white'>
                    <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 overflow-hidden flex-1'>
                            <Avatar className='w-7 h-7 ring-1 ring-gray-100'>
                                <AvatarImage src={author?.profilePicture} className="object-cover" />
                                <AvatarFallback className={cn("text-[10px] uppercase font-black", getAvatarColor(author?.username))}>
                                    {author?.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className='text-[13px] font-bold text-gray-900 truncate hover:text-indigo-600 transition-colors' onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author?._id}`); }}>
                                {author?.username}
                            </span>
                        </div>

                        {/* Engagement Info on the right */}
                        <div className='flex items-center gap-3'>
                            <div onClick={handleLike} className='flex items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition-transform'>
                                {liked ? <FaHeart size={14} className='text-red-500' /> : <FaRegHeart size={14} className='text-gray-400' />}
                                <span className='text-[12px] font-bold text-gray-600'>{likeCount.toLocaleString()}</span>
                            </div>
                            <div className='flex items-center gap-1 text-gray-400'>
                                <MessageCircle size={14} />
                                <span className='text-[12px] font-bold text-gray-600'>{commentCount.toLocaleString()}</span>
                            </div>
                            {!isReel && (
                                <div
                                    onClick={(e) => { e.stopPropagation(); setOpenShare(true); }}
                                    className='flex items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors'
                                >
                                    <Send size={14} className="-rotate-12" />
                                </div>
                            )}
                            {isReel && (
                                <div className='flex items-center gap-1 text-gray-400'>
                                    <Eye size={12} />
                                    <span className='text-[12px] font-bold text-gray-600'>{viewCount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CommentDialog open={openComment} setOpen={setOpenComment} />
            <PostModal open={openPost} setOpen={setOpenPost} post={item} />
            <SharePostModal open={openShare} setOpen={setOpenShare} post={item} />
        </>
    );
};


export default FeedCard;
