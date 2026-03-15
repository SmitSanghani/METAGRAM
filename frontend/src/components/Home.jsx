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
        <div className='flex justify-center w-full min-h-screen'>
            <div className='flex w-full max-w-[1400px] gap-12 pt-8 justify-between'>
                {/* Feed Section */}
                <div className='flex-1 lg:max-w-none'>
                    <Feed />
                    <div className='py-4'>
                        <Outlet />
                    </div>
                </div>

                {/* Suggested Section - Visible on very large screens */}
                <div className='hidden xl:block w-full max-w-[320px]'>
                    <RightSidebar />
                </div>
            </div>
        </div>
    )
}

export default Home

