import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import api from '@/api';
import { toast } from 'sonner';
import { setAuthUser, updateSuggestedUser } from '@/redux/authSlice';
import Swal from 'sweetalert2';
import { Loader2 } from 'lucide-react';
import UserListModal from './UserListModal';

const SuggestedUsers = () => {
    const { suggestedUsers = [], user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const [pendingId, setPendingId] = useState(null);
    const [isSeeAllOpen, setIsSeeAllOpen] = useState(false);

    const handleFollowUnfollow = async (targetUserId) => {
        if (pendingId) return;

        const isCurrentlyFollowing = user?.following?.includes(targetUserId);
        if (isCurrentlyFollowing) {
            const result = await Swal.fire({
                title: 'Unfollow?',
                text: "Are you sure you want to unfollow this user?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'Unfollow',
                background: '#ffffff',
                borderRadius: '24px',
                customClass: {
                    popup: 'rounded-[24px]',
                    confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                    cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
                }
            });

            if (!result.isConfirmed) return;
        }

        setPendingId(targetUserId);

        try {
            const res = await api.post(`/user/followorunfollow/${targetUserId}`, {});
            if (res.data.success) {
                let updatedFollowing = [...(user.following || [])];

                if (res.data.status === 'followed') {
                    updatedFollowing.push(targetUserId);
                    toast.success(`Following ${res.data.user?.username || 'user'}`);
                } else if (res.data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(id => id !== targetUserId);
                    toast.success(`Unfollowed ${res.data.user?.username || 'user'}`);
                } else if (res.data.status === 'requested') {
                    const targetUser = suggestedUsers.find(u => u._id === targetUserId);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: [...(targetUser.followRequests || []), user._id] }
                        }));
                    }
                    toast.success("Follow request sent");
                } else if (res.data.status === 'canceled') {
                    const targetUser = suggestedUsers.find(u => u._id === targetUserId);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: (targetUser.followRequests || []).filter(id => id !== user._id) }
                        }));
                    }
                    toast.success("Follow request canceled");
                }

                dispatch(setAuthUser({ ...user, following: updatedFollowing }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to action');
        } finally {
            setPendingId(null);
        }
    };

    // Top 5 suggestions only
    const topSuggestions = (suggestedUsers || []).slice(0, 5);

    return (
        <div className='flex flex-col gap-4'>
            {/* Header */}
            <div className='flex items-center justify-between px-1 mb-2'>
                <h1 className='font-bold text-[14px] text-gray-400 tracking-tight'>Suggested for you</h1>
                <span 
                    onClick={() => setIsSeeAllOpen(true)}
                    className='text-[12px] font-bold text-gray-900 hover:text-gray-500 cursor-pointer transition-colors'
                >
                    See All
                </span>
            </div>

            {/* Users List */}
            <div className='flex flex-col gap-3'>
                {
                    topSuggestions.map((suggestedUser) => {
                        const isFollowing = user?.following?.includes(suggestedUser?._id);
                        const isFollower = user?.followers?.includes(suggestedUser?._id) || suggestedUser?.following?.includes(user?._id);
                        const hasRequested = suggestedUser?.followRequests?.includes(user?._id);

                        let buttonState = 'Follow';
                        let buttonColor = 'text-[#3b82f6]';

                        if (isFollowing) {
                            buttonState = 'Following';
                            buttonColor = 'text-gray-400';
                        } else if (hasRequested) {
                            buttonState = 'Requested';
                            buttonColor = 'text-gray-300';
                        } else if (isFollower) {
                            buttonState = 'Follow Back';
                            buttonColor = 'text-[#3b82f6]';
                        }

                        const isPending = pendingId === suggestedUser._id;

                        return (
                            <div
                                key={suggestedUser._id}
                                className='flex items-center justify-between py-1 px-1'
                            >
                                <div className='flex items-center gap-3'>
                                    <Link to={`/profile/${suggestedUser?._id}`}>
                                        <div className="p-[1.5px] rounded-full ring-1 ring-gray-100 cursor-pointer">
                                            <Avatar className="w-[32px] h-[32px]">
                                                <AvatarImage src={suggestedUser?.profilePicture} alt="user_image" className="object-cover" />
                                                <AvatarFallback className={cn("font-bold text-xs uppercase", getAvatarColor(suggestedUser?.username))}>
                                                    {suggestedUser?.username?.charAt(0)?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </Link>

                                    <div className='flex flex-col'>
                                        <h1 className='font-bold text-[13px] text-gray-900 hover:text-[#3b82f6] cursor-pointer leading-tight'>
                                            <Link to={`/profile/${suggestedUser?._id}`}>
                                                {suggestedUser?.username}
                                            </Link>
                                        </h1>
                                        <span className='text-gray-400 text-[11px] font-medium leading-none mt-1'>
                                            {isFollower ? 'Follows you' : 'Suggested for you'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleFollowUnfollow(suggestedUser?._id)}
                                    disabled={isPending}
                                    className={`text-[12px] font-bold hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1 ${buttonColor} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {buttonState}
                                </button>
                            </div>
                        )
                    })
                }
            </div>

            {topSuggestions.length === 0 && (
                <div className="py-4 text-center">
                    <span className="text-[13px] text-gray-300">No suggestions at the moment</span>
                </div>
            )}

            <UserListModal 
                isOpen={isSeeAllOpen}
                onClose={() => setIsSeeAllOpen(false)}
                title="Suggested"
                users={suggestedUsers}
            />
        </div>
    )
}

export default SuggestedUsers