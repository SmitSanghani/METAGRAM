import React, { useEffect, useState } from 'react';
import { MessageCircle, Search, Loader2, User, ExternalLink } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';

const MessageMonitoring = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChatUsers = async () => {
            try {
                const res = await api.get('/user/chatusers');
                if (res.data.success) {
                    setConversations(res.data.users);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to fetch messaging data");
            } finally {
                setLoading(false);
            }
        };
        fetchChatUsers();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Messages Monitoring</h1>
                <p className="text-sm text-gray-500">Overview of active platform conversations (Traffic monitoring).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Analyzing traffic patterns...</p>
                    </div>
                ) : conversations.length > 0 ? (
                    conversations.map((user) => (
                        <div key={user._id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <img 
                                        src={user.profilePicture || "https://github.com/shadcn.png"} 
                                        alt="user" 
                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-50" 
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 truncate">@{user.username}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Registered User</p>
                                </div>
                                <button className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl transition-all">
                                    <ExternalLink size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Status</span>
                                    <span className="text-emerald-500 font-black">ACTIVE</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Connection</span>
                                    <span className="text-gray-700 font-bold truncate max-w-[120px]">{user.email}</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-gray-50">
                                <button className="w-full py-2.5 bg-gray-50 text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-sky-50 hover:text-sky-600 transition-all flex items-center justify-center gap-2">
                                    <MessageCircle size={14} />
                                    Inspect Logs
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest bg-white rounded-[32px] border border-dashed border-gray-200">
                        No active conversations recorded
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageMonitoring;
