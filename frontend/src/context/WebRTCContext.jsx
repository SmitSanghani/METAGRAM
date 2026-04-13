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
    // Bug #6 fix: A ref that always points to the latest endCall, used inside
    // setupPeerConnection's onconnectionstatechange timeout to avoid both
    // stale closures AND the circular dep that adding endCall to setupPeerConnection's
    // dep array would introduce.
    const endCallRef = useRef(null);

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
            if (remoteSourceRef.current) {
                try { remoteSourceRef.current.disconnect(); } catch (e) {}
            }

            // MIX LOCAL STREAM (Your voice)
            const localTracks = lStream.getAudioTracks();
            if (localTracks.length > 0) {
                localSourceRef.current = audioCtx.createMediaStreamSource(new MediaStream([localTracks[0]]));
                localSourceRef.current.connect(dest);
                console.log("[WebRTC] Local voice added to recording mix");
            }

            // MIX REMOTE STREAM (Their voice)
            const remoteTracks = rStream.getAudioTracks();
            if (remoteTracks.length > 0) {
                remoteSourceRef.current = audioCtx.createMediaStreamSource(new MediaStream([remoteTracks[0]]));
                remoteSourceRef.current.connect(dest);
                console.log("[WebRTC] Remote voice added to recording mix");
            }

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
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.onconnectionstatechange = null;
            pc.current.close();
        }

        pc.current = new RTCPeerConnection(servers);
        const currentPc = pc.current;

        // Ensure bidirectional audio using a transceiver as requested
        currentPc.addTransceiver('audio', { direction: 'sendrecv' });
        if (type === 'video') {
            currentPc.addTransceiver('video', { direction: 'sendrecv' });
        }

        currentPc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        currentPc.ontrack = (event) => {
            console.log("[WebRTC] REMOTE TRACK RECEIVED:", event.track.kind);
            // Verify that ontrack correctly receives and updates the remote stream
            const stream = event.streams[0];
            if (stream) {
                setRemoteStream(stream);
                remoteStreamRef.current = stream;
            }

            if (event.track.kind === 'audio') {
                event.track.enabled = true;
            }

            if (currentPc.connectionState === 'connected' && localStreamRef.current) {
                startRecording(localStreamRef.current, remoteStreamRef.current);
            }
        };

        currentPc.onconnectionstatechange = () => {
            if (currentPc.connectionState === 'connected') {
                dispatch(setCallConnected(true));
                if (!startTime) dispatch(setStartTime(Date.now()));

                if (localStreamRef.current && remoteStreamRef.current) {
                    startRecording(localStreamRef.current, remoteStreamRef.current);
                }
            } else if (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected') {
                setTimeout(() => {
                    if (pc.current === currentPc && (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected')) {
                         endCallRef.current?.(remoteId);
                    }
                }, 15000);
            }
        };

        try {
            const needsVideo = type === 'video';
            const constraints = {
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true
                },
                video: needsVideo ? { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: "user"
                } : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (pc.current !== currentPc) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            localStreamRef.current = stream;
            setLocalStream(stream);

            // Ensure local stream tracks are enabled and added to the peer connection
            stream.getTracks().forEach(track => {
                track.enabled = true;
                const senders = currentPc.getSenders();
                const alreadyAdded = senders.find(s => s.track?.id === track.id);
                if (!alreadyAdded) {
                    currentPc.addTrack(track, stream);
                    console.log(`[WebRTC] Added ${track.kind} track to PC`);
                }
            });
        } catch (err) {
            console.error("[WebRTC] FATAL: Could not access media:", err);
            toast.error("Microphone/Camera access denied.");
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
    }, [socket, callType, cleanup, startTime, stopAndUploadRecording, remoteUser, isOutgoingCall, saveCallLog]);

    // Keep the ref in sync with the latest endCall
    endCallRef.current = endCall;

    const startCall = useCallback(async (targetUser, type) => {
        if (isActiveCall) return;
        dispatch(setOutgoingCall({ isOutgoing: true, receiver: targetUser._id, type, remoteUser: targetUser }));
        dispatch(setActiveCall(true));
        await setupPeerConnection(targetUser._id, type);

        try {
            const offer = await pc.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
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
        await setupPeerConnection(currentRemoteUser._id, callType);

        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(currentOffer));
            const answer = await pc.current.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            const mungedSdp = preferOpus(answer.sdp);
            const localAnswer = new RTCSessionDescription({ type: 'answer', sdp: mungedSdp });
            await pc.current.setLocalDescription(localAnswer);
            
            socket.emit("answer-call", { to: currentRemoteUser._id, answer: localAnswer });

            if (incomingIceCandidates.current.length > 0) {
                for (const candidate of incomingIceCandidates.current) {
                    if (pc.current && pc.current.remoteDescription) {
                        try {
                            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) {}
                    }
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
        
        const handleIncomingCall = async ({ from, offer: newOffer, type, callerInfo }) => {
            if (isActiveCall && remoteUser?._id === from) {
                await setupPeerConnection(from, type);
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(newOffer));
                    const answer = await pc.current.createAnswer();
                    await pc.current.setLocalDescription(answer);
                    socket.emit("answer-call", { to: from, answer });
                } catch (err) {}
            } else if (!isActiveCall) {
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
            if (pc.current && (pc.current.signalingState === "have-local-offer" || pc.current.signalingState === "stable")) {
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {}
                
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

        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-accepted", handleCallAccepted);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-rejected", () => cleanup());
        socket.on("call-ended", () => cleanup());

        return () => {
            socket.off("incoming-call", handleIncomingCall);
            socket.off("call-accepted", handleCallAccepted);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("call-rejected");
            socket.off("call-ended");
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
