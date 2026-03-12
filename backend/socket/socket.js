import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const userSocketMap = {}; // Maps userId to an ARRAY of socketIds [id1, id2, ...]

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
        if (!userSocketMap[userId]) userSocketMap[userId] = [];
        userSocketMap[userId].push(socket.id);
    }

    // Emit to ALL connected clients the array of online users (keys)
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on("register_user", (uId) => {
        const uidStr = String(uId);
        if (!userSocketMap[uidStr]) userSocketMap[uidStr] = [];
        if (!userSocketMap[uidStr].includes(socket.id)) {
            userSocketMap[uidStr].push(socket.id);
        }
        socket.userId = uidStr;
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });

    // Join a specific conversation room
    socket.on("join_room", (conversationId) => {
        if (conversationId) {
            socket.join(String(conversationId));
        }
    });

    // Leave a specific conversation room
    socket.on("leave_room", (conversationId) => {
        if (conversationId) {
            socket.leave(String(conversationId));
        }
    });

    // Helper to emit to a specific user (all their tabs)
    const emitToUser = (receiverId, event, data) => {
        const socketIds = userSocketMap[receiverId];
        console.log(`[SOCKET DBG] emitToUser ${receiverId} - Event: ${event} - Found Sockets:`, socketIds);
        if (socketIds) {
            socketIds.forEach(id => io.to(id).emit(event, data));
        }
    };

    // 1. Chat logic events:
    socket.on("typing", ({ receiverId }) => {
        emitToUser(receiverId, "user_typing", { senderId: userId });
    });

    socket.on("stop_typing", ({ receiverId }) => {
        emitToUser(receiverId, "user_stopped_typing", { senderId: userId });
    });

    socket.on("message_seen", ({ messageId, senderId }) => {
        emitToUser(senderId, "message_seen_update", { messageId, receiverId: userId });
    });

    socket.on("message_reaction", ({ messageId, receiverId, emoji, reactions }) => {
        emitToUser(receiverId, "message_reaction_update", { messageId, senderId: userId, emoji, reactions });
    });

    socket.on("message_delete", ({ messageId, receiverId }) => {
        emitToUser(receiverId, "message_deleted", { messageId });
    });

    // We've moved message broadcasting to the API controller (message.controller.js)
    // to ensure everyone gets fully populated data and real MongoDB IDs.
    // Redundant socket-level "send_message" below is removed to prevent duplicate messages.
    /*
    socket.on("send_message", (data) => {
        // ... redundant ...
    });
    */

    // 2. Stories logic events:
    socket.on("story_like", ({ storyId, receiverId }) => {
        if (receiverId !== userId) {
            emitToUser(receiverId, "notification_new_story_like", { storyId, senderId: userId });
        }
    });

    socket.on("story_comment", ({ storyId, receiverId, commentText }) => {
        if (receiverId !== userId) {
            emitToUser(receiverId, "notification_new_story_comment", { storyId, senderId: userId, text: commentText });
        }
    });

    socket.on('disconnect', () => {
        const uId = socket.userId || userId;
        if (uId && userSocketMap[uId]) {
            userSocketMap[uId] = userSocketMap[uId].filter(id => id !== socket.id);
            if (userSocketMap[uId].length === 0) {
                delete userSocketMap[uId];
            }
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

export const getReceiverSocketId = (receiverId) => {
    const id = String(receiverId);
    return userSocketMap[id] ? userSocketMap[id][0] : null;
};

// New helper for broadcasting to all tabs
export const broadcastToUser = (receiverId, event, data) => {
    const id = String(receiverId);
    const socketIds = userSocketMap[id];
    console.log(`[SOCKET DBG] broadcastToUser ${id} - Event: ${event} - Found Sockets:`, socketIds);
    if (socketIds) {
        socketIds.forEach(sid => io.to(sid).emit(event, data));
    }
};

export { app, io, server };
