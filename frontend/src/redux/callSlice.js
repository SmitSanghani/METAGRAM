import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
    name: "call",
    initialState: {
        isIncomingCall: false,
        isOutgoingCall: false,
        isActiveCall: false,
        isCallConnected: false,
        caller: null,
        receiver: null,
        callType: null, // 'voice' or 'video'
        offer: null,
        answer: null,
        remoteUser: null,
    },
    reducers: {
        setIncomingCall: (state, action) => {
            state.isIncomingCall = action.payload.isIncoming;
            if (action.payload.caller !== undefined) state.caller = action.payload.caller;
            if (action.payload.type !== undefined) state.callType = action.payload.type;
            if (action.payload.offer !== undefined) state.offer = action.payload.offer;
            if (action.payload.remoteUser !== undefined) state.remoteUser = action.payload.remoteUser;
        },
        setOutgoingCall: (state, action) => {
            state.isOutgoingCall = action.payload.isOutgoing;
            if (action.payload.receiver !== undefined) state.receiver = action.payload.receiver;
            if (action.payload.type !== undefined) state.callType = action.payload.type;
            if (action.payload.remoteUser !== undefined) state.remoteUser = action.payload.remoteUser;
        },
        setActiveCall: (state, action) => {
            state.isActiveCall = action.payload;
            if (!action.payload) {
                // Reset everything when call ends
                state.isIncomingCall = false;
                state.isOutgoingCall = false;
                state.isCallConnected = false;
                state.caller = null;
                state.receiver = null;
                state.callType = null;
                state.offer = null;
                state.answer = null;
                state.remoteUser = null;
            }
        },
        setCallConnected: (state, action) => {
            state.isCallConnected = action.payload;
        },
        setCallAnswer: (state, action) => {
            state.answer = action.payload;
        }
    }
});

export const { setIncomingCall, setOutgoingCall, setActiveCall, setCallAnswer, setCallConnected } = callSlice.actions;
export default callSlice.reducer;
