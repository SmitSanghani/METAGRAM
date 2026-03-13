import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Search, X, CheckCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import api from '@/api';
import { toast } from 'sonner';

const SharePostModal = ({ open, setOpen, post }) => {
    const { suggestedUsers } = useSelector(store => store.auth);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const filteredUsers = suggestedUsers?.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const sharePostHandler = async () => {
        if (selectedUsers.length === 0 || !post?._id) return;
        setLoading(true);
        try {
            for (const userId of selectedUsers) {
                await api.post(`/message/send/${userId}`, {
                    messageType: 'post',
                    postId: post._id,
                    mediaUrl: post.image, // Pass image for immediate display if needed
                    message: post.caption || "Check out this post",
                });
            }
            toast.success("Shared successfully!");
            setOpen(false);
            setSelectedUsers([]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to share");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border-none shadow-2xl rounded-[32px] animate-in zoom-in-95 duration-300">
                <DialogHeader className="p-6 border-b border-gray-100 flex flex-row items-center justify-between">
                    <DialogTitle className="text-[14px] font-black uppercase tracking-[0.2em] text-gray-800">Share Post</DialogTitle>
                    <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </DialogHeader>

                <div className="p-6 flex flex-col gap-6">
                    {/* Post preview */}
                    {post?.image && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                            <img src={post.image} className="w-14 h-14 rounded-xl object-cover" alt="post" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[13px] font-black text-gray-800 truncate">{post?.author?.username}</span>
                                <span className="text-[12px] text-gray-400 truncate">{post?.caption || "Post"}</span>
                            </div>
                        </div>
                    )}

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find your friends..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-100/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl py-3 pl-12 pr-4 text-[14px] font-medium outline-none transition-all"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {filteredUsers?.length > 0 ? (
                            filteredUsers.map(user => (
                                <div
                                    key={user._id}
                                    onClick={() => toggleUser(user._id)}
                                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${selectedUsers.includes(user._id) ? 'bg-indigo-50 shadow-sm' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12 border-2 border-white">
                                            <AvatarImage src={user.profilePicture} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-500 font-black">{user.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-gray-900">{user.username}</span>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedUsers.includes(user._id) ? 'bg-indigo-600 text-white scale-110' : 'border-2 border-gray-200'}`}>
                                        {selectedUsers.includes(user._id) && <CheckCircle2 size={16} strokeWidth={3} />}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-gray-400 italic font-medium opacity-50">
                                No one found...
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                    <Button
                        onClick={sharePostHandler}
                        disabled={selectedUsers.length === 0 || loading}
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] tracking-[0.2em] uppercase rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        {loading ? "SENDING..." : `SEND TO ${selectedUsers.length} FRIEND${selectedUsers.length > 1 ? 'S' : ''}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SharePostModal;
