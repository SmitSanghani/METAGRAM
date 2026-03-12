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
        <div className='mb-16 w-full mx-auto bg-white border-b border-gray-100 pb-12 transition-colors duration-300'>
            {/* Header */}
            <div className='flex items-center justify-between py-4 bg-white px-2'>
                <div className='flex items-center gap-4'>
                    <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                        <Avatar className="w-[42px] h-[42px] border-2 border-white">
                            <AvatarImage src={post?.author?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className="font-bold text-sm bg-gray-100">{post?.author?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <h1 className='font-bold text-[15px] text-gray-900 cursor-pointer hover:text-gray-500'>{post?.author?.username}</h1>
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
                            <Button variant="ghost" className="w-full py-4 text-[14px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800 rounded-none h-auto">Go to post</Button>
                            {user && user?._id === post?.author._id && (
                                <Button onClick={deletePostHandler} variant="ghost" className="w-full py-4 text-[14px] font-bold text-[#ED4956] hover:bg-red-50 dark:hover:bg-red-900/10 border-b border-gray-50 dark:border-zinc-800 rounded-none h-auto">Delete</Button>
                            )}
                            <DialogClose className='w-full py-4 text-[14px] font-normal text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors'>Cancel</DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Media Content */}
            <div className="w-full relative border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <img className='w-full h-auto max-h-[700px] object-cover'
                    src={post.image} alt="post_img"
                    onDoubleClick={likeOrDislikeHandler}
                />
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
                        <div className="transition-transform active:scale-90 cursor-pointer">
                            <Send size={28} className='text-black hover:text-gray-500' strokeWidth={2} />
                        </div>
                    </div>
                    <div className="transition-transform active:scale-90 cursor-pointer px-2">
                        <SaveButton
                            isSaved={user?.bookmarks?.some(item => (item._id || item) === post?._id)}
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
                        <span className='font-bold text-[15px] text-gray-900 hover:opacity-70 cursor-pointer'>{post?.author?.username}</span>
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