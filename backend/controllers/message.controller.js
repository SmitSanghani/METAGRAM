import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { broadcastToUser, io } from "../socket/socket.js";

// For Chatting 
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const sender = await User.findById(senderId).select("username profilePicture");
        const receiverId = req.params.id;
        const { message, messageType = 'text', storyId = null, reelId = null, postId = null, replyTo = null, tempId } = req.body;

        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found" });

        // BLOCK CHECK:
        const senderUser = await User.findById(senderId);
        if (senderUser.blockedUsers.includes(receiverId) || senderUser.blockedBy.includes(receiverId)) {
            return res.status(403).json({ success: false, message: "You cannot message this account." });
        }

        // Validation to prevent 500 errors if ID is malformed
        if (!receiverId || receiverId.length !== 24) {
            return res.status(400).json({ success: false, message: "Invalid receiver ID" });
        }

        const file = req.file;
        let mediaUrl = req.body.mediaUrl || "";

        if (file) {
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');

            if (isImage) {
                const optimizedImageBuffer = await sharp(file.buffer)
                    .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
                    .toFormat('jpeg', { quality: 80 })
                    .toBuffer();
                const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
                const cloudResponse = await cloudinary.uploader.upload(fileUri, {
                    folder: "instagram-clone/messages",
                });
                mediaUrl = cloudResponse.secure_url;
            } else if (isVideo) {
                // Promise wrapper for video upload
                const uploadVideo = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream({
                            resource_type: "video",
                            folder: "instagram-clone/messages",
                        }, (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        });
                        stream.end(file.buffer);
                    });
                };
                const cloudResponse = await uploadVideo();
                mediaUrl = cloudResponse.secure_url;
            }
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: []
            });
        }

        const newMessageData = {
            senderId,
            receiverId,
            message,
            messageType: file ? (file.mimetype.startsWith('image/') ? 'image' : 'video') : messageType,
            storyId,
            reelId,
            postId,
            replyTo,
            mediaUrl
        };

        conversation.messages.push(newMessageData);
        await conversation.save();

        // Get the newly created message (last in the array)
        let savedMessage = conversation.messages[conversation.messages.length - 1];

        // Manual "population" for replyTo if it exists
        let replyToPopulated = null;
        if (replyTo) {
            const replyMsg = conversation.messages.id(replyTo);
            if (replyMsg) {
                replyToPopulated = {
                    _id: replyMsg._id,
                    message: replyMsg.message,
                    senderId: replyMsg.senderId,
                    messageType: replyMsg.messageType
                };
            }
        }

        // Populate story and reactions for broadcast
        await conversation.populate([
            { path: 'messages.storyId', select: 'mediaUrl mediaType userId' },
            { path: 'messages.reelId', select: 'videoUrl caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.postId', select: 'image caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.reactions.userId', select: 'username profilePicture' }
        ]);

        // Get the fully populated version of our new message
        const newMessage = conversation.messages.id(savedMessage._id);
        const messageObj = newMessage.toObject();
        messageObj.senderUsername = sender.username;
        messageObj.senderProfilePicture = sender.profilePicture;

        // Add the manually populated reply info
        if (replyToPopulated) {
            messageObj.replyTo = replyToPopulated;
        }

        // Include metadata for frontend tracking/room logic
        messageObj.tempId = tempId;
        messageObj.conversationId = conversation._id.toString();

        // 1. Broadcast to the conversation room (Primary for participants currently in chat)
        io.to(conversation._id.toString()).emit("receive_message", messageObj);

        // 2. Also notify receiver directly (for toasts and sidebar updates when NOT directly in room)
        if (String(receiverId) !== String(senderId)) {
            broadcastToUser(receiverId, "new_message_notification", messageObj);
        }

        if (messageType === 'story_reply') broadcastToUser(receiverId, "story_reply_receive", messageObj);
        else if (messageType === 'story_reaction') broadcastToUser(receiverId, "story_reaction_receive", messageObj);

        return res.status(201).json({ success: true, newMessage: messageObj });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        }).populate([
            { path: 'messages.storyId', select: 'mediaUrl mediaType userId' },
            { path: 'messages.reelId', select: 'videoUrl caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.postId', select: 'image caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.reactions.userId', select: 'username profilePicture' }
        ]);

        if (!conversation) return res.status(200).json({ success: true, messages: [], conversationId: null });

        // Populate replyTo content manually for all messages
        const populatedMessages = conversation.messages.map(msg => {
            const msgObj = msg.toObject();
            if (msgObj.replyTo) {
                const parent = conversation.messages.id(msgObj.replyTo);
                if (parent) {
                    msgObj.replyTo = {
                        _id: parent._id,
                        message: parent.message,
                        senderId: parent.senderId,
                        messageType: parent.messageType
                    };
                }
            }
            return msgObj;
        });

        res.status(200).json({ success: true, messages: populatedMessages, conversationId: conversation._id.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const markAsSeen = async (req, res) => {
    try {
        const userId = req.id;
        const receiverId = req.params.id; // The other person

        const conversation = await Conversation.findOne({
            participants: { $all: [userId, receiverId] }
        });

        if (conversation) {
            conversation.messages.forEach(msg => {
                if (msg.senderId.toString() === receiverId.toString() && !msg.seen) {
                    msg.seen = true;
                }
            });
            await conversation.save();
        }

        broadcastToUser(receiverId, "message_seen_update", { receiverId: userId });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.id;

        const conversation = await Conversation.findOne({ "messages._id": messageId });
        if (!conversation) return res.status(404).json({ success: false, message: "Message not found" });

        const message = conversation.messages.id(messageId);
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        message.isDeleted = true;
        await conversation.save();

        broadcastToUser(message.receiverId, "message_deleted", { messageId });
        broadcastToUser(message.senderId, "message_deleted", { messageId });

        res.status(200).json({ success: true, message: "Message unsent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const addReaction = async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.id;
        const { emoji } = req.body;

        const conversation = await Conversation.findOne({ "messages._id": messageId });
        if (!conversation) return res.status(404).json({ success: false });

        const message = conversation.messages.id(messageId);
        const reactionIndex = message.reactions.findIndex(r => r.userId.toString() === userId.toString());
        let action = "added";

        if (reactionIndex > -1) {
            if (message.reactions[reactionIndex].emoji === emoji) {
                message.reactions.splice(reactionIndex, 1);
                action = "removed";
            } else {
                message.reactions[reactionIndex].emoji = emoji;
                action = "updated";
            }
        } else {
            message.reactions.push({ userId, emoji });
            action = "added";
        }

        await conversation.save();

        // Populate reactions.userId for the broadcast and response
        await conversation.populate('messages.reactions.userId', 'username profilePicture');

        const updatedMessage = conversation.messages.id(messageId);
        const reactions = updatedMessage.reactions;

        const reactionPayload = {
            message_id: messageId,
            messageId,
            user_id: userId,
            reaction: emoji,
            reactions,
            action, // "added", "updated", or "removed"
            conversationId: conversation._id.toString()
        };

        // 1. Broadcast to the conversation room
        io.to(conversation._id.toString()).emit("message_reaction_added", reactionPayload);

        // 2. Also notify both participants directly
        broadcastToUser(updatedMessage.senderId, "message_reaction_added", reactionPayload);
        broadcastToUser(updatedMessage.receiverId, "message_reaction_added", reactionPayload);


        res.status(200).json({ success: true, reactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.id;
        const conversations = await Conversation.find({
            participants: userId
        });

        const unreadCounts = {};
        conversations.forEach(conv => {
            const otherParticipant = conv.participants.find(p => p.toString() !== userId.toString());
            if (otherParticipant) {
                const count = conv.messages.filter(msg =>
                    msg.senderId.toString() === otherParticipant.toString() && !msg.seen
                ).length;
                unreadCounts[otherParticipant.toString()] = count;
            }
        });

        res.status(200).json({ success: true, unreadCounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};