import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const StoryAvatar = ({ user, currentUser, stories = [], size = 66, isYourStory = false }) => {
    // Identify overall user story state
    const unseenStories = stories.filter(s => !s.viewers.map(v => (v._id || v).toString()).includes(currentUser?._id));
    const isUnseen = unseenStories.length > 0;
    const isCF = stories.some(s => s.audience === 'closeFriends');

    // Case 1: No Story Uploaded
    if (stories.length === 0) {
        return (
            <div className="relative flex items-center justify-center p-[2px]" style={{ width: size + 8, height: size + 8 }}>
                <div 
                    className="rounded-full overflow-hidden p-[2px] border-[2px] border-black dark:border-white transition-all hover:scale-105" 
                    style={{ width: size + 4, height: size + 4 }}
                >
                    <Avatar className="w-full h-full border-2 border-white dark:border-zinc-950">
                        <AvatarImage src={user?.profilePicture} className="object-cover" />
                        <AvatarFallback className="bg-gray-100 dark:bg-zinc-800 text-[10px] font-black uppercase">
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        );
    }

    // Constants for precise UI
    const ringWidth = 4;
    const innerGap = 2;
    const svgSize = size + 12; // Radius handles the size, we need enough viewBox
    const center = svgSize / 2;
    const radius = (size / 2) + innerGap + (ringWidth / 2);

    // Determine stroke color
    let strokeColor = "#d1d1d1"; // Default viewed grey
    if (isUnseen) {
        strokeColor = isCF ? "#2ecc71" : "url(#metagram-ring-gradient)";
    }

    return (
        <div className="relative flex items-center justify-center transition-transform active:scale-95 cursor-pointer" style={{ width: svgSize, height: svgSize }}>
            <svg
                width={svgSize}
                height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                className="absolute inset-0 transform -rotate-90 pointer-events-none"
            >
                <defs>
                    <linearGradient id="metagram-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="25%" stopColor="#fa7e1e" />
                        <stop offset="50%" stopColor="#d62976" />
                        <stop offset="75%" stopColor="#962fbf" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                    </linearGradient>
                </defs>

                {/* Continuous Circular Ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={ringWidth}
                    className="transition-all duration-500 ease-in-out"
                />
            </svg>

            {/* White Gap and Avatar */}
            <div 
                className="rounded-full overflow-hidden p-[2px] bg-white dark:bg-zinc-950 flex items-center justify-center shadow-sm" 
                style={{ width: size + 4, height: size + 4 }}
            >
                <div className="w-full h-full rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800">
                    <Avatar className="w-full h-full">
                        <AvatarImage src={user?.profilePicture} className="object-cover" />
                        <AvatarFallback className="bg-gray-200 dark:bg-zinc-800 text-[10px] font-bold uppercase">
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </div>
    );
};

export default StoryAvatar;
