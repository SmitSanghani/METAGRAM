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
            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-2'>
                <h1 className='text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2'>
                    Feed
                    <div className='w-2 h-2 bg-indigo-500 rounded-full animate-pulse'></div>
                </h1>

                {/* Modern Tab System */}
                <div className='flex items-center bg-white p-1.5 rounded-xl shadow-sm border border-gray-100'>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Story Section - Modern Look */}
            <div className='w-full mb-10 overflow-hidden'>
                <div className='bg-white rounded-2xl p-6 border border-gray-100 shadow-sm'>
                    <StoryFeature />
                </div>
            </div>


            {/* Content Section - Masonry Grid Logic in Posts component */}
            <div className='w-full min-h-[60vh] pb-20'>
                <Posts activeTab={activeTab} />
            </div>
        </div>
    );
};

export default Feed;

