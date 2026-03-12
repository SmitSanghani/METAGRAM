import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, Shield, ShieldAlert, Trash2, Eye, Loader2, UserX, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/user/suggested', { withCredentials: true });
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch registered users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const toggleStatusHandler = async (userId, currentStatus) => {
        const action = currentStatus === false ? 'activate' : 'suspend';
        if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

        try {
            const res = await axios.post(`http://localhost:8000/api/v1/user/admin/toggle-status/${userId}`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                // Simple state update instead of full re-fetch
                setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.isActive } : u));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to toggle user status");
        }
    };

    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 mb-1">User Management</h1>
                    <p className="text-sm text-gray-500">Manage, monitor, and moderate platform users.</p>
                </div>
                <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-sky-500/20">
                    Add New Admin
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[24px] border border-gray-100 flex gap-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                        <Search size={16} />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search users by username or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-transparent focus:border-sky-300 rounded-xl text-sm outline-none transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                    <Filter size={16} />
                    Filter
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-widest font-black">
                            <th className="px-8 py-5">User</th>
                            <th className="px-8 py-5">Verified Status</th>
                            <th className="px-8 py-5">Engagement</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Fetching registered users...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user._id} className={`hover:bg-gray-50/50 transition-colors group ${user.isActive === false ? 'bg-rose-50/30' : ''}`}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className={`w-11 h-11 border-2 border-white shadow-sm ${user.isActive === false ? 'grayscale' : ''}`}>
                                                <AvatarImage src={user.profilePicture} className="object-cover" />
                                                <AvatarFallback className="bg-sky-50 text-sky-600 font-black">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className={`text-sm font-black ${user.isActive === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>@{user.username}</p>
                                                <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            user.isActive === false 
                                                ? 'bg-rose-100 text-rose-600' 
                                                : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                            {user.isActive === false ? 'Suspended' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-gray-700">{user.followers?.length || 0}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Followers</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all" title="View Profile">
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatusHandler(user._id, user.isActive)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    user.isActive === false 
                                                        ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100' 
                                                        : 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                                                }`}
                                                title={user.isActive === false ? "Activate User" : "Suspend User"}
                                            >
                                                {user.isActive === false ? <UserCheck size={18} /> : <UserX size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No registered users found</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="flex justify-between items-center px-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">showing {filteredUsers.length} of {users.length} total</p>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-100 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed">Prev</button>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">Next</button>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;


