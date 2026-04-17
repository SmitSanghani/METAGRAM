import React, { useEffect, useState } from 'react';
import api from '@/api';
import { useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Plus } from 'lucide-react';
import 'swiper/css';
import StoryViewer from './StoryViewer';
import StoryAvatar from './StoryAvatar';
import StoryUploadModal from './StoryUploadModal';

const StoryFeature = () => {
    const [groupedStories, setGroupedStories] = useState([]);
    const [activeUserId, setActiveUserId] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const { user } = useSelector(store => store.auth);
    const { socket } = useSelector(store => store.socketio);

    const fetchStories = async () => {
        try {
            const res = await api.get('/story/all');
            if (res.data.success) {
                const stories = res.data.groupedStories;
                const currentUserId = user?._id?.toString();

                // Enhanced sorting:
                // 1. Current user always at index 0
                // 2. Users with unseen stories
                // 3. Users with all seen stories
                // 4. Within groups 2 & 3, sort by newest story createdAt
                const sortedStories = [...stories].sort((a, b) => {
                    const aId = (a.userId?._id || a.userId)?.toString();
                    const bId = (b.userId?._id || b.userId)?.toString();

                    if (currentUserId) {
                        if (aId === currentUserId) return -1;
                        if (bId === currentUserId) return 1;
                    }

                    const aUnseen = a.stories.some(s => {
                        const viewers = s.viewers?.map(v => (v._id || v).toString()) || [];
                        return currentUserId && !viewers.includes(currentUserId);
                    });
                    const bUnseen = b.stories.some(s => {
                        const viewers = s.viewers?.map(v => (v._id || v).toString()) || [];
                        return currentUserId && !viewers.includes(currentUserId);
                    });

                    if (aUnseen && !bUnseen) return -1;
                    if (!aUnseen && bUnseen) return 1;

                    // If both have same visibility state, sort by the newest story in the group
                    const aMaxTime = Math.max(...a.stories.map(s => new Date(s.createdAt).getTime()));
                    const bMaxTime = Math.max(...b.stories.map(s => new Date(s.createdAt).getTime()));
                    return bMaxTime - aMaxTime;
                });

                setGroupedStories(sortedStories);
            }
        } catch (error) {
            console.error("Error fetching stories:", error);
        }
    };

    useEffect(() => {
        fetchStories();

        if (socket) {
            socket.on('new_story', fetchStories);
            socket.on('story_deleted', fetchStories);
        }

        return () => {
            if (socket) {
                socket.off('new_story', fetchStories);
                socket.off('story_deleted', fetchStories);
            }
        };
    }, [socket, user?._id]); // Added user?._id to ensure refresh on login/logout

    const myStoryGroup = React.useMemo(() => {
        if (!user?._id) return null;
        return groupedStories.find(g => (g.userId?._id || g.userId)?.toString() === user._id.toString());
    }, [groupedStories, user?._id]);

    const otherStoryGroups = React.useMemo(() => {
        const uId = user?._id?.toString();
        if (!uId) return groupedStories;
        return groupedStories.filter(g => (g.userId?._id || g.userId)?.toString() !== uId);
    }, [groupedStories, user?._id]);

    const openStoryViewer = (userId) => {
        setActiveUserId(userId?.toString());
    };

    const activeGroup = activeUserId 
        ? groupedStories.find(g => (g.userId?._id || g.userId)?.toString() === activeUserId) 
        : null;

    return (
        <div className="w-full max-w-full px-0">
            <Swiper
                spaceBetween={12}
                slidesPerView="auto"
                className="w-full pb-2"
            >
                {/* Your Story Bubble */}
                <SwiperSlide className="w-[60px] sm:w-[72px] !w-auto flex flex-col items-center gap-1.5 cursor-pointer mt-1 first:pl-2">
                    <div
                        className="relative group transition-all"
                        onClick={() => myStoryGroup ? openStoryViewer(user._id) : setIsUploadModalOpen(true)}
                    >
                        <StoryAvatar
                            user={user}
                            currentUser={user}
                            stories={myStoryGroup?.stories || []}
                            isYourStory={true}
                            size={window.innerWidth < 640 ? 44 : 64}
                        />
                        {/* Blue Plus Button */}
                        <div
                            className="absolute bottom-[2px] right-[2px] p-[2px] bg-white rounded-full shadow-sm cursor-pointer transition-transform z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsUploadModalOpen(true);
                            }}
                        >
                            <div className="bg-[#0095F6] rounded-full p-[2px] flex items-center justify-center border-[2px] border-white">
                                <Plus size={10} strokeWidth={5} className="text-white" />
                            </div>
                        </div>
                    </div>
                    <p className="w-full text-center px-1 text-[11px] font-medium truncate text-zinc-400 mt-0.5">
                        Your story
                    </p>
                </SwiperSlide>

                {/* Other Users' Stories */}
                {otherStoryGroups.map((group) => (
                    <SwiperSlide
                        key={group.userId?._id || group.userId}
                        className="w-[72px] !w-auto flex flex-col items-center gap-1.5 cursor-pointer mt-1 hover:opacity-90 transition-opacity"
                        onClick={() => openStoryViewer(group.userId?._id || group.userId)}
                    >
                        <StoryAvatar
                            user={group.userId}
                            currentUser={user}
                            stories={group.stories}
                            size={window.innerWidth < 640 ? 44 : 64}
                        />
                        <p className="w-full text-center px-1 text-[12px] font-bold truncate text-gray-800">
                            {group.userId.username}
                        </p>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Viewer Modal */}
            {activeUserId && activeGroup && (
                <StoryViewer
                    key={activeUserId}
                    stories={activeGroup.stories}
                    onClose={() => setActiveUserId(null)}
                    onStoryDeleted={fetchStories}
                    onStoryViewed={fetchStories} 
                    onAddStory={() => {
                        setActiveUserId(null);
                        setIsUploadModalOpen(true);
                    }}
                />
            )}

            {/* Upload Modal */}
            <StoryUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                user={user}
                onUploadSuccess={fetchStories}
            />
        </div>
    );
};

export default StoryFeature;