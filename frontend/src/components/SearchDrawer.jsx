import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Loader2, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { toast } from 'sonner';

const SearchDrawer = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef(null);

    // Fetch initial recent searches
    useEffect(() => {
        if (isOpen) {
            fetchRecentSearches();
        }
    }, [isOpen]);

    const fetchRecentSearches = async () => {
        try {
            const res = await api.get('/user/recent-search');
            if (res.data.success) {
                setRecentSearches(res.data.recentSearches);
            }
        } catch (error) {
            console.error(error);
        }
    };

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

    const handleUserClick = async (targetUser) => {
        try {
            // Add to recent search in backend
            await api.post(`/user/recent-search/add/${targetUser._id}`);
            onClose();
            navigate(`/profile/${targetUser._id}`);
        } catch (error) {
            console.error(error);
            navigate(`/profile/${targetUser._id}`);
        }
    };

    const removeRecentSearch = async (e, targetId) => {
        e.stopPropagation();
        try {
            const res = await api.delete(`/user/recent-search/remove/${targetId}`);
            if (res.data.success) {
                setRecentSearches(recentSearches.filter(user => user._id !== targetId));
            }
        } catch (error) {
            toast.error("Failed to remove from history");
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-y-0 left-[240px] w-[400px] bg-white border-r shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
            <div className='p-6 h-full flex flex-col'>
                <div className='flex items-center justify-between mb-8'>
                    <h2 className='text-2xl font-bold'>Search</h2>
                    <button onClick={onClose} className='p-2 hover:bg-gray-100 rounded-full transition-colors'>
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className='relative mb-6'>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                        {loading ? <Loader2 size={18} className='animate-spin' /> : <SearchIcon size={18} />}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search usernames..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className='w-full bg-[#efefef] border-transparent focus:border-indigo-400 border py-2.5 pl-10 pr-4 rounded-lg outline-none transition-all placeholder:text-gray-500 font-medium'
                        autoFocus
                    />
                </div>

                <div className='flex-1 overflow-y-auto no-scrollbar'>
                    {/* Recent / History Section */}
                    {(query.trim() === "" ? recentSearches : recentSearches.filter(u => u.username.toLowerCase().includes(query.toLowerCase()))).length > 0 && (
                        <div className='mb-6'>
                            <div className='flex items-center justify-between mb-4'>
                                <span className='text-[12px] font-bold text-gray-500 uppercase tracking-widest'>Recent</span>
                                {recentSearches.length > 0 && (
                                    <button 
                                        onClick={() => {
                                            api.delete('/user/recent-search/clear-all').catch(err => console.error(err));
                                            setRecentSearches([]);
                                        }} 
                                        className='text-xs font-bold text-[#0095F6] hover:text-indigo-800 transition-colors'
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                            
                            <div className='flex flex-col gap-1'>
                                {(query.trim() === "" ? recentSearches : recentSearches.filter(u => u.username.toLowerCase().includes(query.toLowerCase()))).map((u) => (
                                    <div 
                                        key={`recent-${u._id}`} 
                                        onClick={() => handleUserClick(u)}
                                        className='flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group'
                                    >
                                        <Avatar className='w-11 h-11 ring-2 ring-transparent group-hover:ring-indigo-100 ring-offset-2 transition-all'>
                                            <AvatarImage src={u.profilePicture} className="object-cover" />
                                            <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className='flex flex-col flex-1'>
                                            <span className='text-[14px] font-bold text-[#262626]'>{u.username}</span>
                                            <span className='text-[12px] text-gray-500'>{u.fullName || 'User'}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => removeRecentSearch(e, u._id)}
                                            className='p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors'
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Section */}
                    {query.trim() !== "" && (
                        <div className='flex flex-col gap-1'>
                            <span className='text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4'>Suggested</span>
                            {loading ? (
                                <div className='flex items-center justify-center py-10'>
                                    <Loader2 className='animate-spin text-gray-300' />
                                </div>
                            ) : results.length > 0 ? (
                                results.filter(r => !recentSearches.some(rs => rs._id === r._id)).map((u) => (
                                    <div 
                                        key={`result-${u._id}`} 
                                        onClick={() => handleUserClick(u)}
                                        className='flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group'
                                    >
                                        <Avatar className='w-11 h-11 ring-2 ring-transparent group-hover:ring-indigo-100 ring-offset-2 transition-all'>
                                            <AvatarImage src={u.profilePicture} className="object-cover" />
                                            <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className='flex flex-col flex-1'>
                                            <span className='text-[14px] font-bold text-[#262626]'>{u.username}</span>
                                            <span className='text-[12px] text-gray-500'>{u.fullName || 'User'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className='py-10 text-center text-gray-400 font-medium'>
                                    No new users found.
                                </div>
                            )}
                        </div>
                    )}

                    {query.trim() === "" && recentSearches.length === 0 && (
                        <div className='flex flex-col items-center justify-center py-24 text-center'>
                            <div className='w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6'>
                                <Clock size={32} className='text-gray-200' />
                            </div>
                            <p className='text-gray-400 text-sm font-semibold'>No recent searches.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchDrawer;
