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
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
};

// Prioritize Opus audio codec for crystal clear audio
const preferOpus = (sdp) => {
    const lines = sdp.split('\r\n');
    const audioIndex = lines.findIndex(l => l.startsWith('m=audio'));
    if (audioIndex === -1) return sdp;
    
    const mLine = lines[audioIndex].split(' ');
    const opusPayloads = lines
        .filter(l => l.startsWith('a=rtpmap') && l.includes('opus/48000'))
        .map(l => l.split(':')[1].split(' ')[0]);
    
    if (opusPayloads.length === 0) return sdp;
    
    const otherPayloads = mLine.slice(3).filter(p => !opusPayloads.includes(p));
    lines[audioIndex] = [...mLine.slice(0, 3), ...opusPayloads, ...otherPayloads].join(' ');
    return lines.join('\r\n');
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
        
        // Reset ALL call states in Redux (closes all modals/stops audio)
        dispatch(setActiveCall(false));
    }, [dispatch]);

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

            localSourceRef.current = audioCtx.createMediaStreamSource(lStream.clone());
            remoteSourceRef.current = audioCtx.createMediaStreamSource(rStream.clone());

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
        
        // Always close old PC to ensure clean signaling state for new connection/reconnection
        if (pc.current) {
            console.log("[WebRTC] Closing existing PeerConnection before setup");
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.onconnectionstatechange = null;
            pc.current.close();
        }

        pc.current = new RTCPeerConnection(servers);
        const currentPc = pc.current;

        currentPc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        currentPc.ontrack = (event) => {
            console.log("[WebRTC] REMOTE TRACK RECEIVED:", event.track.kind, "id:", event.track.id);

            if (event.streams && event.streams[0]) {
                // Use event.streams[0] directly as the stable remote stream reference
                remoteStreamRef.current = event.streams[0];
                console.log("[WebRTC] Assigned event.streams[0] as remoteStream. Tracks:", event.streams[0].getTracks().length);
            } else {
                // Fallback: build manually into a persistent MediaStream
                if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
                const exists = remoteStreamRef.current.getTracks().find(t => t.id === event.track.id);
                if (!exists) {
                    remoteStreamRef.current.addTrack(event.track);
                    console.log("[WebRTC] Manually added track to remoteStream");
                }
            }

            // Ensure audio track is enabled
            if (event.track.kind === 'audio') {
                event.track.enabled = true;
                event.track.onunmute = () => {
                    console.log('[WebRTC] Remote audio track unmuted');
                    // Force a state update so audio element re-attaches
                    setRemoteStream(prev => remoteStreamRef.current);
                };
            }

            // Trigger a single state update with the stable stream reference
            setRemoteStream(remoteStreamRef.current);

            // Start recording if connected
            if (currentPc.connectionState === 'connected' && localStreamRef.current) {
                startRecording(localStreamRef.current, remoteStreamRef.current);
            }
        };

        currentPc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE CONNECTION STATE:", currentPc.iceConnectionState);
            if (currentPc.iceConnectionState === 'connected' || currentPc.iceConnectionState === 'completed') {
                dispatch(setCallConnected(true));
                if (!startTime) dispatch(setStartTime(Date.now()));
            }
        };

        currentPc.onconnectionstatechange = () => {
            console.log("[WebRTC] CONNECTION STATE CHANGED TO:", currentPc.connectionState);
            if (currentPc.connectionState === 'connected') {
                const now = Date.now();
                if (!startTime) dispatch(setStartTime(now));
                dispatch(setCallConnected(true));

                if (localStreamRef.current && remoteStreamRef.current) {
                    startRecording(localStreamRef.current, remoteStreamRef.current);
                }
            } else if (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected') {
                console.warn("[WebRTC] Connection failed/disconnected. Reconnection window open.");
                setTimeout(() => {
                    // Check if it's still disconnected or failed
                    if (pc.current === currentPc && (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected')) {
                         console.log("[WebRTC] TIMEOUT: Ending call after 15s failure.");
                         endCall(remoteId);
                    }
                }, 15000); // 15s window for page refreshes
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
                
                const constraints = {
                    audio: { 
                        echoCancellation: true, 
                        noiseSuppression: true, 
                        autoGainControl: true,
                        channelCount: 1,
                        sampleRate: 48000
                    },
                    video: needsVideo ? { 
                        width: { ideal: 640 }, 
                        height: { ideal: 480 },
                        frameRate: { max: 30 }
                    } : false
                };

                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (resErr) {
                    console.warn("[WebRTC] Preferred camera settings failed, trying generic.", resErr);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                            video: needsVideo
                        });
                    } catch (fatalErr) {
                        // Better explanation if camera is locked by another app
                        if (fatalErr.name === 'NotReadableError' || fatalErr.name === 'TrackStartError') {
                             throw new Error("Camera is already being used by another application or tab.");
                        }
                        throw fatalErr;
                    }
                }
            }

            // ─── RACE CONDITION GUARD ───────────────────────────────────────────────
            // getUserMedia is async (can take 1-3s). During that time, cleanup() or
            // a second setupPeerConnection() may have closed/replaced pc.current.
            // If that happened, stop the media tracks and bail — do NOT call addTrack.
            if (pc.current !== currentPc || currentPc.signalingState === 'closed') {
                console.warn("[WebRTC] PC was replaced or closed during getUserMedia. Releasing tracks and aborting.");
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            // ────────────────────────────────────────────────────────────────────────

            localStreamRef.current = stream;
            setLocalStream(stream);

            // Force enable all tracks
            stream.getTracks().forEach(track => {
                track.enabled = true;
                console.log(`[WebRTC] LOCAL TRACK READY: ${track.kind} (${track.label})`);
            });

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log(`[WebRTC] Local audio track acquired: ${audioTracks[0].label}. Enabled: ${audioTracks[0].enabled}`);
            } else {
                console.error("[WebRTC] NO LOCAL AUDIO TRACK ACQUIRED!");
            }
            
            // Ensure we don't add duplicate tracks, and guard against late-closed PC
            const senders = currentPc.getSenders();
            stream.getTracks().forEach(track => {
                if (currentPc.signalingState === 'closed') {
                    console.warn("[WebRTC] PC closed before addTrack, skipping track:", track.kind);
                    return;
                }
                const alreadyAdded = senders.find(s => s.track?.id === track.id);
                if (!alreadyAdded) {
                    console.log("[WebRTC] ADDING LOCAL TRACK TO PC:", track.kind);
                    currentPc.addTrack(track, stream);
                }
            });
        } catch (err) {
            console.error("[WebRTC] FATAL: Could not access media:", err);
            // Only show user-facing errors for real permission/device errors
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                toast.error("Camera/Microphone access denied. Please check permissions.");
                endCall(remoteId);
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                toast.error("Camera already in use. Please close other apps using camera.");
                endCall(remoteId);
            } else if (err.name === 'InvalidStateError') {
                // PC was closed mid-setup — this is a race condition, not a user error.
                console.warn("[WebRTC] Ignoring InvalidStateError — PC closed during async setup.");
            } else {
                toast.error("Could not access microphone. Please check permissions.");
                endCall(remoteId);
            }
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
            const offerOptions = {
                iceRestart: false,
                offerToReceiveAudio: true,
                offerToReceiveVideo: type === 'video'
            };
            const offer = await pc.current.createOffer(offerOptions);
            // Apply Opus codec prioritization (same as ng-ThinkCode)
            const mungedSdp = preferOpus(offer.sdp);
            const localOffer = new RTCSessionDescription({ type: 'offer', sdp: mungedSdp });
            await pc.current.setLocalDescription(localOffer);
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
        if (!currentOffer || !currentRemoteUser) return;

        dispatch(setActiveCall(true));
        
        // Ensure PeerConnection and Local Media are READY before doing ANYTHING with signaling
        await setupPeerConnection(currentRemoteUser._id, callType);

        try {
            console.log("[WebRTC] ACCEPTING CALL: Setting remote description...");
            await pc.current.setRemoteDescription(new RTCSessionDescription(currentOffer));
            
            // Re-verify that tracks were added (fallback)
            if (pc.current.getSenders().length === 0 && localStreamRef.current) {
                console.warn("[WebRTC] NO SENDERS FOUND, re-adding tracks before answer");
                localStreamRef.current.getTracks().forEach(track => {
                    pc.current.addTrack(track, localStreamRef.current);
                });
            }

            const answer = await pc.current.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === 'video'
            });
            // Apply Opus codec prioritization (same as ng-ThinkCode)
            const mungedSdp = preferOpus(answer.sdp);
            const localAnswer = new RTCSessionDescription({ type: 'answer', sdp: mungedSdp });
            await pc.current.setLocalDescription(localAnswer);
            
            console.log("[WebRTC] ACCEPTING CALL: Sending answer...");
            socket.emit("answer-call", { to: currentRemoteUser._id, answer: localAnswer });

            // Process any ICE candidates that arrived before we had a remote description
            if (incomingIceCandidates.current.length > 0) {
                console.log(`[WebRTC] Processing ${incomingIceCandidates.current.length} queued ICE candidates`);
                for (const candidate of incomingIceCandidates.current) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
                        console.warn("[WebRTC] Error adding queued ICE candidate:", e);
                    });
                }
                incomingIceCandidates.current = [];
            }
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
            const initiateReconnection = async () => {
                await setupPeerConnection(remoteUser._id, callType);
                if (isOutgoingCall) {
                    console.log("[WebRTC] (RELOAD) I was caller, sending new offer.");
                    const offer = await pc.current.createOffer();
                    await pc.current.setLocalDescription(offer);
                    socket.emit("call-user", { to: remoteUser._id, offer, type: callType });
                } else {
                    console.log("[WebRTC] (RELOAD) I was receiver, requesting re-offer.");
                    socket.emit("request-reoffer", { to: remoteUser._id });
                }
            };
            initiateReconnection();
        }

        const handleIncomingCall = async ({ from, offer: newOffer, type, callerInfo }) => {
            // Case 1: Reconnection with SAME user
            if (isActiveCall && remoteUser?._id === from) {
                console.log("[WebRTC] Incoming call from active peer (re-negotiation/reload)...", from);
                await setupPeerConnection(from, type);
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(newOffer));
                    const answer = await pc.current.createAnswer();
                    await pc.current.setLocalDescription(answer);
                    socket.emit("answer-call", { to: from, answer });
                } catch (err) {
                    console.error("[WebRTC] Reconnection signaling failed:", err);
                }
            } 
            // Case 2: New call (if not handled by CallManager, though it usually is)
            else if (!isActiveCall) {
                console.log("[WebRTC] New incoming call from", from);
                dispatch(setIncomingCall({
                    isIncoming: true,
                    caller: from,
                    type,
                    offer: newOffer,
                    remoteUser: callerInfo || { _id: from, username: "Unknown" }
                }));
            }
        };

        const handleRequestReoffer = async ({ from }) => {
            if (isActiveCall && remoteUser?._id === from) {
                console.log("[WebRTC] Peer requested re-offer after reload. Re-negotiating...");
                await setupPeerConnection(from, callType);
                try {
                    const offer = await pc.current.createOffer();
                    await pc.current.setLocalDescription(offer);
                    socket.emit("call-user", { 
                        to: from, 
                        offer, 
                        type: callType,
                        callerInfo: { _id: user?._id, username: user?.username, profilePicture: user?.profilePicture }
                    });
                } catch (err) {
                    console.error("[WebRTC] Re-offering failed:", err);
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
        socket.on("request-reoffer", handleRequestReoffer);

        return () => {
            socket.off("incoming-call", handleIncomingCall);
            socket.off("call-accepted", handleCallAccepted);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("call-rejected", handleCallRejected);
            socket.off("call-ended", handleCallEnded);
            socket.off("peer-busy", handlePeerBusy);
            socket.off("request-reoffer", handleRequestReoffer);
        };
    }, [socket, cleanup, dispatch, isActiveCall, remoteUser, callType, setupPeerConnection, isOutgoingCall, isIncomingCall, user]);

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
