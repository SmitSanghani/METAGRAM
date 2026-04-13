import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useWebRTC } from '@/hooks/useWebRTC';
import IncomingCallModal from './calling/IncomingCallModal';
import OutgoingCallModal from './calling/OutgoingCallModal';
import ActiveCallOverlay from './calling/ActiveCallOverlay';
import { setIncomingCall, setOutgoingCall, setActiveCall } from '@/redux/callSlice';
import api from '@/api';
import { audioGenerator } from '@/utils/audioGenerator';

const CallManager = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socketio);
    const { isIncomingCall, isOutgoingCall, isActiveCall, isCallConnected, remoteUser, offer, callType } = useSelector(store => store.call);

    const latestCallId = useRef(null);
    const audioRef = useRef(null);

    // Global Sound Management
    useEffect(() => {
        const stopAudio = () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                try { audioRef.current.load(); } catch(e) {}
                audioRef.current = null;
            }
            audioGenerator.stop();
        };

        if (isIncomingCall && !isActiveCall) {
            stopAudio();
            const audio = new Audio('/ringtone.mp3');
            audio.loop = true;
            audioRef.current = audio;
            audio.play().catch(() => audioGenerator.startRingTone());
        } 
        else if (isOutgoingCall && !isCallConnected) {
            stopAudio();
            const audio = new Audio('/dialtone.mp3');
            audio.loop = true;
            audioRef.current = audio;
            audio.play().catch(() => audioGenerator.startDialTone());
        }
        else {
            stopAudio();
        }

        return () => stopAudio();
    }, [isIncomingCall, isOutgoingCall, isActiveCall, isCallConnected]);


    // Initialize WebRTC hook
    const { acceptCall, endCall, saveCallLog, preWarmMedia, localStream, remoteStream } = useWebRTC();

    useEffect(() => {
        if (!socket) return;

        // User data fetch no longer needed as it is passed via socket for instant display

        const handleIncomingCall = ({ from, offer, type, callerInfo }) => {
            latestCallId.current = from;
            
            // Pre-warm local media (camera/mic) as soon as call arrives
            // This makes the connection nearly instant when user clicks "Accept"
            preWarmMedia(type);

            // Use provided caller info for instant display
            const remoteUserData = callerInfo || { _id: from, username: "Incoming Call..." };

            // If we are already in an active call with SOMEONE ELSE, send busy signal
            if (isActiveCall && remoteUser?._id !== from) {
                console.log("[CallManager] Busy, already in call with", remoteUser?.username);
                socket.emit("peer-busy", { to: from });
                return;
            }

            // If it's the same user and we are already active, WebRTCContext handles it silently
            if (isActiveCall && remoteUser?._id === from) return;

            dispatch(setIncomingCall({
                isIncoming: true,
                caller: from,
                type,
                offer,
                remoteUser: remoteUserData
            }));
        };

        const handleCallEndedLocally = () => {
            latestCallId.current = null;
            dispatch(setIncomingCall({ isIncoming: false }));
            dispatch(setOutgoingCall({ isOutgoing: false }));
        };

        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-ended", handleCallEndedLocally);
        socket.on("call-rejected", handleCallEndedLocally);

        return () => {
            socket.off("incoming-call", handleIncomingCall);
            socket.off("call-ended", handleCallEndedLocally);
            socket.off("call-rejected", handleCallEndedLocally);
        };
    }, [socket, dispatch, isActiveCall, remoteUser, acceptCall]);

    // Shared immediate audio stop — called directly, no state delays
    const stopAudioNow = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            try { audioRef.current.load(); } catch(e) {}
            audioRef.current = null;
        }
        audioGenerator.stop();
    };

    const handleAccept = () => {
        stopAudioNow(); // Stop immediately, don't wait for state
        // acceptCall internally dispatches setActiveCall(true)
        acceptCall();
        dispatch(setIncomingCall({ isIncoming: false }));
    };

    const handleReject = () => {
        stopAudioNow(); // Stop immediately
        const targetId = remoteUser?._id;
        dispatch(setIncomingCall({ isIncoming: false }));
        socket.emit("reject-call", { to: targetId });
        
        if (targetId) {
            saveCallLog({
                remoteId: targetId,
                duration: 0,
                type: callType,
                status: 'rejected'
            });
        }
    };

    const handleEndCall = (remoteId) => {
        endCall(remoteId);
    };

    return (
        <>
            {isIncomingCall && (
                <IncomingCallModal
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}
            {isOutgoingCall && !isCallConnected && (
                <OutgoingCallModal onCancel={handleEndCall} />
            )}
            {isActiveCall && (isCallConnected || isOutgoingCall || !isIncomingCall) && (
                <ActiveCallOverlay
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onEndCall={handleEndCall}
                    isConnecting={!isCallConnected}
                />
            )}
        </>
    );
};

export default CallManager;
