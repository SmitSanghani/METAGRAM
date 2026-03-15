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
            const userId = String(action.payload);
            const index = state.chatUsers.findIndex(u => String(u._id) === userId);
            if (index !== -1) {
                const user = state.chatUsers[index];
                const others = state.chatUsers.filter(u => String(u._id) !== userId);
                state.chatUsers = [user, ...others];
            }
        },
        addChatUser: (state, action) => {
            const newUser = action.payload;
            const exists = state.chatUsers.find(u => String(u._id) === String(newUser._id));
            if (!exists) {
                state.chatUsers = [newUser, ...state.chatUsers];
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
            const index = state.messages.findIndex(m =>
                (newMessage._id && m._id === newMessage._id) ||
                (newMessage.tempId && m.tempId === newMessage.tempId)
            );
            if (index !== -1) {
                // Replace existing message (clearing isLoading and updating IDs)
                state.messages[index] = { ...newMessage, isLoading: false };
            } else {
                state.messages.push(newMessage);
            }
        },
        removeTempMessage: (state, action) => {
            const { tempId } = action.payload;
            state.messages = state.messages.filter(m => m.tempId !== tempId);
        },
        updateLastMessage: (state, action) => {
            const { userId, message } = action.payload;
            const sId = String(userId);
            if (!state.lastMessages) state.lastMessages = {};
            state.lastMessages[sId] = message;
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
            const userId = String(action.payload);
            if (!state.unreadCounts) state.unreadCounts = {};
            state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
        },
        clearUnreadCount: (state, action) => {
            const userId = String(action.payload);
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
            const msg = state.messages.find(m => String(m._id) === String(messageId));
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
        },
        updateChatUserConversation: (state, action) => {
            const { userId, conversationId } = action.payload;
            const index = state.chatUsers.findIndex(u => String(u._id) === String(userId));
            if (index !== -1) {
                state.chatUsers[index].conversationId = conversationId;
            }
        },
        clearChat: (state, action) => {
            const userId = String(action.payload);
            state.messages = [];
            if (state.lastMessages && state.lastMessages[userId]) {
                delete state.lastMessages[userId];
            }
            state.chatUsers = state.chatUsers.filter(u => String(u._id) !== userId);
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
    removeTempMessage,
    updateChatUserConversation,
    addChatUser,
    clearChat
} = chatSlice.actions;

export default chatSlice.reducer;
