import React from 'react'
import Feed from './Feed'
import RightSidebar from './RightSidebar'
import { Outlet } from 'react-router-dom'
import useGetAllPost from '@/hooks/useGetAllPost'
import useGetSuggestedUsers from '@/hooks/useGetSuggestedUsers'

const Home = () => {
    useGetAllPost();
    useGetSuggestedUsers();
    return (
        <div className='flex justify-center w-full min-h-screen bg-[#edf6f5]'>
            <div className='flex w-full max-w-[1240px] gap-20 pt-8 px-8 justify-between'>
                {/* Feed Section */}
                <div className='flex-1 max-w-[700px]'>
                    <Feed />
                    <div className='py-4'>
                        <Outlet />
                    </div>
                </div>

                {/* Suggested Section */}
                <div className='hidden lg:block w-full max-w-[340px]'>
                    <RightSidebar />
                </div>
            </div>
        </div>
    )
}

export default Home
