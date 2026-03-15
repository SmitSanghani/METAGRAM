import React, { useMemo } from 'react';
import FeedCard from './FeedCard';
import { useSelector } from 'react-redux';

const Posts = ({ activeTab = 'Latest' }) => {
    const { posts } = useSelector((store) => store.post);
    const { reels } = useSelector((store) => store.reel);

    const feedItems = useMemo(() => {
        let combined = [];
        
        // Filter and combine based on tab
        if (activeTab === 'Latest' || activeTab === 'Popular') {
            const p = (posts || []).map(item => ({ ...item, feedType: 'post' }));
            const r = (reels || []).map(item => ({ ...item, feedType: 'reel' }));
            combined = [...p, ...r];
            
            if (activeTab === 'Latest') {
                combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else {
                combined.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
            }
        } else if (activeTab === 'Reels') {
            combined = (reels || []).map(item => ({ ...item, feedType: 'reel' }));
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (activeTab === 'Posts') {
            combined = (posts || []).map(item => ({ ...item, feedType: 'post' }));
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return combined.filter(Boolean);
    }, [posts, reels, activeTab]);

    // Masonry logic: distributing items into columns to maintain zigzag order
    const renderMasonry = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Column 1 */}
                <div className="flex flex-col gap-6">
                    {feedItems.filter((_, i) => i % 3 === 0).map((item) => (
                        <FeedCard key={item._id} item={item} type={item.feedType} />
                    ))}
                </div>
                {/* Column 2 - Hidden on Mobile */}
                <div className="hidden md:flex flex-col gap-6">
                    {feedItems.filter((_, i) => i % 3 === 1 || (window.innerWidth < 1024 && i % 2 === 1)).map((item) => (
                        <FeedCard key={item._id} item={item} type={item.feedType} />
                    ))}
                </div>
                {/* Column 3 - Hidden on Tablet/Mobile */}
                <div className="hidden lg:flex flex-col gap-6">
                    {feedItems.filter((_, i) => i % 3 === 2).map((item) => (
                        <FeedCard key={item._id} item={item} type={item.feedType} />
                    ))}
                </div>
            </div>
        );
    };

    // Simplified responsive grid for CSS-only approach if JS splitting feels laggy
    // but the above is better for Pinterest zigzag.
    // Let's use a cleaner approach with CSS grid and handle the columns correctly.

    if (!feedItems.length) {
        return (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
                <p className='text-lg font-medium'>No content found in this category.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Using a standard grid with flex-col columns for true masonry effect */}
            <div className="masonry-grid flex-col sm:flex-row">
                {/* Desktop view splitting */}
                <div className="hidden lg:flex w-full gap-6">
                    <div className="flex-1 flex flex-col gap-6">
                        {feedItems.filter((_, i) => i % 3 === 0).map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                        {feedItems.filter((_, i) => i % 3 === 1).map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                        {feedItems.filter((_, i) => i % 3 === 2).map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                    </div>
                </div>

                {/* Tablet view splitting */}
                <div className="hidden sm:flex lg:hidden w-full gap-6">
                    <div className="flex-1 flex flex-col gap-6">
                        {feedItems.filter((_, i) => i % 2 === 0).map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                        {feedItems.filter((_, i) => i % 2 === 1).map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                    </div>
                </div>

                {/* Mobile view splitting */}
                <div className="flex sm:hidden w-full flex-col gap-6">
                    {feedItems.map(item => <FeedCard key={item._id} item={item} type={item.feedType} />)}
                </div>
            </div>
        </div>
    );
};

export default Posts;

