import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn, getAvatarColor } from '@/lib/utils';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import SuggestedUsers from './SuggestedUsers';
import SwitchAccountModal from './SwitchAccountModal';

const RightSidebar = () => {

    const { user } = useSelector(store => store.auth);
    const [isSwitchOpen, setIsSwitchOpen] = useState(false);

    return ( 
        <div className='w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            {/* Current User Info Row */}
            <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-4'>
                    <Link to={`/profile/${user?._id}`}>
                        <Avatar className="w-[44px] h-[44px] border border-gray-100">
                            <AvatarImage src={user?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className={cn("font-bold text-xs uppercase", getAvatarColor(user?.username))}>
                                {user?.username?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className='flex flex-col'>
                        <h1 className='font-bold text-[14px] hover:text-[#3b82f6] cursor-pointer text-gray-900 leading-none'>
                            <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
                        </h1>
                        <span className='text-zinc-400 text-[12px] font-medium leading-tight mt-1'>{user?.username}</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsSwitchOpen(true)}
                    className='text-[#3b82f6] hover:text-black text-[12px] font-bold transition-all'
                >
                    Switch
                </button>
            </div>

            <SuggestedUsers />
            <SwitchAccountModal
                isOpen={isSwitchOpen}
                onClose={() => setIsSwitchOpen(false)}
            />
        </div>

    )
}

export default RightSidebar
