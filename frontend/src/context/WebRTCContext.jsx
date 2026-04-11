import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIncomingCall, setOutgoingCall, setActiveCall, setCallAnswer, setCallConnected, setStartTime, setRemoteUser } from '../redux/callSlice';
import { toast } from 'sonner';
import api from '@/api';

const WebRTCContext = createContext();

const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

export const WebRTCProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socketio);
    const { user } = useSelector(store => store.auth);
    const { callType, remoteUser, offer, isIncomingCall, isOutgoingCall, isActiveCall, startTime } = useSelector(store => store.call);

    const pc = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const localStreamRef = useRef(null); 
    const remoteStreamRef = useRef(null); 
    const incomingIceCandidates = useRef([]); 

    // Recording State
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const mixedStreamRef = useRef(null);

    const cleanup = useCallback(() => {
        console.log("[WebRTC] CLEANUP - Closing PC and stopping tracks");
        
        // Stop MediaRecorder
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            try { mediaRecorder.current.stop(); } catch (e) {}
        }

        // Close AudioContext nodes
        if (localSourceRef.current) { localSourceRef.current.disconnect(); localSourceRef.current = null; }
        if (remoteSourceRef.current) { remoteSourceRef.current.disconnect(); remoteSourceRef.current = null; }
        if (destRef.current) { destRef.current.disconnect(); destRef.current = null; }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }

        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`[WebRTC] Stopped local ${track.kind} track`);
            });
            localStreamRef.current = null;
            setLocalStream(null);
        }
        remoteStreamRef.current = null;
        setRemoteStream(null);
        incomingIceCandidates.current = [];
        mixedStreamRef.current = null;
    }, []);

    const audioCtxRef = useRef(null);
    const localSourceRef = useRef(null);
    const remoteSourceRef = useRef(null);
    const destRef = useRef(null);

    const startRecording = useCallback((lStream, rStream) => {
        if (!lStream || !rStream) return;
        
        // Ensure streams have audio tracks before starting
        if (lStream.getAudioTracks().length === 0 || rStream.getAudioTracks().length === 0) {
            console.log("[WebRTC] Delaying recording - waiting for audio tracks");
            return;
        }

        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') return;

        try {
            console.log("[WebRTC] STARTING RECORDING - Mixing Audio Streams");
            
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'interactive',
                    sampleRate: 48000,
                });
            }
            const audioCtx = audioCtxRef.current;
            
            if (!destRef.current) {
                destRef.current = audioCtx.createMediaStreamDestination();
            }
            const dest = destRef.current;

            // Cleanup old sources if any
            if (localSourceRef.current) {
                try { localSourceRef.current.disconnect(); } catch (e) {}
            }
            if (remoteSourceRef.current) {
                try { remoteSourceRef.current.disconnect(); } catch (e) {}
            }

            localSourceRef.current = audioCtx.createMediaStreamSource(lStream);
            remoteSourceRef.current = audioCtx.createMediaStreamSource(rStream);

            localSourceRef.current.connect(dest);
            remoteSourceRef.current.connect(dest);

            mixedStreamRef.current = dest.stream;
            
            // Use standard audio/webm;codecs=opus (highest quality for web)
            const options = { 
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };
            
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn("[WebRTC] opus not supported, falling back to default");
                delete options.mimeType;
            }

            mediaRecorder.current = new MediaRecorder(dest.stream, options);
            
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start(1000); // 1s chunks
            console.log("[WebRTC] MediaRecorder started with quality:", options.audioBitsPerSecond);
        } catch (err) {
            console.error("[WebRTC] Error starting recorder:", err);
        }
    }, []);

    const saveCallLog = useCallback(async ({ remoteId, duration, type, status, recordingBlob }) => {
        const formData = new FormData();
        if (recordingBlob) {
            formData.append('recording', recordingBlob, `call_recording_${Date.now()}.webm`);
        }
        formData.append('receiverId', remoteId);
        formData.append('callType', type || 'voice');
        formData.append('status', status || 'completed');
        formData.append('duration', duration || 0);

        try {
            console.log(`[WebRTC] Saving call log: ${status} for ${remoteId}`);
            const res = await api.post('/message/save-call-log', formData);
            return res.data;
        } catch (err) {
            console.error("[WebRTC] Error saving call log:", err);
        }
    }, []);

    const stopAndUploadRecording = useCallback(async (remoteId, finalDuration, type) => {
        if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;

        console.log("[WebRTC] STOPPING AND UPLOADING RECORDING");

        return new Promise((resolve) => {
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                await saveCallLog({
                    remoteId,
                    duration: finalDuration,
                    type,
                    status: 'completed',
                    recordingBlob: audioBlob
                });
                resolve();
            };
            mediaRecorder.current.stop();
        });
    }, [saveCallLog]);

    const setupPeerConnection = useCallback(async (remoteId, type) => {
        console.log("[WebRTC] Setting up PeerConnection for", remoteId, "Type:", type);
        
        if (pc.current) {
            pc.current.close();
        }

        pc.current = new RTCPeerConnection(servers);

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        pc.current.ontrack = (event) => {
            console.log("[WebRTC] REMOTE TRACK RECEIVED:", event.track.kind, "ID:", event.track.id);
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
            }
            if (!remoteStreamRef.current.getTracks().find(t => t.id === event.track.id)) {
                remoteStreamRef.current.addTrack(event.track);
            }
            
            const newStream = new MediaStream(remoteStreamRef.current.getTracks());
            setRemoteStream(newStream);

            // Attempt to start recording as soon as both streams have audio tracks
            if (pc.current.connectionState === 'connected' && localStreamRef.current) {
                startRecording(localStreamRef.current, remoteStreamRef.current);
            }
        };

        pc.current.onconnectionstatechange = () => {
            console.log("[WebRTC] CONNECTION STATE CHANGED TO:", pc.current.connectionState);
            if (pc.current.connectionState === 'connected') {
                const now = Date.now();
                if (!startTime) dispatch(setStartTime(now));
                dispatch(setCallConnected(true));

                if (localStreamRef.current && remoteStreamRef.current) {
                    startRecording(localStreamRef.current, remoteStreamRef.current);
                }
            } else if (pc.current.connectionState === 'failed' || pc.current.connectionState === 'disconnected') {
                console.warn("[WebRTC] Connection failed/disconnected, will timeout end soon.");
                setTimeout(() => {
                    if (pc.current && (pc.current.connectionState === 'failed' || pc.current.connectionState === 'disconnected')) {
                         endCall(remoteId);
                    }
                }, 5000);
            }
        };

        // Get Local Media
        try {
            const needsVideo = type === 'video';
            const hasVideo = localStreamRef.current?.getVideoTracks().length > 0;
            const isStreamActive = localStreamRef.current?.active;

            let stream;
            if (isStreamActive && (!needsVideo || hasVideo)) {
                console.log("[WebRTC] REUSING EXISTING LOCAL STREAM");
                stream = localStreamRef.current;
            } else {
                console.log("[WebRTC] REQUESTING NEW LOCAL MEDIA (Video:", needsVideo, ")");
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => t.stop());
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: needsVideo ? { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user" 
                    } : false
                });
            }

            localStreamRef.current = stream;
            setLocalStream(stream);
            
            stream.getTracks().forEach(track => {
                console.log("[WebRTC] ADDING LOCAL TRACK TO PC:", track.kind);
                pc.current.addTrack(track, stream);
            });
        } catch (err) {
            console.error("[WebRTC] FATAL: Could not access media:", err);
            toast.error("Camera/Microphone access denied.");
            endCall(remoteId);
        }
    }, [socket, dispatch, startTime, startRecording]);

    const endCall = useCallback(async (remoteId) => {
        const targetId = remoteId || remoteUser?._id;
        if (!targetId) return cleanup();

        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        if (mediaRecorder.current) {
            await stopAndUploadRecording(targetId, duration, callType);
        } else if (isOutgoingCall && !startTime) {
            saveCallLog({
                remoteId: targetId,
                duration: 0,
                type: callType,
                status: 'missed'
            });
        }

        socket?.emit("end-call", { to: targetId, duration, type: callType, startTime });
        cleanup();
        dispatch(setActiveCall(false));
    }, [socket, callType, cleanup, dispatch, startTime, stopAndUploadRecording, remoteUser, isOutgoingCall, saveCallLog]);

    const startCall = useCallback(async (targetUser, type) => {
        if (isActiveCall) return;
        dispatch(setOutgoingCall({ isOutgoing: true, receiver: targetUser._id, type, remoteUser: targetUser }));
        dispatch(setActiveCall(true));
        await setupPeerConnection(targetUser._id, type);

        try {
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            socket.emit("call-user", {
                to: targetUser._id,
                offer,
                type,
                callerInfo: {
                    _id: user?._id,
                    username: user?.username,
                    profilePicture: user?.profilePicture
                }
            });
            saveCallLog({ remoteId: targetUser._id, duration: 0, type, status: 'outgoing' });
        } catch (err) {
            console.error("[WebRTC] Error starting call:", err);
            endCall(targetUser._id);
        }
    }, [dispatch, setupPeerConnection, socket, endCall, user, isActiveCall, saveCallLog]);

    const acceptCall = useCallback(async (reconnectOffer = null, reconnectRemoteUser = null) => {
        const currentOffer = reconnectOffer || offer;
        const currentRemoteUser = reconnectRemoteUser || remoteUser;
        if (!currentOffer || !currentRemoteUser) return;

        dispatch(setActiveCall(true));
        await setupPeerConnection(currentRemoteUser._id, callType);

        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(currentOffer));
            
            if (incomingIceCandidates.current.length > 0) {
                for (const candidate of incomingIceCandidates.current) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
                incomingIceCandidates.current = [];
            }

            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            socket.emit("answer-call", { to: currentRemoteUser._id, answer });
        } catch (err) {
            console.error("[WebRTC] Error accepting call:", err);
            endCall(currentRemoteUser._id);
        }
    }, [offer, remoteUser, setupPeerConnection, socket, endCall, callType, dispatch]);

    // Handle Signaling
    useEffect(() => {
        if (!socket) return;
        
        // RECONNECTION LOGIC: Detect if we were in a call and the page refreshed
        if (isActiveCall && !pc.current && remoteUser) {
            console.log("[WebRTC] DETECTED ACTIVE SESSION ON RELOAD, ATTEMPTING RECONNECTION...");
            setupPeerConnection(remoteUser._id, callType);
        }

        const handleIncomingCall = async ({ from, offer: newOffer, type }) => {
            // If already in call with THIS user, auto-reconnect
            if (isActiveCall && remoteUser?._id === from) {
                console.log("[WebRTC] Seamlessly reconnecting with same user...", from);
                await setupPeerConnection(from, type);
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(newOffer));
                    const answer = await pc.current.createAnswer();
                    await pc.current.setLocalDescription(answer);
                    socket.emit("answer-call", { to: from, answer });
                } catch (err) {
                    console.error("[WebRTC] Reconnection failed:", err);
                }
            }
        };

        const handleCallAccepted = async ({ answer }) => {
            if (pc.current && (pc.current.signalingState === "have-local-offer" || pc.current.signalingState === "stable")) {
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {
                    console.warn("[WebRTC] setRemoteDescription failed (likely already stable):", e);
                }
                
                if (incomingIceCandidates.current.length > 0) {
                    for (const candidate of incomingIceCandidates.current) {
                        await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                    }
                    incomingIceCandidates.current = [];
                }
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            if (pc.current && pc.current.remoteDescription && pc.current.remoteDescription.type) {
                await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            } else {
                incomingIceCandidates.current.push(candidate);
            }
        };

        const handleCallRejected = () => { toast.error("Call rejected"); cleanup(); dispatch(setActiveCall(false)); };
        const handleCallEnded = () => { cleanup(); dispatch(setActiveCall(false)); toast.info("Call ended"); };
        const handlePeerBusy = () => { toast.error("User is busy"); cleanup(); dispatch(setActiveCall(false)); };

        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-accepted", handleCallAccepted);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-ended", handleCallEnded);
        socket.on("peer-busy", handlePeerBusy);

        return () => {
            socket.off("incoming-call", handleIncomingCall);
            socket.off("call-accepted", handleCallAccepted);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("call-rejected", handleCallRejected);
            socket.off("call-ended", handleCallEnded);
            socket.off("peer-busy", handlePeerBusy);
        };
    }, [socket, cleanup, dispatch, isActiveCall, remoteUser, callType, setupPeerConnection]);

    const value = {
        startCall,
        acceptCall,
        endCall,
        saveCallLog,
        localStream,
        remoteStream,
        pc: pc.current
    };

    return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
};

export const useWebRTC = () => {
    const context = useContext(WebRTCContext);
    if (!context) throw new Error("useWebRTC must be used within a WebRTCProvider");
    return context;
};
