import { Heart, Home, LogOut, MessageCircle, PlusSquare, Search, TrendingUp, Video, Sun, Moon } from 'lucide-react'
import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { toast } from 'sonner'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice'
import CreatePost from './CreatePost'
import ReelUploadModal from './ReelUploadModal'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import NotificationDropdown from './NotificationDropdown'
import useTheme from '../hooks/useTheme'

const LeftSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector(store => store.auth);
    const notificationState = useSelector(store => store.notification);
    const notifications = notificationState?.notifications || [];
    const [open, setOpen] = useState(false);
    const [reelOpen, setReelOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const dispatch = useDispatch();

    const { unreadCounts = {} } = useSelector(store => store.chat || {});
    const totalUnreadMessages = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
    const unreadCount = notifications.filter(n => !n.read).length;


    const logoutHandler = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/user/logout', { withCredentials: true });
            if (res.data.success) {
                dispatch(setAuthUser(null));
                dispatch(setSelectedPost(null));
                dispatch(setPosts([]));

                navigate("/login");
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response.data.message);
        }
    }


    const sidebarHandler = (textType) => {
        if (textType === 'Logout') {
            logoutHandler();
        } else if (textType === 'Create') {
            setOpen(true);
            setNotificationOpen(false);
        } else if (textType === 'Profile') {
            navigate(`/profile/${user?._id}`);
            setNotificationOpen(false);
        } else if (textType === 'Home') {
            navigate('/');
            setNotificationOpen(false);
        } else if (textType === 'Message') {
            navigate('/chat');
            setNotificationOpen(false);
        } else if (textType === 'Reels') {
            navigate('/reels');
            setNotificationOpen(false);
        } else if (textType === 'Notifications') {
            setNotificationOpen(!notificationOpen);
        } else if (textType === 'Upload Reel') {
            setReelOpen(true);
            setNotificationOpen(false);
        } else {
            setNotificationOpen(false);
        }
    }


    const sidebarItems = [
        { icon: <Home size={20} strokeWidth={1.5} />, text: "Home" },
        { icon: <Search size={20} strokeWidth={1.5} />, text: "Search" },
        { icon: <TrendingUp size={20} strokeWidth={1.5} />, text: "Explore" },
        { icon: <Video size={20} strokeWidth={1.5} />, text: "Reels" },
        { icon: <MessageCircle size={20} strokeWidth={1.5} />, text: "Message" },
        { icon: <Heart size={20} strokeWidth={1.5} />, text: "Notifications" },
        { icon: <PlusSquare size={20} strokeWidth={1.5} />, text: "Create" },
        { icon: <Video size={20} strokeWidth={1.5} />, text: "Upload Reel" }
    ]

    const isActive = (text) => {
        if (text === 'Home' && location.pathname === '/') return true;
        if (text === 'Message' && location.pathname.startsWith('/chat')) return true;
        if (text === 'Reels' && location.pathname.startsWith('/reels')) return true;
        if (text === 'Profile' && location.pathname.includes(`/profile/${user?._id}`)) return true;
        return false;
    }

    return (
        <div className='fixed top-0 z-50 left-0 w-[240px] h-screen bg-[#d6eef3] border-r border-[#efefef] flex flex-col justify-between pb-6 px-4 transition-colors duration-300'>
            <div className='flex flex-col'>
                <div className='my-8 pl-3 flex flex-col'>
                    <h1 className='text-2xl font-bold tracking-tight text-[#3b82f6]' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        METAGRAM
                    </h1>
                    <p className='text-[8px] tracking-[0.3em] text-gray-400 font-bold uppercase mt-0.5' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Digital Identity
                    </p>
                </div>

                <div className='flex flex-col gap-2'>
                    {
                        sidebarItems.map((item, index) => {
                            const active = isActive(item.text);
                            return (
                                <div onClick={() => sidebarHandler(item.text)} key={index}
                                    className={`flex items-center gap-4 cursor-pointer px-3 py-3 rounded-lg transition-all duration-200 group active:scale-[0.98] ${active
                                        ? 'bg-white text-[#3b82f6] font-bold shadow-sm'
                                        : 'text-[#262626] hover:bg-white/60'
                                        }`}>
                                    <div className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-[#3b82f6]' : ''}`}>
                                        {React.cloneElement(item.icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
                                    </div>
                                    <span className={`text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>{item.text}</span>

                                    {item.text === 'Notifications' && unreadCount > 0 && (
                                        <div className='ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1'>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}

                                    {item.text === 'Message' && totalUnreadMessages > 0 && location.pathname !== '/chat' && (
                                        <div className='ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1'>
                                            {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    }
                </div>
            </div>

            {/* Bottom Actions */}
            <div className='flex flex-col gap-2'>
                <div onClick={() => sidebarHandler('Profile')}
                    className={`flex items-center gap-4 cursor-pointer px-3 py-3 rounded-lg transition-all duration-200 group active:scale-[0.98] ${isActive('Profile')
                        ? 'bg-white text-[#3b82f6] font-bold shadow-sm'
                        : 'text-[#262626] hover:bg-white/60'
                        }`}>
                    <Avatar className={`w-6 h-6 border ${isActive('Profile') ? 'ring-2 ring-[#3b82f6] ring-offset-2' : 'border-gray-200'}`}>
                        <AvatarImage src={user?.profilePicture} alt="user" className="object-cover" />
                        <AvatarFallback className='bg-gray-200 text-[10px] text-black'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className={`text-[15px] ${isActive('Profile') ? 'font-bold' : 'font-normal'}`}>Profile</span>
                </div>

                <div onClick={() => sidebarHandler('Logout')}
                    className='flex items-center gap-4 cursor-pointer px-3 py-3 rounded-lg transition-all duration-200 text-[#262626] hover:bg-white/60 group active:scale-[0.98]'>
                    <div className='transition-transform duration-200 group-hover:scale-110'>
                        <LogOut size={24} strokeWidth={2} />
                    </div>
                    <span className='text-[15px] font-medium'>Logout</span>
                </div>
            </div>

            <CreatePost open={open} setOpen={setOpen} />
            <ReelUploadModal open={reelOpen} setOpen={setReelOpen} />


            {/* Notifications Backdrop/Overlay */}
            {notificationOpen && (
                <div
                    className='fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity'
                    onClick={() => setNotificationOpen(false)}
                />
            )}

            {notificationOpen && <NotificationDropdown onClose={() => setNotificationOpen(false)} />}
        </div>
    )
}

export default LeftSidebar