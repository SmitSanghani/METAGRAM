import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from './ui/button'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment.jsx'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts } from '@/redux/postSlice'
import { DialogClose } from '@radix-ui/react-dialog'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { Send, Heart } from 'lucide-react';
import SaveButton from './SaveButton';
import UserListModal from './UserListModal';

const CommentDialog = ({ open, setOpen }) => {

    const [text, setText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const { selectedPost, posts } = useSelector(store => store.post);
    const { user } = useSelector(store => store.auth);
    const { socket } = useSelector(store => store.socketio);
    const [comment, setComment] = useState([]);
    const [liked, setLiked] = useState(false);
    const [postLike, setPostLike] = useState(0);
    const [showLikers, setShowLikers] = useState(false);
    const dispatch = useDispatch();
    const inputRef = React.useRef(null);

    useEffect(() => {
        if (selectedPost) {
            setComment(selectedPost.comments);
            setLiked(selectedPost.likes.includes(user?._id));
            setPostLike(selectedPost.likes.length);
        }
    }, [selectedPost, user?._id])

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo])

    useEffect(() => {
        if (!socket || !selectedPost) return;

        const handleNewComment = (newComment) => {
            if (newComment.post === selectedPost._id) {
                setComment(prev => {
                    if (prev.some(c => c._id === newComment._id)) return prev;
                    return [...prev, newComment];
                });
            }
        };

        const handleDeleteComment = ({ commentId, postId }) => {
            if (postId === selectedPost._id) {
                setComment(prev => prev.filter(c => c._id !== commentId && c.parentId !== commentId));
            }
        };

        const handleUpdateLikes = ({ commentId, postId, likes }) => {
            if (postId === selectedPost._id) {
                setComment(prev => prev.map(c =>
                    c._id === commentId ? { ...c, likes } : c
                ));
            }
        };

        const handleEditComment = ({ commentId, postId, text }) => {
            if (postId === selectedPost._id) {
                setComment(prev => prev.map(c =>
                    c._id === commentId ? { ...c, text } : c
                ));
            }
        };

        socket.on('newPostComment', handleNewComment);
        socket.on('deletePostComment', handleDeleteComment);
        socket.on('updatePostCommentLikes', handleUpdateLikes);
        socket.on('editPostComment', handleEditComment);

        return () => {
            socket.off('newPostComment', handleNewComment);
            socket.off('deletePostComment', handleDeleteComment);
            socket.off('updatePostCommentLikes', handleUpdateLikes);
            socket.off('editPostComment', handleEditComment);
        };
    }, [socket, selectedPost]);

    const changeEventHandler = (e) => {
        const inputText = e.target.value;
        if (inputText.trim()) {
            setText(inputText)
        } else {
            setText("");
        }
    }

    const sendMessageHandler = async () => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/post/${selectedPost?._id}/comment`, {
                text,
                parentId: replyingTo?._id
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true,
            });
            if (res.data.success) {
                const updatedCommnetData = [...comment, res.data.comment];
                setComment(updatedCommnetData);

                const updatedPostData = posts.map(p =>
                    p._id === selectedPost._id ? {
                        ...p,
                        comments: updatedCommnetData
                    } : p
                );
                dispatch(setPosts(updatedPostData));
                setText("");
                setReplyingTo(null);
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
        }
    }

    const likeOrDislikeHandler = async () => {
        try {
            const action = liked ? "dislike" : "like";
            const res = await axios.get(`http://localhost:8000/api/v1/post/${selectedPost._id}/${action}`, { withCredentials: true });
            if (res.data.success) {
                const updatedLikesCount = liked ? postLike - 1 : postLike + 1;
                setPostLike(updatedLikesCount);
                setLiked(!liked);

                const updatedPostData = posts.map(p =>
                    p._id === selectedPost._id ? {
                        ...p,
                        likes: liked ? p.likes.filter(id => id !== user._id) : [...p.likes, user._id]
                    } : p
                );
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error("Failed to update like");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent onInteractOutside={() => { setOpen(false); setReplyingTo(null); }} className='max-w-5xl p-0 flex flex-col bg-white overflow-hidden rounded-[15px] border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] sm:max-h-[88vh] max-h-[95vh] w-[98vw] sm:w-[90vw] transition-all duration-500'>
                <div className='flex flex-col sm:flex-row flex-1 overflow-hidden'>
                    {/* Media Section */}
                    <div className='w-full sm:w-[55%] bg-[#050505] flex items-center justify-center relative group min-h-[350px] sm:min-h-0'>
                        <img
                            src={selectedPost?.image}
                            alt="post_img"
                            className='w-full h-full object-contain sm:max-h-[88vh] max-h-[50vh] transition-transform duration-700 group-hover:scale-[1.02]'
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Comments Section */}
                    <div className='w-full sm:w-[45%] flex flex-col bg-white overflow-hidden relative'>
                        {/* Header */}
                        <div className='flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-20'>
                            <div className='flex gap-4 items-center'>
                                <Link to={`/profile/${selectedPost?.author?._id}`}>
                                    <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform hover:rotate-12">
                                        <Avatar className="w-9 h-9 border-2 border-white">
                                            <AvatarImage src={selectedPost?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="bg-gray-100 font-black text-xs">{selectedPost?.author?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </Link>
                                <div className="flex flex-col -gap-0.5">
                                    <Link to={`/profile/${selectedPost?.author?._id}`} className='font-black text-[14px] text-gray-900 hover:text-indigo-600 transition-colors'>
                                        {selectedPost?.author?.username}
                                    </Link>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original Post</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="p-2 hover:bg-gray-50 rounded-full cursor-pointer transition-colors group">
                                            <MoreHorizontal className='text-gray-400 group-hover:text-black transition-colors' size={20} />
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="flex flex-col items-center text-sm text-center sm:rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                                        <button className='w-full text-[#ED4956] font-black py-4 hover:bg-red-50 transition-colors border-b border-gray-50'>Report Content</button>
                                        <button onClick={() => { }} className='w-full text-[#ED4956] font-black py-4 hover:bg-red-50 transition-colors border-b border-gray-50'>Unfollow User</button>
                                        <button className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50'>Add to Favorites</button>
                                        <button className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50'>Share Post</button>
                                        <DialogClose className='w-full py-4 hover:bg-gray-100 font-black text-gray-400 transition-colors'>Cancel</DialogClose>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {/* Comments Area */}
                        <div className='flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-white'>
                            <div className='flex flex-col'>
                                {selectedPost?.caption && (
                                    <div className='flex gap-4 items-start mb-8 pb-6 border-b border-gray-50'>
                                        <Avatar className="w-8 h-8 shrink-0 ring-1 ring-gray-100">
                                            <AvatarImage src={selectedPost?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="font-bold text-[10px]">{selectedPost?.author?.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className='flex flex-col gap-1'>
                                            <p className='text-[14px] text-gray-700 leading-relaxed'>
                                                <span className='font-black mr-2 text-gray-900'>{selectedPost?.author?.username}</span>
                                                {selectedPost?.caption}
                                            </p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Edited • 2d</span>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {
                                        comment
                                            .filter(c => !c.parentId)
                                            .map((c) => (
                                                <Comment
                                                    key={c._id}
                                                    comment={c}
                                                    onReply={setReplyingTo}
                                                    allComments={comment}
                                                />
                                            ))
                                    }
                                </div>
                                {comment.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <X className="text-gray-300" size={32} strokeWidth={1} />
                                        </div>
                                        <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">No Comments</h3>
                                        <p className="text-gray-400 text-[12px] mt-1 font-medium">Be the first to share your thoughts.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interactive Section (Likes/Stats) */}
                        <div className="px-6 py-4 border-t border-gray-50 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={likeOrDislikeHandler}
                                        className="transition-transform active:scale-75"
                                    >
                                        {liked ? <FaHeart size={22} className="text-red-500" /> : <FaRegHeart size={22} className="text-gray-800" />}
                                    </button>
                                    <Send size={22} className="text-gray-800 cursor-pointer" />
                                </div>
                                <SaveButton isSaved={user?.bookmarks?.includes(selectedPost?._id)} size={22} />
                            </div>
                            <div
                                onClick={() => setShowLikers(true)}
                                className="inline-flex items-center gap-1 cursor-pointer group"
                            >
                                <span className="font-black text-[13px] text-gray-900">{postLike}</span>
                                <span className="font-bold text-[12px] text-gray-400 uppercase tracking-widest group-hover:text-indigo-600">Likes</span>
                            </div>
                        </div>

                        {/* Interactive Input Area */}
                        <div className='p-6 bg-white border-t border-gray-50 relative z-30'>
                            <div className="flex flex-col gap-3">
                                {replyingTo && (
                                    <div className='flex items-center justify-between px-5 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-1 animate-in slide-in-from-bottom-2 duration-300'>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                            <span className='text-[11px] font-black text-gray-500 uppercase tracking-widest'>
                                                Replying to <span className='text-indigo-600'>@{replyingTo.author?.username}</span>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                <form
                                    onSubmit={(e) => { e.preventDefault(); sendMessageHandler(); }}
                                    className={`flex items-center gap-3 bg-gray-50/80 p-1.5 rounded-[24px] pl-5 border-2 border-transparent transition-all duration-300 group focus-within:bg-white focus-within:border-indigo-600/20 focus-within:shadow-[0_10px_30px_-10px_rgba(79,70,229,0.15)] w-full`}
                                >
                                    <Avatar className="w-8 h-8 shrink-0 hidden sm:block grayscale hover:grayscale-0 transition-all duration-500">
                                        <AvatarImage src={user?.profilePicture} />
                                        <AvatarFallback className="text-[10px] font-bold">ME</AvatarFallback>
                                    </Avatar>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={text}
                                        onChange={changeEventHandler}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && text.trim()) {
                                                e.preventDefault();
                                                sendMessageHandler();
                                            }
                                        }}
                                        placeholder={replyingTo ? `Reply to ${replyingTo.author?.username}...` : 'Write a comment...'}
                                        className='flex-1 bg-transparent outline-none text-[14px] placeholder:text-gray-400 text-gray-800 font-medium py-2'
                                    />
                                    <button
                                        type="submit"
                                        disabled={!text.trim()}
                                        className='bg-indigo-600 hover:bg-indigo-700 text-white font-black h-10 px-8 rounded-full text-[11px] tracking-[0.1em] uppercase disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:shadow-none'
                                    >
                                        Post
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {showLikers && (
                <UserListModal
                    isOpen={showLikers}
                    onClose={() => setShowLikers(false)}
                    title="Likes"
                    users={selectedPost?.likes}
                />
            )}
        </Dialog>
    )
}

export default CommentDialog
