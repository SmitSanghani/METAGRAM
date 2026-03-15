import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Eye, Video, MoreHorizontal, Send } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaHeart, FaRegHeart } from "react-icons/fa";
import api from '@/api';
import { setPosts, setSelectedPost } from '@/redux/postSlice';
import { updateReelLikes } from '@/redux/reelSlice';
import { toast } from 'sonner';
import CommentDialog from './CommentDialog';

const FeedCard = ({ item, type = 'post' }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);
    const [openComment, setOpenComment] = useState(false);

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
        setOpenComment(true);
    };

    return (
        <div
            onClick={handleCardClick}
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
                    <div className='w-full overflow-hidden'>
                        <img
                            src={mediaUrl}
                            alt='post'
                            className='w-full h-auto object-cover media-zoom'
                            loading="lazy"
                        />
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
                            <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-500 font-bold">{author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
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
                        {isReel && (
                            <div className='flex items-center gap-1 text-gray-400'>
                                <Eye size={12} />
                                <span className='text-[12px] font-bold text-gray-600'>{viewCount.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CommentDialog open={openComment} setOpen={setOpenComment} />
        </div>
    );
};


export default FeedCard;
