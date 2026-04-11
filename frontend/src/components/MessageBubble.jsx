import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Reply, Trash2, Heart, Smile, X, Loader2, Play, FileText, Download, Pause, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { THEMES } from '@/utils/themes';

const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ url, isDark }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const current = audioRef.current.currentTime;
        const dur = audioRef.current.duration;
        setCurrentTime(current);
        if (dur) setProgress((current / dur) * 100);
    };

    const handleLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const handleSeek = (e) => {
        const val = parseFloat(e.target.value);
        const seekTime = (val / 100) * audioRef.current.duration;
        audioRef.current.currentTime = seekTime;
        setProgress(val);
    };

    return (
        <div className={`flex items-center gap-3 p-2 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50 border border-black/5 shadow-sm'} animate-in fade-in duration-500`}>
            <audio 
                ref={audioRef} 
                src={url} 
                onTimeUpdate={handleTimeUpdate} 
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
            />
            <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 shrink-0"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1 pr-1 min-w-0">
                <input 
                    type="range" 
                    value={progress || 0} 
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900/40 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-400 font-mono tracking-tight">
                   <span>{formatTime(currentTime)}</span>
                   <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

const MessageBubble = ({ msg, isSender, onReply, onDelete, onReact, onScrollTo, onStoryClick, onPostClick, isHighlighted, currentUser, otherUser }) => {
    const navigate = useNavigate();
    const [showReactions, setShowReactions] = useState(false);
    const [showReactionInfo, setShowReactionInfo] = useState(false);
    const [showSeen, setShowSeen] = useState(false); // Initially hidden
    const wasAlreadySeenRef = useRef(!!msg.seen); // Track if it was already seen on mount
    const pickerRef = useRef(null);
    const { selectedChatTheme } = useSelector(store => store.chat || {});
    const themeConfig = THEMES.find(t => t.id === selectedChatTheme?.id) || THEMES[0];

    useEffect(() => {
        if (msg.seen && !wasAlreadySeenRef.current) {
            setShowSeen(true);
            const timer = setTimeout(() => setShowSeen(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [msg.seen]);

    const x = useMotionValue(0);
    const replyOpacity = useTransform(x, isSender ? [-80, 0] : [0, 80], [1, 0]);
    const replyScale = useTransform(x, isSender ? [-80, 0] : [0, 80], [1, 0.5]);

    // Click outside listener for emoji picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowReactions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (msg.isDeleted) {
        return (
            <div className={`flex mb-4 ${isSender ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%] px-4 py-2 rounded-2xl text-[13px] italic text-gray-400 border border-gray-100 bg-white/50 backdrop-blur-sm">
                    Message unsent
                </div>
            </div>
        );
    }

    if (msg.messageType === 'system') {
        return (
            <div className="flex justify-center w-full my-4 px-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="bg-white/80 border border-black/5 px-6 py-1.5 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                    <span className="text-[12.5px] font-semibold text-[#8e8e8e] text-center lowercase first-letter:uppercase">
                        {msg.message}
                    </span>
                </div>
            </div>
        );
    }





    // Hide story_reaction messages from the SENDER's view — only the story owner should see it
    // Note: Re-enabled after user feedback "message hi nahi show ho raha he"
    /*
    if (msg.messageType === 'story_reaction' && isSender) {
        return null;
    }
    */

    const handleDragEnd = (_, info) => {
        if (!isSender && info.offset.x > 50) onReply(msg);
        else if (isSender && info.offset.x < -50) onReply(msg);
    };

    const reactionsList = ["❤️", "😂", "🔥", "👍", "😮", "😢"];
    
    // In group chats, otherUser is just one of many. We prefer msg.senderProfilePicture
    const senderData = typeof msg.senderId === 'object' ? msg.senderId : (
        otherUser?.isGroup ? 
        otherUser.participants.find(p => String(p._id || p) === String(msg.senderId?._id || msg.senderId)) : 
        (isSender ? currentUser : otherUser)
    );
    const senderProfile = msg.senderProfilePicture || senderData?.profilePicture;
    const senderName = msg.senderUsername || senderData?.username;

    return (
        <div id={`msg-${msg._id}`} className={`group flex flex-col ${msg.reactions?.length > 0 ? 'mb-8' : 'mb-4'} ${isSender ? 'items-end' : 'items-start'} transition-all duration-500`}>
            <div className={`flex items-end gap-1.5 max-w-[85%] ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`w-8 h-8 shrink-0 border shadow-sm mb-0.5 ${themeConfig.isDark ? 'border-white/20' : 'border-white'}`}>
                    <AvatarImage src={senderProfile} className="object-cover" />
                    <AvatarFallback className={`${themeConfig.isDark ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-500'} text-sm font-black uppercase`}>
                        {senderName?.charAt(0) || '?'}
                    </AvatarFallback>
                </Avatar>

                {/* Message Content Container */}
                <div className="relative flex flex-col">
                    {/* Sender Name in Group Chat - Positioned inside or top-left of the cluster */}
                    {otherUser?.isGroup && !isSender && (
                        <span className={`text-[10px] font-black mb-1 ml-1 uppercase tracking-tight ${themeConfig.isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {senderName}
                        </span>
                    )}

                    {/* Reply Preview inside bubble - Now Clickable */}
                    {msg.replyTo && (
                        <div
                            onClick={() => onScrollTo(msg.replyTo._id)}
                            className={`mb-[-15px] pb-5 pt-2.5 px-3.5 rounded-t-[20px] text-[12px] flex items-center gap-2 border-x border-t cursor-pointer hover:opacity-100 transition-all ${isSender 
                                ? 'bg-black/10 border-white/10 text-white/80' 
                                : `border-[#efefef] ${themeConfig.isDark ? 'bg-white/5 border-white/5 text-white/50' : 'bg-gray-100/80 text-gray-500'}`}`}
                        >
                            <div className="w-1 self-stretch bg-current opacity-20 rounded-full"></div>
                            <div className="truncate max-w-[200px]">
                                <span className="font-black block text-[9px] uppercase tracking-wider mb-0.5">
                                    Replying to {String(msg.replyTo.senderId) === String(currentUser?._id) ? "yourself" : (msg.replyTo.senderUsername || "them")}
                                </span>
                                <span className="italic">
                                    {msg.replyTo.message || (msg.replyTo.messageType === 'image' ? 'photo' : 'video')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Draggable Bubble with Highlight Motion */}
                    <motion.div
                        drag={msg.messageType === 'call_log' ? false : "x"}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDragEnd={handleDragEnd}
                        style={{ x }}
                        initial={false}
                        animate={isHighlighted ? {
                            scale: [1, 1.05, 1],
                            backgroundColor: isSender ? ["#4F46E5", "#818CF8", "#4F46E5"] : ["#ffffff", "#EEF2FF", "#ffffff"],
                            boxShadow: isHighlighted ? "0 0 25px rgba(79,70,229,0.5)" : "none"
                        } : {}}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className={`relative z-10 ${msg.messageType === 'call_log' ? 'p-4 rounded-[24px]' : 'px-4 py-2.5 rounded-[20px]'} text-[14.5px] leading-[1.4] transition-all duration-300 ${isSender
                            ? `${msg.messageType === 'call_log' ? (themeConfig.isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-gray-100 shadow-sm') : `${themeConfig.bubbleColor} ${themeConfig.textColor} rounded-br-sm shadow-sm`} backdrop-blur-sm`
                            : `${msg.messageType === 'call_log' ? (themeConfig.isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-gray-100 shadow-sm') : `${themeConfig.receivedColor} ${themeConfig.receivedTextColor} rounded-bl-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#efefef]/10`} backdrop-blur-sm`
                            } ${isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-2' : ''} ${msg.messageType !== 'call_log' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                        {msg.messageType === 'call_log' ? (
                            <div className="min-w-[200px]">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        (msg.callLog?.status === 'missed' || msg.callLog?.status === 'rejected') ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                                    }`}>
                                        {msg.callLog?.callType === 'video' ? (
                                            (msg.callLog?.status === 'missed' || msg.callLog?.status === 'rejected') ? <VideoOff size={22} /> : <Video size={22} />
                                        ) : (
                                            (msg.callLog?.status === 'missed' || msg.callLog?.status === 'rejected') ? <PhoneOff size={22} /> : <Phone size={22} />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h4 className={`text-[15px] font-black truncate ${themeConfig.isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {(msg.callLog?.callType === 'audio' || !msg.callLog?.callType) ? 'Audio Call' : 'Video Call'} {msg.callLog?.status === 'outgoing' ? '' : ((msg.callLog?.status === 'missed' || msg.callLog?.status === 'rejected') ? 'Missed' : 'Ended')}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 font-bold tracking-tight uppercase opacity-70">
                                            {msg.callLog?.status === 'outgoing' ? (isSender ? 'Outgoing' : 'Incoming') : ((msg.callLog?.status === 'missed' || msg.callLog?.status === 'rejected') ? 'No Answer' : (
                                                <>
                                                    {Math.floor(msg.callLog?.duration / 60)}:{(msg.callLog?.duration % 60).toString().padStart(2, '0')} 
                                                    <span className="mx-1.5 opacity-30">•</span>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            ))}
                                        </p>
                                    </div>
                                </div>
                                {msg.callLog?.recordingUrl && (
                                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                        <div className="flex flex-col gap-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Call Recording</p>
                                            <AudioPlayer url={msg.callLog.recordingUrl} isDark={themeConfig.isDark} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : msg.messageType === 'image' ? (
                            <div className="relative -mx-4 -my-2.5 overflow-hidden rounded-[20px]">
                                <img
                                    src={msg.mediaUrl}
                                    alt="media"
                                    className={`w-full max-w-[280px] h-auto object-cover transition-all ${msg.isLoading ? 'opacity-40 grayscale blur-[4px]' : 'hover:scale-105'}`}
                                    style={{ display: 'block' }}
                                />
                                {msg.isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full shadow-lg">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : msg.messageType === 'video' ? (
                            <div className="relative -mx-4 -my-2.5 overflow-hidden rounded-[20px]">
                                <video
                                    src={msg.mediaUrl}
                                    controls
                                    className={`w-full max-w-[280px] h-auto object-contain transition-all ${msg.isLoading ? 'opacity-40 blur-[4px]' : ''}`}
                                    style={{ display: 'block' }}
                                />
                                {msg.isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full shadow-lg">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : msg.messageType === 'story_reply' || msg.messageType === 'story_reaction' ? (
                            <div
                                className="flex flex-col gap-2 min-w-[180px] max-w-[240px] cursor-pointer"
                                onClick={() => {
                                    if (msg.storyId) {
                                        const storyOwner = isSender ? otherUser : currentUser;
                                        onStoryClick({ ...msg.storyId, userId: storyOwner });
                                    }
                                }}
                            >
                                <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-black/10 border border-white/20 shadow-inner group/story -mx-1 -mt-1">
                                    {msg.storyId?.mediaType === 'video' ? (
                                        <video src={msg.storyId?.mediaUrl} className="w-full h-full object-cover opacity-90" />
                                    ) : (
                                        <img src={msg.storyId?.mediaUrl} className="w-full h-full object-cover opacity-90" />
                                    )}
                                    <div className="absolute inset-0 bg-black/10 group-hover/story:bg-black/5 transition-all flex items-center justify-center">
                                        <span className="text-[9px] text-white font-black uppercase tracking-tighter bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Story</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0.5 mt-1">
                                    <span className={`text-[9px] font-black uppercase tracking-tighter opacity-60 ${isSender ? 'text-white' : 'text-inherit'}`}>
                                        {msg.messageType === 'story_reaction'
                                            ? (isSender ? "You reacted" : "Reacted")
                                            : (isSender ? "You replied" : "Replied")
                                        }
                                    </span>
                                    <span className="text-[13.5px] font-medium leading-tight">
                                        {msg.message}
                                    </span>
                                </div>
                            </div>
                        ) : msg.messageType === 'reel' ? (
                            <div
                                className="flex flex-col min-w-[200px] max-w-[260px] cursor-pointer group/reel shadow-xl rounded-[26px]"
                                onClick={() => navigate(`/reels/${msg.reelId?._id || ''}`)}
                            >
                                <div className={`bg-[#5B51D8] ${isSender ? '-mx-4 -my-2.5' : '-mx-4 -my-2.5'} p-4 rounded-[26px] overflow-hidden transition-all hover:brightness-110 active:scale-[0.98]`}>
                                    {/* Header Section */}
                                    <div className="flex items-center gap-2.5 mb-3 px-1">
                                        <Avatar className="w-8 h-8 border-2 border-white/50 shadow-md">
                                            <AvatarImage src={msg.reelId?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="bg-white text-[#5B51D8] font-black">{msg.reelId?.author?.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-white leading-none">
                                                {msg.reelId?.author?.username}
                                            </span>
                                            <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.1em] mt-0.5">
                                                @{msg.reelId?.author?.username?.toUpperCase()}'S REEL
                                            </span>
                                        </div>
                                    </div>

                                    {/* Video Container */}
                                    <div className="relative aspect-[10/13] rounded-2xl overflow-hidden bg-black shadow-inner ring-1 ring-white/10">
                                        <video
                                            src={msg.reelId?.videoUrl}
                                            className="w-full h-full object-cover"
                                            muted
                                            playsInline
                                            preload="metadata"
                                            disablePictureInPicture
                                        />

                                        {/* Realistic Play Overlay removed as per request */}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                                            <p className="text-[12px] text-white font-bold leading-tight drop-shadow-lg line-clamp-1">
                                                {msg.reelId?.caption || "Watch Reel"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : msg.messageType === 'post' ? (
                            <div
                                className="flex flex-col min-w-[200px] max-w-[260px] cursor-pointer group/post shadow-xl rounded-[26px]"
                                onClick={() => {
                                    if (msg.postId) {
                                        onPostClick(msg.postId);
                                    }
                                }}
                            >
                                <div className={`bg-[#F1F5F9] ${isSender ? '-mx-4 -my-2.5' : '-mx-4 -my-2.5'} p-4 rounded-[26px] overflow-hidden transition-all hover:brightness-110 active:scale-[0.98]`}>
                                    {/* Header Section */}
                                    <div className="flex items-center gap-2.5 mb-3 px-1">
                                        <Avatar className="w-8 h-8 border-2 border-white/50 shadow-md">
                                            <AvatarImage src={msg.postId?.author?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="bg-gray-200 text-gray-600 font-black">{msg.postId?.author?.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col text-gray-800">
                                            <span className="text-[11px] font-black leading-none">
                                                {msg.postId?.author?.username}
                                            </span>
                                            <span className="text-[9px] font-black opacity-50 uppercase tracking-[0.1em] mt-0.5">
                                                SHARED A POST
                                            </span>
                                        </div>
                                    </div>

                                    {/* Image Container */}
                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200 shadow-inner ring-1 ring-black/5">
                                        <img
                                            src={msg.postId?.image || (msg.postId?.images && msg.postId.images[0]) || msg.mediaUrl}
                                            className="w-full h-full object-cover"
                                            alt="post"
                                        />
                                        {msg.postId?.images?.length > 1 && (
                                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                            <p className="text-[12px] text-white font-bold leading-tight drop-shadow-lg line-clamp-1">
                                                {msg.postId?.caption || msg.message || "View Post"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                         ) : msg.messageType === 'file' ? (
                             isSender ? (
                                 <div className="flex items-center gap-3 p-2.5 rounded-2xl border bg-indigo-600/40 border-white/20 text-white w-full min-w-[180px] max-w-[240px] relative">
                                     <div className="shrink-0 p-2.5 rounded-xl flex items-center justify-center bg-white/10">
                                         <FileText size={20} className="text-white" />
                                     </div>
                                     <div className="flex flex-col flex-1 overflow-hidden">
                                         <span className="text-[13px] font-bold truncate pr-1">{msg.message || 'Shared file'}</span>
                                         <span className="text-[9px] font-black uppercase tracking-tight opacity-50 text-white/70">Sent File</span>
                                     </div>
                                     {msg.isLoading && (
                                         <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-20">
                                             <Loader2 size={18} className="animate-spin text-white" />
                                         </div>
                                     )}
                                 </div>
                             ) : (
                                 <a
                                     href={msg.mediaUrl ? msg.mediaUrl.replace('/upload/', '/upload/fl_attachment/') : '#'}
                                     download={msg.message || 'Shared file'}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center gap-3 p-2.5 rounded-2xl border bg-gray-50 border-gray-100 text-[#262626] hover:brightness-110 active:scale-[0.98] w-full min-w-[180px] max-w-[240px]"
                                 >
                                     <div className="shrink-0 p-2.5 rounded-xl flex items-center justify-center bg-white shadow-sm">
                                         <FileText size={20} className="text-indigo-600" />
                                     </div>
                                     <div className="flex flex-col flex-1 overflow-hidden">
                                         <span className="text-[13px] font-bold truncate pr-1">{msg.message || 'Shared file'}</span>
                                         <div className="flex items-center gap-1 opacity-50">
                                             <Download size={10} />
                                             <span className="text-[9px] font-black uppercase tracking-tight">Download</span>
                                         </div>
                                     </div>
                                 </a>
                             )
                         ) : (
                             msg.message
                         )}

                        {/* Reaction Display - Clickable */}
                        {msg.reactions?.length > 0 && (
                            <div
                                onClick={() => setShowReactionInfo(true)}
                                className={`absolute -bottom-2 ${isSender ? 'right-2' : 'left-2'} flex -space-x-0.5 cursor-pointer hover:scale-110 transition-transform z-10 origin-center`}
                            >
                                <div className="bg-white rounded-full px-1.5 py-0.5 text-[11px] shadow-lg border border-gray-100 flex items-center gap-0.5 animate-in zoom-in-50 duration-300 ring-2 ring-white">
                                    {[...new Set(msg.reactions.map(r => r.emoji))].map((emoji, i) => (
                                        <span key={i} className="drop-shadow-sm">{emoji}</span>
                                    ))}
                                    {msg.reactions.length > 1 && (
                                        <span className="text-[9px] font-black text-gray-400 ml-0.5">{msg.reactions.length}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Action Buttons (Visible on Hover) */}
                    <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isSender ? 'left-[-85px] mr-3 flex-row-reverse' : 'right-[-75px]'}`}>
                        <button onClick={() => setShowReactions(!showReactions)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors cursor-pointer">
                            <Smile size={14} />
                        </button>
                        <button onClick={() => onReply(msg)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors cursor-pointer">
                            <Reply size={14} />
                        </button>
                        {isSender && (
                            <button onClick={() => onDelete(msg._id)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* Emoji Picker Overlay */}
                    {showReactions && (
                        <div ref={pickerRef} className={`absolute z-30 -bottom-10 ${isSender ? 'right-0' : 'left-0'} bg-white shadow-xl border border-gray-100 rounded-full p-1.5 flex gap-1 animate-in slide-in-from-bottom-2`}>
                            {reactionsList.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onReact(msg._id, emoji);
                                        setShowReactions(false);
                                    }}
                                    className="hover:scale-125 transition-transform p-1 cursor-pointer"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Reactions Info Dialog */}
            <Dialog open={showReactionInfo} onOpenChange={setShowReactionInfo}>
                <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="p-4 border-b border-gray-100">
                        <DialogTitle className="text-[16px] font-black text-[#262626] text-center">Reactions</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {msg.reactions?.map((r, i) => {
                            const isMine = r.userId?._id?.toString() === currentUser?._id?.toString();
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={r.userId?.profilePicture} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold uppercase text-base">{r.userId?.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-[#262626] leading-none mb-1">{r.userId?.username} {isMine && "(You)"}</span>
                                            <span className="text-[12px] text-gray-400 font-medium">Reacted {r.emoji}</span>
                                        </div>
                                    </div>
                                    {isMine && (
                                        <button
                                            onClick={() => {
                                                onReact(msg._id, r.emoji); // Toggle off
                                                setShowReactionInfo(false);
                                            }}
                                            className="text-red-500 font-black text-[12px] hover:bg-red-50 px-4 py-2 rounded-full transition-colors cursor-pointer"
                                        >
                                            REMOVE
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Seen Indicator (Show only for latest seen, now temporary) */}
            {isSender && showSeen && (
                <span className="text-[10px] text-gray-400 font-bold mt-1 mr-1 animate-in fade-in fade-out transition-all duration-500">Seen</span>
            )}

            {/* Timestamp - Always Visible */}
            <span className="text-[9px] text-gray-400 font-medium mt-1 mx-1.5 opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
};

export default MessageBubble;
