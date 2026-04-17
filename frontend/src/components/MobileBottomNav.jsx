import React, { useState } from 'react';
import { Home, Search, Video, MessageCircle, User, PlusSquare, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CreatePost from './CreatePost';
import ReelUploadModal from './ReelUploadModal';
import { toast } from 'sonner';

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector(store => store.auth);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    const { postsEnabled, reelsEnabled } = useSelector(store => store.settings);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [openPost, setOpenPost] = useState(false);
    const [openReel, setOpenReel] = useState(false);
    const { unreadCounts = {} } = useSelector(store => store.chat || {});
    const totalUnreadMessages = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

    const navItems = [
        { icon: <Home size={24} />, path: '/', label: 'Home' },
        { icon: <Search size={24} />, path: '/explore', label: 'Explore' },
        { isCreate: true },
        { icon: <Video size={24} />, path: '/reels', label: 'Reels' },
        { icon: <MessageCircle size={24} />, path: '/chat', label: 'Chat', badge: totalUnreadMessages },
    ];

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-gray-100 pb-safe">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item, index) => {
                    if (item.isCreate) {
                        return (
                            <div key="create" className="relative flex items-center justify-center w-full h-full">
                                <button
                                    onClick={() => setShowCreateOptions(!showCreateOptions)}
                                    className={cn(
                                        "flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-90 transition-all z-10",
                                        showCreateOptions && "rotate-45 bg-gray-900 shadow-none"
                                    )}
                                >
                                    <Plus size={28} strokeWidth={3} />
                                </button>
                                
                                <AnimatePresence>
                                    {showCreateOptions && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -20, scale: 1 }}
                                            exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 min-w-[140px]"
                                        >
                                            <button 
                                                onClick={() => {
                                                    if(!postsEnabled) return toast.error("Posting disabled");
                                                    setOpenPost(true);
                                                    setShowCreateOptions(false);
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-bold text-sm"
                                            >
                                                <PlusSquare size={18} className="text-indigo-600" />
                                                Post
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(!reelsEnabled) return toast.error("Reels disabled");
                                                    setOpenReel(true);
                                                    setShowCreateOptions(false);
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-bold text-sm"
                                            >
                                                <Video size={18} className="text-rose-600" />
                                                Reel
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                {showCreateOptions && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowCreateOptions(false)}
                                        className="fixed inset-0 bg-black/5 backdrop-blur-[2px] -z-10"
                                    />
                                )}
                            </div>
                        );
                    }

                    const active = isActive(item.path);
                    return (
                        <div
                            key={index}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center w-full h-full cursor-pointer"
                        >
                            <div className={cn(
                                "transition-all duration-300 transform active:scale-75",
                                active ? "text-indigo-600 scale-110" : "text-gray-400"
                            )}>
                                {item.isProfile ? (
                                    <Avatar className={cn(
                                        "w-7 h-7 border-2 transition-all",
                                        active ? "border-indigo-600" : "border-transparent"
                                    )}>
                                        <AvatarImage src={user?.profilePicture} className="object-cover" />
                                        <AvatarFallback className={cn("text-[10px] font-bold", getAvatarColor(user?.username))}>
                                            {user?.username?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    React.cloneElement(item.icon, { 
                                        strokeWidth: active ? 2.5 : 2,
                                        className: cn(active && "fill-indigo-50/50")
                                    })
                                )}
                            </div>
                            
                            {item.badge > 0 && (
                                <span className="absolute top-3 right-[30%] bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-[16px] flex items-center justify-center border-2 border-white">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}

                            {active && (
                                <motion.div 
                                    layoutId="nav-indicator"
                                    className="absolute -top-0 w-12 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(99,102,241,0.3)]"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Modals for Create */}
            <CreatePost open={openPost} setOpen={setOpenPost} />
            <ReelUploadModal open={openReel} setOpen={setOpenReel} />
        </div>
    );
};

export default MobileBottomNav;
