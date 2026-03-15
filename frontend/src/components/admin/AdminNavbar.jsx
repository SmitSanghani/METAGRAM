import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut, X, Settings, ExternalLink } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { toast } from 'sonner';
import { setAuthUser } from '../../redux/authSlice';
import logo from '../../assets/logo2.png';

const AdminNavbar = () => {
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Notifications state
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications] = useState([
        { id: 1, text: 'New user registered: @patel', time: '2 min ago', unread: true, icon: '👤' },
        { id: 2, text: 'Post reported by a user', time: '15 min ago', unread: true, icon: '🚨' },
        { id: 3, text: 'New reel uploaded by @smit123', time: '1 hr ago', unread: false, icon: '🎬' },
        { id: 4, text: 'User @savan posted a new reel', time: '3 hrs ago', unread: false, icon: '📹' },
    ]);
    const notifRef = useRef(null);

    // Profile dropdown state
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);


    // ── Close dropdowns on outside click ─────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await api.get('/user/logout');
            dispatch(setAuthUser(null));
            toast.success('Logged out successfully');
            navigate('/login');
        } catch {
            toast.error('Logout failed');
        }
    };

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
            {/* Logo for mobile/dashboard */}
            <div className="flex items-center gap-2 mr-4">
                <img src={logo} alt="logo" className="w-8 h-8 object-contain" />
                <span className="font-black text-lg tracking-tighter" style={{ fontFamily: "'Outfit', sans-serif" }}>METAGRAM</span>
            </div>

            <div className="flex-1"></div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setShowNotifications(p => !p); setShowProfile(false); }}
                        className="relative p-2.5 text-gray-500 hover:bg-gray-50 rounded-full transition-all"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                                <p className="font-black text-gray-900 text-sm">Notifications</p>
                                {unreadCount > 0 && <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                            </div>
                            <ul className="max-h-72 overflow-y-auto">
                                {notifications.map(n => (
                                    <li key={n.id} className={`flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${n.unread ? 'bg-sky-50/40' : ''}`}>
                                        <span className="text-lg mt-0.5">{n.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 font-medium leading-snug">{n.text}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">{n.time}</p>
                                        </div>
                                        {n.unread && <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />}
                                    </li>
                                ))}
                            </ul>
                            <div className="px-5 py-3 border-t border-gray-50">
                                <button className="w-full text-center text-xs font-black text-sky-500 hover:text-sky-600 uppercase tracking-widest">Mark All as Read</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-gray-100 mx-1" />

                {/* Admin Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => { setShowProfile(p => !p); setShowNotifications(false); }}
                        className="flex items-center gap-3 pl-2 pr-4 py-2 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 border border-sky-200 overflow-hidden">
                            {user?.profilePicture
                                ? <img src={user.profilePicture} alt="admin" className="w-full h-full object-cover" />
                                : <User size={18} />}
                        </div>
                        <div className="text-left hidden lg:block">
                            <p className="text-sm font-black text-gray-900 leading-none mb-1">{user?.username || 'Administrator'}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Master Admin</p>
                        </div>
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <p className="font-black text-gray-900">@{user?.username}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                            </div>
                            <ul className="p-2">
                                <li>
                                    <button onClick={() => { navigate('/admin/settings'); setShowProfile(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors">
                                        <Settings size={15} className="text-gray-400" /> Admin Settings
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => { navigate(`/profile/${user?._id}`); setShowProfile(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors">
                                        <ExternalLink size={15} className="text-gray-400" /> View Profile
                                    </button>
                                </li>
                                <li className="border-t border-gray-50 mt-1 pt-1">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-rose-50 text-sm font-bold text-rose-500 transition-colors">
                                        <LogOut size={15} /> Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Quick Logout Button */}
                <button onClick={handleLogout} className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all ml-1" title="Logout">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default AdminNavbar;
