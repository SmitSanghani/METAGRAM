import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn, getAvatarColor } from '@/lib/utils';

const ActiveCallOverlay = ({ localStream, remoteStream, onEndCall, isConnecting }) => {
    const { socket } = useSelector(store => store.socketio);
    const { remoteUser, callType, startTime } = useSelector(store => store.call);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [remoteVideoOff, setRemoteVideoOff] = useState(false);
    const [remoteAudioOff, setRemoteAudioOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    // Guard: track which stream is already attached to the audio element
    // to avoid redundant srcObject re-assignments (which cancel in-flight play() and cause AbortError loops)
    const lastAttachedStreamRef = useRef(null);
    const retryTimersRef = useRef([]);

    // React has a known bug: muted={false} prop on <audio> is IGNORED by the browser.
    // We must set it imperatively on mount to ensure audio is never muted.
    useEffect(() => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            console.log("[ActiveCallOverlay] Audio element initialized: muted=false, volume=1.0");
        }
        // CRITICAL: Local video must ALWAYS be muted to prevent audio echo (hearing your own voice)
        // Browser sometimes ignores JSX `muted` prop — must be set imperatively
        if (localVideoRef.current) {
            localVideoRef.current.muted = true;
            console.log("[ActiveCallOverlay] Local video element force-muted to prevent echo");
        }
    }, []);

    // Track remote media state changes from socket
    useEffect(() => {
        if (!socket) return;
        
        const handleMediaUpdate = ({ from, videoOff, audioOff }) => {
            if (from === remoteUser?._id) {
                if (videoOff !== undefined) setRemoteVideoOff(videoOff);
                if (audioOff !== undefined) setRemoteAudioOff(audioOff);
            }
        };

        socket.on("call-media-update", handleMediaUpdate);
        return () => socket.off("call-media-update", handleMediaUpdate);
    }, [socket, remoteUser?._id]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            console.log("[ActiveCallOverlay] SETTING LOCAL STREAM");
            if (localVideoRef.current.srcObject !== localStream) {
                localVideoRef.current.srcObject = localStream;
            }
            // ALWAYS mute local stream to prevent echo (hearing your own voice back)
            localVideoRef.current.muted = true;
            localVideoRef.current.volume = 0; // Guard against browser quirks
            localVideoRef.current.play().catch(e => {
                if (e.name !== "AbortError") console.error("Local video play failed:", e);
            });
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            console.log("[ActiveCallOverlay] SETTING REMOTE STREAM (VIDEO)");
            if (remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            // Mute video element so ALL audio routing strictly passes through our dedicated audio element
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.volume = 0; 
            remoteVideoRef.current.play().catch(e => {
                if (e.name !== "AbortError") console.error("Remote video play failed:", e);
            });
        }
    }, [remoteStream]);

    useEffect(() => {
        const audioEl = remoteAudioRef.current;
        if (!audioEl || !remoteStream) return;

        // Bug #1 fix: Only re-attach if this is genuinely a new stream object.
        // Skipping re-attachment prevents cancelling an already-playing play() call
        // (which causes AbortError and silences audio) on every isConnecting toggle.
        if (lastAttachedStreamRef.current === remoteStream) {
            console.log("[ActiveCallOverlay] remoteStream unchanged — skipping re-attach");
            return;
        }

        // Cancel any pending retry timers from a previous stream
        retryTimersRef.current.forEach(id => clearTimeout(id));
        retryTimersRef.current = [];

        const audioTracks = remoteStream.getAudioTracks();
        console.log(`[ActiveCallOverlay] New remote stream. Audio tracks: ${audioTracks.length}`);

        // Force track enabled state
        audioTracks.forEach(t => { t.enabled = true; });

        // Imperatively set audio element props (JSX muted={false} is a React bug — doesn't work)
        audioEl.pause();
        audioEl.srcObject = remoteStream;
        audioEl.volume = 1.0;
        audioEl.muted = false;
        lastAttachedStreamRef.current = remoteStream;

        // Bug #4 fix: tryPlay retries are tracked so they can be cancelled if
        // the component unmounts or the stream changes before all retries finish.
        const tryPlay = (attempt = 1) => {
            audioEl.play()
                .then(() => console.log(`[ActiveCallOverlay] ✅ Remote audio playing (attempt ${attempt})`))
                .catch(e => {
                    console.warn(`[ActiveCallOverlay] Audio play blocked (attempt ${attempt}):`, e.name);
                    if (attempt < 5) {
                        const timerId = setTimeout(() => tryPlay(attempt + 1), attempt * 300);
                        retryTimersRef.current.push(timerId);
                    }
                });
        };

        tryPlay();

        return () => {
            // Cleanup retry timers when stream changes or component unmounts
            retryTimersRef.current.forEach(id => clearTimeout(id));
            retryTimersRef.current = [];
        };
        // Bug #3 fix: isConnecting REMOVED from deps — audio re-attach must only
        // fire when the MediaStream object itself changes, NOT on every connecting
        // state flip (which would cancel the playing audio via AbortError).
    }, [remoteStream]);


    useEffect(() => {
        if (!isConnecting && startTime) {
            const updateTimer = () => {
                const duration = Math.floor((Date.now() - startTime) / 1000);
                setCallDuration(duration > 0 ? duration : 0);
            };
            
            updateTimer(); // Initial call
            const timer = setInterval(updateTimer, 1000);
            return () => clearInterval(timer);
        }
    }, [isConnecting, startTime]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        if (localStream) {
            const newState = !isMuted;
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !newState;
            });
            setIsMuted(newState);
            socket?.emit("call-media-update", { to: remoteUser?._id, audioOff: newState });
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const newState = !isVideoOff;
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !newState;
            });
            setIsVideoOff(newState);
            socket?.emit("call-media-update", { to: remoteUser?._id, videoOff: newState });
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] bg-[#0a0a14] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
            {/* 
              CRITICAL: ONE persistent, always-mounted audio element for remote audio.
              Never conditionally render this — browser requires a stable DOM node.
              The video element is always muted; all audio goes through this element.
            */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="fixed -top-10 -left-10 w-1 h-1 opacity-0 pointer-events-none" />

            {/* Remote Video (Full Screen) */}
            {callType === 'video' ? (
                <div className="relative w-full h-full">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        muted // Video element MUST be muted to let the dedicated audio element handle sound independently
                        playsInline
                        className={cn(
                            "w-full h-full object-cover animate-in fade-in duration-1000",
                            (!remoteStream || remoteStream.getVideoTracks().length === 0 || remoteVideoOff) && "hidden"
                        )}
                    />
                    
                    {(!remoteStream || remoteStream.getVideoTracks().length === 0 || remoteVideoOff) && (
                        <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-md">
                             {/* Audio is handled by the single persistent <audio> element above — do NOT add another ref here */}
                             <div className="flex flex-col items-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-[ping_3s_infinite]"></div>
                                    <Avatar className="w-40 h-40 border-8 border-white/5 shadow-2xl relative z-10 scale-110">
                                        <AvatarImage src={remoteUser?.profilePicture} className="object-cover" />
                                        <AvatarFallback className={cn("text-5xl font-black", getAvatarColor(remoteUser?.username))}>
                                            {remoteUser?.username?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    {remoteAudioOff && (
                                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center border-4 border-[#0a0a14] z-20 shadow-lg">
                                            <MicOff size={20} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-white/60 font-bold tracking-[0.3em] uppercase animate-pulse">
                                    {remoteVideoOff ? "Video is Off" : "Waiting for Video..."}
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
                        
                        {remoteAudioOff && (
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center border-4 border-[#0a0a14] z-20 shadow-lg">
                                <MicOff size={20} className="text-white" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Remote Mic Indicator for Video Calls (Top Left) */}
            {callType === 'video' && remoteAudioOff && !remoteVideoOff && (
                <div className="absolute top-8 left-8 bg-red-500/80 backdrop-blur-md p-3 rounded-full border border-white/20 z-40 shadow-xl animate-in zoom-in duration-300">
                    <MicOff size={24} className="text-white" />
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
