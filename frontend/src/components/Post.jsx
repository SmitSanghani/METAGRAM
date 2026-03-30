import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from './ui/dialog'
import { MessageCircle, MoreHorizontal, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SaveButton from './SaveButton'
import { Button } from './ui/button'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import CommentDialog from './CommentDialog'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/api';
import { setPosts, setSelectedPost, updatePostLikes } from '@/redux/postSlice'
import { setAuthUser, setUserProfile, toggleBookmark } from '@/redux/authSlice'
import { Badge } from './ui/badge'
import UserListModal from './UserListModal'
import SharePostModal from './SharePostModal'

const Post = ({ post }) => {

    // if (!post) return null;
    if (!post || !post.author) return null;

    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { user, userProfile } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);

    // Derived values for live updates
    const liked = post?.likes?.includes(user?._id);
    const postLike = post?.likes?.length || 0;
    const comment = post?.comments || [];
    const [showLikers, setShowLikers] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const dispatch = useDispatch();


    const changeEventHandler = (e) => {
        const inputText = e.target.value;
        if (inputText.trim()) {
            setText(inputText);
        } else {
            setText("");
        }
    }


    // like or dislike post handler :
    const likeOrDislikeHandler = async () => {
        const action = liked ? "dislike" : "like";
        
        // Optimistic Update : Update UI immediately
        dispatch(updatePostLikes({ 
            postId: post._id, 
            userId: user._id, 
            type: action 
        }));

        try {
            const res = await api.get(`/post/${post._id}/${action}`);
            if (res.data.success) {
                toast.success(res.data.message, { id: `like-${post._id}` });
            } else {
                // Rollback on failure
                dispatch(updatePostLikes({ 
                    postId: post._id, 
                    userId: user._id, 
                    type: action === 'like' ? 'dislike' : 'like' 
                }));
                toast.error(res.data.message, { id: `like-${post._id}` });
            }
        } catch (error) {
            // Revert on network/server error
            dispatch(updatePostLikes({ 
                postId: post._id, 
                userId: user._id, 
                type: action === 'like' ? 'dislike' : 'like' 
            }));
            console.log(error);
            toast.error("Failed to update like", { id: `like-${post._id}` });
        }
    }

    // comment on post handler :
    const commentHandler = async () => {
        try {
            const res = await api.post(`/post/${post._id}/comment`, { text }, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if (res.data.success) {
                const updatedCommnetData = [...post.comments, res.data.comment];

                const updatedPostData = posts.map(p =>
                    p._id === post._id ? {
                        ...p,
                        comments: updatedCommnetData
                    } : p
                );
                dispatch(setPosts(updatedPostData));
                setText("");
                toast.success(res.data.message, { id: `comment-${post._id}` });
            }
        } catch (error) {
            console.log(error);
        }
    }


    // delete post handler :
    const deletePostHandler = async () => {
        try {
            const res = await api.delete(`/post/delete/${post?._id}`);
            if (res.data.success) {
                const updatedPostData = posts.filter((postItem) => postItem?._id !== post?._id);
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Failed to delete post");
        }
    }

    const bookmarkHandler = async () => {
        // 1. Update Redux Auth state immediately (Optimistically)
        dispatch(toggleBookmark({ postId: post._id, isReel: false }));

        try {
            const res = await api.post(`/post/${post?._id}/bookmark`, {});
            if (res.data.success) {
                toast.success(res.data.message, { id: `bookmark-${post._id}` });
            } else {
                // Rollback
                dispatch(toggleBookmark({ postId: post._id, isReel: false }));
                toast.error(res.data.message || "Failed to bookmark", { id: `bookmark-${post._id}` });
            }
        } catch (error) {
            // ROLLBACK on error
            dispatch(toggleBookmark({ postId: post._id, isReel: false }));
            console.log(error);
            toast.error(error.message || "Failed to bookmark", { id: `bookmark-${post._id}` });
        }
    }


    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const scrollRef = React.useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const lastScrollTime = useRef(0);

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

    // Wheel listener for Post carousel
    React.useEffect(() => {
        const el = scrollRef.current;
        if (!el || !post.images || post.images.length <= 1) return;

        const handleWheel = (e) => {
            if (!isHovered) return;

            const dx = Math.abs(e.deltaX);
            const dy = Math.abs(e.deltaY);
            
            // If the user is scrolling vertically on the post carousel, intercept it
            if (dy > 3 && dy > dx) {
                e.preventDefault(); // Stop page scroll

                const now = Date.now();
                if (now - lastScrollTime.current < 300) return; // Debounce

                if (e.deltaY > 0) {
                    scrollToImage(currentMediaIndex + 1 < post.images.length ? currentMediaIndex + 1 : 0);
                } else {
                    scrollToImage(currentMediaIndex > 0 ? currentMediaIndex - 1 : post.images.length - 1);
                }
                lastScrollTime.current = now;
            } else if (dx > 3) {
                // For touchpads horizontal swipe, let native handle it or prevent if needed
                // Usually native is fine for scroll containers with snap
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [currentMediaIndex, isHovered, post.images]);

    return (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className='mb-16 w-full mx-auto bg-white border-b border-gray-100 pb-12 transition-colors duration-300'
        >
            {/* Header */}
            <div className='flex items-center justify-between py-4 bg-white px-2'>
                <div className='flex items-center gap-4'>
                    <div
                        onClick={() => navigate(`/profile/${post?.author?._id}`)}
                        className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 cursor-pointer"
                    >
                        <Avatar className="w-[42px] h-[42px] border-2 border-white">
                            <AvatarImage src={post?.author?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className="font-bold text-sm bg-gray-100">{post?.author?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <h1
                            onClick={() => navigate(`/profile/${post?.author?._id}`)}
                            className='font-bold text-[15px] text-gray-900 cursor-pointer hover:text-gray-500'
                        >
                            {post?.author?.username}
                        </h1>
                        {user?._id === post?.author?._id && <span className="text-[10px] text-zinc-400 font-medium">• You</span>}
                    </div>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex items-center justify-center rounded-full hover:bg-gray-50 cursor-pointer p-1">
                            <MoreHorizontal className='text-black' size={24} />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0 bg-white dark:bg-zinc-900 border-none sm:rounded-xl overflow-hidden max-w-[400px]">
                        <div className="flex flex-col items-center">
                            <Button variant="ghost" className="w-full py-4 text-[14px] font-bold text-[#ED4956] hover:bg-red-50 dark:hover:bg-red-900/10 border-b border-gray-50 dark:border-zinc-800 rounded-none h-auto">Unfollow</Button>

                            {user && user?._id === post?.author?._id && (
                                <Button onClick={deletePostHandler} variant="ghost" className="w-full py-4 text-[14px] font-bold text-[#ED4956] hover:bg-red-50 dark:hover:bg-red-900/10 border-b border-gray-50 dark:border-zinc-800 rounded-none h-auto">Delete</Button>
                            )}
                            <DialogClose className='w-full py-4 text-[14px] font-normal text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors'>Cancel</DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Media Content */}
            <div className="w-full relative border border-gray-100 rounded-xl shadow-sm overflow-hidden group">
                {
                    post.images && post.images.length > 1 ? (
                        <>
                            <div 
                                ref={scrollRef}
                                onScroll={handleScroll}
                                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                            >
                                {post.images.map((img, index) => (
                                    <div key={index} className="w-full flex-none snap-center">
                                        <img 
                                            className='w-full h-auto max-h-[700px] object-cover'
                                            src={img} 
                                            alt={`post_img_${index}`}
                                            onDoubleClick={likeOrDislikeHandler}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            <div className="absolute top-2 right-4 bg-black/60 text-white text-[12px] px-2 py-1 rounded-full font-medium z-10 pointer-events-none">
                                {currentMediaIndex + 1}/{post.images.length}
                            </div>

                            {/* Navigation Arrows - Only visible on hover */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex > 0 ? currentMediaIndex - 1 : post.images.length - 1); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex < post.images.length - 1 ? currentMediaIndex + 1 : 0); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </>
                    ) : (
                        <img className='w-full h-auto max-h-[700px] object-cover'
                            src={post.image || (post.images && post.images[0])} alt="post_img"
                            onDoubleClick={likeOrDislikeHandler}
                        />
                    )
                }
            </div>

            {/* Post Interaction Row */}
            <div className="py-4">
                <div className='flex items-center justify-between mb-4 px-2'>
                    <div className='flex items-center gap-5'>
                        <div className="transition-transform active:scale-90 cursor-pointer">
                            {
                                liked ?
                                    <FaHeart onClick={likeOrDislikeHandler} size={28} className='text-red-500' /> :
                                    <FaRegHeart onClick={likeOrDislikeHandler} size={28} className='text-black hover:text-gray-500' />
                            }
                        </div>
                        <div className="transition-transform active:scale-90 cursor-pointer" onClick={() => { dispatch(setSelectedPost(post)); setOpen(true); }}>
                            <MessageCircle size={28} className='text-black hover:text-gray-500' strokeWidth={2} />
                        </div>
                        <div className="transition-transform active:scale-90 cursor-pointer" onClick={() => setShowShare(true)}>
                            <Send size={28} className='text-black hover:text-gray-500' strokeWidth={2} />
                        </div>
                    </div>
                    <div className="transition-transform active:scale-90 cursor-pointer px-2">
                        <SaveButton
                            isSaved={user?.bookmarks?.some(item => (item._id || item).toString() === post?._id?.toString())}
                            onClick={bookmarkHandler}
                            size={28}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1 px-2">
                    <span
                        onClick={() => setShowLikers(true)}
                        className='font-bold text-[15px] text-gray-900 cursor-pointer hover:opacity-70'
                    >
                        {postLike.toLocaleString()} likes
                    </span>

                    <div className='flex flex-wrap items-center gap-2'>
                        <span
                            onClick={() => navigate(`/profile/${post?.author?._id}`)}
                            className='font-bold text-[15px] text-gray-900 hover:opacity-70 cursor-pointer'
                        >
                            {post?.author?.username}
                        </span>
                        <p className='text-[15px] text-gray-800 font-medium'>
                            {post.caption}
                        </p>
                    </div>

                    {comment.length > 0 && (
                        <button
                            onClick={() => { dispatch(setSelectedPost(post)); setOpen(true); }}
                            className='text-[14px] font-bold text-gray-400 mt-1 hover:opacity-70 text-left'
                        >
                            View all {comment.length} comments
                        </button>
                    )}

                    <CommentDialog open={open} setOpen={setOpen} />

                    <SharePostModal open={showShare} setOpen={setShowShare} post={post} />

                    {showLikers && (
                        <UserListModal
                            isOpen={showLikers}
                            onClose={() => setShowLikers(false)}
                            title="Likes"
                            users={post?.likes}
                        />
                    )}

                    {/* Inline Comment Input */}
                    {post.allowComments && (
                        <form
                            onSubmit={(e) => { e.preventDefault(); commentHandler(); }}
                            className='flex items-center gap-3 mt-2 border-none'
                        >
                            <input
                                type="text"
                                placeholder='Add a comment...'
                                value={text}
                                onChange={changeEventHandler}
                                className='bg-transparent text-[14px] w-full outline-none placeholder:text-gray-300 text-gray-900 border-none font-medium'
                            />
                            {text.trim() && (
                                <button
                                    type="submit"
                                    className='text-[#0095F6] font-semibold text-[14px] hover:text-black dark:hover:text-white transition-colors'
                                >
                                    Post
                                </button>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Post