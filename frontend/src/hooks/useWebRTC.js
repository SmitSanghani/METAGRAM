import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIncomingCall, setOutgoingCall, setActiveCall, setCallAnswer, setCallConnected, setStartTime } from '../redux/callSlice';
import { toast } from 'sonner';

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

export const useWebRTC = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socketio);
    const { user } = useSelector(store => store.auth);
    const { callType, remoteUser, offer, isIncomingCall, isOutgoingCall, isActiveCall, startTime } = useSelector(store => store.call);

    const pc = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const localStreamRef = useRef(null); // Keep ref for cleanup
    const remoteStreamRef = useRef(null); // Keep ref for accumulation
    const incomingIceCandidates = useRef([]); // ICE Buffer

    // Recording State
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const mixedStreamRef = useRef(null);

    const startRecording = useCallback((lStream, rStream) => {
        if (!lStream || !rStream) return;
        try {
            console.log("[WebRTC] STARTING RECORDING");
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();

            const localSource = audioCtx.createMediaStreamSource(lStream);
            const remoteSource = audioCtx.createMediaStreamSource(rStream);

            localSource.connect(dest);
            remoteSource.connect(dest);

            mixedStreamRef.current = dest.stream;
            mediaRecorder.current = new MediaRecorder(dest.stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start();
        } catch (err) {
            console.error("[WebRTC] Error starting recorder:", err);
        }
    }, []);

    const stopAndUploadRecording = useCallback(async (remoteId, finalDuration, type) => {
        if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;

        console.log("[WebRTC] STOPPING AND UPLOADING RECORDING");
        
        return new Promise((resolve) => {
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('recording', audioBlob, `call_recording_${Date.now()}.webm`);
                formData.append('receiverId', remoteId);
                formData.append('callType', type);
                formData.append('status', 'completed');
                formData.append('duration', finalDuration);

                try {
                    // We need to import axios or use fetch here. Assuming axios is available in the project context or using standard fetch.
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'}/message/save-call-log`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}` // Basic auth assumption
                        },
                        body: formData
                    });
                    const result = await response.json();
                    console.log("[WebRTC] Call log saved:", result);
                } catch (err) {
                    console.error("[WebRTC] Error uploading recording:", err);
                }
                resolve();
            };
            mediaRecorder.current.stop();
        });
    }, []);

    const cleanup = useCallback(() => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }
        remoteStreamRef.current = null;
        setRemoteStream(null);
        incomingIceCandidates.current = [];
    }, []);

    const endCall = useCallback(async (remoteId) => {
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        // Stop recording and upload before emitting socket event to ensure data is captured
        if (mediaRecorder.current) {
            await stopAndUploadRecording(remoteId, duration, callType);
        }

        socket.emit("end-call", {
            to: remoteId,
            duration,
            type: callType,
            startTime: startTime
        });
        cleanup();
        dispatch(setActiveCall(false));
    }, [socket, callType, cleanup, dispatch, startTime, stopAndUploadRecording]);

    // Initialize WebRTC
    const setupPeerConnection = useCallback(async (remoteId, type) => {
        console.log("[WebRTC] Setting up PeerConnection for", remoteId, "Type:", type);
        
        if (pc.current) {
            console.log("[WebRTC] Closing existing connection before new setup");
            pc.current.close();
        }

        pc.current = new RTCPeerConnection(servers);

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        pc.current.oniceconnectionstatechange = () => {
            console.log("ICE STATE:", pc.current.iceConnectionState);
            if (pc.current.iceConnectionState === 'failed') {
                console.warn("[WebRTC] ICE CONNECTION FAILED, RESTARTING ICE");
                pc.current.restartIce();
            }
        };

        pc.current.ontrack = (event) => {
            console.log("REMOTE TRACK RECEIVED");
            
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
            }

            // Sync with existing tracks
            if (!remoteStreamRef.current.getTracks().find(t => t.id === event.track.id)) {
                remoteStreamRef.current.addTrack(event.track);
                console.log(`[WebRTC] Added ${event.track.kind} track to remote stream`);
            }

            // Always update state to trigger re-renders with the latest stream reference
            setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
        };


        pc.current.onconnectionstatechange = () => {
            console.log("[WebRTC] CONNECTION STATE:", pc.current.connectionState);
            if (pc.current.connectionState === 'connected') {
                console.log("[WebRTC] CALL FULLY CONNECTED");
                const now = Date.now();
                if (!startTime) {
                    dispatch(setStartTime(now));
                }
                dispatch(setCallConnected(true));

                // Start recording when connected
                if (localStreamRef.current && remoteStreamRef.current) {
                    startRecording(localStreamRef.current, remoteStreamRef.current);
                }
            } else if (pc.current.connectionState === 'failed' || pc.current.connectionState === 'disconnected') {
                console.warn("[WebRTC] Connection failed or disconnected, state:", pc.current.connectionState);
                // Try to recover or wait before ending
                setTimeout(() => {
                    if (pc.current && (pc.current.connectionState === 'failed' || pc.current.connectionState === 'disconnected')) {
                         console.log("[WebRTC] Recovery failed, ending call");
                         endCall(remoteId);
                    }
                }, 5000); // 5 seconds Grace period
            }
        };

        // Get Local Media
        try {
            console.log("[WebRTC] REQUESTING LOCAL MEDIA");
            const constraints = {
                audio: { 
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    googEchoCancellation: { ideal: true },
                    googAutoGainControl: { ideal: true },
                    googNoiseSuppression: { ideal: true },
                    googHighpassFilter: { ideal: true },
                },
                video: (type === 'video' || callType === 'video') ? { 
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false
            };

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                console.warn("[WebRTC] Precise constraints failed, trying basic:", err);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: (type === 'video' || callType === 'video') });
                } catch (basicErr) {
                    console.warn("[WebRTC] Basic media failed, trying audio only:", basicErr);
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                }
            }

            localStreamRef.current = stream;
            setLocalStream(stream);
            console.log("LOCAL STREAM CREATED");
            
            stream.getTracks().forEach(track => {
                console.log("ADDING LOCAL TRACK");
                pc.current.addTrack(track, stream);
            });
        } catch (err) {
            console.error("[WebRTC] FATAL: Could not access ANY media devices:", err);
            toast.error("Permissions denied. Could not access your camera/microphone.");
            // If they can't even get audio, we can't really call.
            setTimeout(() => {
                 if (isIncomingCall || isOutgoingCall) {
                    endCall(remoteId);
                 }
            }, 3000);
        }
    }, [callType, socket, dispatch, endCall, isIncomingCall, isOutgoingCall]);

    // Handle incoming call accept
    const acceptCall = useCallback(async () => {
        if (!offer || !remoteUser) return;

        console.log("[WebRTC] CALL ACCEPTED");
        dispatch(setActiveCall(true)); // Show UI instantly
        await setupPeerConnection(remoteUser._id, callType);

        try {
            console.log("[WebRTC] SETTING REMOTE OFFER");
            if (pc.current.signalingState !== "stable") {
                console.warn("[WebRTC] Signaling state is not stable, clearing existing state");
                // This shouldn't normally happen on first offer, but good for safety
            }
            
            await pc.current.setRemoteDescription(new RTCSessionDescription(offer));

            // Flush buffered candidates
            if (incomingIceCandidates.current.length > 0) {
                console.log(`[WebRTC] FLUSHING ${incomingIceCandidates.current.length} BUFFERED ICE CANDIDATES`);
                for (const candidate of incomingIceCandidates.current) {
                    try {
                        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                         console.error("[WebRTC] Error adding buffered candidate:", e);
                    }
                }
                incomingIceCandidates.current = [];
            }

            console.log("[WebRTC] CREATING ANSWER");
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);

            console.log("[WebRTC] ANSWER SENT");
            socket.emit("answer-call", { to: remoteUser._id, answer });
        } catch (err) {
            console.error("[WebRTC] Error accepting call:", err);
            endCall(remoteUser._id);
        }
    }, [offer, remoteUser, setupPeerConnection, socket, endCall]);

    // Start outgoing call
    const startCall = useCallback(async (targetUser, type) => {
        console.log("[WebRTC] CALL REQUEST INITIATED to", targetUser._id);
        dispatch(setOutgoingCall({ isOutgoing: true, receiver: targetUser._id, type, remoteUser: targetUser }));
        dispatch(setActiveCall(true)); // Show UI instantly

        await setupPeerConnection(targetUser._id, type);

        try {
            console.log("OFFER CREATED");
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);

            console.log("[WebRTC] OFFER SENT");
            socket.emit("call-user", { to: targetUser._id, offer, type });
        } catch (err) {
            console.error("[WebRTC] Error starting call:", err);
            endCall(targetUser._id);
        }
    }, [dispatch, setupPeerConnection, socket, endCall]);

    // Socket listeners for signaling
    useEffect(() => {
        if (!socket) return;

        const handleCallAccepted = async ({ from, answer }) => {
            console.log("ANSWER RECEIVED");
            if (pc.current) {
                if (pc.current.signalingState !== "have-local-offer") {
                    console.warn("[WebRTC] Ignoring call-accepted because signaling state is", pc.current.signalingState);
                    return;
                }

                await pc.current.setRemoteDescription(new RTCSessionDescription(answer));

                // Flush buffered candidates for the caller
                if (incomingIceCandidates.current.length > 0) {
                    console.log(`[WebRTC] FLUSHING ${incomingIceCandidates.current.length} BUFFERED ICE CANDIDATES (Caller Side)`);
                    for (const candidate of incomingIceCandidates.current) {
                        try {
                            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) { console.error("Error adding buffered candidate", e); }
                    }
                    incomingIceCandidates.current = [];
                }
            }
        };

        const handleIceCandidate = async ({ from, candidate }) => {
            console.log("[WebRTC] ICE CANDIDATE RECEIVED");
            if (pc.current && pc.current.remoteDescription) {
                try {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("[WebRTC] Error adding ICE candidate:", e);
                }
            } else {
                console.log("[WebRTC] BUFFERING EARLY ICE CANDIDATE");
                incomingIceCandidates.current.push(candidate);
            }
        };

        const handleCallRejected = () => {
            toast.error("Call rejected");
            cleanup();
            dispatch(setActiveCall(false));
        };

        const handleCallEnded = () => {
            cleanup();
            dispatch(setActiveCall(false));
            toast.info("Call ended");
        };

        const handlePeerBusy = () => {
            toast.error("User is busy on another call");
            cleanup();
            dispatch(setActiveCall(false));
        };

        socket.on("call-accepted", handleCallAccepted);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-ended", handleCallEnded);
        socket.on("peer-busy", handlePeerBusy);
 
         return () => {
             socket.off("call-accepted", handleCallAccepted);
             socket.off("ice-candidate", handleIceCandidate);
             socket.off("call-rejected", handleCallRejected);
             socket.off("call-ended", handleCallEnded);
             socket.off("peer-busy", handlePeerBusy);
         };
     }, [socket, cleanup, dispatch]);
 
     // Automatic reconnection logic on mount
     useEffect(() => {
         if (!socket || !user) return;
 
         const handleReconnection = async () => {
             // If we have an active call flag but no peer connection, we likely refreshed
             if (isActiveCall && !pc.current && remoteUser) {
                 console.log("[WebRTC] DETECTED ACTIVE SESSION ON RELOAD, ATTEMPTING RECONNECTION...");
                 
                 if (isOutgoingCall) {
                     // We were the caller, try to re-initiate
                     startCall(remoteUser, callType);
                 } else if (offer) {
                     // We were the receiver, try to re-accept
                     acceptCall();
                 } else {
                     // Fallback: If we were active but no clear state, try to re-dial
                     startCall(remoteUser, callType);
                 }
             }
         };
 
         // Delay slightly to ensure socket is ready and hydrated
         const timer = setTimeout(handleReconnection, 1200);
         return () => clearTimeout(timer);
     }, [socket, user, isActiveCall, remoteUser, isOutgoingCall, offer, callType, startCall, acceptCall]);
 
     return {
        startCall,
        acceptCall,
        endCall,
        localStream,
        remoteStream,
        pc: pc.current
    };
};
