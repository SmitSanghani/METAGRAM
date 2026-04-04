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
    Flag,
    ExternalLink,
    Trash2
} from 'lucide-react';
import logo from '../../assets/logo2.png';
import { NavLink, Link } from 'react-router-dom';

const AdminSidebar = () => {
    const menuItems = [
        { icon: <LayoutDashboard size={18} />, text: 'Dashboard', path: '/admin' },
        { icon: <Users size={18} />, text: 'Users Management', path: '/admin/users' },
        { icon: <Trash2 size={18} />, text: 'Delete Accounts', path: '/admin/delete-accounts' },
        { icon: <Image size={18} />, text: 'Posts Management', path: '/admin/posts' },
        { icon: <Video size={18} />, text: 'Reels Management', path: '/admin/reels' },
        { icon: <MessageSquare size={18} />, text: 'Comments', path: '/admin/comments' },
        { icon: <Settings size={18} />, text: 'Settings', path: '/admin/settings' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-100 h-screen sticky top-0 flex flex-col pt-6">
            {/* Removed Logo Section intentionally */}

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

            {/* Removed Return to Site and Logout */}
        </aside>
    );
};

export default AdminSidebar;
