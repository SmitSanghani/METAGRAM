import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Plus } from 'lucide-react';
import 'swiper/css';
import StoryViewer from './StoryViewer';
import StoryAvatar from './StoryAvatar';
import StoryUploadModal from './StoryUploadModal';

const StoryFeature = () => {
    const [groupedStories, setGroupedStories] = useState([]);
    const [activeGroupIndex, setActiveGroupIndex] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const { user } = useSelector(store => store.auth);
    const { socket } = useSelector(store => store.socketio);

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
    }, [socket]);

    const fetchStories = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/story/all', { withCredentials: true });
            if (res.data.success) {
                const stories = res.data.groupedStories;
                const currentUserId = user?._id;

                // Enhanced sorting:
                // 1. Current user always at index 0
                // 2. Users with unseen stories
                // 3. Users with all seen stories
                // 4. Within groups 2 & 3, sort by newest story createdAt
                const sortedStories = stories.sort((a, b) => {
                    const aId = a.userId._id.toString();
                    const bId = b.userId._id.toString();
                    
                    if (aId === currentUserId) return -1;
                    if (bId === currentUserId) return 1;

                    const aUnseen = a.stories.some(s => !s.viewers.map(v => (v._id || v).toString()).includes(currentUserId));
                    const bUnseen = b.stories.some(s => !s.viewers.map(v => (v._id || v).toString()).includes(currentUserId));

                    if (aUnseen && !bUnseen) return -1;
                    if (!aUnseen && bUnseen) return 1;

                    // If both have same visibility state, sort by the newest story in the group
                    const aMaxTime = Math.max(...a.stories.map(s => new Date(s.createdAt).getTime()));
                    const bMaxTime = Math.max(...b.stories.map(s => new Date(s.createdAt).getTime()));
                    return bMaxTime - aMaxTime;
                });

                setGroupedStories([...sortedStories]);
            }
        } catch (error) {
            console.error("Error fetching stories:", error);
        }
    };

    const myStoryGroup = groupedStories.find(g => g.userId._id === user?._id);
    const otherStoryGroups = groupedStories.filter(g => g.userId._id !== user?._id);

    const openStoryViewer = (userId) => {
        const index = groupedStories.findIndex(g => g.userId._id === userId);
        if (index !== -1) setActiveGroupIndex(index);
    };

    return (
        <div className="w-full max-w-full mb-1">
            <Swiper
                spaceBetween={12}
                slidesPerView="auto"
                className="w-full pb-2"
            >
                {/* Your Story Bubble */}
                <SwiperSlide className="w-[72px] !w-auto flex flex-col items-center gap-2 cursor-pointer mt-1 first:pl-2">
                    <div
                        className="relative group transition-transform active:scale-95"
                        onClick={() => myStoryGroup ? openStoryViewer(user._id) : setIsUploadModalOpen(true)}
                    >
                        <StoryAvatar
                            user={user}
                            currentUser={user}
                            stories={myStoryGroup?.stories || []}
                            isYourStory={true}
                            size={64}
                        />
                        {/* Blue Plus Button */}
                        <div 
                            className="absolute bottom-[6px] right-[6px] p-[2px] bg-white rounded-full shadow-sm cursor-pointer hover:scale-110 active:scale-90 transition-transform z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsUploadModalOpen(true);
                            }}
                        >
                            <div className="bg-[#0095F6] rounded-full p-[3px] flex items-center justify-center border-[2px] border-white">
                                <Plus size={12} strokeWidth={5} className="text-white" />
                            </div>
                        </div>
                    </div>
                    <span className="text-[12px] font-bold text-center truncate w-[74px] text-zinc-400 mt-0.5">
                        Your story
                    </span>
                </SwiperSlide>

                {/* Other Users' Stories */}
                {otherStoryGroups.map((group) => (
                    <SwiperSlide
                        key={group.userId._id}
                        className="w-[72px] !w-auto flex flex-col items-center gap-1.5 cursor-pointer mt-1 hover:opacity-90 transition-opacity"
                        onClick={() => openStoryViewer(group.userId._id)}
                    >
                        <StoryAvatar
                            user={group.userId}
                            currentUser={user}
                            stories={group.stories}
                            size={64}
                        />
                        <span className="text-[12px] font-bold text-center truncate w-[74px] text-gray-800">
                            {group.userId.username}
                        </span>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Viewer Modal */}
            {activeGroupIndex !== null && groupedStories[activeGroupIndex] && (
                <StoryViewer
                    stories={groupedStories[activeGroupIndex].stories}
                    onClose={() => setActiveGroupIndex(null)}
                    onStoryDeleted={fetchStories}
                    onStoryViewed={fetchStories} // Refresh to update borders
                    onAddStory={() => {
                        setActiveGroupIndex(null);
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

