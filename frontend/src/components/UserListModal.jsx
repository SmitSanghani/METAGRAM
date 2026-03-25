import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthUser, setUserProfile } from '@/redux/authSlice';
import api from '@/api';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const UserListItem = ({ user: targetUser, currentAuthUser, onClose, onUpdate }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(false);

    const targetId = String(targetUser?._id || targetUser);
    const isFollowing = currentAuthUser?.following?.some(u => String(u._id || u) === targetId);
    const isFollower = currentAuthUser?.followers?.some(u => String(u._id || u) === targetId) || (targetUser?.following?.some(u => String(u._id || u) === String(currentAuthUser?._id)));
    const hasRequested = targetUser?.followRequests?.some(id => String(id) === String(currentAuthUser?._id));

    let buttonState = 'Follow';
    if (isFollowing) buttonState = 'Following';
    else if (hasRequested) buttonState = 'Requested';
    else if (isFollower) buttonState = 'Follow Back';

    const handleFollowUnfollow = async (e) => {
        e.stopPropagation();
        if (loading) return;

        const currentButtonState = buttonState;

        if (currentButtonState === 'Following') {
            onClose(); // Auto-close background modal immediately
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
                    container: 'z-[99999]',
                    popup: 'rounded-[24px]',
                    confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-red-600 transition-colors !cursor-pointer',
                    cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-400 transition-colors !cursor-pointer'
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

        setLoading(true);
        try {
            const res = await api.post(`/user/followorunfollow/${targetId}`, {});
            if (res.data.success) {
                // Call the unified update handler provided by the parent
                onUpdate(targetUser, res.data.status, res.data);
                const actionVerb = res.data.status === 'followed' ? 'Followed' : 'Unfollowed';
                toast.success(`${actionVerb} @${targetUser.username} successfully`);
            }
        } catch (error) {
            console.error("Follow/Unfollow error:", error);
            toast.error(error.response?.data?.message || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-2">
            <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                    navigate(`/profile/${targetId}`);
                    onClose();
                }}
            >
                <Avatar className="w-10 h-10 border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
                    <AvatarImage src={targetUser.profilePicture || null} className="object-cover" />
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
                    disabled={loading}
                    className={`text-[12px] font-bold px-4 py-1.5 rounded-[8px] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 min-w-[100px] ${buttonState === 'Following' || buttonState === 'Requested'
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-transparent'
                        : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                    {buttonState}
                </button>
            )}
        </div>
    );
};

const UserListModal = ({ isOpen, onClose, title, users }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user: currentAuthUser, userProfile } = useSelector(store => store.auth);

    const handleRelationshipUpdateInModal = (targetUser, status, resData) => {
        // 1. Update Auth User (Current User's Following list)
        let updatedFollowing = [...(currentAuthUser.following || [])];
        const targetIdStr = String(targetUser._id);

        if (status === 'followed') {
            if (!updatedFollowing.some(u => String(u._id || u) === targetIdStr)) {
                updatedFollowing.push(targetUser);
            }
        } else if (status === 'unfollowed') {
            updatedFollowing = updatedFollowing.filter(u => String(u._id || u) !== targetIdStr);
        }
        dispatch(setAuthUser({ ...currentAuthUser, following: updatedFollowing }));

        // 2. If we are on a profile page, sync with userProfile state
        if (userProfile) {
            // Case A: We followed/unfollowed the person whose profile we are on
            if (String(userProfile._id) === targetIdStr) {
                let updatedFollowers = [...(userProfile.followers || [])];
                const myIdStr = String(currentAuthUser._id);

                if (status === 'followed') {
                    if (!updatedFollowers.some(u => String(u._id || u) === myIdStr)) updatedFollowers.push(currentAuthUser);
                } else if (status === 'unfollowed') {
                    updatedFollowers = updatedFollowers.filter(u => String(u._id || u) !== myIdStr);
                }

                dispatch(setUserProfile({ ...userProfile, followers: updatedFollowers }));
            }
            
            // Case B: We are on our OWN profile and followed/unfollowed someone from followers/following modal
            if (String(userProfile._id) === String(currentAuthUser._id)) {
                dispatch(setUserProfile({ ...userProfile, following: updatedFollowing }));
            }
        }
    };

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
                        users && users.map((user, index) => (
                            <UserListItem
                                key={user?._id || user || index}
                                user={user}
                                currentAuthUser={currentAuthUser}
                                onClose={onClose}
                                onUpdate={handleRelationshipUpdateInModal}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserListModal;
