import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import SuggestedUsers from './SuggestedUsers';

const RightSidebar = () => {

    const { user } = useSelector(store => store.auth);

    return (
        <div className='w-full bg-white border border-[#efefef] p-6 rounded-[13px] shadow-sm'>
            {/* Current User Info Row */}
            <div className='flex items-center justify-between mb-8'>
                <div className='flex items-center gap-3'>
                    <Link to={`/profile/${user?._id}`}>
                        <Avatar className="w-12 h-12 border border-[#efefef] shadow-sm hover:scale-105 transition-transform duration-300">
                            <AvatarImage src={user?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 font-bold">{user?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className='flex flex-col'>
                        <h1 className='font-bold text-[14px] leading-tight hover:underline cursor-pointer text-[#262626]'>
                            <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
                        </h1>
                        <span className='text-[#8e8e8e] text-[13px] font-medium'>{user?.bio?.slice(0, 20) || 'Active now'}</span>
                    </div>
                </div>
                <button className='text-[#0095F6] hover:text-[#00376b] text-[12px] font-bold transition-all'>Switch</button>
            </div>

            <SuggestedUsers />
        </div>
    )
}

export default RightSidebar
