import React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MoreHorizontal, X, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { useSelector, useDispatch } from 'react-redux';
import { FaHeart, FaRegHeart } from "react-icons/fa";
import api from '@/api';
import { toast } from 'sonner';
import { setPosts, setSelectedPost, updatePostLikes } from '@/redux/postSlice';
import { setAuthUser, setUserProfile, toggleBookmark } from '@/redux/authSlice';
import SaveButton from './SaveButton';
import SharePostModal from './SharePostModal';
import CommentDialog from './CommentDialog';

const PostModal = ({ open, setOpen, post: initialPost, onOpenComment }) => {
    const { user, userProfile } = useSelector(store => store.auth);
    const { posts, selectedPost } = useSelector(store => store.post);
    const dispatch = useDispatch();
    const [showShare, setShowShare] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [showMoreOptions, setShowMoreOptions] = React.useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
    const scrollRef = React.useRef(null);

    // Prioritize the live post from store if IDs match
    const post = (selectedPost?._id === initialPost?._id) ? selectedPost : initialPost;

    React.useEffect(() => {
        if (open) {
            document.body.classList.add('post-modal-open');
        } else {
            document.body.classList.remove('post-modal-open');
        }
        return () => document.body.classList.remove('post-modal-open');
    }, [open]);

    const liked = post?.likes?.some(id => (id._id || id).toString() === user?._id?.toString());
    const images = (post?.images && post?.images.length > 0) ? post.images : (post?.image ? [post.image] : []);

    const handleLike = async (e) => {
        if (e) e.stopPropagation();
        
        // Optimistic Values
        const action = liked ? "dislike" : "like";
        
        // 1. Update Redux immediately
        dispatch(updatePostLikes({ 
            postId: post._id, 
            userId: user._id, 
            type: action 
        }));

        try {
            const res = await api.get(`/post/${post._id}/${action}`);
            if (!res.data.success) {
                // Rollback on failure
                dispatch(updatePostLikes({ 
                    postId: post._id, 
                    userId: user._id, 
                    type: action === 'like' ? 'dislike' : 'like' 
                }));
                toast.error(res.data.message || "Failed to update like", { id: `like-${post._id}` });
            } else {
                toast.success(res.data.message, { id: `like-${post._id}` });
            }
        } catch (error) {
            // Rollback on error
            dispatch(updatePostLikes({ 
                postId: post._id, 
                userId: user._id, 
                type: action === 'like' ? 'dislike' : 'like' 
            }));
            console.error(error);
            toast.error("Network error: Failed to update like", { id: `like-${post._id}` });
        }
    };

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

    const deletePostHandler = async () => {
        try {
            const res = await api.delete(`/post/delete/${post?._id}`);
            if (res.data.success) {
                const updatedPostData = posts.filter((postItem) => postItem?._id !== post?._id);
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
                setOpen(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete post");
        }
    };

    const isReel = post?.feedType === 'reel';

    const bookmarkHandler = async () => {
        // 1. Update Redux immediately (Optimistically)
        dispatch(toggleBookmark({ postId: post._id, isReel: isReel }));

        try {
            const endpoint = isReel ? `/reels/save/${post?._id}` : `/post/${post?._id}/bookmark`;
            const res = await api.post(endpoint, {});
            
            if (res.data.success) {
                toast.success(res.data.message, { id: `bookmark-${post?._id}` });
            } else {
                // Rollback on failure
                dispatch(toggleBookmark({ postId: post._id, isReel: isReel }));
                toast.error(res.data.message || "Failed to bookmark", { id: `bookmark-${post?._id}` });
            }
        } catch (error) {
            // Rollback on error
            dispatch(toggleBookmark({ postId: post._id, isReel: isReel }));
            console.error(error);
            toast.error("Failed to bookmark", { id: `bookmark-${post?._id}` });
        }
    };

    if (!post) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent hideClose className='max-w-[500px] w-[95vw] md:w-full p-0 flex flex-col bg-white max-h-[90vh] overflow-hidden rounded-[15px] sm:rounded-[24px] border-none shadow-2xl animate-in zoom-in-95 duration-300'>
                    <DialogTitle className="sr-only">Post by {post?.author?.username}</DialogTitle>
                    <DialogDescription className="sr-only">Viewing shared post media and caption</DialogDescription>
                    
                    {/* Header */}
                    <div className='flex items-center justify-between px-5 py-4 border-b border-gray-50 shrink-0'>
                        <div className='flex items-center gap-3'>
                            <Avatar className="w-10 h-10 border border-gray-100 p-[1px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                                <AvatarImage src={post?.author?.profilePicture} className="object-cover rounded-full" />
                                <AvatarFallback className="bg-gray-100 font-bold">{post?.author?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col'>
                                <span className='font-bold text-[14px] text-gray-900'>{post?.author?.username}</span>
                                {post?.location && <span className='text-[10px] text-gray-400 font-medium'>{post.location}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Dialog open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                                <DialogTrigger asChild>
                                    <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors cursor-pointer">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="p-0 border-none bg-white rounded-3xl overflow-hidden max-w-[400px] shadow-2xl flex flex-col items-center text-sm text-center">
                                    <button className="w-full py-4 font-black text-[#ED4956] hover:bg-red-50 border-b border-gray-50 transition-colors">Report Content</button>
                                    <button className="w-full py-4 font-black text-[#ED4956] hover:bg-red-50 border-b border-gray-50 transition-colors">Unfollow User</button>
                                    {user?._id === post?.author?._id && (
                                        <button onClick={deletePostHandler} className="w-full py-4 font-black text-[#ED4956] hover:bg-red-50 border-b border-gray-50 transition-colors">Delete Post</button>
                                    )}
                                    <button className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50'>Add to Favorites</button>
                                    <button onClick={() => { setShowMoreOptions(false); setShowShare(true); }} className='w-full font-bold py-4 hover:bg-gray-50 transition-colors border-b border-gray-50'>Share Post</button>
                                    <button onClick={() => setShowMoreOptions(false)} className="w-full py-4 hover:bg-gray-100 font-black text-gray-400 transition-colors">Cancel</button>
                                </DialogContent>
                            </Dialog>
                            <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Media */}
                    <div className="w-full relative aspect-square bg-black flex items-center justify-center group shrink min-h-[250px]">
                        {images.length > 1 ? (
                            <>
                                <div 
                                    ref={scrollRef}
                                    onScroll={handleScroll}
                                    className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                                >
                                    {images.map((img, index) => (
                                        <div key={index} className="w-full h-full flex-none snap-center flex items-center justify-center">
                                            <img 
                                                className='w-full h-full object-contain'
                                                src={img} 
                                                alt={`post_img_${index}`}
                                                onDoubleClick={handleLike}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold z-10 pointer-events-none">
                                    {currentMediaIndex + 1} / {images.length}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex > 0 ? currentMediaIndex - 1 : images.length - 1); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); scrollToImage(currentMediaIndex < images.length - 1 ? currentMediaIndex + 1 : 0); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center hover:scale-110 active:scale-90"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </button>
                            </>
                        ) : (
                            <img src={images[0]} className='w-full h-full object-contain' alt="post" onDoubleClick={handleLike} />
                        )}
                    </div>

                    {/* Footer */}
                    <div className='p-5 flex flex-col gap-4 bg-white shrink-0 overflow-y-auto custom-scrollbar max-h-[40vh] sm:max-h-[30vh] font-medium'>
                        <div className='flex items-center justify-between shrink-0'>
                            <div className='flex items-center gap-5'>
                                <button onClick={handleLike} className='hover:scale-110 active:scale-90 transition-transform'>
                                    {liked ? <FaHeart size={24} className='text-red-500' /> : <FaRegHeart size={24} className='text-gray-800' />}
                                </button>
                                <button 
                                    onClick={() => {
                                        dispatch(setSelectedPost(post));
                                        if (onOpenComment) {
                                            onOpenComment();
                                        } else {
                                            setShowComments(true);
                                        }
                                    }} 
                                    className='hover:scale-110 active:scale-90 transition-transform'
                                >
                                    <MessageCircle size={24} className='text-gray-800' />
                                </button>
                                <button onClick={() => setShowShare(true)} className='hover:scale-110 active:scale-90 transition-transform'>
                                    <Send size={24} className='text-gray-800 -rotate-12' />
                                </button>
                            </div>
                            <SaveButton 
                                isSaved={isReel 
                                    ? user?.savedReels?.some(item => (typeof item === 'object' ? item._id : item).toString() === post?._id?.toString())
                                    : user?.bookmarks?.some(item => (typeof item === 'object' ? item._id : item).toString() === post?._id?.toString())
                                } 
                                onClick={bookmarkHandler}
                                size={24} 
                            />
                        </div>

                        <div className='flex flex-col gap-1.5 shrink-0'>
                            <span className='font-bold text-[14px] text-gray-900'>{post.likes?.length || 0} likes</span>
                            <p className='text-[14px] text-gray-800 leading-relaxed break-words'>
                                <span className='font-bold mr-2'>{post?.author?.username}</span>
                                {post.caption}
                            </p>
                            <button 
                                onClick={() => {
                                    dispatch(setSelectedPost(post));
                                    if (onOpenComment) {
                                        onOpenComment();
                                    } else {
                                        setShowComments(true);
                                    }
                                }}
                                className='text-[12px] font-bold text-gray-400 mt-1 uppercase tracking-wider hover:text-indigo-600 transition-colors text-left w-max'
                            >
                                View all {post.comments?.length || 0} comments
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <SharePostModal open={showShare} setOpen={setShowShare} post={post} />
            <CommentDialog open={showComments} setOpen={setShowComments} />
        </>
    );
};

export default PostModal;
