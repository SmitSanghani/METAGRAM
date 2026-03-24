import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { Heart, Trash2, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from './ui/dialog';
import { useSelector, useDispatch } from 'react-redux';
import api from '@/api';
import { toast } from 'sonner';
import { setPosts } from '@/redux/postSlice';

// Relative time helper
const getRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000); // seconds
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
};

const Comment = ({ comment, onReply, allComments = [], depth = 0, isReel = false }) => {
    const { user } = useSelector(store => store.auth);
    const { selectedPost, posts } = useSelector(store => store.post);
    const dispatch = useDispatch();
    const [isLiked, setIsLiked] = useState(
        comment?.likes?.some(id => id?.toString() === user?._id?.toString())
    );
    const [likeCount, setLikeCount] = useState(comment?.likes?.length || 0);

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(comment?.text || "");
    const [showReplies, setShowReplies] = useState(false);

    React.useEffect(() => {
        setIsLiked(comment?.likes?.some(id => id?.toString() === user?._id?.toString()));
        setLikeCount(comment?.likes?.length || 0);
    }, [comment.likes, user]);

    const handleLike = async () => {
        const prevLiked = isLiked;
        const prevCount = likeCount;
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        try {
            const endpoint = isReel ? `/reels/comment/like/${comment._id}` : `/post/comment/like/${comment._id}`;
            const res = await api.post(
                endpoint,
                {}
            );
            if (!res.data.success) {
                setIsLiked(prevLiked);
                setLikeCount(prevCount);
            }
        } catch (error) {
            console.error(error);
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await api.delete(`/post/comment/delete/${comment._id}`);
            if (res.data.success) {
                toast.success("Comment deleted");
                // We'll let Socket.io handle the UI removal if it's connected, 
                // but we also keep this fallback just in case socket is slow.
            }
        } catch (error) {
            toast.error("Failed to delete comment");
        }
    };

    const handleEdit = async () => {
        if (!editValue.trim() || editValue === comment.text) {
            setIsEditing(false);
            return;
        }
        try {
            const res = await api.put(`/post/comment/edit/${comment._id}`, { text: editValue });
            if (res.data.success) {
                toast.success("Comment updated");
                setIsEditing(false);
            }
        } catch (error) {
            toast.error("Failed to edit comment");
        }
    };

    const replies = allComments.filter(c => c.parentId === comment._id);

    return (
        <div className={`${depth > 0 ? 'ml-9 mt-2' : 'mt-5'}`}>
            <div className='flex gap-3 items-start group relative'>
                {/* Avatar with Ring */}
                <Avatar className={`w-8 h-8 rounded-full shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100 transition-transform hover:scale-105 cursor-pointer`}>
                    <AvatarImage src={comment?.author?.profilePicture} className="object-cover" />
                    <AvatarFallback className={cn("text-sm font-black uppercase", getAvatarColor(comment?.author?.username))}>
                        {comment?.author?.username?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className='flex flex-col flex-1 min-w-0'>
                    {/* Comment Bubble - Pill Shape */}
                    <div className={`rounded-[22px] px-5 py-3 relative border border-transparent transition-all hover:border-indigo-100 ${depth % 2 === 0
                        ? 'bg-[#F1F5F9]'
                        : 'bg-indigo-50/60'
                        }`}>
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className='font-black text-[12px] text-gray-900 tracking-tight hover:underline cursor-pointer'>{comment?.author?.username}</span>
                            <span className='text-[10px] font-bold text-gray-400/80 mr-1'>
                                {getRelativeTime(comment?.createdAt)}
                            </span>
                        </div>
                        {isEditing ? (
                            <div className="mt-2 flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEdit();
                                        if (e.key === 'Escape') setIsEditing(false);
                                    }}
                                    className="bg-white border rounded-lg px-2 py-1 text-[13px] outline-none w-full shadow-sm"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleEdit} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                                    <button onClick={() => { setIsEditing(false); setEditValue(comment.text); }} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <p className='text-[13.5px] text-gray-700 leading-relaxed font-medium break-words'>{comment?.text}</p>
                        )}
                    </div>

                    {/* Action Row */}
                    <div className='flex items-center gap-6 mt-2 ml-4'>
                        {/* Like count and button */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleLike}
                                className="flex items-center gap-2 group/like py-2 px-1 -my-2 -mx-1"
                            >
                                <Heart
                                    size={16}
                                    strokeWidth={3}
                                    className={`cursor-pointer transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-125' : 'text-gray-400 hover:text-red-400 hover:scale-110'}`}
                                />
                                {likeCount > 0 && (
                                    <span className={`text-[12px] font-black ${isLiked ? 'text-red-500/80' : 'text-gray-400'}`}>
                                        {likeCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Reply button */}
                        <button
                            onClick={() => onReply(comment)}
                            className='text-[11px] font-extrabold text-gray-400 hover:text-indigo-600 transition-all uppercase tracking-widest active:scale-95 py-2'
                        >
                            Reply
                        </button>

                        {/* Options Menu */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className='text-[11px] p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100'>
                                    <MoreHorizontal size={14} strokeWidth={2.5} />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col items-center text-sm text-center sm:rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-w-sm">
                                {user?._id === comment?.author?._id && (
                                    <DialogClose asChild>
                                        <button onClick={() => setIsEditing(true)} className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 text-indigo-600'>
                                            Edit
                                        </button>
                                    </DialogClose>
                                )}
                                {user?._id === comment?.author?._id && (
                                    <DialogClose asChild>
                                        <button onClick={handleDelete} className='w-full text-[#ED4956] font-black py-4 hover:bg-red-50 transition-colors border-b border-gray-50'>
                                            Delete
                                        </button>
                                    </DialogClose>
                                )}
                                <DialogClose asChild>
                                    <button className='w-full text-[#ED4956] font-bold py-4 hover:bg-red-50 transition-colors border-b border-gray-50'>
                                        Report
                                    </button>
                                </DialogClose>
                                <DialogClose className='w-full py-4 hover:bg-gray-100 font-bold text-gray-900 transition-colors'>
                                    Cancel
                                </DialogClose>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Visual Connector for replies */}
                {depth > 0 && (
                    <div className="absolute -left-5 top-[-10px] bottom-1/2 w-4 border-l-2 border-b-2 border-gray-100 rounded-bl-xl pointer-events-none" />
                )}
            </div>

            {/* Render Replies Toggle */}
            {replies.length > 0 && (
                <div className='mt-1 ml-14'>
                    <button
                        onClick={() => setShowReplies(!showReplies)}
                        className='flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-gray-800 transition-colors uppercase tracking-widest'
                    >
                        <div className='w-6 h-[1px] bg-gray-300' />
                        {showReplies ? 'Hide replies' : `View replies (${replies.length})`}
                    </button>
                </div>
            )}

            {/* Render Replies */}
            {showReplies && replies.length > 0 && (
                <div className='mt-2'>
                    {replies.map(reply => (
                        <Comment
                            key={reply._id}
                            comment={reply}
                            onReply={onReply}
                            allComments={allComments}
                            depth={depth + 1}
                            isReel={isReel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Comment;
