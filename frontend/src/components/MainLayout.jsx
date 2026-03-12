import React from 'react'
import { Outlet } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'
import useGetNotifications from '../hooks/useGetNotifications'

const MainLayout = () => {
  useGetNotifications();
  return (
    <div className="bg-white min-h-screen">
      <LeftSidebar />
      <div className="sm:ml-[240px] ml-0 transition-all duration-300 px-4">
        <Outlet />
      </div>
    </div>
  )
}

export default MainLayout
