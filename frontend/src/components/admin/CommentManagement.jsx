import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Loader2, Eye, X } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';
import PostViewModal from './PostViewModal';

const CommentManagement = () => {
    const [comments, setComments] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const fetchAllPostsAndComments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/post/all');
            if (res.data.success) {
                setPosts(res.data.posts);
                const allComments = res.data.posts.flatMap(post => 
                    (post.comments || []).map(comment => ({
                        ...comment,
                        postImage: post.image,
                        postCaption: post.caption,
                        postId: post._id,
                        fullPost: post
                    }))
                );
                // Sort by newest
                allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setComments(allComments);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch comments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPostsAndComments();
    }, []);

    const deleteCommentHandler = async (commentId, postId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            const response = await api.delete(`/post/comment/delete/${commentId}`);
            if (response.data.success) {
                setComments(prev => prev.filter(c => c._id !== commentId));
                // Update selected post if modal is open
                if (selectedPost) {
                    setSelectedPost(prev => ({
                        ...prev,
                        comments: prev.comments.filter(c => c._id !== commentId)
                    }));
                }
                toast.success(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete comment");
        }
    };

    const deletePostHandler = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this entire post?")) return;
        try {
            // Re-checking backend deletePost at line 433: 
            // if (post.author.toString() !== authorId) return res.status(403).json({ message: "Unauthorized" });
            // This also blocks admins. I'll need to fix this.
            
            const res = await api.delete(`/post/delete/${postId}`);
            if (res.data.success) {
                setPosts(prev => prev.filter(p => p._id !== postId));
                setComments(prev => prev.filter(c => c.postId !== postId));
                setShowModal(false);
                setSelectedPost(null);
                toast.success(res.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete post");
        }
    }

    const viewPostHandler = (post) => {
        setSelectedPost(post);
        setShowModal(true);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Comments Management</h1>
                <p className="text-sm text-gray-500">Monitor and moderate user discussions across all posts.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Scanning platform conversations...</p>
                </div>
            ) : comments.length > 0 ? (
                <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        {comments.map((comment) => (
                            <div key={comment._id} className="p-8 hover:bg-gray-50 transition-all flex items-center justify-between gap-8 group">
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    {/* Post Thumbnail */}
                                    <div className="relative w-20 h-20 rounded-3xl overflow-hidden bg-gray-100 flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                        <img src={comment.postImage} className="w-full h-full object-cover" alt="Post" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <img src={comment.author?.profilePicture || "https://github.com/shadcn.png"} className="w-6 h-6 rounded-full" alt="User" />
                                                <span className="text-sm font-black text-gray-900 underline decoration-sky-300 decoration-2 underline-offset-4 leading-none">@{comment.author?.username}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                                                • {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        <p className="text-base text-gray-700 font-medium leading-relaxed italic truncate max-w-2xl">
                                            "{comment.text}"
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Context Post:</span>
                                            <span className="text-[10px] font-bold text-sky-500 truncate max-w-xs">{comment.postCaption || "Untitled Post"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => viewPostHandler(comment.fullPost)}
                                        className="flex items-center gap-2 px-5 py-3 bg-sky-50 text-sky-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-sky-100 transition-all"
                                    >
                                        <Eye size={16} />
                                        Context
                                    </button>
                                    <button 
                                        onClick={() => deleteCommentHandler(comment._id, comment.postId)}
                                        className="p-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all shadow-sm"
                                        title="Delete Comment"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest bg-white rounded-[40px] border border-dashed border-gray-200">
                    No comments found to moderate
                </div>
            )}

            {/* Reusable Post View Modal */}
            <PostViewModal 
                post={selectedPost} 
                onClose={() => setShowModal(false)}
                onDeleteComment={deleteCommentHandler}
                onDeletePost={deletePostHandler}
            />
        </div>
    );
};

export default CommentManagement;

