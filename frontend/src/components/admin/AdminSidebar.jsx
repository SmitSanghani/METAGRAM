import React from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Image, 
    Video, 
    MessageSquare, 
    AlertTriangle, 
    Settings, 
    LogOut,
    MessageCircle,
    Flag
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
    const menuItems = [
        { icon: <LayoutDashboard size={18} />, text: 'Dashboard', path: '/admin' },
        { icon: <Users size={18} />, text: 'Users Management', path: '/admin/users' },
        { icon: <Image size={18} />, text: 'Posts Management', path: '/admin/posts' },
        { icon: <Video size={18} />, text: 'Reels Management', path: '/admin/reels' },
        { icon: <MessageSquare size={18} />, text: 'Comments', path: '/admin/comments' },
        { icon: <MessageCircle size={18} />, text: 'Messages Monitoring', path: '/admin/messages' },
        { icon: <Settings size={18} />, text: 'Settings', path: '/admin/settings' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-100 h-screen sticky top-0 flex flex-col pt-6">
            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-200
                            ${isActive 
                                ? 'bg-sky-50 text-sky-600' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                        `}
                    >
                        {item.icon}
                        <span>{item.text}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-50 mb-4">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[14px] font-medium text-rose-500 hover:bg-rose-50 transition-all duration-200">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
