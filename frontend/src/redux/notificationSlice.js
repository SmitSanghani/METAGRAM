import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
    name: "notification",
    initialState: {
        notifications: [],
    },
    reducers: {
        setNotifications: (state, action) => {
            state.notifications = action.payload;
        },
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
        },
        markAllAsRead: (state) => {
            state.notifications = state.notifications.map(n => ({ ...n, read: true }));
        },
        markSingleAsRead: (state, action) => {
            state.notifications = state.notifications.map(n => 
                n._id === action.payload ? { ...n, read: true } : n
            );
        },
        removeNotification: (state, action) => {
            const { senderId, type } = action.payload;
            state.notifications = state.notifications.filter(n => !(n.sender._id === senderId && n.type === type));
        },
        removeNotificationById: (state, action) => {
            state.notifications = state.notifications.filter(n => n._id !== action.payload);
        },
        updateNotificationStatus: (state, action) => {
            const { senderId, type, status } = action.payload;
            state.notifications = state.notifications.map(n => {
                const nSenderId = n.sender?._id || n.sender;
                if (String(nSenderId) === String(senderId) && n.type === type) {
                    return { ...n, requestStatus: status };
                }
                return n;
            });
        }
    }
});

export const { setNotifications, addNotification, markAllAsRead, markSingleAsRead, removeNotification, removeNotificationById, updateNotificationStatus } = notificationSlice.actions;
export default notificationSlice.reducer;
