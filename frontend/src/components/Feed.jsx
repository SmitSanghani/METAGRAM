import React, { useState } from 'react';
import Posts from './Posts';
import StoryFeature from './StoryFeature';
import useGetReels from '@/hooks/useGetReels';
import { Sparkles, Trophy, Video, Image as ImageIcon } from 'lucide-react';

const Feed = () => {
    useGetReels();
    const [activeTab, setActiveTab] = useState('Latest');

    const tabs = [
        { id: 'Latest', label: 'Latest', icon: <Sparkles size={16} /> },
        { id: 'Popular', label: 'Popular', icon: <Trophy size={16} /> },
        { id: 'Reels', label: 'Reels', icon: <Video size={16} /> },
        { id: 'Posts', label: 'Posts', icon: <ImageIcon size={16} /> },
    ];

    return (
        <div className='flex-1 flex flex-col w-full animate-soft-in'>
            {/* Feed Header Section */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-4 px-0'>
                <h1 className='hidden sm:flex text-3xl font-extrabold text-gray-900 tracking-tight items-center gap-2'>
                    Feed
                    <div className='w-2 h-2 bg-indigo-500 rounded-full animate-pulse'></div>
                </h1>

                {/* Modern Tab System - Horizontally Scrollable on Mobile */}
                <div className='relative w-full max-w-full group'>
                    <div className='flex items-center bg-white/50 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar scroll-smooth'>
                        <div className='flex items-center gap-1.5 sm:gap-2 min-w-max pr-8'>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-[1.02]'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Fading indicators for scroll */}
                    <div className='absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none rounded-r-xl sm:hidden' />
                </div>
            </div>

            {/* Story Section - Modern Look */}
            {/* Story Section - Modern Look */}
            <div className='w-full mb-4 sm:mb-10 overflow-hidden'>
                <div className='bg-white sm:bg-white rounded-2xl p-0 sm:p-6 border-none sm:border border-gray-100 shadow-none sm:shadow-sm'>
                    <StoryFeature />
                </div>
            </div>


            {/* Content Section - Masonry Grid Logic in Posts component */}
            <div className='w-full max-w-full px-0 min-h-[60vh] pb-20'>
                <Posts activeTab={activeTab} />
            </div>
        </div>
    );
};

export default Feed;

