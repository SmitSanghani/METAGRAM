import { Server } from "socket.io";
import express from "express";
import http from "http";

import { Conversation } from "../models/conversation.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [process.env.URL, 'http://localhost:5173', 'https://metagram-nine.vercel.app'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const userSocketMap = {}; // Maps userId to an ARRAY of socketIds [id1, id2, ...]

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
        const uidStr = String(userId);
        if (!userSocketMap[uidStr]) userSocketMap[uidStr] = [];
        if (!userSocketMap[uidStr].includes(socket.id)) {
            userSocketMap[uidStr].push(socket.id);
        }
        socket.userId = uidStr;
        console.log(`[SOCKET] User ${uidStr} connected. Socket ID: ${socket.id}`);
    }

    // Emit to ALL connected clients the array of online users (keys)
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on("register_user", (uId) => {
        if (!uId || uId === "undefined") return;
        const uidStr = String(uId);
        if (!userSocketMap[uidStr]) userSocketMap[uidStr] = [];
        if (!userSocketMap[uidStr].includes(socket.id)) {
            userSocketMap[uidStr].push(socket.id);
        }
        socket.userId = uidStr;
        console.log(`[SOCKET] User ${uidStr} registered. Socket ID: ${socket.id}`);
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });

    // Join a specific conversation room - SECURED with membership check
    socket.on("join_room", async (conversationId) => {
        if (!conversationId || !socket.userId) return;
        try {
            const sid = String(conversationId);
            // Verify membership before allowing join
            const isMember = await Conversation.exists({ _id: sid, participants: socket.userId });
            if (isMember) {
                socket.join(sid);
                console.log(`[SOCKET] User ${socket.userId} joined room ${sid}`);
            } else {
                console.warn(`[SOCKET] User ${socket.userId} attempted unauthorized join to room ${sid}`);
            }
        } catch (err) {
            console.error(`[SOCKET] Error in join_room for room ${conversationId}:`, err);
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

// Force remove a user from a specific room (e.g. when leaving a group)
export const removeFromRoom = (userId, roomId) => {
    const id = String(userId);
    const socketIds = userSocketMap[id];
    console.log(`[SOCKET DBG] removeFromRoom ${id} - Room: ${roomId} - Found Sockets:`, socketIds);
    if (socketIds) {
        socketIds.forEach(sid => {
            const socket = io.sockets.sockets.get(sid);
            if (socket) {
                socket.leave(String(roomId));
                console.log(`[SOCKET] Socket ${sid} for user ${id} forced to leave room ${roomId}`);
            }
        });
    }
};

// Securely broadcast to all current participants of a conversation (avoids room leaks)
export const broadcastToRoomParticipants = (participants, event, data) => {
    if (!participants || !Array.isArray(participants)) return;
    participants.forEach(p => {
        const id = p._id ? p._id.toString() : p.toString();
        broadcastToUser(id, event, data);
    });
};

export { app, io, server };
