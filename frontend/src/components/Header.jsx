import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, Bell, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Header = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    // Live search Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 500);

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
        <header className='fixed top-0 right-0 left-0 sm:left-[280px] z-40 h-[70px] bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 sm:px-10 transition-all duration-300'>
            <div className='h-full w-full max-w-[1200px] mx-auto flex items-center justify-between'>
                
                {/* Search Bar Container */}
                <div className='relative w-full max-w-[400px]'>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                        {loading ? <Loader2 size={18} className='animate-spin' /> : <SearchIcon size={18} />}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search Metagram..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className='w-full bg-[#f1f3f6] border-transparent focus:border-indigo-400 border py-2 pl-10 pr-4 rounded-lg outline-none transition-all placeholder:text-gray-400 font-medium text-sm'
                    />

                    {/* Search Results Dropdown */}
                    {isSearchFocused && (query.trim() !== "" || results.length > 0) && (
                        <div className='absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-50 overflow-hidden animate-soft-in max-h-[400px] overflow-y-auto no-scrollbar'>
                            {results.length > 0 ? (
                                results.map((u) => (
                                    <div 
                                        key={u._id} 
                                        onClick={() => handleUserClick(u)}
                                        className='flex items-center gap-3 p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors group border-b border-gray-50 last:border-none'
                                    >
                                        <Avatar className='w-9 h-9'>
                                            <AvatarImage src={u.profilePicture} className="object-cover" />
                                            <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-gray-900 group-hover:text-indigo-600'>{u.username}</span>
                                            <span className='text-[11px] text-gray-400'>{u.fullName || 'User'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : query.trim() !== "" && !loading && (
                                <div className='p-4 text-center text-gray-400 text-sm'>No users found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side Info */}
                <div className='flex items-center gap-4'>
                    {user?.role === 'admin' && user?.email === 'admin@gmail.com' && (
                        <button 
                            onClick={() => navigate('/admin')}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                        >
                            <Bell size={14} className="animate-pulse" />
                            Dashboard
                        </button>
                    )}
                    <div 
                        onClick={() => navigate(`/profile/${user?._id}`)}
                        className='flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-all'
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
                </div>
            </div>
        </header>
    );
};

export default Header;
