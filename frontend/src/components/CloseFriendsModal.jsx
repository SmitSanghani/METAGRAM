import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import api from '@/api';
import { toast } from 'sonner';

const CloseFriendsModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [followers, setFollowers] = useState([]);
    const [closeFriends, setCloseFriends] = useState(user?.closeFriends || []);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFollowers();
            setCloseFriends(user?.closeFriends || []);
        }
    }, [isOpen, user]);

    const fetchFollowers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/user/profile/${user._id}`);
            if (res.data.success) {
                setFollowers(res.data.user.followers || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCloseFriend = async (friendId) => {
        try {
            const res = await api.post(`/story/close-friends`, { targetId: friendId });
            if (res.data.success) {
                const isAdded = res.data.isCloseFriend;
                if (isAdded) {
                    setCloseFriends([...closeFriends, friendId]);
                } else {
                    setCloseFriends(closeFriends.filter(id => id.toString() !== friendId.toString()));
                }
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            toast.error("Failed to update list");
        }
    };

    const filteredFollowers = followers.filter(f =>
        f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                        <X size={20} />
                    </button>
                    <h3 className="font-bold">Close Friends</h3>
                    <div className="w-8"></div>
                </div>

                {/* Search */}
                <div className="p-4 border-b dark:border-zinc-800">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            className="w-full bg-gray-50 dark:bg-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFollowers.map((friend) => {
                                const isCF = closeFriends.some(id => (id._id || id).toString() === friend._id.toString());

                                return (
                                    <div
                                        key={friend._id}
                                        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                                        onClick={() => toggleCloseFriend(friend._id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-11 h-11">
                                                <AvatarImage src={friend.profilePicture} />
                                                <AvatarFallback>{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight">{friend.username}</p>
                                                <p className="text-xs text-gray-500">Your Follower</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCF ? 'bg-[#2ecc71] border-[#2ecc71]' : 'border-gray-200 dark:border-zinc-700'}`}>
                                            {isCF && <Check size={14} className="text-white" strokeWidth={4} />}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredFollowers.length === 0 && !loading && (
                                <p className="text-center text-gray-500 text-sm py-10">No followers found.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 border-t dark:border-zinc-800">
                    <Button
                        onClick={onClose}
                        className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl py-6 font-bold"
                    >
                        Done
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default CloseFriendsModal;
