import React, { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Loader2, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch, useSelector } from 'react-redux';
import { addReel } from '@/redux/reelSlice';

const ReelUploadModal = ({ open, setOpen }) => {
    const videoRef = useRef();
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState("");
    const [videoPreview, setVideoPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [allowComments, setAllowComments] = useState(true);
    const [allowLikes, setAllowLikes] = useState(true);
    const [allowSave, setAllowSave] = useState(true);
    const [allowShare, setAllowShare] = useState(true);
    const { user } = useSelector((store) => store.auth);
    const dispatch = useDispatch();

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                return toast.error("Please select a valid video file.");
            }
            setFile(file);
            const previewUrl = URL.createObjectURL(file);
            setVideoPreview(previewUrl);
        }
    }

    const uploadReelHandler = async () => {
        if (!file) return toast.error("Please select a video");

        const formData = new FormData();
        formData.append("caption", caption);
        formData.append("video", file);
        formData.append("allowComments", allowComments);
        formData.append("allowLikes", allowLikes);
        formData.append("allowSave", allowSave);
        formData.append("allowShare", allowShare);

        try {
            setLoading(true);
            const res = await api.post("/reels/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.success) {
                dispatch(addReel(res.data.reel));
                toast.success(res.data.message);
                setOpen(false);
                setFile(null);
                setCaption("");
                setVideoPreview("");
                setAllowComments(true);
                setAllowLikes(true);
                setAllowSave(true);
                setAllowShare(true);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const Toggle = ({ active, set, label }) => (
        <div className="flex items-center justify-between py-2 border-t border-gray-50 mt-1">
            <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">{label}</span>
            <div
                onClick={() => set(!active)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${active ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-white rounded-[32px] p-0 border-none shadow-2xl overflow-hidden max-w-sm max-h-[95vh] flex flex-col">
                <DialogHeader className='relative flex-none items-center justify-center py-5 border-b border-[#efefef] m-0 bg-white'>
                    <h2 className='text-center font-black text-[14px] text-[#262626] uppercase tracking-widest'>Create new reel</h2>
                    {videoPreview && (
                        <Button variant="ghost" className="absolute right-4 p-2 h-auto rounded-full hover:bg-gray-50" onClick={() => { setVideoPreview(""); setFile(null); }}>
                            <X size={18} />
                        </Button>
                    )}
                </DialogHeader>

                <div className='p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1 bg-white'>
                    <div className='flex gap-3 items-center'>
                        <Avatar className="w-10 h-10 border-2 border-indigo-50 shadow-sm">
                            <AvatarImage src={user?.profilePicture} alt="img" className="object-cover" />
                            <AvatarFallback className="bg-indigo-50 text-indigo-400 font-black">{user?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h1 className='font-black text-[14px] text-[#262626]'>{user?.username}</h1>
                    </div>

                    <Textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="focus-visible:ring-0 border-none bg-indigo-50/10 hover:bg-indigo-50/20 p-4 text-[14px] resize-none min-h-[100px] placeholder:text-gray-400 rounded-2xl transition-colors"
                        placeholder="Write a caption for your reel..."
                    />

                    {videoPreview ? (
                        <div className='w-full aspect-[9/16] flex items-center justify-center rounded-[24px] overflow-hidden bg-black relative group shadow-lg'>
                            <video src={videoPreview} controls className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div
                            onClick={() => videoRef.current.click()}
                            className="w-full h-[280px] border-2 border-dashed border-gray-200 rounded-[28px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-400 p-8 text-center transition-all bg-gray-50/50 group"
                        >
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-50 group-hover:scale-110 transition-transform">
                                <Video className="text-indigo-400" size={32} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-[#262626] font-black text-[16px]">Upload Reel</h3>
                                <p className="text-gray-400 text-xs mt-1 font-medium leading-relaxed">Vertical videos (9:16) work best.</p>
                            </div>
                        </div>
                    )}

                    <input ref={videoRef} type="file" className='hidden' accept="video/*" onChange={fileChangeHandler} />

                    <div className="space-y-1">
                        <Toggle active={allowComments} set={setAllowComments} label="Allow Comments" />
                        <Toggle active={allowLikes} set={setAllowLikes} label="Allow Likes" />
                        <Toggle active={allowSave} set={setAllowSave} label="Allow Saving" />
                        <Toggle active={allowShare} set={setAllowShare} label="Allow Sharing" />
                    </div>

                    <Button
                        disabled={loading || !file}
                        onClick={uploadReelHandler}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12 rounded-full mt-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:bg-indigo-100 disabled:shadow-none"
                    >
                        {loading ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' /> Sharing...</> : 'Publish Reel'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReelUploadModal;
