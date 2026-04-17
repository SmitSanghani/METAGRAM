import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, Bell, MessageCircle, User, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

import CommentDialog from './CommentDialog';
import NotificationDropdown from './NotificationDropdown';
import logo from '../assets/logo2.png';

const Header = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { user } = useSelector(store => store.auth);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const navigate = useNavigate();

    // Live search Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 100);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/user/search?query=${query}`);
            if (res.data.success) {
                setResults(res.data.users);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = (targetUser) => {
        setQuery("");
        setResults([]);
        setIsSearchFocused(false);
        navigate(`/profile/${targetUser._id}`);
    };

    return (
        <header className='main-header-layout fixed top-0 right-0 left-0 sm:left-[280px] z-40 h-[70px] bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-10 transition-all duration-300'>
            <div className='h-full w-full max-w-[1200px] mx-auto flex items-center justify-between gap-4'>
                
                {/* Logo - Visible only correctly on mobile Header */}
                <div onClick={() => navigate('/')} className='flex sm:hidden items-center gap-2 cursor-pointer shrink-0'>
                    <img src={logo} alt="logo" className="w-8 h-8 object-contain" />
                    <span className="font-black text-lg tracking-tighter text-gray-900 hidden sm:block">METAGRAM</span>
                </div>

                {/* Search Bar Container */}
                <div className={`relative transition-all duration-300 w-[55%] sm:flex-1 max-w-[400px] ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                        {loading ? <Loader2 size={16} className='animate-spin' /> : <SearchIcon size={16} />}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className='w-full bg-[#f1f3f6] border-transparent focus:border-indigo-400 border py-2 pl-10 pr-4 rounded-xl outline-none transition-all placeholder:text-gray-400 font-medium text-sm'
                    />

                    {/* Search Results Dropdown */}
                    {isSearchFocused && (query.trim() !== "" || results.length > 0) && (
                        <div className='absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-soft-in max-h-[400px] overflow-y-auto no-scrollbar z-[100]'>
                            {results.length > 0 ? (
                                results.map((u) => (
                                    <div 
                                        key={u._id} 
                                        onClick={() => handleUserClick(u)}
                                        className='flex items-center gap-3 p-4 hover:bg-indigo-50/50 cursor-pointer transition-colors group border-b border-gray-50 last:border-none'
                                    >
                                        <Avatar className='w-10 h-10 ring-2 ring-transparent group-hover:ring-indigo-100 transition-all'>
                                            <AvatarImage src={u.profilePicture} className="object-cover" />
                                            <AvatarFallback className='bg-indigo-50 text-indigo-600 font-bold'>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className='flex flex-col'>
                                            <span className='text-[14px] font-bold text-gray-900 group-hover:text-indigo-600'>{u.username}</span>
                                            <span className='text-[12px] text-gray-400'>{u.fullName || 'User'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : query.trim() !== "" && !loading && (
                                <div className='p-6 text-center text-gray-400 text-sm font-medium'>No users found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side Info */}
                <div className='flex items-center gap-2 sm:gap-4 shrink-0'>
                    {user?.role === 'admin' && user?.email === 'admin@gmail.com' && (
                        <button 
                            onClick={() => navigate('/admin')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <Bell size={16} className="animate-pulse" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </button>
                    )}
                    <div 
                        onClick={() => navigate(`/profile/${user?._id}`)}
                        className='hidden sm:flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-all'
                    >
                        <div className='flex flex-col items-end'>
                            <span className='text-[13px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors'>{user?.username}</span>
                            <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-tighter'>View Profile</span>
                        </div>
                        <Avatar className='w-10 h-10 ring-2 ring-transparent group-hover:ring-indigo-100 ring-offset-2 transition-all'>
                            <AvatarImage src={user?.profilePicture} className="object-cover" />
                            <AvatarFallback className='bg-indigo-50 text-indigo-500 font-bold'>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    {/* Compact Profile for Mobile Header - Icon only */}
                    {/* Notifications and Profile for Mobile Header */}
                    <div className="flex sm:hidden items-center gap-3">
                        <button 
                            onClick={() => setNotificationOpen(true)}
                            className='relative p-1 text-gray-700 active:scale-90 transition-transform'
                        >
                            <Heart size={22} className={notificationOpen ? "fill-current text-indigo-600" : ""} />
                        </button>
                        <Avatar 
                            onClick={() => navigate(`/profile/${user?._id}`)}
                            className='w-8 h-8 ring-2 ring-transparent active:ring-indigo-100 active:ring-offset-2 transition-all cursor-pointer'
                        >
                            <AvatarImage src={user?.profilePicture} className="object-cover" />
                            <AvatarFallback className='bg-indigo-50 text-indigo-500 font-bold text-[10px]'>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>

                    {notificationOpen && (
                        <div className="fixed inset-0 z-[150] sm:relative">
                            <div className="absolute inset-0 bg-black/5 sm:hidden" onClick={() => setNotificationOpen(false)} />
                            <NotificationDropdown onClose={() => setNotificationOpen(false)} />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
