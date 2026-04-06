import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { cn, getAvatarColor } from '@/lib/utils';
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from './ui/button'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment.jsx'
import api from '@/api';
import { toast } from 'sonner'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { updateReelLikes, addReelComment } from '@/redux/reelSlice'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { setAuthUser, setUserProfile } from '@/redux/authSlice';
import { Send, Heart } from 'lucide-react';
import SaveButton from './SaveButton';
import UserListModal from './UserListModal';
import SharePostModal from './SharePostModal';
import ShareReelModal from './ShareReelModal';

const CommentDialog = ({ open, setOpen }) => {

    const [text, setText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const { selectedPost, posts } = useSelector(store => store.post);
    const { reels } = useSelector(store => store.reel);
    const { user, userProfile } = useSelector(store => store.auth);
    const { socket } = useSelector(store => store.socketio);
    const [comment, setComment] = useState([]);
    const [liked, setLiked] = useState(false);
    const [postLike, setPostLike] = useState(0);
    const [showLikers, setShowLikers] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const isReel = selectedPost?.feedType === 'reel';
    const dispatch = useDispatch();
    const inputRef = React.useRef(null);

    useEffect(() => {
        if (open) {
            document.body.classList.add('comment-modal-open');
        } else {
            document.body.classList.remove('comment-modal-open');
        }
        return () => document.body.classList.remove('comment-modal-open');
    }, [open]);

    useEffect(() => {
        if (selectedPost) {
            setComment(selectedPost.comments || []);
            setLiked(selectedPost.likes?.some(id => (id._id || id) === user?._id) || false);
            setPostLike(selectedPost.likes?.length || 0);
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
            const parentId = newComment.post || newComment.reel;
            if (parentId === selectedPost._id) {
                setComment(prev => {
                    if (prev.some(c => c._id === newComment._id)) return prev;
                    const updated = [...prev, newComment];
                    // Keep selectedPost in sync
                    dispatch(setSelectedPost({ ...selectedPost, comments: updated }));
                    return updated;
                });
                
                // Also update global collections
                if (isReel) {
                    dispatch(addReelComment({ reelId: selectedPost._id, comment: newComment }));
                } else {
                    dispatch(addPostComment({ postId: selectedPost._id, comment: newComment }));
                }
            }
        };

        const handleDeleteComment = ({ commentId, postId, reelId }) => {
            const id = postId || reelId;
            if (id === selectedPost._id) {
                setComment(prev => {
                    const updated = prev.filter(c => c._id !== commentId && c.parentId !== commentId);
                    dispatch(setSelectedPost({ ...selectedPost, comments: updated }));
                    return updated;
                });
                
                if (isReel) {
                    dispatch(deleteReelComment({ reelId: id, commentId }));
                } else {
                    dispatch(deletePostComment({ postId: id, commentId }));
                }
            }
        };

        const handleUpdateLikes = ({ commentId, postId, reelId, likes }) => {
            const id = postId || reelId;
            if (id === selectedPost._id) {
                setComment(prev => {
                    const updated = prev.map(c => c._id === commentId ? { ...c, likes } : c);
                    dispatch(setSelectedPost({ ...selectedPost, comments: updated }));
                    return updated;
                });

                if (isReel) {
                    dispatch(updateReelCommentLikes({ reelId: id, commentId, likes }));
                } else {
                    dispatch(updatePostCommentLikes({ postId: id, commentId, likes }));
                }
            }
        };

        const handleEditComment = ({ commentId, postId, reelId, text }) => {
            const id = postId || reelId;
            if (id === selectedPost._id) {
                setComment(prev => {
                    const updated = prev.map(c => c._id === commentId ? { ...c, text } : c);
                    dispatch(setSelectedPost({ ...selectedPost, comments: updated }));
                    return updated;
                });

                if (isReel) {
                    dispatch(editReelComment({ reelId: id, commentId, text }));
                } else {
                    // postSlice doesn't have editPostComment, it uses setPosts/setSelectedPost 
                    // which we already did via selectedPost, but we should also update 'posts' collection
                    const updatedPosts = posts.map(p => 
                        p._id === id ? {
                            ...p, 
                            comments: p.comments.map(c => c._id === commentId ? { ...c, text } : c)
                        } : p
                    );
                    dispatch(setPosts(updatedPosts));
                }
            }
        };

        socket.on('newPostComment', handleNewComment);
        socket.on('newReelComment', handleNewComment);
        socket.on('deletePostComment', handleDeleteComment);
        socket.on('deleteReelComment', handleDeleteComment);
        socket.on('updatePostCommentLikes', handleUpdateLikes);
        socket.on('updateReelCommentLikes', handleUpdateLikes);
        socket.on('editPostComment', handleEditComment);
        socket.on('editReelComment', handleEditComment);

        return () => {
            socket.off('newPostComment', handleNewComment);
            socket.off('newReelComment', handleNewComment);
            socket.off('deletePostComment', handleDeleteComment);
            socket.off('deleteReelComment', handleDeleteComment);
            socket.off('updatePostCommentLikes', handleUpdateLikes);
            socket.off('updateReelCommentLikes', handleUpdateLikes);
            socket.off('editPostComment', handleEditComment);
            socket.off('editReelComment', handleEditComment);
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
            const endpoint = isReel ? `/reels/comment/${selectedPost?._id}` : `/post/${selectedPost?._id}/comment`;
            const res = await api.post(endpoint, {
                text,
                parentId: replyingTo?._id
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if (res.data.success) {
                const updatedCommentData = [...comment, res.data.comment];
                setComment(updatedCommentData);

                if (isReel) {
                    dispatch(addReelComment({ reelId: selectedPost._id, comment: res.data.comment }));
                } else {
                    const updatedPostData = posts.map(p =>
                        p._id === selectedPost._id ? {
                            ...p,
                            comments: updatedCommentData
                        } : p
                    );
                    dispatch(setPosts(updatedPostData));
                }

                // Update selected item in redux to keep sync
                dispatch(setSelectedPost({ ...selectedPost, comments: updatedCommentData }));

                setText("");
                setReplyingTo(null);
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to post comment");
        }
    }

    const likeOrDislikeHandler = async () => {
        // Optimistic Values
        const wasLiked = liked;
        const previousLikesCount = postLike;
        const previousSelectedPost = { ...selectedPost };
        const previousPosts = [...posts];
        const previousReels = [...reels];

        // 1. Update LOCAL UI state immediately
        setLiked(!wasLiked);
        setPostLike(wasLiked ? previousLikesCount - 1 : previousLikesCount + 1);

        // 2. Prepare updated likes array for Redux
        const updatedLikes = wasLiked
            ? (selectedPost.likes || []).filter(id => (id._id || id) !== user._id)
            : [...(selectedPost.likes || []), user._id];

        // 3. Update Redux state immediately (Optimistically)
        if (isReel) {
            dispatch(updateReelLikes({ reelId: selectedPost._id, likes: updatedLikes }));
        } else {
            const updatedPostData = posts.map(p =>
                p._id === selectedPost._id ? { ...p, likes: updatedLikes } : p
            );
            dispatch(setPosts(updatedPostData));
        }
        dispatch(setSelectedPost({ ...selectedPost, likes: updatedLikes }));

        try {
            const action = wasLiked ? "dislike" : "like";
            const endpoint = isReel ? `/reels/like/${selectedPost._id}` : `/post/${selectedPost._id}/${action}`;

            const res = isReel ? await api.post(endpoint) : await api.get(endpoint);

            if (!res.data.success) {
                throw new Error(res.data.message || "Failed to update like");
            }
            toast.success(res.data.message, { id: `like-${selectedPost._id}` });
        } catch (error) {
            // ROLLBACK on error
            setLiked(wasLiked);
            setPostLike(previousLikesCount);
            dispatch(setSelectedPost(previousSelectedPost));
            if (isReel) {
                // For reels we'd ideally have a way to reset the whole slice or item,
                // but since we updated it, we'll just try to keep it simple.
            } else {
                dispatch(setPosts(previousPosts));
            }
            toast.error(error.message || "Failed to update like", { id: `like-${selectedPost._id}` });
        }
    }

    const bookmarkHandler = async () => {
        // Optimistic Values
        const isCurrentlySaved = isReel
            ? user?.savedReels?.some(item => (typeof item === 'object' ? item._id : item).toString() === selectedPost._id.toString())
            : user?.bookmarks?.some(item => (typeof item === 'object' ? item._id : item).toString() === selectedPost._id.toString());

        const previousUser = { ...user };
        const previousUserProfile = userProfile ? { ...userProfile } : null;

        try {
            // 1. Update Redux Auth state immediately (Optimistically)
            if (isReel) {
                const updatedSavedReels = isCurrentlySaved
                    ? user.savedReels.filter(item => (item._id || item).toString() !== selectedPost._id.toString())
                    : [...(user.savedReels || []), selectedPost._id];
                
                dispatch(setAuthUser({ ...user, savedReels: updatedSavedReels }));

                if (userProfile && userProfile._id === user._id) {
                    const updatedProfileSavedReels = isCurrentlySaved
                        ? userProfile.savedReels.filter(p => (p._id || p).toString() !== selectedPost._id.toString())
                        : [...(userProfile.savedReels || []), selectedPost];
                    dispatch(setUserProfile({ ...userProfile, savedReels: updatedProfileSavedReels }));
                }
            } else {
                const updatedBookmarks = isCurrentlySaved
                    ? user.bookmarks.filter(item => (item._id || item).toString() !== selectedPost._id.toString())
                    : [...(user.bookmarks || []), selectedPost._id];
                
                dispatch(setAuthUser({ ...user, bookmarks: updatedBookmarks }));

                if (userProfile && userProfile._id === user._id) {
                    const updatedProfileBookmarks = isCurrentlySaved
                        ? userProfile.bookmarks.filter(p => (p._id || p).toString() !== selectedPost._id.toString())
                        : [...(userProfile.bookmarks || []), selectedPost];
                    dispatch(setUserProfile({ ...userProfile, bookmarks: updatedProfileBookmarks }));
                }
            }

            const endpoint = isReel ? `/reels/save/${selectedPost?._id}` : `/post/${selectedPost?._id}/bookmark`;
            const res = await api.post(endpoint, {});

            if (!res.data.success) {
                throw new Error(res.data.message || "Failed to bookmark");
            }
            toast.success(res.data.message);
        } catch (error) {
            // ROLLBACK on error
            dispatch(setAuthUser(previousUser));
            if (previousUserProfile) {
                dispatch(setUserProfile(previousUserProfile));
            }
            toast.error(error.message || "Failed to bookmark", { id: `bookmark-${selectedPost._id}` });
        }
    };

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const scrollRef = React.useRef(null);

    useEffect(() => {
        setCurrentMediaIndex(0);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0 });
        }
    }, [selectedPost]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
            setCurrentMediaIndex(index);
        }
    };

    const scrollToImage = (index) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: index * scrollRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent hideClose onInteractOutside={() => { setOpen(false); setReplyingTo(null); }} className='max-w-5xl p-0 flex flex-col bg-white overflow-hidden rounded-[15px] border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] sm:max-h-[88vh] max-h-[95vh] w-[98vw] sm:w-[90vw] transition-all duration-500'>
                <DialogTitle className="sr-only">Post by {selectedPost?.author?.username}</DialogTitle>
                <DialogDescription className="sr-only">Post details and comments</DialogDescription>
                <div className='flex flex-col sm:flex-row flex-1 overflow-hidden'>
                    {/* Media Section */}
                    <div className='w-full sm:w-[55%] bg-[#050505] flex items-center justify-center relative group min-h-[350px] sm:min-h-0 overflow-hidden'>
                        {isReel ? (
                            <video
                                src={selectedPost?.videoUrl}
                                controls
                                autoPlay
                                loop
                                className='w-full h-full object-contain sm:max-h-[88vh] max-h-[50vh]'
                            />
                        ) : (
                            selectedPost?.images && selectedPost.images.length > 1 ? (
                                <>
                                    <div
                                        ref={scrollRef}
                                        onScroll={handleScroll}
                                        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                                    >
                                        {selectedPost.images.map((img, index) => (
                                            <div key={index} className="w-full h-full flex-none snap-center flex items-center justify-center">
                                                <img
                                                    className='w-full h-full object-contain'
                                                    src={img}
                                                    alt={`post_img_${index}`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="absolute top-4 right-4 bg-black/60 text-white text-[12px] px-2 py-1 rounded-full font-medium z-20 pointer-events-none">
                                        {currentMediaIndex + 1}/{selectedPost.images.length}
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex > 0 ? currentMediaIndex - 1 : selectedPost.images.length - 1); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex < selectedPost.images.length - 1 ? currentMediaIndex + 1 : 0); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                    </button>

                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
                                        {selectedPost.images.map((_, index) => (
                                            <div
                                                key={index}
                                                className={`w-1.5 h-1.5 rounded-full transition-all ${currentMediaIndex === index ? 'bg-[#0095F6] w-3' : 'bg-white/50'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <img
                                    src={selectedPost?.image || (selectedPost?.images && selectedPost.images[0])}
                                    alt="post_img"
                                    className='w-full h-full object-contain sm:max-h-[88vh] max-h-[50vh] transition-transform duration-700 group-hover:scale-[1.02]'
                                />
                            )
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>

                    {/* Comments Section */}
                    <div className='w-full sm:w-[45%] flex flex-col bg-white overflow-hidden relative'>
                        {/* Header */}
                        <div className='flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-20'>
                            <div className='flex gap-4 items-center'>
                                <Link to={`/profile/${selectedPost?.author?._id}`}>
                                    <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform">
                                        <Avatar className="w-9 h-9 border-2 border-white">
                                            <AvatarImage src={selectedPost?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className={cn("font-black text-xs uppercase", getAvatarColor(selectedPost?.author?.username))}>
                                                {selectedPost?.author?.username?.charAt(0)?.toUpperCase()}
                                            </AvatarFallback>
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
                                        <button onClick={() => { }} className='w-full text-[#ED4956] font-black py-4 hover:bg-red-50 transition-colors border-b border-gray-50'>Unfollow User</button>
                                        <button className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50'>Share Post</button>
                                        <DialogClose className='w-full py-4 hover:bg-gray-100 font-black text-gray-400 transition-colors'>Cancel</DialogClose>
                                    </DialogContent>
                                </Dialog>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpen(false);
                                        setReplyingTo(null);
                                    }}
                                    type="button"
                                    className="rounded-full h-10 w-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-all active:scale-95 focus:outline-none relative z-[100] cursor-pointer"
                                    aria-label="Close dialog"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Comments Area */}
                        <div className='flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-white'>
                            <div className='flex flex-col'>
                                {selectedPost?.caption && (
                                    <div className='flex gap-4 items-start mb-8 pb-6 border-b border-gray-50'>
                                        <Avatar className="w-8 h-8 shrink-0 ring-1 ring-gray-100">
                                            <AvatarImage src={selectedPost?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className={cn("font-black text-[10px] uppercase", getAvatarColor(selectedPost?.author?.username))}>
                                                {selectedPost?.author?.username?.charAt(0)}
                                            </AvatarFallback>
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
                                                    isReel={isReel}
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
                            <Send
                                onClick={() => setShowShare(true)}
                                size={22}
                                className="text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors"
                            />
                        </div>
                        <SaveButton 
                            isSaved={isReel 
                                ? user?.savedReels?.some(item => (typeof item === 'object' ? item._id : item).toString() === selectedPost?._id?.toString())
                                : user?.bookmarks?.some(item => (typeof item === 'object' ? item._id : item).toString() === selectedPost?._id?.toString())
                            } 
                            onClick={bookmarkHandler}
                            size={22} 
                        />
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
                                        <AvatarFallback className={cn("text-[10px] font-black uppercase", getAvatarColor(user?.username))}>
                                            {user?.username?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
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
                    users={selectedPost?.likes || []}
                />
            )}

            {isReel ? (
                <ShareReelModal open={showShare} setOpen={setShowShare} reel={selectedPost} />
            ) : (
                <SharePostModal open={showShare} setOpen={setShowShare} post={selectedPost} />
            )}
        </Dialog>
    )
}

export default CommentDialog
