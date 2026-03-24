import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, Music, MoreHorizontal, UserPlus, Play, Pause, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useDispatch, useSelector } from 'react-redux';
import api from '@/api';
import { updateReelLikes, incrementReelViews, deleteReel } from '@/redux/reelSlice';
import ReelCommentsModal from './ReelCommentsModal';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ShareReelModal from './ShareReelModal';
import { useNavigate } from 'react-router-dom';
import UserListModal from './UserListModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { removeUserProfileReel } from '@/redux/authSlice';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { updateReel } from '@/redux/reelSlice';
import Swal from 'sweetalert2';

const ReelCard = ({ reel, isActive, isGlobalMuted, setIsGlobalMuted, onVideoEnd }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);

    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const isLiked = reel.likes?.includes(user?._id);
    const [showComments, setShowComments] = useState(false);
    const [likeAnimation, setLikeAnimation] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [showLikers, setShowLikers] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        if (reel.savedBy?.includes(user?._id)) setIsSaved(true);
    }, [reel, user]);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.play().catch(e => console.log(e));
            setIsPlaying(true);

            // View Tracking - 40% rule
            let viewCounted = false;
            const video = videoRef.current;
            const handleTimeUpdate = () => {
                if (video.duration > 0) {
                    setProgress((video.currentTime / video.duration) * 100);
                    if (!viewCounted && (video.currentTime / video.duration) >= 0.4) {
                        viewCounted = true;
                        dispatch(incrementReelViews(reel._id));
                        api.post(`/reels/view/${reel._id}`, {});
                    }
                }
            };

            video.addEventListener('timeupdate', handleTimeUpdate);
            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
            };
        } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive, reel._id, dispatch]);

    const handleLike = async () => {
        if (!reel.allowLikes && user?._id !== reel.author?._id) return;

        if (!isLiked) setLikeAnimation(true);
        setTimeout(() => setLikeAnimation(false), 1000);

        // Optimistic UI update
        const newLikes = isLiked
            ? reel.likes.filter(id => id !== user?._id)
            : [...reel.likes, user?._id];
        dispatch(updateReelLikes({ reelId: reel._id, likes: newLikes }));

        try {
            await api.post(`/reels/like/${reel._id}`, {});
        } catch (error) {
            // Revert on error
            const revertedLikes = isLiked
                ? [...reel.likes, user?._id]
                : reel.likes.filter(id => id !== user?._id);
            dispatch(updateReelLikes({ reelId: reel._id, likes: revertedLikes }));
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!reel.allowSave && user?._id !== reel.author?._id) return;
        setIsSaved(!isSaved);
        try {
            await api.post(`/reels/save/${reel._id}`, {});
        } catch (error) {
            setIsSaved(!isSaved);
            console.error(error);
        }
    };

    const handleVideoClick = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleDeleteReel = async () => {
        const result = await Swal.fire({
            title: 'Delete Reel?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, delete it!',
            background: '#ffffff',
            borderRadius: '24px',
            allowOutsideClick: false, // Prevent accidental dismissal
            customClass: {
                container: 'z-[9999]', // Ensure it's above everything
                popup: 'rounded-[24px]',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
            }
        });

        if (!result.isConfirmed) return;
        try {
            const res = await api.delete(`/reels/delete/${reel._id}`);
            if (res.data.success) {
                toast.success(res.data.message);
                dispatch(deleteReel(reel._id));
                dispatch(removeUserProfileReel(reel._id));
                setShowEditModal(false);
            }
        } catch (error) {
            toast.error("Failed to delete reel");
        }
    };

    return (
        <div className="relative h-full w-full bg-black group overflow-hidden shadow-2xl">
            {/* Video Player */}
            <video
                ref={videoRef}
                src={reel.videoUrl}
                poster={reel.videoUrl?.replace(/\.[^/.]+$/, ".jpg")}
                className="w-full h-full object-cover cursor-pointer transition-opacity duration-300"
                muted={isGlobalMuted}
                onClick={handleVideoClick}
                onEnded={onVideoEnd}
                playsInline
            />

            {/* Double Tap Heart Animation */}
            <AnimatePresence>
                {likeAnimation && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                    >
                        <Heart size={100} className="text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Bar bottom - Ultra Smooth */}
            <div className="absolute bottom-0 left-0 w-full h-[3.5px] bg-white/20 z-50 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-[#E2FF4E] to-lime-300 shadow-[0_0_15px_#E2FF4E] transition-all duration-[400ms] ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Interaction Layer */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Side Buttons - METAGRAM Style */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-4 items-center z-30 pointer-events-auto">
                {(reel.allowLikes || user?._id === reel.author?._id) && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={handleLike}
                            disabled={!reel.allowLikes && user?._id !== reel.author?._id}
                            className={`w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-75 shadow-xl ${(!reel.allowLikes && user?._id !== reel.author?._id) ? 'opacity-30' : ''}`}
                        >
                            <Heart
                                size={20}
                                className={`transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`}
                                strokeWidth={2.5}
                            />
                        </button>
                        {reel.allowLikes && (
                            <span
                                onClick={() => setShowLikers(true)}
                                className="text-white text-[11px] font-black drop-shadow-md tracking-widest cursor-pointer hover:underline"
                            >
                                {reel.likes?.length || 0}
                            </span>
                        )}
                    </div>
                )}

                {(reel.allowComments || user?._id === reel.author?._id) && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => setShowComments(true)}
                            disabled={!reel.allowComments && user?._id !== reel.author?._id}
                            className={`w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-75 shadow-xl ${(!reel.allowComments && user?._id !== reel.author?._id) ? 'opacity-30' : ''}`}
                        >
                            <MessageCircle size={20} className="text-white" strokeWidth={2.5} />
                        </button>
                        {reel.allowComments && (
                            <span className="text-white text-[11px] font-black drop-shadow-md tracking-widest">{reel.comments?.length || 0}</span>
                        )}
                    </div>
                )}

                {(reel.allowShare || user?._id === reel.author?._id) && (
                    <button
                        onClick={() => setShareModalOpen(true)}
                        disabled={!reel.allowShare && user?._id !== reel.author?._id}
                        className={`w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-75 shadow-xl ${(!reel.allowShare && user?._id !== reel.author?._id) ? 'opacity-30' : ''}`}
                    >
                        <Send size={18} className="text-white -rotate-12 ml-0.5" strokeWidth={2.5} />
                    </button>
                )}

                {(reel.allowSave || user?._id === reel.author?._id) && (
                    <button
                        onClick={handleSave}
                        disabled={!reel.allowSave && user?._id !== reel.author?._id}
                        className={`w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-75 shadow-xl ${(!reel.allowSave && user?._id !== reel.author?._id) ? 'opacity-30' : ''}`}
                    >
                        <Bookmark size={18} className={`transition-all ${isSaved ? 'fill-white text-white scale-110' : 'text-white'}`} strokeWidth={2.5} />
                    </button>
                )}

                {user?._id === reel.author?._id ? (
                    <div className="flex flex-col items-center gap-2 mt-1">
                        <button 
                            onClick={handleDeleteReel}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-red-500/20 transition-all active:scale-75 shadow-xl text-red-500/80 hover:text-red-500"
                        >
                            <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setShowEditModal(true)} className="p-2 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white">
                            <MoreHorizontal size={22} className="rotate-90" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsGlobalMuted(!isGlobalMuted)} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-white/10 transition-all text-white">
                        {isGlobalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                )}

                {/* Music Disc Icon Placeholder like image */}
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center mt-2 overflow-hidden shadow-lg animate-spin-slow">
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-800 p-2">
                        <Music className="text-white/60 w-full h-full" />
                    </div>
                </div>
            </div>

            {/* Bottom Content Info */}
            <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col gap-4 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div onClick={() => navigate(`/profile/${reel.author?._id}`)} className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#E2FF4E] to-blue-400 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                        <Avatar className="w-10 h-10 border-2 border-black/10">
                            <AvatarImage src={reel.author?.profilePicture} className="object-cover" />
                            <AvatarFallback className="font-black text-xs bg-indigo-50 text-indigo-400">{reel.author?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <span onClick={() => navigate(`/profile/${reel.author?._id}`)} className="text-white font-black text-[15px] tracking-tight drop-shadow-xl cursor-pointer hover:underline">{reel.author?.username}</span>
                    {user?._id !== reel.author?._id && (
                        <Button variant="outline" className="h-[28px] text-[10px] font-black uppercase text-white bg-white/10 border-white/20 px-4 rounded-full backdrop-blur-xl hover:bg-white/20 transition-all active:scale-95 tracking-[0.1em]">FOLLOW</Button>
                    )}
                </div>

                <div className="relative group max-w-[85%]">
                    <p className="text-white/95 text-[14px] font-medium leading-[1.6] drop-shadow-md line-clamp-2 hover:line-clamp-none transition-all pointer-events-auto">
                        {reel.caption}
                    </p>
                </div>

                <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5 backdrop-blur-2xl group cursor-pointer hover:bg-white/10 transition-all">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                            <Music className="text-white/60" size={12} />
                        </motion.div>
                        <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.15em] truncate max-w-[150px]">
                            {reel.author?.username} • Original Audio
                        </span>
                    </div>

                    {/* View Count Badge - Lime color like image */}
                    <div className='bg-[#E2FF4E] px-2.5 py-1 rounded-[4px] shadow-[0_4px_12px_rgba(226,255,78,0.3)]'>
                        <span className="text-black text-[9px] font-black tracking-[0.1em] uppercase whitespace-nowrap">{reel.viewsCount} VIEWS</span>
                    </div>
                </div>
            </div>

            {/* Modal Components */}
            {showComments && (
                <ReelCommentsModal
                    reelId={reel._id}
                    comments={reel.comments || []}
                    open={showComments}
                    setOpen={setShowComments}
                />
            )}

            {shareModalOpen && (
                <ShareReelModal
                    open={shareModalOpen}
                    setOpen={setShareModalOpen}
                    reel={reel}
                />
            )}

            {showLikers && (
                <UserListModal
                    isOpen={showLikers}
                    onClose={() => setShowLikers(false)}
                    title="Likes"
                    users={reel?.likes}
                />
            )}
            {showEditModal && (
                <EditReelModal
                    reel={reel}
                    open={showEditModal}
                    setOpen={setShowEditModal}
                    handleDelete={handleDeleteReel}
                />
            )}
        </div>
    );
}

