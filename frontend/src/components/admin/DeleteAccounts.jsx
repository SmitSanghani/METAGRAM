import React, { useEffect, useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import api from '@/api';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';

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

const DeleteAccounts = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/user/all');
            if (res.data.success) {
                const deletedUsersWithCharts = res.data.users
                    .filter(u => u.isDeleted)
                    .map(u => ({
                        ...u,
                        chartData: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
                        chartColor: '#ef4444'
                    }));
                setUsers(deletedUsersWithCharts);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch deleted records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 mb-1">Delete Accounts</h1>
                    <p className="text-sm text-gray-500">Permanent record of account deletions. These profiles cannot be restored.</p>
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
                        placeholder="Search deleted user history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-transparent focus:border-rose-300 rounded-xl text-sm outline-none transition-all"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-widest font-black">
                            <th className="px-8 py-5">User Profile</th>
                            <th className="px-8 py-5">Final Status</th>
                            <th className="px-8 py-5">Activity Stats</th>
                            <th className="px-8 py-5">Engagement Map</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-500">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Accessing archive records...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage).map((user) => (
                                <tr key={user._id} className="hover:bg-rose-50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
                                                <AvatarImage src={user.profilePicture} className="object-cover" />
                                                <AvatarFallback className="bg-rose-50 text-rose-600 font-black">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">@{user.username}</p>
                                                <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-400 border border-gray-100">
                                            Permanently Deleted
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
                                            <MiniSparkline data={user.chartData} color="#ef4444" />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No deletion records archived</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center px-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    showing {Math.min((currentPage * usersPerPage), filteredUsers.length)} of {filteredUsers.length} total
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 border border-gray-100 rounded-xl text-sm font-bold transition-all ${currentPage === 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Prev
                    </button>
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / usersPerPage)))}
                        disabled={currentPage >= Math.ceil(filteredUsers.length / usersPerPage)}
                        className={`px-4 py-2 border border-gray-100 rounded-xl text-sm font-bold transition-all ${currentPage >= Math.ceil(filteredUsers.length / usersPerPage) ? 'text-gray-200 cursor-not-allowed' : 'bg-rose-900 text-white hover:bg-rose-950'}`}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccounts;
