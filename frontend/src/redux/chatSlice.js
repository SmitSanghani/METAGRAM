import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
    name: "chat",
    initialState: {
        onlineUsers: [],
        messages: [],
        unreadCounts: {}, // { userId: count }
        lastMessages: {}, // { userId: msgObject }
        selectedUser: null,
        chatUsers: [],
    },
    reducers: {
        setChatUsers: (state, action) => {
            state.chatUsers = action.payload;
        },
        reorderUsers: (state, action) => {
            const userId = action.payload;
            const index = state.chatUsers.findIndex(u => String(u._id) === String(userId));
            if (index !== -1) {
                const user = state.chatUsers[index];
                const others = state.chatUsers.filter(u => String(u._id) !== String(userId));
                state.chatUsers = [user, ...others];
            }
        },
        setSelectedUser: (state, action) => {
            state.selectedUser = action.payload;
        },
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        },
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            const newMessage = action.payload;
            const exists = state.messages.find(m => 
                (newMessage._id && m._id === newMessage._id) || 
                (newMessage.tempId && m.tempId === newMessage.tempId)
            );
            if (!exists) {
                state.messages.push(newMessage);
            }
        },
        removeTempMessage: (state, action) => {
            state.messages = state.messages.filter(m => m.tempId !== action.payload);
        },
        updateLastMessage: (state, action) => {
            const { userId, message } = action.payload;
            if (!state.lastMessages) state.lastMessages = {};
            state.lastMessages[userId] = message;
        },
        setUnreadCount: (state, action) => {
            const { userId, count } = action.payload;
            if (!state.unreadCounts) state.unreadCounts = {};
            state.unreadCounts[userId] = count;
        },
        setBulkUnreadCounts: (state, action) => {
            state.unreadCounts = action.payload || {};
        },
        incrementUnreadCount: (state, action) => {
            const userId = action.payload;
            if (!state.unreadCounts) state.unreadCounts = {};
            state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
        },
        clearUnreadCount: (state, action) => {
            const userId = action.payload;
            if (!state.unreadCounts) state.unreadCounts = {};
            state.unreadCounts[userId] = 0;
        },
        updateMessageStatus: (state, action) => {
            const { messageId, targetUserId, status } = action.payload;
            if (messageId) {
                const msg = state.messages.find(m => m._id === messageId);
                if (msg) Object.assign(msg, status);
            } else if (targetUserId) {
                state.messages.forEach(msg => {
                    // Mark as seen if it involves the target user
                    if (msg.senderId === targetUserId || msg.receiverId === targetUserId) {
                        Object.assign(msg, status);
                    }
                });
            }
        },
        updateReactions: (state, action) => {
            const { messageId, reactions } = action.payload;
            const msg = state.messages.find(m => m._id === messageId);
            if (msg) {
                msg.reactions = reactions;
            }
        },
        markUnsent: (state, action) => {
            const { messageId } = action.payload;
            const msg = state.messages.find(m => m._id === messageId);
            if (msg) {
                msg.isDeleted = true;
            }
        },
        markStoryUnsent: (state, action) => {
            const { storyId } = action.payload;
            state.messages.forEach(msg => {
                if (msg.storyId === storyId) {
                    msg.isDeleted = true;
                }
            });
        }
    }
});

export const {
    setSelectedUser,
    setChatUsers,
    reorderUsers,
    setOnlineUsers,
    setMessages,
    addMessage,
    updateMessageStatus,
    updateReactions,
    markUnsent,
    markStoryUnsent,
    setUnreadCount,
    setBulkUnreadCounts,
    incrementUnreadCount,
    clearUnreadCount,
    updateLastMessage,
    removeTempMessage
} = chatSlice.actions;

export default chatSlice.reducer;
