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
    const { acceptCall, endCall, localStream, remoteStream } = useWebRTC();

    useEffect(() => {
        if (!socket) return;

        const fetchUserData = async (userId, callOffer, cType) => {
            try {
                const res = await api.get(`/user/${userId}/profile`);
                if (res.data.success && latestCallId.current === userId) {
                    dispatch(setIncomingCall({
                        isIncoming: true,
                        caller: userId,
                        type: cType,
                        offer: callOffer,
                        remoteUser: res.data.user
                    }));
                }
            } catch (err) {
                console.error("Error fetching caller profile", err);
            }
        };

        const handleIncomingCall = ({ from, offer, type }) => {
            latestCallId.current = from;
            dispatch(setIncomingCall({
                isIncoming: true,
                caller: from,
                type,
                offer,
                remoteUser: { _id: from, username: "Incoming Call..." }
            }));
            fetchUserData(from, offer, type);
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
    }, [socket, dispatch]);

    const handleAccept = () => {
        dispatch(setIncomingCall({ isIncoming: false }));
        acceptCall();
    };

    const handleReject = () => {
        dispatch(setIncomingCall({ isIncoming: false }));
        socket.emit("reject-call", { to: remoteUser?._id });
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
