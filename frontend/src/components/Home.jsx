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
        <div className='flex justify-center w-full min-h-screen bg-[rgb(218,242,242)]'>
            <div className='flex w-full max-w-[1200px] gap-8 pt-8 px-4'>
                {/* Feed Section - Creative White Column */}
                <div className='flex-1 max-w-[830px] bg-white rounded-[13px] border border-[#efefef] shadow-sm overflow-hidden h-fit'>
                    <Feed />
                    <div className='py-4'>
                        <Outlet />
                    </div>
                </div>

                {/* Suggested Section - Separate Floating Sidebar */}
                <div className='hidden xl:block w-full max-w-[350px]'>
                    <RightSidebar />
                </div>
            </div>
        </div>
    )
}

export default Home
