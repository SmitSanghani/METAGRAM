import { Call } from "../models/call.model.js";

export const handleCallEvents = (io, socket, userSocketMap) => {
    
    // 1. Initial Call Request
    socket.on("call-user", ({ to, offer, type }) => {
        const receiverSockets = userSocketMap[to];
        if (receiverSockets && receiverSockets.length > 0) {
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("incoming-call", {
                    from: socket.userId,
                    offer,
                    type,
                    callerInfo
                });
            });
        } else {
            // User is offline
            socket.emit("call-error", { message: "User is currently offline" });
        }
    });

    // 2. Answer Call
    socket.on("answer-call", ({ to, answer }) => {
        const callerSockets = userSocketMap[to];
        if (callerSockets) {
            callerSockets.forEach(socketId => {
                io.to(socketId).emit("call-accepted", {
                    from: socket.userId,
                    answer
                });
            });
        }
    });

    // 3. ICE Candidates exchange
    socket.on("ice-candidate", ({ to, candidate }) => {
        const targetSockets = userSocketMap[to];
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("ice-candidate", {
                    from: socket.userId,
                    candidate
                });
            });
        }
    });

    // 4. Reject Call
    socket.on("reject-call", ({ to }) => {
        const callerSockets = userSocketMap[to];
        if (callerSockets) {
            callerSockets.forEach(socketId => {
                io.to(socketId).emit("call-rejected", { from: socket.userId });
            });
        }
        
        // Log missed/rejected call
        Call.create({
            caller: to,
            receiver: socket.userId,
            type: 'voice', // Default if unknown at this stage
            status: 'rejected'
        }).catch(err => console.error("Error logging rejected call:", err));
    });

    // 5. End Call
    socket.on("end-call", ({ to, duration, type, startTime }) => {
        const targetSockets = userSocketMap[to];
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("call-ended", { from: socket.userId });
            });
        }

        // Log completed call
        if (startTime) {
            Call.create({
                caller: socket.userId, // This assumes the sender of 'end-call' is the one who initiated or was in it
                receiver: to,
                type: type || 'voice',
                status: 'completed',
                startTime: new Date(startTime),
                endTime: new Date(),
                duration: duration || 0
            }).catch(err => console.error("Error logging completed call:", err));
        }
    });

    // 6. User Busy
    socket.on("user-busy", ({ to }) => {
        const targetSockets = userSocketMap[to];
        if (targetSockets) {
            targetSockets.forEach(socketId => {
                io.to(socketId).emit("peer-busy", { from: socket.userId });
            });
        }
    });
};
