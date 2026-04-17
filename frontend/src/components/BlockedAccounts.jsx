import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser } from '@/redux/authSlice';
import { Loader2, UserX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BlockedAccounts = () => {
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUnblockConfirmOpen, setIsUnblockConfirmOpen] = useState(false);
    const [userToUnblock, setUserToUnblock] = useState(null);
    const [isUnblocking, setIsUnblocking] = useState(false);
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/user/blocked-users');
            if (res.data.success) {
                setBlockedUsers(res.data.blockedUsers);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load blocked accounts");
        } finally {
            setLoading(false);
        }
    };

    const handleUnblockRequest = (user) => {
        setUserToUnblock(user);
        setIsUnblockConfirmOpen(true);
    };

    const confirmUnblock = async () => {
        if (!userToUnblock) return;
        setIsUnblocking(true); // Start loading
        try {
            const res = await api.post(`/user/unblock/${userToUnblock._id}`);
            if (res.data.success) {
                toast.success(res.data.message);
                setBlockedUsers(prev => prev.filter(u => u && u._id !== userToUnblock._id));
                
                // Update local auth user state (remove from blockedUsers)
                const updatedAuthUser = {
                    ...user,
                    blockedUsers: (user.blockedUsers || []).filter(id => (id._id || id).toString() !== userToUnblock._id.toString())
                };
                dispatch(setAuthUser(updatedAuthUser));
                
                setIsUnblockConfirmOpen(false);
                setUserToUnblock(null);
            }
        } catch (error) {
            console.error("Unblock Error:", error);
            toast.error(error.response?.data?.message || "Failed to unblock user");
        } finally {
            setIsUnblocking(false); // End loading
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-20'>
                <Loader2 className='animate-spin text-gray-300' size={40} />
            </div>
        );
    }

    return (
        <div className='p-4 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-500'>
            <div className='mb-8 flex items-center gap-4'>
                <button 
                    onClick={() => navigate(-1)}
                    className='md:hidden p-2 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-all'
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className='text-2xl font-bold text-gray-900'>Blocked Accounts</h1>
                    <p className='text-gray-500 text-sm'>Manage the people you've blocked.</p>
                </div>
            </div>

            {blockedUsers.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200'>
                    <div className='w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm'>
                        <UserX size={32} className='text-gray-300' />
                    </div>
                    <p className='text-gray-500 font-medium'>You haven't blocked anyone yet.</p>
                </div>
            ) : (
                <div className='flex flex-col gap-4'>
                    {blockedUsers.map((u) => (
                        <div key={u._id} className='flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all'>
                            <div className='flex items-center gap-4'>
                                <Avatar className='w-12 h-12'>
                                    <AvatarImage src={u.profilePicture} className="object-cover" />
                                    <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className='flex flex-col'>
                                    <span className='font-bold text-gray-900'>@{u.username}</span>
                                    <span className='text-xs text-gray-500'>{u.fullName || 'User'}</span>
                                </div>
                            </div>
                            <Button
                                onClick={() => handleUnblockRequest(u)}
                                className='bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] font-bold h-9 px-6 rounded-xl'
                            >
                                Unblock
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Unblock Confirmation Dialog */}
            <Dialog open={isUnblockConfirmOpen} onOpenChange={setIsUnblockConfirmOpen}>
                <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
                    <DialogTitle className="sr-only">Unblock Confirmation</DialogTitle>
                    <DialogDescription className="sr-only">Confirm if you want to unblock {userToUnblock?.username}</DialogDescription>
                    <div className="flex flex-col items-center pt-8 pb-6 px-8 border-b border-[#efefef]">
                        <h2 className="text-[18px] font-bold text-[#262626] mb-4">Unblock {userToUnblock?.username}?</h2>
                        <p className="text-[14px] text-center text-gray-500 leading-relaxed">
                            They will be able to find your profile and see your posts again.
                        </p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Button
                            variant="ghost"
                            onClick={confirmUnblock}
                            disabled={isUnblocking}
                            className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors disabled:opacity-50"
                        >
                            {isUnblocking ? "Unblocking..." : "Unblock"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setIsUnblockConfirmOpen(false)}
                            className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] rounded-none h-auto transition-colors"
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BlockedAccounts;
