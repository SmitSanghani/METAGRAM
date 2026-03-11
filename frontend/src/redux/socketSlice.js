import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
    name: "socketio",
    initialState: {
        socket: null
    },
    reducers: {
        // Warning: storing non-serializable objects in Redux can cause warnings
        setSocket: (state, action) => {
            state.socket = action.payload;
        }
    }
});
export const { setSocket } = socketSlice.actions;
export default socketSlice.reducer;
