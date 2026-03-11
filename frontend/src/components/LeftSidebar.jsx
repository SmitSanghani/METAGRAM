import { Heart, Home, LogOut, MessageCircle, PlusSquare, Search, TrendingUp, Video } from 'lucide-react'
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
        <div className='fixed top-0 z-50 left-0 w-[240px] h-screen bg-[rgb(206,223,245)] flex flex-col justify-between pb-6'>
            <div className='flex flex-col px-3'>
                <div className='my-5 pl-2 flex items-center'>
                    <h1 className='brand-font text-xl tracking-wide'>METAGRAM</h1>
                    <span className='w-1 h-1 rounded-full bg-[#4F46E5] ml-0.5 mt-1'></span>
                </div>

                <div className='flex flex-col gap-0.5'>
                    {
                        sidebarItems.map((item, index) => {
                            const active = isActive(item.text);
                            return (
                                <div onClick={() => sidebarHandler(item.text)} key={index}
                                    className={`relative flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-all duration-300 group mb-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] active:scale-[0.96] border border-transparent ${active
                                        ? 'bg-white text-[#4F46E5] font-bold shadow-sm'
                                        : 'bg-white text-[#262626] hover:text-[#4F46E5] hover:shadow-sm hover:font-bold'
                                        }`}>
                                    <div className={`transition-colors duration-300 ${active ? 'text-[#4F46E5]' : 'text-current group-hover:text-[#4F46E5]'}`}>
                                        {React.cloneElement(item.icon, { size: 16 })}
                                    </div>
                                    <span className='text-[12.5px] font-medium'>{item.text}</span>

                                    {item.text === 'Notifications' && unreadCount > 0 && (
                                        <div className='ml-auto bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm border border-white/20'>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}

                                    {item.text === 'Message' && totalUnreadMessages > 0 && (
                                        <div className='ml-auto bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm border border-white/20'>
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
            <div className='flex flex-col gap-1 px-3'>
                <div onClick={() => sidebarHandler('Profile')}
                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl transition-all duration-300 group shadow-[0_1px_4px_rgba(0,0,0,0.02)] active:scale-[0.96] border border-transparent ${isActive('Profile')
                        ? 'bg-white text-[#4F46E5] font-bold shadow-sm'
                        : 'bg-white text-[#262626] hover:text-[#4F46E5] hover:shadow-sm hover:font-bold'
                        }`}>
                    <Avatar className={`w-6 h-6 ${isActive('Profile') ? 'ring-2 ring-[#4F46E5] ring-offset-1' : ''}`}>
                        <AvatarImage src={user?.profilePicture} alt="user" className="object-cover" />
                        <AvatarFallback className='bg-gray-200 text-[8px] text-black'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className='text-[12.5px] font-medium'>Profile</span>
                </div>

                <div onClick={() => sidebarHandler('Logout')}
                    className='flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl transition-all duration-300 bg-white text-[#262626] hover:text-red-500 hover:shadow-sm group shadow-[0_1px_4px_rgba(0,0,0,0.02)] active:scale-[0.96] mt-0.5 border border-transparent'>
                    <div className='transition-transform duration-300 group-hover:scale-105'>
                        <LogOut size={16} strokeWidth={1.5} />
                    </div>
                    <span className='text-[12.5px] font-medium'>Logout</span>
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