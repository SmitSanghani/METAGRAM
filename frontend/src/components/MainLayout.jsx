import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'
import useGetNotifications from '../hooks/useGetNotifications'
import CallManager from './CallManager'

const MainLayout = () => {
  useGetNotifications();
  const location = useLocation();
  const isReelsPage = location.pathname.startsWith('/reels');
  const isChatPage = location.pathname.startsWith('/chat');
  const isProfilePage = location.pathname.startsWith('/profile');
  const hideHeader = isReelsPage || isChatPage || (isProfilePage && window.innerWidth < 640);
  
  // Hide Mobile Bottom Nav on Chat (when talking) and Reels for full immersion
  const hideMobileNav = isReelsPage || isChatPage;

  return (
    <div className="bg-[#F6F7FB] min-h-screen">
      <LeftSidebar />
      <CallManager />
      <div className="main-content-layout sm:ml-[280px] ml-0 transition-all duration-300">
        {!hideHeader && <Header />}
        <main className={`${!hideHeader ? 'pt-[70px]' : ''} min-h-screen ${isChatPage ? 'px-0 sm:px-0' : 'px-4 sm:px-10'} ${!hideMobileNav ? 'pb-20 sm:pb-0' : 'pb-0'}`}>
          <Outlet />
        </main>
      </div>
      {!hideMobileNav && <MobileBottomNav />}
    </div>
  )
}


export default MainLayout

