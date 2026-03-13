import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { Heart, MessageCircle, PlayCircle, Loader2 } from 'lucide-react';

const Explore = () => {
    const [topPosts, setTopPosts] = useState([]);
    const [topReels, setTopReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExplore = async () => {
            try {
                const res = await api.get('/post/explore');
                if (res.data.success) {
                    setTopPosts(res.data.top_posts);
                    setTopReels(res.data.top_reels);
                }
            } catch (error) {
                console.error("Error fetching explore content:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExplore();
    }, []);

    // Combine and shuffle slightly or just show posts then reels?
    // Instagram mix them. I will mix them by score.
    const combinedContent = [...topPosts, ...topReels].sort((a, b) => b.score - a.score);

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-[#edf6f5]'>
                <Loader2 className='animate-spin text-indigo-600' size={40} />
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-[#edf6f5] pt-8 pb-20 px-4'>
            <div className='max-w-5xl mx-auto'>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4 grid-flow-dense'>
                    {combinedContent.map((item) => (
                        <div 
                            key={item._id} 
                            onClick={() => {
                                if (item.type === 'reel') {
                                    navigate(`/reels/${item._id}`, { state: { initialReel: item } });
                                } else {
                                    // Normally this would open a post modal
                                    // For now, let's just go to profile or show a toast
                                    // toast.info("Opening post detail...");
                                }
                            }}
                            className={`relative group cursor-pointer overflow-hidden rounded-md bg-white shadow-sm border border-gray-100 ${item.type === 'reel' ? 'row-span-2' : ''}`}
                        >
                            {item.type === 'reel' ? (
                                <video 
                                    src={item.videoUrl} 
                                    className='w-full h-full object-cover'
                                    muted
                                    onMouseOver={(e) => e.target.play()}
                                    onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                />
                            ) : (
                                <img 
                                    src={item.image} 
                                    alt="Explore" 
                                    className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                                />
                            )}

                            {/* Overlay */}
                            <div className='absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold'>
                                <div className='flex items-center gap-1.5'>
                                    <Heart size={20} fill="currentColor" />
                                    <span>{item.likes?.length || 0}</span>
                                </div>
                                <div className='flex items-center gap-1.5'>
                                    <MessageCircle size={20} fill="currentColor" />
                                    <span>{item.comments?.length || 0}</span>
                                </div>
                            </div>

                            {item.type === 'reel' && (
                                <div className='absolute top-3 right-3 text-white drop-shadow-lg'>
                                    <PlayCircle size={20} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {combinedContent.length === 0 && (
                    <div className='text-center py-20 text-gray-400'>
                        <p className='text-lg font-medium'>No content found to explore yet.</p>
                        <p className='text-sm mt-2'>Be the first one to post something amazing!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Explore;