const EditReelModal = ({ reel, open, setOpen, handleDelete }) => {
    const dispatch = useDispatch();
    const [caption, setCaption] = useState(reel.caption);
    const [allowLikes, setAllowLikes] = useState(reel.allowLikes);
    const [allowComments, setAllowComments] = useState(reel.allowComments);
    const [allowShare, setAllowShare] = useState(reel.allowShare);
    const [allowSave, setAllowSave] = useState(reel.allowSave);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await api.put(`/reels/edit/${reel._id}`, {
                caption,
                allowLikes,
                allowComments,
                allowShare,
                allowSave
            });
            if (res.data.success) {
                toast.success(res.data.message);
                dispatch(updateReel(res.data.reel));
                setOpen(false);
            }
        } catch (error) {
            toast.error("Failed to update reel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-[15px] p-6 bg-white outline-none">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-center mb-4">Edit Reel</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="caption" className="font-bold text-gray-700 ml-1">Caption</Label>
                        <Textarea
                            id="caption"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 min-h-[100px] resize-none"
                            placeholder="Write a caption..."
                        />
                    </div>

                    <div className="grid gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between">
                            <Label className="cursor-pointer text-sm font-black text-gray-600">Allow Likes</Label>
                            <input
                                type="checkbox"
                                checked={allowLikes}
                                onChange={(e) => setAllowLikes(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="cursor-pointer text-sm font-black text-gray-600">Allow Comments</Label>
                            <input
                                type="checkbox"
                                checked={allowComments}
                                onChange={(e) => setAllowComments(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="cursor-pointer text-sm font-black text-gray-600">Allow Sharing</Label>
                            <input
                                type="checkbox"
                                checked={allowShare}
                                onChange={(e) => setAllowShare(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="cursor-pointer text-sm font-black text-gray-600">Allow Saving</Label>
                            <input
                                type="checkbox"
                                checked={allowSave}
                                onChange={(e) => setAllowSave(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                        onClick={handleDelete}
                        className="flex-1 py-3 px-4 rounded-xl font-black text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest text-[11px]"
                    >
                        Delete Reel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-100"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReelCard;
