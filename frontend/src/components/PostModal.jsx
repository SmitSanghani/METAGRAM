import React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MoreHorizontal, X, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { useSelector, useDispatch } from 'react-redux';
import { FaHeart, FaRegHeart } from "react-icons/fa";
import api from '@/api';
import { toast } from 'sonner';
import { setPosts, setSelectedPost } from '@/redux/postSlice';
import SaveButton from './SaveButton';
import SharePostModal from './SharePostModal';
import CommentDialog from './CommentDialog';

const PostModal = ({ open, setOpen, post }) => {
    const { user } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);
    const dispatch = useDispatch();
    const [showShare, setShowShare] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
    const scrollRef = React.useRef(null);

    const liked = post?.likes?.some(id => (id._id || id) === user?._id);
    const images = (post?.images && post?.images.length > 0) ? post.images : (post?.image ? [post.image] : []);

    const handleLike = async (e) => {
        e.stopPropagation();
        try {
            const action = liked ? "dislike" : "like";
            const res = await api.get(`/post/${post._id}/${action}`);
            if (res.data.success) {
                const updatedPostData = posts.map(p =>
                    p._id === post._id ? {
                        ...p,
                        likes: liked ? p.likes.filter(id => (id._id || id) !== user._id) : [...p.likes, user._id]
                    } : p
                );
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
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

    if (!post) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent hideClose className='max-w-[500px] w-[95vw] md:w-full p-0 flex flex-col bg-white max-h-[90vh] overflow-hidden rounded-[15px] sm:rounded-[24px] border-none shadow-2xl animate-in zoom-in-95 duration-300'>
                    <DialogTitle className="sr-only">Post by {post?.author?.username}</DialogTitle>
                    <DialogDescription className="sr-only">Viewing post without comments</DialogDescription>
                    
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
                            <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <MoreHorizontal size={20} />
                            </button>
                            <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
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
                            <img src={images[0]} className='w-full h-full object-contain' alt="post" />
                        )}
                    </div>

                    {/* Footer */}
                    <div className='p-5 flex flex-col gap-4 bg-white shrink-0 overflow-y-auto custom-scrollbar max-h-[40vh] sm:max-h-[30vh]'>
                        <div className='flex items-center justify-between shrink-0'>
                            <div className='flex items-center gap-5'>
                                <button onClick={handleLike} className='hover:scale-110 active:scale-90 transition-transform'>
                                    {liked ? <FaHeart size={24} className='text-red-500' /> : <FaRegHeart size={24} className='text-gray-800' />}
                                </button>
                                <button onClick={() => setShowComments(true)} className='hover:scale-110 active:scale-90 transition-transform'>
                                    <MessageCircle size={24} className='text-gray-800' />
                                </button>
                                <button onClick={() => setShowShare(true)} className='hover:scale-110 active:scale-90 transition-transform'>
                                    <Send size={24} className='text-gray-800 -rotate-12' />
                                </button>
                            </div>
                            <SaveButton isSaved={user?.bookmarks?.some(item => (item._id || item) === post._id)} size={24} />
                        </div>

                        <div className='flex flex-col gap-1.5 shrink-0'>
                            <span className='font-bold text-[14px] text-gray-900'>{post.likes?.length || 0} likes</span>
                            <p className='text-[14px] text-gray-800 leading-relaxed font-medium break-words'>
                                <span className='font-bold mr-2'>{post?.author?.username}</span>
                                {post.caption}
                            </p>
                            <button 
                                onClick={() => setShowComments(true)}
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
