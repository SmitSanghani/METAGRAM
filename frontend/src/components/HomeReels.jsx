import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Heart, MessageCircle, Send, Bookmark, Music, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';
import { updateReelLikes } from '@/redux/reelSlice';

const HomeReels = () => {
    const { reels = [] } = useSelector(store => store.reel);
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    const handleLike = async (reelId, isLiked, likes) => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/reels/like/${reelId}`, {}, { withCredentials: true });
            if (res.data.success) {
                const newLikes = isLiked
                    ? likes.filter(id => id !== user?._id)
                    : [...likes, user?._id];
                dispatch(updateReelLikes({ reelId, likes: newLikes }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (reels.length === 0) return (
        <div className='flex flex-col items-center justify-center p-20 opacity-40 italic font-medium'>
            No reels yet. Be the first to post!
        </div>
    );

    return (
        <div className='flex flex-col gap-6 w-full max-w-[600px] mx-auto py-6 px-4'>
            {reels.map((reel) => {
                const isLiked = reel.likes?.includes(user?._id);
                return (
                    <div key={reel._id} className='bg-[#fafafa] border border-gray-100 rounded-3xl overflow-hidden shadow-sm'>
                        {/* Header */}
                        <div className='flex items-center justify-between p-4'>
                            <div className='flex items-center gap-3'>
                                <Avatar className="w-9 h-9 border border-gray-100">
                                    <AvatarImage src={reel.author?.profilePicture} alt="img" className="object-cover" />
                                    <AvatarFallback>{reel.author?.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className='flex flex-col'>
                                    <span className='font-bold text-[14px] leading-none mb-0.5'>{reel.author?.username}</span>
                                    <span className='text-[10px] text-gray-400 font-bold uppercase tracking-wider'>Original Audio</span>
                                </div>
                            </div>
                        </div>

                        {/* Video Preview / Player */}
                        <div className='relative aspect-[9/16] bg-black max-h-[600px] group flex items-center justify-center'>
                            <video src={reel.videoUrl} controls className='w-full h-full object-contain' />
                            <div className='absolute top-4 right-4 bg-black/40 backdrop-blur-sm p-1.5 rounded-full'>
                                <Play size={14} className='text-white fill-white' />
                            </div>
                        </div>

                        {/* Actions & Caption */}
                        <div className='p-5 pt-4 bg-white'>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex items-center gap-4'>
                                    <div className='flex items-center gap-1.5 cursor-pointer pb-1'>
                                        <Heart
                                            size={26}
                                            onClick={() => handleLike(reel._id, isLiked, reel.likes)}
                                            className={`transition-all active:scale-90 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-800'}`}
                                        />
                                        <span className='text-[13px] font-black'>{reel.likes?.length || 0}</span>
                                    </div>
                                    <div className='flex items-center gap-1.5 cursor-pointer pb-1'>
                                        <MessageCircle size={26} className='text-gray-800' />
                                        <span className='text-[13px] font-black'>{reel.comments?.length || 0}</span>
                                    </div>
                                    <Send size={24} className='text-gray-800 cursor-pointer active:scale-95' />
                                </div>
                                <Bookmark size={24} className='text-gray-800 cursor-pointer' />
                            </div>
                            <div className='flex flex-col gap-1'>
                                <p className='text-[14px] text-gray-800 font-medium leading-relaxed'>
                                    <span className='font-black mr-2'>{reel.author?.username}</span>
                                    {reel.caption}
                                </p>
                                <span className='text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60'>
                                    {new Date(reel.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

export default HomeReels;
