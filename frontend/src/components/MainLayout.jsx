import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'
import Header from './Header'
import useGetNotifications from '../hooks/useGetNotifications'
import CallManager from './CallManager'

const MainLayout = () => {
  useGetNotifications();
  const location = useLocation();
  const isReelsPage = location.pathname.startsWith('/reels');
  const isChatPage = location.pathname.startsWith('/chat');
  const hideHeader = isReelsPage || isChatPage;

  return (
    <div className="bg-[#F6F7FB] min-h-screen">
      <LeftSidebar />
      <CallManager />
      <div className="main-content-layout sm:ml-[280px] ml-0 transition-all duration-300">
        {!hideHeader && <Header />}
        <main className={`${!hideHeader ? 'pt-[70px]' : ''} min-h-screen px-4 sm:px-10`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}


export default MainLayout

