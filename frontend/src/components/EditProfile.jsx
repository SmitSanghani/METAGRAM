import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';
import { Textarea } from './ui/textarea';
import api from '@/api';
import { toast } from 'sonner';
import { setAuthUser, setUserProfile } from '@/redux/authSlice';
import { Loader2, X } from 'lucide-react';

const EditProfile = ({ isOpen, onClose }) => {
    const { user, userProfile } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    const [bio, setBio] = useState(user?.bio || '');
    const [category, setCategory] = useState(user?.category || '');
    const [link, setLink] = useState(user?.link || '');
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(user?.profilePicture || '');
    const [loading, setLoading] = useState(false);

    const imageRef = useRef();

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('bio', bio);
        formData.append('category', category);
        formData.append('link', link);
        if (file) {
            formData.append('profilePicture', file);
        }

        try {
            setLoading(true);
            const res = await api.post('/user/profile/edit', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.data.success) {
                const updatedUser = {
                    ...user,
                    bio: res.data.user?.bio,
                    category: res.data.user?.category,
                    profilePicture: res.data.user?.profilePicture,
                    link: res.data.user?.link,
                };
                dispatch(setAuthUser(updatedUser));

                // Also update the currently viewed local profile if it's the same user
                if (userProfile?._id === user?._id) {
                    dispatch(setUserProfile({
                        ...userProfile,
                        bio: res.data.user?.bio,
                        category: res.data.user?.category,
                        profilePicture: res.data.user?.profilePicture,
                        link: res.data.user?.link,
                    }));
                }

                toast.success(res.data.message);
                onClose();
            }

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-[13px] p-0 border border-[#dbdbdb] shadow-2xl bg-white overflow-hidden">
                {/* Close Button UI */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#dbdbdb] hover:bg-gray-50 transition-all z-50 text-[#262626]"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                <DialogHeader className="pt-6 pb-4 border-b border-[#F0F0F0] shrink-0">
                    <h1 className="text-center font-bold text-[16px] text-[#262626]">Edit profile</h1>
                </DialogHeader>

                <form
                    onSubmit={submitHandler}
                    className="px-8 pt-2 pb-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh] custom-scrollbar"
                >
                    <div className="flex bg-[#fafafa] border border-[#efefef] rounded-[13px] p-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border border-gray-200">
                                <AvatarImage src={imagePreview} alt="profile" className="object-cover" />
                                <AvatarFallback className="bg-gray-100 text-gray-500 font-bold">{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-bold text-[14px] text-[#262626] leading-none mb-1">{user?.username}</span>
                                <span className="text-[#8e8e8e] text-[12px]">Manage your profile details</span>
                            </div>
                        </div>
                        <input ref={imageRef} type="file" className="hidden" onChange={fileChangeHandler} />
                        <button
                            type="button"
                            className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold py-1.5 px-3 rounded-[13px] text-[12px] transition-colors"
                            onClick={() => imageRef.current.click()}
                        >
                            Change photo
                        </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-[14px] text-[#262626] ml-0.5">Bio</label>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="focus-visible:ring-1 focus-visible:ring-gray-300 bg-white border-[#dbdbdb] rounded-[13px] resize-none min-h-[120px] p-4 text-[14px] text-[#262626] placeholder:text-gray-400 leading-normal"
                            placeholder="Share something about yourself..."
                            maxLength={150}
                        />
                        <div className="flex justify-end pr-1">
                            <span className="text-[10px] text-gray-400 font-medium">{bio.length}/150</span>
                        </div>
                    </div>

                    {/* Link Section */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-[14px] text-[#262626] ml-0.5">Link</label>
                        <input
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            className="w-full h-10 px-4 rounded-[13px] border border-[#dbdbdb] bg-white text-[14px] text-[#262626] focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
                            placeholder="Website link..."
                        />
                    </div>



                    <div className="pt-2 pb-6">
                        {loading ? (
                            <button disabled className="w-full bg-[#0095F6]/60 text-white font-bold h-11 rounded-[13px] flex items-center justify-center gap-2 cursor-not-allowed">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Updating...
                            </button>
                        ) : (
                            <button type="submit" className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold h-11 rounded-[13px] shadow-sm transition-all active:scale-[0.98]">
                                Save profile
                            </button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    );
};

export default EditProfile;
