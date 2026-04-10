import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn, getAvatarColor } from '@/lib/utils';

const ActiveCallOverlay = ({ localStream, remoteStream, onEndCall, isConnecting }) => {
    const { remoteUser, callType } = useSelector(store => store.call);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.error("Local video play failed:", e));
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error("Remote video play failed:", e));
        }
    }, [remoteStream]);

    useEffect(() => {
        if (!isConnecting) {
            const timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isConnecting]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] bg-[#0a0a14] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
            {/* Remote Video (Full Screen) */}
            {callType === 'video' ? (
                <div className="relative w-full h-full">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover animate-in fade-in duration-1000"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/40">
                             <div className="flex flex-col items-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-[ping_3s_infinite]"></div>
                                    <Avatar className="w-40 h-40 border-8 border-white/5 shadow-2xl relative z-10 scale-110">
                                        <AvatarImage src={remoteUser?.profilePicture} className="object-cover" />
                                        <AvatarFallback className={cn("text-5xl font-black", getAvatarColor(remoteUser?.username))}>
                                            {remoteUser?.username?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <p className="text-white/60 font-bold tracking-[0.3em] uppercase animate-pulse">
                                    Waiting for Video...
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-[ping_3s_infinite]"></div>
                        <Avatar className="w-40 h-40 border-8 border-white/5 shadow-2xl relative z-10 scale-110">
                            <AvatarImage src={remoteUser?.profilePicture} className="object-cover" />
                            <AvatarFallback className={cn("text-5xl font-black", getAvatarColor(remoteUser?.username))}>
                                {remoteUser?.username?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            )}

            {/* Local Video Preview (Picture-in-Pip) */}
            {callType === 'video' && (
                <div className="absolute top-8 right-8 w-40 h-56 rounded-[24px] overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
                    {localStream ? (
                        <>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={cn("w-full h-full object-cover -scale-x-100", isVideoOff && "hidden")}
                            />
                            {isVideoOff && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-bold">
                                    Off
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 border-2 border-dashed border-white/10">
                            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                        </div>
                    )}
                </div>
            )}

            {/* Call Info Overlay */}
            <div className="absolute top-12 left-0 right-0 flex flex-col items-center pointer-events-none z-30">
                <h2 className="text-white text-[32px] font-black tracking-tight mb-2 drop-shadow-md">
                    {remoteUser?.username}
                </h2>
                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                    <span className="text-white/90 font-black text-[14px] tracking-widest uppercase flex items-center gap-2">
                        {isConnecting ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                CONNECTING...
                            </>
                        ) : (
                            formatDuration(callDuration)
                        )}
                    </span>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center gap-8 animate-in slide-in-from-bottom-10 duration-700 z-30">
                <button
                    onClick={toggleMute}
                    className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
                        isMuted ? "bg-red-500 text-white" : "bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20"
                    )}
                >
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>

                <button
                    onClick={() => onEndCall(remoteUser?._id)}
                    className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-2xl shadow-red-500/40 hover:bg-red-700 active:scale-90 transition-all"
                >
                    <PhoneOff size={32} />
                </button>

                {callType === 'video' && (
                    <button
                        onClick={toggleVideo}
                        className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
                            isVideoOff ? "bg-red-500 text-white" : "bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20"
                        )}
                    >
                        {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ActiveCallOverlay;
