import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useWebRTC } from '@/hooks/useWebRTC';
import IncomingCallModal from './calling/IncomingCallModal';
import OutgoingCallModal from './calling/OutgoingCallModal';
import ActiveCallOverlay from './calling/ActiveCallOverlay';
import { setIncomingCall, setOutgoingCall, setActiveCall } from '@/redux/callSlice';
import api from '@/api';

const CallManager = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socketio);
    const { isIncomingCall, isOutgoingCall, isActiveCall, isCallConnected, remoteUser, offer, callType } = useSelector(store => store.call);

    const latestCallId = useRef(null);

    // Initialize WebRTC hook
    const { acceptCall, endCall, saveCallLog, localStream, remoteStream } = useWebRTC();

    useEffect(() => {
        if (!socket) return;

        // User data fetch no longer needed as it is passed via socket for instant display

        const handleIncomingCall = ({ from, offer, type, callerInfo }) => {
            latestCallId.current = from;
            
            // Use provided caller info for instant display
            const remoteUserData = callerInfo || { _id: from, username: "Incoming Call..." };

            // RECONNECTION LOGIC: If already in call with this person, auto-accept their new offer
            if (isActiveCall && remoteUser?._id === from) {
                console.log("[CallManager] Seamlessly reconnecting with same user...", from);
                dispatch(setIncomingCall({
                    isIncoming: false,
                    caller: from,
                    type,
                    offer,
                    remoteUser: remoteUserData
                }));
                acceptCall(offer, remoteUserData);
                return;
            }

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

    const handleAccept = () => {
        dispatch(setIncomingCall({ isIncoming: false }));
        acceptCall();
    };

    const handleReject = () => {
        const targetId = remoteUser?._id;
        dispatch(setIncomingCall({ isIncoming: false }));
        socket.emit("reject-call", { to: targetId });
        
        // Log rejected call to chat
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
