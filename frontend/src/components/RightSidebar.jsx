import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import SuggestedUsers from './SuggestedUsers';

const RightSidebar = () => {

    const { user } = useSelector(store => store.auth);

    return (
        <div className='w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            {/* Current User Info Row */}
            <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-4'>
                    <Link to={`/profile/${user?._id}`}>
                        <Avatar className="w-[44px] h-[44px] border border-gray-100">
                            <AvatarImage src={user?.profilePicture} alt="post_image" className="object-cover" />
                            <AvatarFallback className="bg-zinc-100 font-bold text-black">{user?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className='flex flex-col'>
                        <h1 className='font-bold text-[14px] hover:text-[#3b82f6] cursor-pointer text-gray-900 leading-none'>
                            <Link to={`/profile/${user?._id}`}>{user?.username}</Link>
                        </h1>
                        <span className='text-zinc-400 text-[12px] font-medium leading-tight mt-1'>{user?.username}</span>
                    </div>
                </div>
                <button className='text-[#3b82f6] hover:text-black text-[12px] font-bold transition-all'>Switch</button>
            </div>

            <SuggestedUsers />

            {/* Footer Links */}
            <div className='mt-8 pt-6 border-t border-gray-50 flex flex-wrap gap-x-2 gap-y-1'>
                {['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms', 'Locations', 'Language', 'Meta Verified'].map((link) => (
                    <span key={link} className='text-[11px] text-zinc-300 hover:text-zinc-500 cursor-pointer'>{link}</span>
                ))}
            </div>
            <p className='mt-4 text-[10px] text-zinc-300 uppercase font-bold tracking-wider'>
                © 2026 METAGRAM FROM META
            </p>
        </div>
    )
}

export default RightSidebar
