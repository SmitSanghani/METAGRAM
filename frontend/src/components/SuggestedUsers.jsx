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

        const isCurrentlyFollowing = user?.following?.some(u => String(u._id || u) === String(targetUserId));
        if (isCurrentlyFollowing) {
            setIsSeeAllOpen(false); // Close modal if open
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
                    container: 'z-[99999]',
                    popup: 'rounded-[24px]',
                    confirmButton: 'rounded-xl px-4 py-2 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-red-600 transition-colors !cursor-pointer',
                    cancelButton: 'rounded-xl px-4 py-2 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-gray-400 transition-colors !cursor-pointer'
                },
                didRender: () => {
                    const confirmBtn = Swal.getConfirmButton();
                    const cancelBtn = Swal.getCancelButton();
                    if (confirmBtn) confirmBtn.style.cursor = 'pointer';
                    if (cancelBtn) cancelBtn.style.cursor = 'pointer';
                }
            });

            if (!result.isConfirmed) return;
        }

        setPendingId(targetUserId);

        try {
            const res = await api.post(`/user/followorunfollow/${targetUserId}`, {});
            if (res.data.success) {
                let updatedFollowing = [...(user.following || [])];
                const targetIdStr = String(targetUserId);

                if (res.data.status === 'followed') {
                    const targetUserInList = suggestedUsers.find(u => String(u._id) === targetIdStr);
                    if (!updatedFollowing.some(u => String(u._id || u) === targetIdStr)) {
                        updatedFollowing.push(targetUserInList);
                    }
                    toast.success(`Followed @${targetUserInList?.username || 'user'} successfully`);
                } else if (res.data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(u => String(u._id || u) !== targetIdStr);
                    const targetUserInList = suggestedUsers.find(u => String(u._id) === targetIdStr);
                    toast.success(`Unfollowed @${targetUserInList?.username || 'user'} successfully`);
                } else if (res.data.status === 'requested') {
                    const targetUser = suggestedUsers.find(u => String(u._id) === targetIdStr);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: [...(targetUser.followRequests || []), String(user._id)] }
                        }));
                    }
                    toast.success("Follow request sent");
                } else if (res.data.status === 'canceled') {
                    const targetUser = suggestedUsers.find(u => String(u._id) === targetIdStr);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: (targetUser.followRequests || []).filter(id => String(id) !== String(user._id)) }
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
                    topSuggestions.map((suggestedUser, index) => {
                        const isFollowing = user?.following?.some(u => String(u._id || u) === String(suggestedUser?._id));
                        const isFollower = user?.followers?.some(u => String(u._id || u) === String(suggestedUser?._id)) || suggestedUser?.following?.some(u => String(u._id || u) === String(user?._id));
                        const hasRequested = suggestedUser?.followRequests?.some(id => String(id) === String(user?._id));

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
                                key={suggestedUser?._id || index}
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