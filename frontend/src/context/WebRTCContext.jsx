import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIncomingCall, setOutgoingCall, setActiveCall, setCallAnswer, setCallConnected, setStartTime, setRemoteUser } from '../redux/callSlice';
import { toast } from 'sonner';
import api from '@/api';

const WebRTCContext = createContext();

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun.metered.ca:80' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10,
};

// Prioritize Opus audio codec for crystal clear audio
const preferOpus = (sdp) => {
    try {
        const lines = sdp.split('\r\n');
        const audioIndex = lines.findIndex(l => l.startsWith('m=audio'));
        if (audioIndex === -1) return sdp;
        
        const mLine = lines[audioIndex].split(' ');
        if (mLine.length < 4) return sdp; // Port, proto, payloads...

        const opusPayloads = lines
            .filter(l => l.startsWith('a=rtpmap') && l.includes('opus/48000'))
            .map(l => {
                const match = l.match(/a=rtpmap:(\d+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);
        
        if (opusPayloads.length === 0) return sdp;
        
        const otherPayloads = mLine.slice(3).filter(p => !opusPayloads.includes(p));
        lines[audioIndex] = [...mLine.slice(0, 3), ...opusPayloads, ...otherPayloads].join(' ');
        return lines.join('\r\n');
    } catch (e) {
        console.warn("[WebRTC] SDP munging failed, using original", e);
        return sdp;
    }
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
    const endCallRef = useRef(null);

    // Recording and Audio Context Refs
    const mediaRecorder = useRef(null);
    const audioChunks = useRef(null);
    const mixedStreamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const localSourceRef = useRef(null);
    const remoteSourceRef = useRef(null);
    const destRef = useRef(null);

    const cleanup = useCallback(() => {
        console.log("[WebRTC] CLEANUP - Closing PC and stopping tracks");
        
        // Stop MediaRecorder
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            try { mediaRecorder.current.stop(); } catch (e) {}
        }

        // Close AudioContext nodes
        if (localSourceRef.current) { try { localSourceRef.current.disconnect(); } catch (e) {} localSourceRef.current = null; }
        if (remoteSourceRef.current) { try { remoteSourceRef.current.disconnect(); } catch (e) {} remoteSourceRef.current = null; }
        if (destRef.current) { try { destRef.current.disconnect(); } catch (e) {} destRef.current = null; }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }

        if (pc.current) {
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.onconnectionstatechange = null;
            pc.current.close();
            pc.current = null;
        }
        
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`[WebRTC] Stopped local ${track.kind} track`);
            });
            localStreamRef.current = null;
        }
        
        setLocalStream(null);
        remoteStreamRef.current = null;
        setRemoteStream(null);
        incomingIceCandidates.current = [];
        mixedStreamRef.current = null;
        
        // Reset ALL call states in Redux
        dispatch(setActiveCall(false));
    }, [dispatch]);

    const startRecording = useCallback((lStream, rStream) => {
        if (!lStream || !rStream) return;
        
        // Ensure streams have audio tracks before starting
        const hasLocalAudio = lStream.getAudioTracks().length > 0;
        const hasRemoteAudio = rStream.getAudioTracks().length > 0;

        if (!hasLocalAudio || !hasRemoteAudio) {
            console.log("[WebRTC] Delaying recording - waiting for audio tracks on both sides");
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

            // MIX LOCAL STREAM
            const localTracks = lStream.getAudioTracks();
            if (localTracks.length > 0) {
                if (localSourceRef.current) localSourceRef.current.disconnect();
                localSourceRef.current = audioCtx.createMediaStreamSource(new MediaStream([localTracks[0]]));
                localSourceRef.current.connect(dest);
            }

            // MIX REMOTE STREAM
            const remoteTracks = rStream.getAudioTracks();
            if (remoteTracks.length > 0) {
                if (remoteSourceRef.current) remoteSourceRef.current.disconnect();
                remoteSourceRef.current = audioCtx.createMediaStreamSource(new MediaStream([remoteTracks[0]]));
                remoteSourceRef.current.connect(dest);
            }

            mixedStreamRef.current = dest.stream;
            
            const options = { 
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };
            
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                delete options.mimeType;
            }

            mediaRecorder.current = new MediaRecorder(dest.stream, options);
            
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };

            mediaRecorder.current.start(1000); 
            console.log("[WebRTC] MediaRecorder started");
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
            const currentChunks = audioChunks.current || [];
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(currentChunks, { type: 'audio/webm' });
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

    const preWarmMedia = useCallback(async (type) => {
        // If already warm and same type, reuse
        if (localStreamRef.current && localStreamRef.current.active) {
             const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
             if (type !== 'video' || hasVideo) {
                 console.log("[WebRTC] Media already warm, reusing existing stream.");
                 return localStreamRef.current;
             }
        }
        
        console.log("[WebRTC] REQUESTING MEDIA ACCESS - Type:", type);
        try {
            const constraints = {
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true,
                    sampleRate: 48000
                },
                video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false
            };
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("MediaDevices API not supported. This might be due to an insecure context (HTTP).");
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            console.log("[WebRTC] Local media stream obtained successfully.");
            return stream;
        } catch (err) {
            console.error("[WebRTC] Media acquisition FAILED:", err.name, err.message);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                toast.error("Microphone/Camera access was denied.");
            } else if (!window.isSecureContext) {
                toast.error("Video calling requires a secure context (HTTPS) on this network.");
            } else {
                toast.error(`Media Error: ${err.message}`);
            }
            return null;
        }
    }, []);

    const setupPeerConnection = useCallback(async (remoteId, type) => {
        console.log("[WebRTC] INITIALIZING PeerConnection for", remoteId);
        
        if (pc.current) {
            console.log("[WebRTC] Closing previous PeerConnection before new one");
            pc.current.close();
        }

        pc.current = new RTCPeerConnection(servers);
        const currentPc = pc.current;

        currentPc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("[WebRTC] New local ICE candidate found");
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        currentPc.ontrack = (event) => {
            console.log("[WebRTC] Received remote track:", event.track.kind);
            
            // Handle cross-browser stream assignment
            let stream = event.streams[0];
            if (!stream) {
                if (!remoteStreamRef.current) {
                    remoteStreamRef.current = new MediaStream();
                    setRemoteStream(remoteStreamRef.current);
                }
                remoteStreamRef.current.addTrack(event.track);
            } else {
                setRemoteStream(stream);
                remoteStreamRef.current = stream;
            }

            if (currentPc.connectionState === 'connected' && localStreamRef.current && remoteStreamRef.current) {
                startRecording(localStreamRef.current, remoteStreamRef.current);
            }
        };

        currentPc.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection state changed:", currentPc.connectionState);
            if (currentPc.connectionState === 'connected') {
                dispatch(setCallConnected(true));
                if (!startTime) dispatch(setStartTime(Date.now()));
                
                if (localStreamRef.current && remoteStreamRef.current) {
                    startRecording(localStreamRef.current, remoteStreamRef.current);
                }
            } else if (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected') {
                // If disconnected, wait a bit before ending in case it recovers (common on mobile/wi-fi)
                setTimeout(() => {
                    if (pc.current === currentPc && (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected')) {
                         console.log("[WebRTC] Connection recovery failed, ending call.");
                         endCallRef.current?.(remoteId);
                    }
                }, currentPc.connectionState === 'failed' ? 2000 : 10000);
            }
        };

        currentPc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE connection state:", currentPc.iceConnectionState);
        };

        try {
            const stream = await preWarmMedia(type);

            if (!stream) {
                 endCall(remoteId);
                 return;
            }

            if (pc.current !== currentPc) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            // Standard track addition - creates transceivers automatically in sendrecv mode
            stream.getTracks().forEach(track => {
                track.enabled = true;
                currentPc.addTrack(track, stream);
                console.log(`[WebRTC] Added local ${track.kind} track to PC`);
            });
        } catch (err) {
            console.error("[WebRTC] PeerConnection setup FAILED:", err);
            endCall(remoteId);
        }
    }, [socket, dispatch, startTime, startRecording, preWarmMedia]);

    const endCall = useCallback(async (remoteId) => {
        const targetId = remoteId || remoteUser?._id;
        console.log("[WebRTC] END CALL REQUESTED for", targetId);
        
        if (!targetId) return cleanup();

        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
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
    }, [socket, callType, cleanup, startTime, stopAndUploadRecording, remoteUser, isOutgoingCall, saveCallLog]);

    endCallRef.current = endCall;

    const startCall = useCallback(async (targetUser, type) => {
        if (isActiveCall) return;
        console.log("[WebRTC] STARTING OUTGOING CALL to", targetUser.username);
        
        dispatch(setOutgoingCall({ isOutgoing: true, receiver: targetUser._id, type, remoteUser: targetUser }));
        dispatch(setActiveCall(true));
        
        await setupPeerConnection(targetUser._id, type);

        try {
            const offer = await pc.current.createOffer();
            const mungedSdp = preferOpus(offer.sdp);
            const localOffer = new RTCSessionDescription({ type: 'offer', sdp: mungedSdp });
            
            await pc.current.setLocalDescription(localOffer);
            console.log("[WebRTC] Local description (offer) set.");

            socket.emit("call-user", {
                to: targetUser._id,
                offer: localOffer,
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
        if (!currentOffer || !currentRemoteUser) {
            console.error("[WebRTC] Cannot accept call: missing offer or user.");
            return;
        }

        console.log("[WebRTC] ACCEPTING CALL from", currentRemoteUser.username);
        dispatch(setActiveCall(true));
        
        await setupPeerConnection(currentRemoteUser._id, callType);

        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(currentOffer));
            console.log("[WebRTC] Remote description (offer) set.");
            
            const answer = await pc.current.createAnswer();
            const mungedSdp = preferOpus(answer.sdp);
            const localAnswer = new RTCSessionDescription({ type: 'answer', sdp: mungedSdp });
            
            await pc.current.setLocalDescription(localAnswer);
            console.log("[WebRTC] Local description (answer) set.");
            
            socket.emit("answer-call", { to: currentRemoteUser._id, answer: localAnswer });

            // Apply buffered candidates
            if (incomingIceCandidates.current.length > 0) {
                console.log(`[WebRTC] Applying ${incomingIceCandidates.current.length} buffered ICE candidates`);
                for (const candidate of incomingIceCandidates.current) {
                    try {
                        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.warn("[WebRTC] Error adding buffered candidate", e);
                    }
                }
                incomingIceCandidates.current = [];
            }
        } catch (err) {
            console.error("[WebRTC] Error accepting call trace:", err);
            endCall(currentRemoteUser._id);
        }
    }, [offer, remoteUser, setupPeerConnection, socket, endCall, callType, dispatch]);

    // Global Signaling Effect
    useEffect(() => {
        if (!socket) return;
        
        const handleIncomingCallSignal = async ({ from, offer: newOffer, type, callerInfo }) => {
            // Case 1: Active call with the SAME user (reconnection attempt)
            if (isActiveCall && remoteUser?._id === from) {
                console.log("[WebRTC] Re-offer received from current peer, re-negotiating...");
                await setupPeerConnection(from, type);
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(newOffer));
                    const answer = await pc.current.createAnswer();
                    await pc.current.setLocalDescription(answer);
                    socket.emit("answer-call", { to: from, answer });
                } catch (err) {
                    console.error("[WebRTC] Re-negotiation failed:", err);
                }
            } 
            // Case 2: No active call, handle normally
            else if (!isActiveCall) {
                console.log("[WebRTC] Incoming call signal received from", from);
                // Pre-warm local media instantly to speed up connection
                preWarmMedia(type); 
                
                dispatch(setIncomingCall({
                    isIncoming: true,
                    caller: from,
                    type,
                    offer: newOffer,
                    remoteUser: callerInfo || { _id: from, username: "Unknown" }
                }));
            }
        };

        const handleCallAccepted = async ({ answer }) => {
            console.log("[WebRTC] Call accepted by peer, setting remote description (answer)");
            if (pc.current && (pc.current.signalingState === "have-local-offer" || pc.current.signalingState === "stable")) {
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {
                    console.error("[WebRTC] Failed to set remote answer:", e);
                }
                
                if (incomingIceCandidates.current.length > 0) {
                    console.log(`[WebRTC] Applying ${incomingIceCandidates.current.length} buffered candidates after acceptance`);
                    for (const candidate of incomingIceCandidates.current) {
                        pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                    }
                    incomingIceCandidates.current = [];
                }
            }
        };

        const handleIceCandidateSignal = async ({ candidate }) => {
            if (pc.current && pc.current.remoteDescription && pc.current.remoteDescription.type) {
                pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
                    // Ignore transient ICE errors during connection
                });
            } else {
                incomingIceCandidates.current.push(candidate);
            }
        };

        socket.on("incoming-call", handleIncomingCallSignal);
        socket.on("call-accepted", handleCallAccepted);
        socket.on("ice-candidate", handleIceCandidateSignal);
        socket.on("call-rejected", () => cleanup());
        socket.on("call-ended", () => cleanup());
        socket.on("peer-busy", () => {
            toast.info("User is currently on another call.");
            cleanup();
        });

        return () => {
            socket.off("incoming-call", handleIncomingCallSignal);
            socket.off("call-accepted", handleCallAccepted);
            socket.off("ice-candidate", handleIceCandidateSignal);
            socket.off("call-rejected");
            socket.off("call-ended");
            socket.off("peer-busy");
        };
    }, [socket, cleanup, dispatch, isActiveCall, remoteUser, callType, setupPeerConnection, preWarmMedia]);

    const value = {
        startCall,
        acceptCall,
        endCall,
        preWarmMedia,
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
