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

        const handleCallEndedLocally = () => {
            latestCallId.current = null;
            dispatch(setIncomingCall({ isIncoming: false }));
            dispatch(setOutgoingCall({ isOutgoing: false }));
        };

        socket.on("call-ended", handleCallEndedLocally);
        socket.on("call-rejected", handleCallEndedLocally);

        return () => {
            socket.off("call-ended", handleCallEndedLocally);
            socket.off("call-rejected", handleCallEndedLocally);
        };
    }, [socket, dispatch]);

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
