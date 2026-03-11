import React from 'react'
import { Outlet } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'
import useGetNotifications from '../hooks/useGetNotifications'

const MainLayout = () => {
  useGetNotifications();
  return (
    <div className="bg-[rgb(218,242,242)] min-h-screen">
      <LeftSidebar />
      <div className="sm:ml-[280px] ml-0 transition-all duration-300">
        <Outlet />
      </div>
    </div>
  )
}

export default MainLayout
