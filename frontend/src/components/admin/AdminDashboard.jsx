import React, { useEffect, useState } from 'react';
import { 
    Users, 
    Image as ImageIcon, 
    Video, 
    TrendingUp, 
    Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 mb-6`}>
            <Icon size={32} className={colorClass.replace('bg-', 'text--')} />
        </div>
        <p className="text-gray-400 text-sm font-black uppercase tracking-widest mb-2">{title}</p>
        {loading ? (
            <Loader2 className="w-8 h-8 text-gray-200 animate-spin" />
        ) : (
            <h3 className="text-4xl font-black text-gray-900">{value}</h3>
        )}
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        users: 0,
        posts: 0,
        reels: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [userRes, postRes, reelRes] = await Promise.all([
                    axios.get('http://localhost:8000/api/v1/user/suggested', { withCredentials: true }),
                    axios.get('http://localhost:8000/api/v1/post/all', { withCredentials: true }),
                    axios.get('http://localhost:8000/api/v1/reels/feed', { withCredentials: true })
                ]);

                setStats({
                    users: (userRes.data.users?.length || 0) + 1, // +1 for the admin themselves
                    posts: postRes.data.posts?.length || 0,
                    reels: reelRes.data.reels?.length || 0
                });
            } catch (error) {
                console.error(error);
                toast.error("Failed to load dashboard statistics");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-gray-900">Platform Performance</h1>
                <p className="text-gray-500 font-medium">Real-time overview of Metagram's registered growth and content.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard 
                    title="Registered Users" 
                    value={stats.users} 
                    icon={Users} 
                    colorClass="bg-sky-500" 
                    loading={loading}
                />
                <StatCard 
                    title="Total Posts" 
                    value={stats.posts} 
                    icon={ImageIcon} 
                    colorClass="bg-purple-500" 
                    loading={loading}
                />
                <StatCard 
                    title="Total Reels" 
                    value={stats.reels} 
                    icon={Video} 
                    colorClass="bg-rose-500" 
                    loading={loading}
                />
            </div>

            {/* Summary Info */}
            <div className="bg-sky-50/50 p-8 rounded-[40px] border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-sky-500 text-white p-3 rounded-2xl shadow-lg shadow-sky-500/30">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-sky-900 leading-tight">Dynamic Insights Active</h4>
                        <p className="text-sm text-sky-600 font-medium">Dashboard automatically syncs with your MongoDB database.</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-white text-sky-600 font-bold rounded-2xl border border-sky-200 hover:bg-sky-100 transition-all"
                >
                    Refresh Data
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;

