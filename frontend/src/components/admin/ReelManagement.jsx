import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Eye, Loader2, Play, X } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';

const ReelManagement = () => {
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReel, setSelectedReel] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchReels = async () => {
            try {
                // Fetching from feed as it's the standard way to get reels, 
                // in a real app might need a specific admin endpoint for all reels.
                const res = await api.get('/reels/feed');
                if (res.data.success) {
                    setReels(res.data.reels);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to fetch reels");
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, []);

    const deleteReelHandler = async (reelId) => {
        if (!window.confirm("Are you sure you want to delete this reel?")) return;
        try {
            const res = await api.delete(`/reels/delete/${reelId}`);
            if (res.data.success) {
                setReels(reels.filter(r => r._id !== reelId));
                toast.success(res.data.message);
                if (selectedReel?._id === reelId) {
                    setShowModal(false);
                    setSelectedReel(null);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete reel");
        }
    }

    const viewReelHandler = (reel) => {
        setSelectedReel(reel);
        setShowModal(true);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-gray-900">
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Reels Management</h1>
                <p className="text-sm text-gray-500">Manage short-form video content.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Loading platform reels...</p>
                </div>
            ) : reels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {reels.map((reel) => (
                        <div key={reel._id} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                            {/* Video Preview */}
                            <div className="relative aspect-[9/16] bg-black cursor-pointer" onClick={() => viewReelHandler(reel)}>
                                <video 
                                    src={reel.videoUrl} 
                                    className="w-full h-full object-cover opacity-80"
                                    muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm group-hover:scale-110 transition-transform">
                                        <Play className="text-white fill-white" size={24} />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white drop-shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <Heart size={14} fill="currentColor" />
                                            <span className="text-xs font-black">{reel.likes?.length || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle size={14} fill="currentColor" />
                                            <span className="text-xs font-black">{reel.comments?.length || 0}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase bg-black/40 px-2 py-1 rounded-lg backdrop-blur-md">
                                        {reel.viewsCount || 0} Views
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <img 
                                        src={reel.author?.profilePicture || "https://github.com/shadcn.png"} 
                                        alt="author" 
                                        className="w-8 h-8 rounded-full border-2 border-sky-100" 
                                    />
                                    <span className="text-sm font-black text-gray-900 leading-none underline underline-offset-2 decoration-sky-300">@{reel.author?.username}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => viewReelHandler(reel)}
                                        className="flex-1 bg-sky-50 text-sky-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-sky-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={14} />
                                        View
                                    </button>
                                    <button 
                                        onClick={() => deleteReelHandler(reel._id)}
                                        className="flex-1 bg-rose-50 text-rose-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition-all font-bold flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest bg-white rounded-[32px] border border-dashed border-gray-200">
                    No reels found on the platform
                </div>
            )}

            {/* View Reel Modal */}
            {showModal && selectedReel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-5xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh]">
                        {/* Video Section */}
                        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
                            <video 
                                src={selectedReel.videoUrl} 
                                className="w-full h-full object-contain" 
                                autoPlay 
                                controls 
                                loop
                            />
                            <button 
                                onClick={() => setShowModal(false)}
                                className="absolute top-8 left-8 p-3 bg-white/20 hover:bg-white/40 text-white rounded-2xl backdrop-blur-xl transition-all md:hidden"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Info Section */}
                        <div className="w-full md:w-[400px] flex flex-col bg-white">
                            <div className="p-8 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <img src={selectedReel.author?.profilePicture || "https://github.com/shadcn.png"} className="w-12 h-12 rounded-2xl border-4 border-sky-50 shadow-sm" alt="Author" />
                                        <div>
                                            <p className="font-black text-gray-900 leading-tight">@{selectedReel.author?.username}</p>
                                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Platform Creator</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Content Caption</p>
                                        <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                                            <p className="text-gray-700 font-medium leading-relaxed italic text-sm">"{selectedReel.caption || 'The user shared this reel without a caption.'}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Engagement Overview</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                                                <Heart size={20} fill="currentColor" />
                                            </div>
                                            <span className="font-bold text-gray-500">Impressions</span>
                                        </div>
                                        <span className="text-xl font-black text-gray-900">{selectedReel.likes?.length || 0}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl">
                                                <MessageCircle size={20} fill="currentColor" />
                                            </div>
                                            <span className="font-bold text-gray-500">Discussions</span>
                                        </div>
                                        <span className="text-xl font-black text-gray-900">{selectedReel.comments?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-8 border-t border-gray-100 flex gap-4 bg-white">
                                <button 
                                    onClick={() => deleteReelHandler(selectedReel._id)}
                                    className="flex-1 bg-rose-500 text-white py-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                                >
                                    Remove Reel
                                </button>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="px-8 bg-gray-100 text-gray-900 py-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReelManagement;

