import { X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';

const StoryAvatar = ({ user, currentUser, stories = [], size = 66, isYourStory = false, strokeWidth }) => {
    // Process story stats
    const unseenStories = stories.filter(s => !s.viewers.map(v => (v._id || v).toString()).includes(currentUser?._id));
    const isUnseen = unseenStories.length > 0;
    const isCF = stories.some(s => s.audience === 'closeFriends');
    const hasStories = stories.length > 0;

    // Unified constants for alignment
    const ringWidth = strokeWidth || 3.5;
    const innerGap = 2.5;
    const padding = 8;
    const svgSize = size + (padding * 2);
    const center = svgSize / 2;
    const radius = (size / 2) + innerGap + (ringWidth / 2);

    // Case: No Story
    if (!hasStories) {
        return (
            <div className="relative flex items-center justify-center p-2 group" style={{ width: svgSize, height: svgSize }}>
                <div
                    className="rounded-full overflow-hidden p-[2px] border-[1px] border-black/5 dark:border-white/10 transition-all"
                    style={{ width: size + 4, height: size + 4 }}
                >
                    <Avatar className="w-full h-full border-2 border-white dark:border-zinc-950 shadow-sm">
                        <AvatarImage src={user?.profilePicture} className="object-cover" />
                        <AvatarFallback className={cn("text-[10px] font-black uppercase", getAvatarColor(user?.username))}>
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        );
    }

    // Determine ring appearance
    // if (isUnseen) -> Rainbow or Green (CF)
    // if (!isUnseen) -> Grey
    let strokeColor = "#DBDBDB"; // Viewed (Gray)
    if (isUnseen) {
        strokeColor = isCF ? "#2ecc71" : "url(#instagram-gradient)";
    }

    return (
        <div className="relative flex items-center justify-center transition-all group cursor-pointer" style={{ width: svgSize, height: svgSize }}>
            {/* Static Ring */}
            <svg
                width={svgSize}
                height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                className="absolute inset-0 transform -rotate-90 pointer-events-none"
            >
                <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="25%" stopColor="#fa7e1e" />
                        <stop offset="50%" stopColor="#d62976" />
                        <stop offset="75%" stopColor="#962fbf" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                    </linearGradient>
                </defs>

                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={ringWidth}
                />
            </svg>

            {/* Gap and Avatar */}
            <div
                className="rounded-full overflow-hidden p-[3px] bg-white dark:bg-zinc-950 flex items-center justify-center"
                style={{ width: size + 6, height: size + 6 }}
            >
                <div className="w-full h-full rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-inner">
                    <Avatar className="w-full h-full">
                        <AvatarImage src={user?.profilePicture} className="object-cover" />
                        <AvatarFallback className={cn("text-[10px] font-black uppercase", getAvatarColor(user?.username))}>
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </div>
    );
};

export default StoryAvatar;
