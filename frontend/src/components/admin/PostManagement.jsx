import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Eye, Loader2, X, Image as ImageIcon } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';
import PostViewModal from './PostViewModal';
import Swal from 'sweetalert2';

const PostManagement = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const { socket } = useSelector(store => store.socketio);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/post/all');
            if (res.data.success) {
                setPosts(res.data.posts);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch posts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();

        if (socket) {
            socket.on('newPost', (newPost) => {
                setPosts(prev => [newPost, ...prev]);
            });

            socket.on('deletePost', (deletedPostId) => {
                setPosts(prev => prev.filter(p => p._id !== deletedPostId));
            });

            return () => {
                socket.off('newPost');
                socket.off('deletePost');
            };
        }
    }, [socket]);

    const deletePostHandler = async (postId) => {
        const result = await Swal.fire({
            title: 'Delete Post?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, delete it!',
            background: '#ffffff',
            borderRadius: '24px',
            customClass: {
                popup: 'rounded-[24px]',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await api.delete(`/post/delete/${postId}`);
                if (res.data.success) {
                    setPosts(posts.filter(p => p._id !== postId));
                    toast.success(res.data.message);
                    if (selectedPost?._id === postId) {
                        setShowModal(false);
                        setSelectedPost(null);
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error(error.response?.data?.message || "Failed to delete post");
            }
        }
    }

    const deleteCommentHandler = async (commentId, postId) => {
        const result = await Swal.fire({
            title: 'Delete Comment?',
            text: "Remove this comment from the platform?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, delete it!',
            background: '#ffffff',
            borderRadius: '24px',
            customClass: {
                popup: 'rounded-[24px]',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await api.delete(`/post/comment/delete/${commentId}`);
                if (res.data.success) {
                    // Update post in list to reflect comment deletion
                    setPosts(prev => prev.map(p => {
                        if (p._id === postId) {
                            return {
                                ...p,
                                comments: p.comments.filter(c => c._id !== commentId)
                            }
                        }
                        return p;
                    }));
                    
                    // Update selected post if modal is open
                    if (selectedPost?._id === postId) {
                        setSelectedPost(prev => ({
                            ...prev,
                            comments: prev.comments.filter(c => c._id !== commentId)
                        }));
                    }
                    toast.success(res.data.message);
                }
            } catch (error) {
                console.error(error);
                toast.error(error.response?.data?.message || "Failed to delete comment");
            }
        }
    };

    const viewPostHandler = (post) => {
        setSelectedPost(post);
        setShowModal(true);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 mb-1">Posts Management</h1>
                    <p className="text-sm text-gray-500">Moderate media shared on the platform.</p>
                </div>
                <button 
                    onClick={fetchPosts}
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                >
                    Refresh Data
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Loading platform posts...</p>
                </div>
            ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <div key={post._id} className="bg-white rounded-[18px] border border-gray-100 overflow-hidden group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            {/* Post Image with Badge for Multiple */}
                            <div className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer" onClick={() => viewPostHandler(post)}>
                                <img src={post.image} alt="post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {post.images?.length > 1 && (
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg border border-white/20">
                                        <ImageIcon size={12} className="text-white" />
                                        {post.images.length} Photos
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                    <div className="flex items-center gap-1.5 text-white">
                                        <Heart size={20} fill="currentColor" />
                                        <span className="font-black">{post.likes?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white">
                                        <MessageCircle size={20} fill="currentColor" />
                                        <span className="font-black">{post.comments?.length || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Post Content */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-black text-gray-900 underline underline-offset-4 decoration-sky-300">@{post.author?.username}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => viewPostHandler(post)}
                                        className="flex-1 bg-sky-50 text-sky-600 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-sky-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={14} />
                                        View
                                    </button>
                                    <button 
                                        onClick={() => deletePostHandler(post._id)}
                                        className="flex-1 bg-rose-50 text-rose-500 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest bg-white rounded-[18px] border border-dashed border-gray-200">
                    No posts found on the platform
                </div>
            )}

            {/* View Post Modal */}
            {showModal && (
                <PostViewModal 
                    post={selectedPost} 
                    onClose={() => {
                        setShowModal(false);
                        setSelectedPost(null);
                    }}
                    onDeletePost={deletePostHandler}
                    onDeleteComment={deleteCommentHandler}
                />
            )}
        </div>
    );
};

export default PostManagement;



