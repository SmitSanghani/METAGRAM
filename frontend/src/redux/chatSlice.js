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
        selectedChatTheme: { id: 'default', name: 'Default', backgroundImage: null },
    },
    reducers: {
        setSelectedChatTheme: (state, action) => {
            state.selectedChatTheme = action.payload || { name: 'Default', backgroundImage: null };
        },
        setChatUsers: (state, action) => {
            state.chatUsers = action.payload;
        },
        reorderUsers: (state, action) => {
            const sid = String(action.payload);
            const index = state.chatUsers.findIndex(u => String(u._id) === sid || String(u.conversationId) === sid);
            if (index !== -1) {
                const user = state.chatUsers[index];
                const others = state.chatUsers.filter(u => String(u._id) !== String(user._id));
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
            const tempId = action.payload;
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
            if (state.lastMessages) {
                for (const userId in state.lastMessages) {
                    if (state.lastMessages[userId]?._id === messageId) {
                        state.lastMessages[userId].isDeleted = true;
                    }
                }
            }
        },
        markStoryUnsent: (state, action) => {
            const { storyId } = action.payload;
            state.messages.forEach(msg => {
                if (msg.storyId === storyId) {
                    msg.isDeleted = true;
                }
            });
            if (state.lastMessages) {
                for (const userId in state.lastMessages) {
                    if (state.lastMessages[userId]?.storyId === storyId) {
                        state.lastMessages[userId].isDeleted = true;
                    }
                }
            }
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
            const isSelected = state.selectedUser && String(state.selectedUser._id) === userId;
            if (isSelected) state.messages = [];
            if (state.lastMessages && state.lastMessages[userId]) delete state.lastMessages[userId];
            if (state.unreadCounts) state.unreadCounts[userId] = 0;
            state.chatUsers = state.chatUsers.filter(u => String(u._id) !== userId);
        },
        clearChatLocally: (state, action) => {
            const userId = String(action.payload);
            const isSelected = state.selectedUser && String(state.selectedUser._id) === userId;
            if (isSelected) state.messages = [];
            if (state.lastMessages && state.lastMessages[userId]) delete state.lastMessages[userId];
            if (state.unreadCounts) state.unreadCounts[userId] = 0;
        },
        updateChatUserMembership: (state, action) => {
            const { conversationId, participants } = action.payload;
            const index = state.chatUsers.findIndex(u => String(u._id) === String(conversationId));
            if (index !== -1) {
                state.chatUsers[index].participants = participants;
            }
            if (state.selectedUser && String(state.selectedUser._id) === String(conversationId)) {
                state.selectedUser = { ...state.selectedUser, participants: participants };
            }
        }
    }
});

export const {
    setSelectedChatTheme,
    setChatUsers,
    setOnlineUsers,
    setSelectedUser,
    setMessages,
    addMessage,
    updateMessageStatus,
    incrementUnreadCount,
    clearUnreadCount,
    setBulkUnreadCounts,
    updateLastMessage,
    reorderUsers,
    clearChat,
    addChatUser,
    updateReactions,
    updateChatUserConversation,
    markUnsent,
    removeTempMessage,
    markStoryUnsent,
    clearChatLocally,
    updateChatUserMembership
} = chatSlice.actions;

export default chatSlice.reducer;
