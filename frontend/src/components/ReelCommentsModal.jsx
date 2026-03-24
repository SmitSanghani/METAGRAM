import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, Loader2, Send, Trash2, MessageCircle, X as CloseIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addReelComment, deleteReelComment, editReelComment } from '@/redux/reelSlice';

const getRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
};

const ReelCommentsModal = ({ reelId, comments: initialComments = [], open, setOpen, reelData }) => {
    const navigate = useNavigate();
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const { user } = useSelector(store => store.auth);
    const { reels } = useSelector(store => store.reel);
    const { socket } = useSelector(store => store.socketio);
    const dispatch = useDispatch();

    // Prioritize global Redux state for real-time updates
    const reel = reels.find(r => r._id === reelId) || reelData;
    const comments = reel?.comments || initialComments;

    React.useEffect(() => {
        if (!socket || !open) return;

        const handleDeleteComment = ({ commentId, reelId: cReelId }) => {
            if (cReelId === reelId) {
                dispatch(deleteReelComment({ reelId, commentId }));
            }
        };

        const handleEditComment = ({ commentId, reelId: cReelId, text }) => {
            if (cReelId === reelId) {
                dispatch(editReelComment({ reelId, commentId, text }));
            }
        };

        const handleUpdateCommentLikes = ({ commentId, reelId: cReelId, likes }) => {
            if (cReelId === reelId) {
                dispatch({ type: 'reel/updateReelCommentLikes', payload: { reelId, commentId, likes } });
            }
        };

        socket.on('deleteReelComment', handleDeleteComment);
        socket.on('editReelComment', handleEditComment);
        socket.on('updateReelCommentLikes', handleUpdateCommentLikes);

        return () => {
            socket.off('deleteReelComment', handleDeleteComment);
            socket.off('editReelComment', handleEditComment);
            socket.off('updateReelCommentLikes', handleUpdateCommentLikes);
        };
    }, [socket, reelId, open, dispatch]);

    const addCommentHandler = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
            setLoading(true);
            const res = await api.post(`/reels/comment/${reelId}`, {
                text,
                parentId: replyingTo?._id || null
            });
            if (res.data.success) {
                dispatch(addReelComment({ reelId, comment: res.data.comment }));
                setText("");
                setReplyingTo(null);
                toast.success(res.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Error");
        } finally {
            setLoading(false);
        }
    };

    const deleteReelCommentHandler = async (commentId) => {
        try {
            const res = await api.delete(`/reels/comment/${commentId}`);
            if (res.data.success) {
                dispatch(deleteReelComment({ reelId, commentId }));
                toast.success(res.data.message || "Comment deleted");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete comment");
        }
    };

    const CommentItem = ({ comment, depth = 0 }) => {
        const isReply = depth > 0;
        const replies = (comments || []).filter(c => c && c.parentId === comment._id);
        const [isLiked, setIsLiked] = useState(comment.likes?.some(id => id?.toString() === user?._id?.toString()));
        const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(comment.text);
        const [showReplies, setShowReplies] = useState(false);

        React.useEffect(() => {
            setIsLiked(comment.likes?.some(id => id?.toString() === user?._id?.toString()));
            setLikeCount(comment.likes?.length || 0);
        }, [comment.likes, user?._id]);

        const handleEdit = async () => {
            if (!editValue.trim() || editValue === comment.text) {
                setIsEditing(false);
                return;
            }
            try {
                const res = await api.put(`/reels/comment/${comment._id}`, { text: editValue });
                if (res.data.success) {
                    toast.success("Comment updated");
                    setIsEditing(false);
                }
            } catch (error) {
                toast.error("Failed to edit comment");
            }
        };

        const handleLike = async () => {
            const prevLiked = isLiked;
            const prevCount = likeCount;
            setIsLiked(!isLiked);
            setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
            try {
                const res = await api.post(`/reels/comment/like/${comment._id}`, {});
                if (!res.data.success) {
                    setIsLiked(prevLiked);
                    setLikeCount(prevCount);
                }
            } catch (error) {
                setIsLiked(prevLiked);
                setLikeCount(prevCount);
                toast.error("Error liking comment");
            }
        };

        return (
            <div className={`flex flex-col gap-1 ${isReply ? 'ml-8 mt-2 pl-4 border-l border-gray-100' : 'mt-4'}`}>
                <div className="flex gap-4 items-start group relative">
                    <div onClick={() => { navigate(`/profile/${comment.author?._id}`); setOpen(false); }} className="cursor-pointer transition-transform active:scale-90">
                        <Avatar className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full shadow-sm shrink-0 border-2 border-white ring-1 ring-gray-100`}>
                            <AvatarImage src={comment.author?.profilePicture} className="object-cover" />
                            <AvatarFallback className="bg-indigo-50 text-[8px] font-black text-indigo-400">
                                {comment.author?.username?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className={`p-[10px] rounded-[13px] transition-all ${isReply ? 'bg-indigo-50/50 border border-indigo-100/30' : 'bg-[#f2f2f2] border border-transparent hover:border-indigo-100'}`}>
                            <div className="flex items-center justify-between mb-0.5">
                                <span
                                    onClick={() => { navigate(`/profile/${comment.author?._id}`); setOpen(false); }}
                                    className={`font-black text-gray-900 tracking-tight cursor-pointer hover:underline ${isReply ? 'text-[11px]' : 'text-[13px]'}`}
                                >
                                    {comment.author?.username}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 tracking-tighter">{getRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p className={`${isReply ? 'text-[13px]' : 'text-[14px]'} text-gray-700 leading-relaxed font-medium break-words`}>
                                {isEditing ? (
                                    <div className="mt-1 flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleEdit();
                                                if (e.key === 'Escape') setIsEditing(false);
                                            }}
                                            className="bg-white border rounded-md px-2 py-1 text-[13px] outline-none w-full shadow-sm"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleEdit} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                                            <button onClick={() => { setIsEditing(false); setEditValue(comment.text); }} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">Cancel</button>
                                        </div>
                                    </div>
                                ) : comment.text}
                            </p>
                        </div>
                        <div className="flex items-center gap-6 mt-2 ml-4">
                            <button
                                onClick={handleLike}
                                className="flex items-center gap-2 group/like py-2 px-1 -my-2 -mx-1"
                            >
                                <Heart
                                    size={16}
                                    strokeWidth={3}
                                    className={`transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-125' : 'text-gray-400 hover:text-red-500 hover:scale-110'}`}
                                />
                                {likeCount > 0 && (
                                    <span className={`font-black tracking-tight ${isReply ? 'text-[10px]' : 'text-[12px]'} ${isLiked ? 'text-red-500' : 'text-gray-600'}`}>
                                        {likeCount}
                                    </span>
                                )}
                                <span className={`font-black tracking-tight uppercase ${isReply ? 'text-[9px]' : 'text-[11px]'} ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                                    {isLiked ? 'Liked' : 'Like'}
                                </span>
                            </button>
                            <button
                                onClick={() => setReplyingTo(comment)}
                                className={`font-extrabold text-gray-400 hover:text-indigo-600 transition-all uppercase tracking-widest active:scale-95 py-2 ${isReply ? 'text-[9px]' : 'text-[11px]'}`}
                            >
                                Reply
                            </button>

                            {user?._id === comment.author?._id && !isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-[11px] font-extrabold text-gray-400 hover:text-indigo-600 transition-all uppercase tracking-widest active:scale-95 py-2">
                                    Edit
                                </button>
                            )}

                            {user?._id === comment.author?._id && (
                                <button
                                    onClick={() => deleteReelCommentHandler(comment._id)}
                                    className="text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 p-2"
                                >
                                    <Trash2 size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Visual Connector for Nested Replies */}
                {replies.length > 0 && (
                    <div className="mt-1 ml-10">
                        <button
                            onClick={() => setShowReplies(!showReplies)}
                            className='flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-gray-800 transition-colors uppercase tracking-widest'
                        >
                            <div className='w-6 h-[1px] bg-gray-300' />
                            {showReplies ? 'Hide replies' : `View replies (${replies.length})`}
                        </button>
                    </div>
                )}
                {showReplies && replies.length > 0 && (
                    <div className="flex flex-col gap-1">
                        {replies.map((reply, idx) => (
                            <CommentItem key={reply._id || idx} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md h-[85vh] flex flex-col p-0 border-none bg-white rounded-t-[15px] sm:rounded-[20px] overflow-hidden focus:outline-none shadow-[0_32px_100px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-[100%] duration-700">
                <DialogHeader className="px-8 py-6 border-b border-gray-50 flex-none bg-white/90 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                            <DialogTitle className="font-black text-[11px] uppercase tracking-[0.3em] text-gray-800 mb-1">METAGRAM</DialogTitle>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discussion ({comments?.length || 0})</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full sm:hidden" />
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black active:scale-90"
                                aria-label="Close"
                            >
                                <CloseIcon size={20} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col bg-white custom-scrollbar pb-10">
                    {(comments || [])?.length > 0 ? (
                        (comments || [])?.filter(c => c && !c.parentId).map((comment, index) => (
                            <CommentItem key={comment._id || index} comment={comment} />
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-30 py-24">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                                <MessageCircle className="w-8 h-8" strokeWidth={1} />
                            </div>
                            <p className="font-black text-[11px] uppercase tracking-[0.25em]">No voices here yet</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-white border-t border-gray-50 flex-none z-50 shadow-[0_-20px_50_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col gap-3">
                        {replyingTo && (
                            <div className="flex items-center justify-between bg-indigo-50/50 px-4 py-3 rounded-2xl border border-indigo-100/50 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                    <span className="text-[11px] font-black text-indigo-600/70 uppercase tracking-tight">Replying to {replyingTo.author?.username}</span>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white rounded-full text-indigo-400 transition-colors">
                                    <CloseIcon size={14} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                        <form onSubmit={addCommentHandler} className="flex items-center gap-3 bg-gray-100/50 p-2 pl-5 rounded-[28px] focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all border-2 border-transparent focus-within:border-indigo-500/20 focus-within:shadow-2xl">
                            <Avatar className="w-8 h-8 shrink-0 grayscale focus-within:grayscale-0 transition-all delay-100 border border-white">
                                <AvatarImage src={user?.profilePicture} />
                                <AvatarFallback className="text-[10px] font-extrabold bg-indigo-50 text-indigo-400">ME</AvatarFallback>
                            </Avatar>
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && text.trim() && !loading) {
                                        e.preventDefault();
                                        addCommentHandler(e);
                                    }
                                }}
                                placeholder={replyingTo ? `@${replyingTo.author?.username} reply...` : "Express yourself..."}
                                className="bg-transparent flex-1 border-none focus:outline-none text-[15px] font-medium py-3 text-gray-800 placeholder:text-gray-400"
                            />
                            <Button
                                type="submit"
                                disabled={!text.trim() || loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] tracking-[0.15em] uppercase rounded-full h-11 px-8 transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 shadow-xl shadow-indigo-100"
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "POST"}
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReelCommentsModal;
