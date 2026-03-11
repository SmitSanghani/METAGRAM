import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from './ui/dialog'
import { MessageCircle, MoreHorizontal, Send } from 'lucide-react'
import SaveButton from './SaveButton'
import { Button } from './ui/button'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import CommentDialog from './CommentDialog'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import axios from 'axios'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { setAuthUser, setUserProfile } from '@/redux/authSlice'
import { Badge } from './ui/badge'
import UserListModal from './UserListModal'

const Post = ({ post }) => {

    // if (!post) return null;
    if (!post || !post.author) return null;

    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const { user, userProfile } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);
    const [liked, setLiked] = useState(post.likes.includes(user?._id) || false);
    const [postLike, setPostLike] = useState(post.likes.length);
    const [comment, setComment] = useState(post.comments);
    const [showLikers, setShowLikers] = useState(false);
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
        try {
            const action = liked ? "dislike" : "like";
            const res = await axios.get(`http://localhost:8000/api/v1/post/${post._id}/${action}`, { withCredentials: true });
            if (res.data.success) {
                const updatedLikes = liked ? postLike - 1 : postLike + 1;
                setPostLike(updatedLikes);
                setLiked(!liked);

                // Update the post likes :
                const updatedPostData = posts.map(p =>
                    p._id === post._id ? {
                        ...p,
                        likes: liked ? p.likes.filter(id => id !== user._id) : [...p.likes, user._id]
                    } : p
                );
                dispatch(setPosts(updatedPostData));

                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
        }
    }


    // comment on post handler :
    const commentHandler = async () => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/post/${post._id}/comment`, { text }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true,
            });
            console.log(res.data);
            if (res.data.success) {
                const updatedCommnetData = [...comment, res.data.comment];
                setComment(updatedCommnetData);

                const updatedPostData = posts.map(p =>
                    p._id === post._id ? {
                        ...p,
                        comments: updatedCommnetData
                    } : p
                );
                dispatch(setPosts(updatedPostData));
                setText("");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);

        }
    }


    // delete post handler :
    const deletePostHandler = async () => {
        try {
            const res = await axios.delete(`http://localhost:8000/api/v1/post/delete/${post?._id}`, { withCredentials: true });
            if (res.data.success) {
                const updatedPostData = posts.filter((postItem) => postItem?._id !== post?._id);
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        }
    }

    const bookmarkHandler = async () => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/post/${post?._id}/bookmark`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);

                const isBookmarked = user?.bookmarks?.some(item => (item._id || item) === post._id);
                // Update bookmarks in redux user object :
                const updatedBookmarks = isBookmarked
                    ? user.bookmarks.filter(item => (item._id || item) !== post._id)
                    : [...user.bookmarks, post._id];
                dispatch(setAuthUser({ ...user, bookmarks: updatedBookmarks }));

                // If user is viewing their own profile, sync the object-based bookmarks list
                if (userProfile && userProfile._id === user._id) {
                    const updatedProfileBookmarks = isBookmarked
                        ? userProfile.bookmarks.filter(p => (p._id || p) !== post._id)
                        : [...userProfile.bookmarks, post];
                    dispatch(setUserProfile({ ...userProfile, bookmarks: updatedProfileBookmarks }));
                }
            }
        } catch (error) {
            console.log(error);
        }
    }


    return (
        <div className='my-8 w-full max-w-lg mx-auto bg-white border border-gray-100 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] group'>
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-5 bg-white sm:bg-white/50 backdrop-blur-sm'>
                <div className='flex items-center gap-3.5'>
                    <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform hover:scale-110">
                        <Avatar className="w-[38px] h-[38px] border-2 border-white ring-1 ring-gray-50 shadow-sm transition-all">
                            <AvatarImage src={post?.author?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className="font-black text-xs bg-gray-100">{post?.author?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className='flex flex-col -gap-0.5 mt-0.5'>
                        <div className="flex items-center gap-2">
                            <h1 className='font-black text-[14px] text-gray-900 tracking-tight cursor-pointer hover:text-indigo-600 transition-colors'>{post?.author?.username}</h1>
                            {user?._id === post?.author?._id && <Badge className="bg-indigo-600 text-white text-[9px] hover:bg-indigo-700 border-0 h-4 px-2 uppercase font-black tracking-widest">You</Badge>}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-wider">Tokyo, Japan</span>
                    </div>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50 cursor-pointer transition-all group/opt">
                            <MoreHorizontal className='text-gray-400 group-hover/opt:text-black transition-colors' size={20} />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0 bg-white border-none shadow-2xl sm:rounded-[24px] overflow-hidden max-w-[400px] animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center">
                            <Button variant="ghost" className="w-full py-5 text-[13px] font-black text-[#ED4956] hover:bg-red-50 border-b border-gray-50 rounded-none h-auto transition-colors uppercase tracking-widest">Unfollow</Button>
                            <Button variant="ghost" className="w-full py-5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 rounded-none h-auto transition-colors uppercase tracking-widest">Add to favorites</Button>
                            <Button variant="ghost" className="w-full py-5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 rounded-none h-auto transition-colors uppercase tracking-widest">Copy link</Button>
                            {user && user?._id === post?.author._id && (
                                <Button onClick={deletePostHandler} variant="ghost" className="w-full text-red-100 bg-red-500 py-5 text-[13px] font-black hover:bg-red-600 border-none rounded-none h-auto transition-colors uppercase tracking-widest">Delete Post</Button>
                            )}
                            <DialogClose className='w-full py-5 text-[13px] font-black text-gray-400 hover:bg-gray-100 uppercase tracking-widest transition-colors'>Cancel</DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Content Section */}
            <div className="w-full relative px-1">
                <div className="w-full overflow-hidden rounded-[22px] transition-all duration-700 group-hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
                    <img className='w-full h-auto max-h-[600px] object-cover transition-transform duration-1000 group-hover:scale-105'
                        src={post.image} alt="post_img"
                        onDoubleClick={likeOrDislikeHandler}
                    />
                </div>
            </div>

            {/* Post Interaction Layer */}
            <div className="px-7 py-6">
                <div className='flex items-center justify-between mb-5'>
                    <div className='flex items-center gap-4'>
                        <div className="transition-transform active:scale-75 cursor-pointer">
                            {
                                liked ?
                                    <FaHeart onClick={likeOrDislikeHandler} size={25} className='text-red-500 drop-shadow-[0_4px_10px_rgba(239,68,68,0.3)]' /> :
                                    <FaRegHeart onClick={likeOrDislikeHandler} size={25} className='text-gray-800 hover:text-red-400 transition-colors' />
                            }
                        </div>
                        <div className="transition-transform active:scale-75 cursor-pointer" onClick={() => { dispatch(setSelectedPost(post)); setOpen(true); }}>
                            <MessageCircle size={25} className='text-gray-800 hover:text-indigo-600 transition-colors' strokeWidth={2} />
                        </div>
                        <div className="transition-transform active:scale-75 cursor-pointer">
                            <Send size={25} className='text-gray-800 hover:text-indigo-600 transition-colors' strokeWidth={2} />
                        </div>
                    </div>
                    <div className="transition-transform active:scale-75 cursor-pointer">
                        <SaveButton
                            isSaved={user?.bookmarks?.some(item => (item._id || item) === post?._id)}
                            onClick={bookmarkHandler}
                            size={25}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 mb-2.5">
                    <span
                        onClick={() => setShowLikers(true)}
                        className='font-black text-[14px] text-gray-900 cursor-pointer hover:underline'
                    >
                        {postLike.toLocaleString()}
                    </span>
                    <span className='font-bold text-[13px] text-gray-400 uppercase tracking-widest'>Likes</span>
                </div>

                <div className='flex flex-col gap-1 mb-4'>
                    <p className='text-[14px] text-gray-700 leading-relaxed font-medium'>
                        <span className='font-black mr-2 text-gray-900 group-hover:text-indigo-600 transition-colors'>{post?.author?.username}</span>
                        {post.caption}
                    </p>
                </div>

                {comment.length > 0 && (
                    <button
                        onClick={() => { dispatch(setSelectedPost(post)); setOpen(true); }}
                        className='text-[12px] font-black text-gray-400/80 uppercase tracking-widest mb-6 block hover:text-indigo-500 transition-colors active:scale-95'
                    >
                        View all {comment.length} sentiments
                    </button>
                )}

                <CommentDialog open={open} setOpen={setOpen} />

                {showLikers && (
                    <UserListModal
                        isOpen={showLikers}
                        onClose={() => setShowLikers(false)}
                        title="Likes"
                        users={post?.likes}
                    />
                )}

                {/* Inline Comment Input */}
                {post.allowComments ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); commentHandler(); }}
                        className='flex items-center gap-3 bg-gray-50/50 p-1 rounded-full pl-5 border border-transparent focus-within:bg-white focus-within:border-indigo-100 transition-all duration-300'
                    >
                        <input
                            type="text"
                            placeholder='Add a comment...'
                            value={text}
                            onChange={changeEventHandler}
                            className='bg-transparent text-[13px] font-medium w-full outline-none placeholder:text-gray-400 text-gray-700'
                        />
                        <button
                            type="submit"
                            disabled={!text.trim()}
                            onClick={commentHandler}
                            className='bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-full shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-0 disabled:translate-x-2'
                        >
                            Send
                        </button>
                    </form>
                ) : (
                    <div className='bg-gray-50 rounded-full py-3 px-4 flex items-center justify-center gap-2'>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
                        <p className='text-[11px] font-black text-gray-400 tracking-widest uppercase'>Public Discussion Paused</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Post