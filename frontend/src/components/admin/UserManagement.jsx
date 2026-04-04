import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, MoreHorizontal, Shield, ShieldAlert, Trash2, Eye, Loader2, UserX, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import api from '@/api';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';
import Swal from 'sweetalert2';

const MiniSparkline = ({ data, color }) => {
    const option = useMemo(() => ({
        grid: { left: 0, top: 0, right: 0, bottom: 0 },
        xAxis: { type: 'category', data: [1, 2, 3, 4, 5, 6, 7], show: false },
        yAxis: { type: 'value', show: false },
        series: [{
            data: data,
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 2, color: color },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: color.replace(')', ', 0.2)').replace('rgb', 'rgba') },
                        { offset: 1, color: color.replace(')', ', 0)').replace('rgb', 'rgba') }
                    ]
                }
            }
        }],
        animationDuration: 1500
    }), [data, color]);

    return <ReactECharts option={option} style={{ height: '40px', width: '100px' }} opts={{ renderer: 'svg' }} />;
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/user/all');
            if (res.data.success) {
                // Mocking some sparkline data since the backend doesn't provide it
                const usersWithCharts = res.data.users.map(u => ({
                    ...u,
                    chartData: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
                    chartColor: ['#3B82F6', '#8B5CF6', '#10B981'][Math.floor(Math.random() * 3)]
                }));
                setUsers(usersWithCharts);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch registered users");
        } finally {
            setLoading(false);
        }
    };
    // ... rest of the component

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const toggleStatusHandler = async (userId, currentStatus) => {
        const action = currentStatus === false ? 'activate' : 'suspend';

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Account?`,
            text: `Are you sure you want to ${action} this user's account?`,
            icon: currentStatus === false ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus === false ? '#10b981' : '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: `Yes, ${action}!`,
            background: '#ffffff',
            borderRadius: '24px',
            customClass: {
                popup: 'rounded-[24px]',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
            }
        });

        if (!result.isConfirmed) return;

        try {
            const res = await api.post(`/user/admin/toggle-status/${userId}`, {});
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
        !user.isDeleted && (
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 mb-1">User Management</h1>
                    <p className="text-sm text-gray-500">Manage, monitor, and moderate platform users.</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[24px] border border-gray-100">
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
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-widest font-black">
                            <th className="px-8 py-5">User</th>
                            <th className="px-8 py-5">Verified Status</th>
                            <th className="px-8 py-5">Engagement</th>
                            <th className="px-8 py-5">Growth</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-8 py-20 text-center">
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
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.isActive === false
                                            ? 'bg-rose-100 text-rose-600'
                                            : 'bg-emerald-100 text-emerald-600'
                                            }`}>
                                            {user.isActive === false ? 'Suspended' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{user.posts?.length || 0}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Posts</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{user.followers?.length || 0}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Followers</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="w-[100px]">
                                            <MiniSparkline data={user.chartData} color={user.chartColor} />
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleStatusHandler(user._id, user.isActive)}
                                                className={`p-2 rounded-lg transition-all ${user.isActive === false
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
                                <td colSpan="5" className="px-8 py-20 text-center">
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


