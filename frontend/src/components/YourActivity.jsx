import React, { useEffect, useState } from 'react';
import api from '@/api';
import { useSelector } from 'react-redux';
import { Heart, MessageCircle, PlaySquare, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

const YourActivity = ({ inSettings = false }) => {
    const [activeTab, setActiveTab] = useState('likes');
    const [likesActivity, setLikesActivity] = useState([]);
    const [commentsActivity, setCommentsActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    const socket = useSelector(store => store.socketio.socket);

    useEffect(() => {
        fetchActivity();
    }, [activeTab]);

    useEffect(() => {
        if (socket) {
            const handlePostDisliked = ({ postId, userId: dislikerId }) => {
                if (dislikerId === user?._id) {
                    setLikesActivity(prev => prev.filter(item => item._id.toString() !== postId.toString()));
                }
            };
            
            const handleReelLikeUpdate = ({ reelId, likes }) => {
                if (!likes.includes(user?._id)) {
                    setLikesActivity(prev => prev.filter(item => item._id.toString() !== reelId.toString()));
                }
            };

            const handleDeleteComment = ({ commentId }) => {
                setCommentsActivity(prev => prev.filter(item => item._id.toString() !== commentId.toString()));
            };

            socket.on('postDisliked', handlePostDisliked);
            socket.on('likeReel', handleReelLikeUpdate);
            socket.on('deletePostComment', handleDeleteComment);
            socket.on('deleteReelComment', handleDeleteComment);

            return () => {
                socket.off('postDisliked', handlePostDisliked);
                socket.off('likeReel', handleReelLikeUpdate);
                socket.off('deletePostComment', handleDeleteComment);
                socket.off('deleteReelComment', handleDeleteComment);
            };
        }
    }, [socket, user?._id]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            if (activeTab === 'likes') {
                const res = await api.get('/user/activity/likes');
                if (res.data.success) {
                    setLikesActivity(res.data.activity);
                }
            } else {
                const res = await api.get('/user/activity/comments');
                if (res.data.success) {
                    setCommentsActivity(res.data.activity);
                }
            }
        } catch (error) {
            console.error("Error fetching activity:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item) => {
        const id = item.post || item._id; // for comments, it's item.post._id
        const type = item.activityType || item.type;
        if (type === 'post') {
            navigate(`/`); // Navigate to home or specific post view if implemented
        } else {
            navigate(`/reels/${item._id || item.reel?._id}`);
        }
    };

    return (
        <div className={`max-w-4xl mx-auto sm:py-10 py-4 px-2 sm:px-4 min-h-screen ${inSettings ? 'bg-transparent py-4' : 'bg-white'}`}>
            {!inSettings && (
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Your Activity</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your interactions on Metagram.</p>
                </div>
            )}

            {/* Custom Tabs */}
            <div className="flex border-b border-gray-100 mb-6">
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
                        activeTab === 'likes' 
                        ? 'border-[#3b82f6] text-[#3b82f6]' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Heart size={18} fill={activeTab === 'likes' ? 'currentColor' : 'none'} />
                    Likes
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
                        activeTab === 'comments' 
                        ? 'border-[#3b82f6] text-[#3b82f6]' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <MessageCircle size={18} />
                    Comments
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'likes' ? (
                        likesActivity.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1 md:gap-4">
                                {likesActivity.map((item) => (
                                    <div 
                                        key={item._id} 
                                        onClick={() => handleItemClick(item)}
                                        className="relative aspect-square group cursor-pointer overflow-hidden rounded-md bg-gray-100 shadow-sm"
                                    >
                                        {item.activityType === 'post' ? (
                                            <img 
                                                src={item.image} 
                                                alt="Post" 
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <video 
                                                    src={item.videoUrl} 
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                                />
                                                <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-md z-10">
                                                    <PlaySquare size={14} className="text-[#E2FF4E] fill-[#E2FF4E]/20" />
                                                </div>
                                                <div className="absolute bottom-2 left-2 bg-[#E2FF4E]/90 text-black px-1.5 py-0.5 rounded-[4px] text-[9px] font-black flex items-center gap-1 shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlaySquare size={8} strokeWidth={3} />
                                                    {item.viewsCount || 0}
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="flex items-center gap-4 text-white font-bold">
                                                <div className="flex items-center gap-1">
                                                    <Heart size={20} fill="white" />
                                                    {item.likes?.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyActivity icon={<Heart size={48} />} title="No Likes Yet" description="Posts and reels you like will appear here." />
                        )
                    ) : (
                        commentsActivity.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {commentsActivity.map((item) => (
                                    <div 
                                        key={item._id} 
                                        onClick={() => handleItemClick(item)}
                                        className="flex gap-4 p-4 border border-gray-50 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group shadow-sm"
                                    >
                                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow-inner">
                                            {item.activityType === 'post' ? (
                                                <img src={item.post?.image} alt="content" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="relative w-full h-full">
                                                    <video src={item.reel?.videoUrl} className="w-full h-full object-cover" />
                                                    <div className="absolute top-1 right-1 p-0.5 bg-black/40 backdrop-blur-sm rounded-sm z-10">
                                                        <PlaySquare size={10} className="text-[#E2FF4E]" />
                                                    </div>
                                                    <div className="absolute bottom-1 left-1 bg-[#E2FF4E]/90 text-black px-1 py-0.5 rounded-[2px] text-[7px] font-black flex items-center gap-0.5 shadow-sm z-10">
                                                        <PlaySquare size={6} strokeWidth={3} />
                                                        {item.reel?.viewsCount || 0}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm text-gray-900">You commented</span>
                                                <span className="text-xs text-gray-400">• {new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-gray-700 text-sm line-clamp-2 bg-gray-100/50 p-2 rounded-md italic">
                                                "{item.text}"
                                            </p>
                                            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                                <span>On {item.activityType === 'post' ? 'post' : 'reel'} by</span>
                                                <span className="font-semibold text-gray-600">{item.activityType === 'post' ? item.post?.author?.username : item.reel?.author?.username}</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center pr-2">
                                            <ChevronRight className="text-gray-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyActivity icon={<MessageCircle size={48} />} title="No Comments Yet" description="Comments you make on posts and reels will appear here." />
                        )
                    )}
                </div>
            )}
        </div>
    );
};

const EmptyActivity = ({ icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
        <div className="mb-4 p-6 bg-gray-50 rounded-full text-gray-200">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-gray-500 text-center mt-2 max-w-xs">{description}</p>
    </div>
);

export default YourActivity;
