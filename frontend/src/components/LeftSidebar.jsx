import { Heart, Home, LogOut, MessageCircle, PlusSquare, Search, Settings, Video, Sun, Moon } from 'lucide-react'
import logo from '../assets/logo2.png';
import React, { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { toast } from 'sonner'
import api from '@/api';
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice'
import CreatePost from './CreatePost'
import ReelUploadModal from './ReelUploadModal'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import NotificationDropdown from './NotificationDropdown'
import SearchDrawer from './SearchDrawer'
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
    const [searchOpen, setSearchOpen] = useState(false);
    const [postsEnabled, setPostsEnabled] = useState(true);
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/setting/get');
                if (res.data.success) {
                    setPostsEnabled(res.data.settings.postsEnabled);
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();

        // Refresh settings every 30 seconds to catch admin changes
        const interval = setInterval(fetchSettings, 30000);
        return () => clearInterval(interval);
    }, [open]); // Re-fetch when modal starts to open

    const { unreadCounts = {} } = useSelector(store => store.chat || {});
    const totalUnreadMessages = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
    const unreadCount = notifications.filter(n => !n.read).length;


    const logoutHandler = async () => {
        try {
            const res = await api.get('/user/logout');
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
            if (!postsEnabled && user?.role !== 'admin') {
                return toast.error("Posting is currently disabled by admin.");
            }
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
            setSearchOpen(false);
        } else if (textType === 'Search') {
            const searchInput = document.querySelector('input[placeholder="Search Metagram..."]');
            if (searchInput) {
                searchInput.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            setNotificationOpen(false);
        } else if (textType === 'Settings') {
            navigate('/settings');
            setNotificationOpen(false);
            setSearchOpen(false);
        } else if (textType === 'Upload Reel') {
            setReelOpen(true);
            setNotificationOpen(false);
            setSearchOpen(false);
        } else {
            setNotificationOpen(false);
            setSearchOpen(false);
        }
    }


    const sidebarItems = [
        { icon: <Home size={22} strokeWidth={1.5} />, text: "Home" },
        { icon: <Video size={22} strokeWidth={1.5} />, text: "Reels" },
        { icon: <MessageCircle size={22} strokeWidth={1.5} />, text: "Message" },
        { icon: <Heart size={22} strokeWidth={1.5} />, text: "Notifications" },
        { icon: <PlusSquare size={22} strokeWidth={1.5} />, text: "Create" },
        { icon: <Video size={22} strokeWidth={1.5} />, text: "Upload Reel" },
        { icon: <Settings size={22} strokeWidth={1.5} />, text: "Settings" }
    ]

    const isActive = (text) => {
        if (text === 'Home' && location.pathname === '/') return true;
        if (text === 'Message' && location.pathname.startsWith('/chat')) return true;
        if (text === 'Reels' && location.pathname.startsWith('/reels')) return true;
        if (text === 'Settings' && location.pathname.startsWith('/settings')) return true;
        if (text === 'Profile' && location.pathname.includes(`/profile/${user?._id}`)) return true;
        return false;
    }

    return (
        <div className='fixed top-0 z-50 left-0 w-[280px] h-screen bg-white border-r border-gray-100 flex flex-col justify-between pb-6 px-6 transition-all duration-300'>
            <div className='flex flex-col'>
                <div className='my-10 pl-3 flex flex-col'>
                    <div
                        onClick={() => navigate('/')}
                        className='flex items-center gap-3 cursor-pointer group'
                    >
                        <div className="relative w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <img src={logo} alt="logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className='text-2xl font-black tracking-tighter text-gray-900'
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            METAGRAM
                        </h1>
                    </div>
                </div>

                <div className='flex flex-col gap-1.5'>
                    {
                        sidebarItems.map((item, index) => {
                            const active = isActive(item.text);
                            const isDisabled = item.text === 'Create' && !postsEnabled && user?.role !== 'admin';
                            return (
                                <div onClick={() => !isDisabled && sidebarHandler(item.text)} key={index}
                                    className={`flex items-center gap-4 cursor-pointer px-4 py-3 rounded-xl transition-all duration-300 group active:scale-[0.98] ${isDisabled ? 'opacity-40 cursor-not-allowed filter grayscale' : active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}>
                                    <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-white' : 'group-hover:text-black'}`}>
                                        {React.cloneElement(item.icon, { strokeWidth: active ? 2.5 : 2 })}
                                    </div>
                                    <span className={`text-[15px] ${active ? 'font-bold' : 'font-semibold'}`}>{item.text}</span>


                                    {item.text === 'Notifications' && unreadCount > 0 && (
                                        <div className={`ml-auto text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 ${active ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}

                                    {item.text === 'Message' && totalUnreadMessages > 0 && location.pathname !== '/chat' && (
                                        <div className={`ml-auto text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 ${active ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
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
                    className={`flex items-center gap-4 cursor-pointer px-4 py-3.5 rounded-2xl transition-all duration-300 group active:scale-[0.98] ${isActive('Profile')
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}>
                    <Avatar className={`w-6 h-6 border ${isActive('Profile') ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-600' : 'border-gray-200'}`}>
                        <AvatarImage src={user?.profilePicture} alt="user" className="object-cover" />
                        <AvatarFallback className='bg-gray-50 text-[10px] text-gray-400'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className={`text-[15px] ${isActive('Profile') ? 'font-bold' : 'font-semibold'}`}>Profile</span>
                </div>

                <div onClick={() => sidebarHandler('Logout')}
                    className='flex items-center gap-4 cursor-pointer px-4 py-3.5 rounded-2xl transition-all duration-300 text-gray-500 hover:bg-red-50 hover:text-red-600 group active:scale-[0.98]'>
                    <div className='transition-transform duration-300 group-hover:scale-110'>
                        <LogOut size={22} strokeWidth={2} />
                    </div>
                    <span className='text-[15px] font-semibold'>Logout</span>
                </div>
            </div>

            <CreatePost open={open} setOpen={setOpen} />
            <ReelUploadModal open={reelOpen} setOpen={setReelOpen} />


            {/* Notifications Backdrop/Overlay */}
            {notificationOpen && (
                <div
                    className='fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40 transition-opacity'
                    onClick={() => setNotificationOpen(false)}
                />
            )}

            {notificationOpen && <NotificationDropdown onClose={() => setNotificationOpen(false)} />}
        </div>
    )
}

export default LeftSidebar