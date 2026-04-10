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
    const { callType, remoteUser, offer, isIncomingCall, isOutgoingCall, startTime } = useSelector(store => store.call);

    const pc = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const localStreamRef = useRef(null); // Keep ref for cleanup
    const remoteStreamRef = useRef(null); // Keep ref for accumulation
    const incomingIceCandidates = useRef([]); // ICE Buffer

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

    const endCall = useCallback((remoteId) => {
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        socket.emit("end-call", {
            to: remoteId,
            duration,
            type: callType,
            startTime: startTime
        });
        cleanup();
        dispatch(setActiveCall(false));
    }, [socket, callType, cleanup, dispatch, startTime]);

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
                console.log("[WebRTC] ICE CANDIDATE SENT");
                socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
            }
        };

        pc.current.ontrack = (event) => {
            console.log("[WebRTC] REMOTE TRACK RECEIVED:", event.track.kind, event.streams);
            
            if (event.streams && event.streams[0]) {
                console.log("[WebRTC] Using provided stream from event");
                setRemoteStream(event.streams[0]);
                remoteStreamRef.current = event.streams[0];
            } else {
                console.log("[WebRTC] No stream provided, creating from track");
                if (!remoteStreamRef.current) {
                    remoteStreamRef.current = new MediaStream();
                }
                
                // Avoid adding duplicate tracks
                const existingTracks = remoteStreamRef.current.getTracks();
                if (!existingTracks.find(t => t.id === event.track.id)) {
                    remoteStreamRef.current.addTrack(event.track);
                    // Force a new MediaStream object to trigger React re-render
                    setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
                }
            }
        };

        pc.current.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE STATE:", pc.current.iceConnectionState);
            if (pc.current.iceConnectionState === 'failed') {
                console.error("[WebRTC] ICE CONNECTION FAILED");
                pc.current.restartIce();
            }
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
                audio: { echoCancellation: true, noiseSuppression: true },
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
            
            stream.getTracks().forEach(track => {
                pc.current.addTrack(track, stream);
            });
            console.log("[WebRTC] Local tracks added to PeerConnection");
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
            await pc.current.setRemoteDescription(new RTCSessionDescription(offer));

            // Add any buffered ICE candidates that arrived early
            if (incomingIceCandidates.current.length > 0) {
                console.log(`[WebRTC] FLUSHING ${incomingIceCandidates.current.length} BUFFERED ICE CANDIDATES`);
                for (const candidate of incomingIceCandidates.current) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
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
            console.log("[WebRTC] CREATING OFFER");
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
            console.log("[WebRTC] ANSWER RECEIVED");
            if (pc.current) {
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
