import React from 'react';
import Posts from './Posts';
import StoryFeature from './StoryFeature';
import useGetReels from '@/hooks/useGetReels';

const Feed = () => {
    useGetReels();

    return (
        <div className='flex-1 flex flex-col w-full bg-white'>
            {/* Story Section */}
            <div className='w-full border-b border-gray-100 pb-4 pt-6 px-6 bg-white'>
                <StoryFeature />
            </div>

            {/* Content Section */}
            <div className='flex flex-col items-center w-full min-h-[60vh] bg-[#fafafa]/30 pt-4'>
                <Posts />
            </div>
        </div>
    );
};

export default Feed;
