import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { X, Heart, Trash2 } from 'lucide-react';
import { markAllAsRead, markSingleAsRead, removeNotification, removeNotificationById, updateNotificationStatus } from '@/redux/notificationSlice';
import api from '@/api';
import { toast } from 'sonner';
import { setAuthUser, setUserProfile } from '@/redux/authSlice';

const NotificationDropdown = ({ onClose }) => {
    const notificationState = useSelector(store => store.notification);
    const notifications = notificationState?.notifications || [];
    const { user, userProfile } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleRead = async () => {
        try {
            await api.post('/notification/read', {});
            dispatch(markAllAsRead());
        } catch (error) {
            console.error('Error marking read', error);
        }
    };

    const handleDeleteNotification = (e, notificationId) => {
        e.stopPropagation();
        dispatch(removeNotificationById(notificationId));
        // Note: Could also delete from database here if an API endpoint is available
    };

    const handleAccept = async (senderId) => {
        try {
            const res = await api.post(`/user/follow/accept/${senderId}`, {});
            if (res.data.success) {
                if (res.data.status === 'deleted') {
                    dispatch(updateNotificationStatus({ senderId, type: 'follow_request', status: 'deleted' }));
                } else {
                    dispatch(updateNotificationStatus({ senderId, type: 'follow_request', status: 'accepted' }));

                    // Update followers in auth state globally
                    if (user) {
                        dispatch(setAuthUser({
                            ...user,
                            followers: [...(user.followers || []), senderId]
                        }));
                    }

                    // If currently viewing their own profile, update it locally too
                    if (userProfile && userProfile?._id === user?._id) {
                        dispatch(setUserProfile({
                            ...userProfile,
                            followers: [...(userProfile.followers || []), senderId]
                        }));
                    }
                }
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Error accepting'); }
    };

    const handleDelete = async (senderId) => {
        try {
            const res = await api.post(`/user/follow/delete/${senderId}`, {});
            if (res.data.success) {
                dispatch(updateNotificationStatus({ senderId, type: 'follow_request', status: 'deleted' }));
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting'); }
    };

    const handleMarkAsRead = async (n) => {
        // Mark as read if not already read
        if (!n.read) {
            try {
                await api.post(`/notification/${n._id}/read`, {});
                dispatch(markSingleAsRead(n._id));
            } catch (error) {
                console.error('Error marking notification as read', error);
            }
        }
    };

    const handleUserClick = (e, senderId) => {
        e.stopPropagation();
        if (senderId) {
            navigate(`/profile/${senderId}`);
            onClose();
        }
    };

    return (
        <div className="absolute top-0 left-full h-screen w-[340px] bg-[#FAFAFA] border-r border-[#F0F0F0] shadow-2xl z-50 flex flex-col">
            <div className="p-6 border-b border-indigo-500 flex items-center justify-between bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white">
                <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
                <div className="flex gap-4 items-center">
                    <button onClick={handleRead} className="text-xs text-[#EEF2FF] hover:text-white font-semibold transition-colors cursor-pointer">Mark Read</button>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer">
                        <X size={20} className="text-white" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF] px-6 text-center">
                        <div className='w-16 h-16 bg-[#EEF2FF] rounded-full flex items-center justify-center mb-4 border-[2px] border-[#4F46E5]/20'>
                            <Heart className='text-[#4F46E5]' size={28} />
                        </div>
                        <p className='font-bold text-[#333] mb-1'>No new notifications</p>
                        <p className='text-sm text-gray-400'>When someone likes or comments on your post, you'll see it here.</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n._id}
                            onClick={() => handleMarkAsRead(n)}
                            className={`flex items-center gap-3 p-4 border-b border-[#F0F0F0] hover:bg-white cursor-pointer transition group ${!n.read ? 'bg-[#EEF2FF]/60 border-l-4 border-l-[#4F46E5]' : 'border-l-4 border-l-transparent'}`}
                        >
                            <Avatar 
                                onClick={(e) => handleUserClick(e, n.sender?._id)}
                                className="w-12 h-12 shadow-sm border border-[#F0F0F0] hover:opacity-80 transition-opacity"
                            >
                                <AvatarImage src={n.sender?.profilePicture} className="object-cover" />
                                <AvatarFallback>{n.sender?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-[13px] leading-tight">
                                <span 
                                    onClick={(e) => handleUserClick(e, n.sender?._id)}
                                    className="font-bold mr-1 text-[#333] hover:underline cursor-pointer"
                                >
                                    {n.sender?.username}
                                </span>
                                <span className="text-gray-600">
                                    {n.type === 'follow' && 'started following you.'}
                                    {n.type === 'follow_request' && 'requested to follow you.'}
                                    {n.type === 'follow_accept' && 'accepted your follow request.'}
                                    {n.type === 'like' && (n.reel ? 'liked your reel.' : n.story ? 'liked your story.' : 'liked your post.')}
                                    {n.type === 'comment' && (n.reel ? 'commented on your reel.' : 'commented on your post.')}
                                    {n.type === 'reply' && (n.reel ? 'replied to your comment on your reel.' : 'replied to your comment.')}
                                    {n.type === 'comment_like' && 'liked your comment ❤️'}
                                    {n.type === 'reel_comment_like' && 'liked your reel comment ❤️'}
                                    {n.type === 'story_like' && 'liked your story.'}
                                    {n.type === 'story_comment' && 'replied to your story.'}
                                    {n.type === 'profile_visit' && 'visited your profile.'}
                                </span>

                                {n.type === 'follow_request' && !n.requestStatus && (
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleAccept(n.sender._id); }} className="bg-[#0095F6] hover:bg-[#1877F2] text-white px-3 py-1.5 rounded-[8px] font-bold text-[12px] transition active:scale-95">Accept</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(n.sender._id); }} className="bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] px-3 py-1.5 rounded-[8px] font-bold text-[12px] transition active:scale-95">Delete</button>
                                    </div>
                                )}
                                {n.type === 'follow_request' && n.requestStatus === 'accepted' && (
                                    <div className="mt-2 text-[12px] font-medium text-gray-500">You accepted this request</div>
                                )}
                                {n.type === 'follow_request' && n.requestStatus === 'deleted' && (
                                    <div className="mt-2 text-[12px] font-medium text-gray-500">Request deleted</div>
                                )}

                                <div className="text-[11px] font-bold text-[#4F46E5] mt-1.5 uppercase tracking-wide">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </div>
                            </div>
                            {/* Content Thumbnail */}
                            {n.post?.image && (
                                <img src={n.post.image} alt="post" className="w-12 h-12 object-cover rounded-md shadow-sm border border-[#F0F0F0]" />
                            )}
                            {n.reel?.thumbnail && (
                                <img src={n.reel.thumbnail} alt="reel" className="w-12 h-12 object-cover rounded-md shadow-sm border border-[#F0F0F0]" />
                            )}
                            {n.story?.mediaUrl && (
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-[#F0F0F0] shadow-sm relative shrink-0">
                                    {n.story.mediaType === 'video' ? (
                                        <video src={n.story.mediaUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={n.story.mediaUrl} alt="story" className="w-full h-full object-cover" />
                                    )}
                                </div>
                            )}

                            <div className='flex flex-col items-end justify-between h-full py-1 ml-1'>
                                <button
                                    onClick={(e) => handleDeleteNotification(e, n._id)}
                                    className='opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all'
                                    title="Delete notification"
                                >
                                    <Trash2 size={16} strokeWidth={2} />
                                </button>
                                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] shadow-sm shrink-0 mb-1"></div>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
