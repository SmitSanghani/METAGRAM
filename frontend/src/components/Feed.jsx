import React from 'react';
import Posts from './Posts';
import StoryFeature from './StoryFeature';
import useGetReels from '@/hooks/useGetReels';

const Feed = () => {
    useGetReels();

    return (
        <div className='flex-1 flex flex-col w-full bg-white rounded-3xl shadow-sm border border-gray-100 transition-colors duration-300 overflow-hidden'>
            {/* Story Section - Added more horizontal padding */}
            <div className='w-full border-b border-gray-100 pb-4 pt-10 px-10 bg-white'>
                <StoryFeature />
            </div>

            {/* Content Section - Increased horizontal padding (px-10) to fix the touching edge issue */}
            <div className='flex flex-col items-center w-full min-h-[60vh] bg-white pt-8 px-10 pb-20'>
                <div className="w-full max-w-[600px]">
                    <Posts />
                </div>
            </div>
        </div>
    );
};

export default Feed;
