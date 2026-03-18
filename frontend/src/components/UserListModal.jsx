import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthUser } from '@/redux/authSlice';
import api from '@/api';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

const UserListItem = ({ user: targetUser, currentAuthUser, onClose }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const isFollowing = currentAuthUser?.following?.some(u => (u._id || u) === targetUser._id);
    const hasRequested = targetUser.followRequests?.includes(currentAuthUser?._id);
    const isFollower = currentAuthUser?.followers?.some(u => (u._id || u) === targetUser._id);

    let buttonState = 'Follow';
    if (isFollowing) buttonState = 'Following';
    else if (hasRequested) buttonState = 'Requested';
    else if (isFollower) buttonState = 'Follow Back';

    const handleFollowUnfollow = async (e) => {
        e.stopPropagation();
        
        if (buttonState === 'Following') {
            const result = await Swal.fire({
                title: 'Unfollow?',
                text: `Are you sure you want to unfollow @${targetUser.username}?`,
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

        try {
            const res = await api.post(`/user/followorunfollow/${targetUser._id}`, {});
            if (res.data.success) {
                let updatedFollowing = [...(currentAuthUser.following || [])];
                if (res.data.status === 'followed') {
                    updatedFollowing.push(targetUser._id);
                } else if (res.data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(id => (id._id || id) !== targetUser._id);
                }
                dispatch(setAuthUser({ ...currentAuthUser, following: updatedFollowing }));
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    return (
        <div className="flex items-center justify-between py-2">
            <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                    navigate(`/profile/${targetUser._id}`);
                    onClose();
                }}
            >
                <Avatar className="w-10 h-10 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
                    <AvatarImage src={targetUser.profilePicture} className="object-cover" />
                    <AvatarFallback className="bg-gray-100 font-bold text-gray-400">
                        {targetUser.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-gray-900 group-hover:underline">{targetUser.username}</span>
                    <span className="text-[12px] text-gray-500 font-medium truncate max-w-[150px]">{targetUser.bio || 'Metagram user'}</span>
                </div>
            </div>

            {currentAuthUser?._id !== targetUser._id && (
                <button
                    onClick={handleFollowUnfollow}
                    className={`text-[12px] font-bold px-4 py-1.5 rounded-[8px] transition-all active:scale-95 ${buttonState === 'Following' || buttonState === 'Requested'
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                        }`}
                >
                    {buttonState}
                </button>
            )}
        </div>
    );
};

const UserListModal = ({ isOpen, onClose, title, users }) => {
    const navigate = useNavigate();
    const { user: currentAuthUser } = useSelector(store => store.auth);

    return (
        <Dialog open={isOpen} onOpenChange={setOpen => !setOpen && onClose()}>
            <DialogContent className="max-w-md sm:rounded-[20px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <div className="w-10" /> {/* Spacer */}
                    <div>
                        <DialogTitle className="text-center font-black text-sm uppercase tracking-widest text-gray-800">{title}</DialogTitle>
                        <DialogDescription className="sr-only">List of {title.toLowerCase()}</DialogDescription>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
                    >
                        <X size={20} />
                    </button>
                </DialogHeader>

                <div className="flex flex-col px-4 py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {users && users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30">
                            <span className="text-[12px] font-bold uppercase tracking-widest">No {title.toLowerCase()} yet</span>
                        </div>
                    ) : (
                        users && users.map(user => (
                            <UserListItem
                                key={user._id}
                                user={user}
                                currentAuthUser={currentAuthUser}
                                onClose={onClose}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserListModal;
