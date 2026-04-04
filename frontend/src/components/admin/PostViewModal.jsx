import React from 'react';
import { X, Heart, MessageCircle, Trash2 } from 'lucide-react';

const PostViewModal = ({ post, onClose, onDeleteComment, onDeletePost }) => {
    if (!post) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh] cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Section */}
                <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] relative group/carousel">
                    {post.images && post.images.length > 1 ? (
                        <>
                            <div 
                                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth w-full h-full"
                                id="admin-post-carousel"
                            >
                                {post.images.map((img, index) => (
                                    <div key={index} className="w-full h-full flex-none snap-center flex items-center justify-center">
                                        <img src={img} alt={`Post img ${index}`} className="max-w-full max-h-full object-contain" />
                                    </div>
                                ))}
                            </div>
                            
                            <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest z-10 border border-white/10 shadow-xl">
                                {post.images.length} Photos
                            </div>

                            <button 
                                onClick={() => {
                                    const el = document.getElementById('admin-post-carousel');
                                    el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/5 opacity-0 group-hover/carousel:opacity-100 transition-all active:scale-90"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button 
                                onClick={() => {
                                    const el = document.getElementById('admin-post-carousel');
                                    el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/5 opacity-0 group-hover/carousel:opacity-100 transition-all active:scale-90"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </>
                    ) : (
                        <img src={post.image || (post.images && post.images[0])} alt="Viewing post" className="max-w-full max-h-full object-contain" />
                    )}
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 left-6 p-3 bg-white/20 hover:bg-white/40 text-white rounded-2xl backdrop-blur-xl transition-all md:hidden cursor-pointer active:scale-95 z-20"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Info & Comments Section */}
                <div className="w-full md:w-[450px] flex flex-col bg-white border-l border-gray-100">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={post.author?.profilePicture || "https://github.com/shadcn.png"} className="w-10 h-10 rounded-full border-2 border-sky-100" alt="Author" />
                            <div>
                                <p className="font-black text-gray-900 leading-tight">@{post.author?.username}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Author</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black border border-gray-100 hover:border-gray-300 cursor-pointer active:scale-90"
                            title="Close Modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Caption and Comments List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                        {/* Caption */}
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
                            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 italic">Description</p>
                            <p className="text-gray-700 italic leading-relaxed text-sm">"{post.caption || 'No caption provided'}"</p>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">User Discussions ({post.comments?.length || 0})</p>
                            {post.comments && post.comments.length > 0 ? (
                                post.comments.map((comment) => (
                                    <div key={comment._id} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-start gap-4 group">
                                        <img src={comment.author?.profilePicture || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-full border border-gray-100" alt="Commenter" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-black text-gray-900">@{comment.author?.username}</span>
                                                <button 
                                                    onClick={() => onDeleteComment(comment._id, post._id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed italic">"{comment.text}"</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No comments yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="p-8 border-t border-gray-100 flex gap-4 bg-white">
                        <div className="flex-1 flex gap-2">
                             <div className="flex-1 bg-gray-50 p-3 rounded-2xl flex items-center justify-center gap-2 border border-gray-100">
                                <Heart size={16} className="text-rose-500" fill="currentColor" />
                                <span className="text-sm font-black">{post.likes?.length || 0}</span>
                             </div>
                             <div className="flex-1 bg-gray-50 p-3 rounded-2xl flex items-center justify-center gap-2 border border-gray-100">
                                <MessageCircle size={16} className="text-sky-500" fill="currentColor" />
                                <span className="text-sm font-black">{post.comments?.length || 0}</span>
                             </div>
                        </div>
                        <button 
                            onClick={() => onDeletePost(post._id)}
                            className="bg-rose-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                        >
                            Delete Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostViewModal;
