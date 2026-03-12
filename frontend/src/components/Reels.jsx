import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel } from 'swiper/modules';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setReels, updateReelLikes } from '@/redux/reelSlice';
import ReelCard from './ReelCard';
import { Loader2 } from 'lucide-react';

import { useLocation, useParams } from 'react-router-dom';

import 'swiper/css';


const Reels = () => {
    const { id: paramReelId } = useParams();
    const location = useLocation();
    const initialReel = location.state?.initialReel;
    const dispatch = useDispatch();
    const { reels } = useSelector(store => store.reel);
    const { socket } = useSelector(store => store.socketio);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isGlobalMuted, setIsGlobalMuted] = useState(false);
    const swiperRef = React.useRef(null);

    useEffect(() => {
        if (!socket) return;
        // Global events like 'likeReel' are now handled in App.jsx
    }, [socket, dispatch]);

    const fetchReels = async (p = 1) => {
        try {
            setLoading(true);
            
            // If it's the first page and we have a specific ID, fetch that first
            let specificReel = null;
            if (p === 1 && paramReelId) {
                try {
                    const res = await axios.get(`http://localhost:8000/api/v1/reels/${paramReelId}`, { withCredentials: true });
                    if (res.data.success) {
                        specificReel = res.data.reel;
                    }
                } catch (err) {
                    console.error("Error fetching specific reel:", err);
                }
            }

            const res = await axios.get(`http://localhost:8000/api/v1/reels/feed?page=${p}&limit=5`, { withCredentials: true });
            if (res.data.success) {
                if (p === 1) {
                    let fedReels = res.data.reels;
                    
                    // Priority: URL Param > Location State
                    const priorityReel = specificReel || initialReel;
                    
                    if (priorityReel) {
                        fedReels = [priorityReel, ...fedReels.filter(r => r._id !== priorityReel._id)];
                    }
                    dispatch(setReels(fedReels));
                } else {
                    const existingIds = new Set(reels.map(r => r._id));
                    const uniqueNewReels = res.data.reels.filter(r => !existingIds.has(r._id));
                    dispatch(setReels([...reels, ...uniqueNewReels]));
                }
                if (res.data.reels.length < 5) setHasMore(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchReels(1);
    }, [paramReelId]);

    const handleSlideChange = (swiper) => {
        setActiveIndex(swiper.activeIndex);
        if (swiper.activeIndex >= reels.length - 2 && hasMore && !loading) {
            setPage(prev => {
                const next = prev + 1;
                fetchReels(next);
                return next;
            });
        }
    };

    return (
        <div className="flex h-screen w-full bg-[rgb(218,242,242)] md:pl-[80px] overflow-hidden">
            <div className="flex-1 h-full flex justify-center items-center">
                <div className="h-[96vh] w-full max-w-[600px] relative shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
                    {reels.length > 0 ? (
                        <Swiper
                            onSwiper={(swiper) => swiperRef.current = swiper}
                            direction="vertical"
                            modules={[Mousewheel]}
                            mousewheel={true}
                            className="h-full w-full"
                            onSlideChange={handleSlideChange}
                            speed={700}
                        >
                            {reels.map((reel, index) => (
                                <SwiperSlide key={reel._id + index} className="h-full w-full">
                                    <ReelCard
                                        reel={reel}
                                        isActive={activeIndex === index}
                                        isGlobalMuted={isGlobalMuted}
                                        setIsGlobalMuted={setIsGlobalMuted}
                                        onVideoEnd={() => swiperRef.current?.slideNext()}
                                    />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-white/40 gap-6">
                            {loading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="animate-spin text-indigo-500" size={40} strokeWidth={3} />
                                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Loading METAGRAM Reels</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="font-black text-[12px] uppercase tracking-[0.2em]">No reels in your feed</span>
                                    <span className="text-[10px] font-medium opacity-50">Try following more creators</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reels;
