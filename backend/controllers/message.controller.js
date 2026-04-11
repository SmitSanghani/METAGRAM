import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { broadcastToUser, io, removeFromRoom, broadcastToRoomParticipants } from "../socket/socket.js";

// For Chatting 
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const sender = await User.findById(senderId).select("username profilePicture");
        const targetId = req.params.id; // Could be a User ID (1v1) or Conversation ID (Group)
        const { message, messageType = 'text', storyId = null, reelId = null, postId = null, replyTo = null, tempId } = req.body;

        const file = req.file;
        let mediaUrl = req.body.mediaUrl || "";

        // Determine if targetId is a conversation ID or a user ID
        let conversation = null;
        let isGroupMessage = false;

        // 1. Try finding conversation by its ID first (Group OR existing 1v1 reference)
        conversation = await Conversation.findById(targetId);
        if (conversation) {
            isGroupMessage = conversation.isGroup;
            
            // SECURE GATE: Verify sender is a member of the group
            if (isGroupMessage && !conversation.participants.some(p => String(p) === String(senderId))) {
                 return res.status(403).json({ success: false, message: "You are no longer a member of this group." });
            }
        } else {
            // 2. If not found, targetId MUST be a User ID (1v1)
            const receiver = await User.findById(targetId);
            if (!receiver) return res.status(404).json({ success: false, message: "Recipient not found" });

            // BLOCK CHECK (Only for 1v1):
            const senderUser = await User.findById(senderId);
            if (senderUser.blockedUsers.includes(targetId) || senderUser.blockedBy.includes(targetId)) {
                return res.status(403).json({ success: false, message: "You cannot message this account." });
            }

            // Find or create 1v1 conversation
            conversation = await Conversation.findOne({
                isGroup: false,
                participants: { $all: [senderId, targetId], $size: 2 }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [senderId, targetId],
                    messages: []
                });
            }
        }

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
            } else {
                const uploadFile = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream({
                            resource_type: "raw",
                            folder: "instagram-clone/messages/files",
                            use_filename: true,
                            unique_filename: true,
                            filename_override: file.originalname
                        }, (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        });
                        stream.end(file.buffer);
                    });
                };
                const cloudResponse = await uploadFile();
                mediaUrl = cloudResponse.secure_url;
            }
        }

        let finalMessageType = messageType;
        if (file) {
            const isImg = file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);
            const isVid = file.mimetype.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.originalname);

            if (isImg) finalMessageType = 'image';
            else if (isVid) finalMessageType = 'video';
            else finalMessageType = 'file';
        }

        const newMessageData = {
            senderId,
            receiverId: isGroupMessage ? null : (conversation.participants.find(p => p.toString() !== senderId.toString()) || targetId),
            message: file && finalMessageType === 'file' ? (message || file.originalname) : message,
            messageType: finalMessageType,
            storyId,
            reelId,
            postId,
            replyTo,
            mediaUrl
        };

        conversation.messages.push(newMessageData);
        await conversation.save();

        let savedMessage = conversation.messages[conversation.messages.length - 1];

        // Manual "population" for replyTo
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

        await conversation.populate([
            { path: 'participants', select: 'username profilePicture' },
            { path: 'messages.senderId', select: 'username profilePicture' },
            { path: 'messages.storyId', select: 'mediaUrl mediaType userId createdAt' },
            { path: 'messages.reelId', select: 'videoUrl caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.postId', select: 'image images caption author likes', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.reactions.userId', select: 'username profilePicture' }
        ]);

        const newMessage = conversation.messages.id(savedMessage._id);
        const messageObj = newMessage.toObject();
        messageObj.senderUsername = sender.username;
        messageObj.senderProfilePicture = sender.profilePicture;
        messageObj.tempId = tempId;
        messageObj.conversationId = conversation._id.toString();
        messageObj.isGroup = conversation.isGroup;
        if (conversation.isGroup) {
            messageObj.groupName = conversation.groupName;
            messageObj.groupProfilePicture = conversation.groupProfilePicture;
            messageObj.groupAdmin = conversation.groupAdmin;
        } else {
            const receiver = conversation.participants.find(p => p._id.toString() !== senderId.toString());
            if (receiver) {
                messageObj.receiverUsername = receiver.username;
                messageObj.receiverProfilePicture = receiver.profilePicture;
            }
        }
        if (replyToPopulated) messageObj.replyTo = replyToPopulated;

        // Secure Broadcast: Deliver only to current participants (prevents room-leaks for removed members)
        broadcastToRoomParticipants(conversation.participants, "receive_message", messageObj);

        // Sidebar update / toasts for all participants
        conversation.participants.forEach(p => {
            broadcastToUser(p._id ? p._id.toString() : p.toString(), "new_message_notification", messageObj);
        });

        return res.status(201).json({ success: true, newMessage: messageObj });
    } catch (error) {
        console.error("SendMessage Error:", error);
        res.status(400).json({ success: false, message: error.message || "Internal server error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const senderId = req.id;
        const targetId = req.params.id; // User ID or Conversation ID

        // Early return if no valid targetId
        if (!targetId || targetId === 'undefined' || targetId === '[object Object]') {
            return res.status(400).json({ success: false, message: "Invalid target ID" });
        }

        // 1. Initial Fetch
        let conversation = await Conversation.findById(targetId);

        if (!conversation) {
            conversation = await Conversation.findOne({
                isGroup: false,
                participants: { $all: [senderId, targetId], $size: 2 }
            });
        }

        if (!conversation) return res.status(200).json({ success: true, messages: [], conversationId: null });

        // atomic mark as seen
        const currentUserIdStr = senderId.toString();

        // 1. Permission Gate: For groups, only show history to participants or former participants
        const isParticipant = conversation.participants.some(p => String(p._id || p) === currentUserIdStr);
        const wasParticipant = conversation.leftParticipants?.some(p => String(p) === currentUserIdStr);

        if (conversation.isGroup && !isParticipant && !wasParticipant) {
             console.warn(`[API DBG] Unauthorized fetch attempt for Group ${targetId} by User ${currentUserIdStr}`);
             return res.status(403).json({ success: false, message: "You are no longer a member of this group." });
        }

        // 2. Select Theme: For former members, use the frozen theme at the time they left
        let themeToReturn = conversation.theme;
        if (conversation.isGroup && wasParticipant && !isParticipant) {
            const frozenTheme = conversation.leftAtThemes?.get(currentUserIdStr);
            if (frozenTheme && frozenTheme.id) {
                console.log(`[API Theme] Returning frozen theme "${frozenTheme.name}" for former member ${currentUserIdStr}`);
                themeToReturn = frozenTheme;
            }
        }

        // 3. Mark as seen (Only if currently a participant)
        if (isParticipant) {
            if (conversation.isGroup) {
                await Conversation.updateOne(
                    { _id: conversation._id },
                    { $addToSet: { "messages.$[elem].seenBy": senderId } },
                    { arrayFilters: [{ "elem.senderId": { $ne: senderId } }] }
                );
            } else {
                const otherParticipantId = conversation.participants.find(p => p.toString() !== currentUserIdStr);
                if (otherParticipantId) {
                    await Conversation.updateOne(
                        { _id: conversation._id },
                        { $set: { "messages.$[elem].seen": true } },
                        { arrayFilters: [{ "elem.senderId": otherParticipantId, "elem.seen": false }] }
                    );
                }
            }
        }

        // 4. Now populate EVERYTHING for the response
        await conversation.populate([
            { path: 'participants', select: 'username profilePicture' },
            { path: 'messages.senderId', select: 'username profilePicture' },
            { path: 'messages.storyId', select: 'mediaUrl mediaType userId createdAt' },
            { path: 'messages.reelId', select: 'videoUrl caption author', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.postId', select: 'image images caption author likes', populate: { path: 'author', select: 'username profilePicture' } },
            { path: 'messages.reactions.userId', select: 'username profilePicture' }
        ]);

        const clearTime = conversation.clearedAt?.get(currentUserIdStr);
        const filteredMessages = clearTime
            ? conversation.messages.filter(msg => new Date(msg.createdAt) > new Date(clearTime))
            : conversation.messages;

        const populatedMessages = filteredMessages.map(msg => {
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

        res.status(200).json({ 
            success: true, 
            messages: populatedMessages, 
            conversationId: conversation._id.toString(), 
            isGroup: conversation.isGroup, 
            groupName: conversation.groupName, 
            groupAdmin: conversation.groupAdmin, 
            theme: themeToReturn 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const markAsSeen = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id; // Could be a User ID or Conversation ID

        // 1. Try finding conversation by ID directly (handles groups or known ID refs)
        let conversation = await Conversation.findById(targetId);

        if (!conversation) {
            // 2. Fallback: targetId is a User ID, find original 1v1 conversation with exactly these participants
            conversation = await Conversation.findOne({
                isGroup: false,
                participants: { $all: [userId, targetId], $size: 2 }
            });
        }

        if (conversation) {
            const isGroup = conversation.isGroup;
            
            // SECURE GATE: Verify membership for groups
            if (isGroup && !conversation.participants.some(p => String(p) === String(userId))) {
                return res.status(403).json({ success: false, message: "Not a member" });
            }

            let targetReceiverId;

            if (isGroup) {
                // Atomic addition of userId to seenBy of all non-own messages
                await Conversation.updateOne(
                    { _id: conversation._id },
                    { $addToSet: { "messages.$[elem].seenBy": userId } },
                    { arrayFilters: [{ "elem.senderId": { $ne: userId } }] }
                );
            } else {
                // For 1v1: Set seen = true for messages from the other user
                const otherParticipant = conversation.participants.find(p => p.toString() !== userId.toString());
                if (otherParticipant) {
                    targetReceiverId = otherParticipant.toString();
                    await Conversation.updateOne(
                        { _id: conversation._id, isGroup: false },
                        { $set: { "messages.$[elem].seen": true } },
                        { arrayFilters: [{ "elem.senderId": otherParticipant, "elem.seen": false }] }
                    );
                }
            }

            // Broadcast real-time update
            if (isGroup) {
                // Securely notify only active members
                broadcastToRoomParticipants(conversation.participants, "message_seen_update", { conversationId: conversation._id, userId });
            } else if (targetReceiverId) {
                broadcastToUser(targetReceiverId, "message_seen_update", { receiverId: userId });
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("markAsSeen Error:", error);
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

        const roomId = conversation._id.toString();
        // Broadcast to all participants globally so sidebar updates even if chat isn't open
        conversation.participants.forEach(pId => {
            const userId = pId._id ? pId._id.toString() : pId.toString();
            broadcastToUser(userId, "message_deleted", { messageId, conversationId: roomId });
        });

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
        
        // SECURE GATE: Verify membership for groups
        if (conversation.isGroup && !conversation.participants.some(p => String(p) === String(userId))) {
            return res.status(403).json({ success: false, message: "Not a member" });
        }

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

        const reactor = await User.findById(userId).select("username profilePicture");
        const reactionPayload = {
            message_id: messageId,
            messageId,
            user_id: userId,
            reactorUsername: reactor.username,
            reactorProfilePicture: reactor.profilePicture,
            reaction: emoji,
            reactions,
            action, // "added", "updated", or "removed"
            conversationId: conversation._id.toString(),
            isGroup: conversation.isGroup
        };

        // 1. Broadcast to all active participants securely
        broadcastToRoomParticipants(conversation.participants, "message_reaction_added", reactionPayload);

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
            const currentUserIdStr = String(userId);
            const clearTime = conv.clearedAt?.get(currentUserIdStr);

            const filteredMessages = clearTime
                ? conv.messages.filter(msg => new Date(msg.createdAt) > new Date(clearTime))
                : conv.messages;

            if (conv.isGroup) {
                // For Groups: Key is conversation ID, check seenBy array
                const count = filteredMessages.filter(msg =>
                    String(msg.senderId) !== currentUserIdStr && !msg.seenBy.some(id => String(id) === currentUserIdStr)
                ).length;
                unreadCounts[conv._id.toString()] = count;
            } else {
                // For 1v1: Key is other person's ID, check seen flag
                const otherParticipant = conv.participants.find(p => p.toString() !== currentUserIdStr);
                if (otherParticipant) {
                    const count = filteredMessages.filter(msg =>
                        msg.senderId.toString() === otherParticipant.toString() && !msg.seen
                    ).length;
                    unreadCounts[otherParticipant.toString()] = count;
                }
            }
        });

        res.status(200).json({ success: true, unreadCounts });
    } catch (error) {
        console.error("getUnreadCounts Error:", error);
        res.status(500).json({ success: false });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const senderId = req.id;
        const targetId = req.params.id;
        const deleteFromSidebar = req.query.sidebar === 'true';

        if (!targetId || targetId === 'undefined' || targetId === '[object Object]') {
            return res.status(400).json({ success: false, message: "Invalid target ID" });
        }

        const conversation = await Conversation.findOne({
            $or: [
                { _id: targetId, $or: [{ participants: senderId }, { leftParticipants: senderId }] }, // Group or ID based
                { participants: { $all: [senderId, targetId], $size: 2 }, isGroup: false } // 1v1
            ]
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const now = new Date();
        if (!conversation.clearedAt) conversation.clearedAt = new Map();
        conversation.clearedAt.set(senderId.toString(), now);

        // If sidebar delete, also hide it 
        if (deleteFromSidebar) {
            if (!conversation.hiddenAt) conversation.hiddenAt = new Map();
            conversation.hiddenAt.set(senderId.toString(), now);
        }

        await conversation.save();

        return res.status(200).json({
            success: true,
            message: deleteFromSidebar ? 'Conversation deleted' : 'Chat history cleared'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Group Management
export const createGroup = async (req, res) => {
    try {
        const senderId = req.id;
        const { groupName, participants } = req.body; // participants is an array of user IDs

        if (!groupName || !participants || participants.length < 1) {
            return res.status(400).json({ success: false, message: "Group name and participants are required" });
        }

        const allParticipants = [...new Set([...participants, senderId])];

        const conversation = await Conversation.create({
            participants: allParticipants,
            isGroup: true,
            groupName: groupName,
            groupAdmin: [senderId],
            messages: []
        });

        await conversation.populate('participants', 'username profilePicture');

        const groupObj = {
            _id: conversation._id,
            username: conversation.groupName,
            profilePicture: conversation.groupProfilePicture,
            isGroup: true,
            participants: conversation.participants,
            groupAdmin: conversation.groupAdmin,
            conversationId: conversation._id,
            updatedAt: conversation.updatedAt
        };

        // Notify all participants
        allParticipants.forEach(p => {
            broadcastToUser(p.toString(), "group_created", groupObj);
        });

        res.status(201).json({ success: true, group: groupObj });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const addGroupMembers = async (req, res) => {
    try {
        const senderId = req.id;
        const { conversationId, participants, userIds } = req.body;
        const targetUserIds = participants || userIds;

        if (!targetUserIds || !Array.isArray(targetUserIds)) {
            return res.status(400).json({ success: false, message: "No members provided" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ success: false });
        if (!conversation.isGroup) return res.status(400).json({ success: false, message: "Not a group" });

        // Check if sender is admin
        if (!conversation.groupAdmin.some(adminId => String(adminId) === String(senderId))) {
            return res.status(403).json({ success: false, message: "Only admins can add members" });
        }

        const newMembers = targetUserIds.filter(id => !conversation.participants.some(p => String(p) === String(id)));
        if (newMembers.length > 0) {
            conversation.participants.push(...newMembers);

            // Remove from leftParticipants if they re-joined
            if (conversation.leftParticipants) {
                conversation.leftParticipants = conversation.leftParticipants.filter(id => !newMembers.some(nm => String(nm) === String(id)));
            }

            // Create a "System Message" describing the additions
            const admin = await User.findById(senderId).select("username");
            const newUsers = await User.find({ _id: { $in: newMembers } }).select("username");
            const usernames = newUsers.map(u => u.username).join(", ");

            const systemMessage = {
                senderId: senderId,
                message: `${admin.username} added ${usernames}`,
                messageType: 'system'
            };

            conversation.messages.push(systemMessage);
            await conversation.save();

            // Populate everything for the real-time message sync
            await conversation.populate([
                { path: 'participants', select: 'username profilePicture' },
                { path: 'messages.senderId', select: 'username profilePicture' }
            ]);

            const savedMsg = conversation.messages[conversation.messages.length - 1];
            const msgObj = savedMsg.toObject();
            msgObj.conversationId = conversation._id.toString();
            msgObj.isGroup = true;
            msgObj.groupName = conversation.groupName;

            // Broadcast the new system message only to current members
            broadcastToRoomParticipants(conversation.participants, "receive_message", msgObj);
        } else {
            await conversation.save();
            await conversation.populate('participants', 'username profilePicture');
        }

        const updatedGroup = {
            _id: conversation._id,
            username: conversation.groupName,
            profilePicture: conversation.groupProfilePicture,
            isGroup: true,
            participants: conversation.participants,
            groupAdmin: conversation.groupAdmin,
            conversationId: conversation._id,
            updatedAt: conversation.updatedAt
        };

        // Notify all participants about the group state update
        conversation.participants.forEach(p => {
            const pid = p._id ? p._id.toString() : p.toString();
            broadcastToUser(pid, "group_updated", updatedGroup);
        });

        // Explicitly notify NEW members they've been added
        newMembers.forEach(uid => {
            broadcastToUser(uid.toString(), "added_to_group", updatedGroup);
        });

        res.status(200).json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const updateGroup = async (req, res) => {
    try {
        const senderId = req.id;
        const { conversationId, groupName, groupProfilePicture } = req.body;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ success: false });
        if (!conversation.isGroup) return res.status(400).json({ success: false });

        // Check if admin
        if (!conversation.groupAdmin.some(adminId => String(adminId) === String(senderId))) {
            return res.status(403).json({ success: false, message: "Only admins can edit group" });
        }

        if (groupName) conversation.groupName = groupName;
        if (groupProfilePicture) conversation.groupProfilePicture = groupProfilePicture;

        await conversation.save();
        await conversation.populate('participants', 'username profilePicture');

        const updatedGroup = {
            _id: conversation._id,
            username: conversation.groupName,
            profilePicture: conversation.groupProfilePicture,
            isGroup: true,
            participants: conversation.participants,
            groupAdmin: conversation.groupAdmin,
            conversationId: conversation._id,
            updatedAt: conversation.updatedAt
        };

        // Notify everyone globally 
        conversation.participants.forEach(p => {
            const pId = p._id ? p._id.toString() : p.toString();
            broadcastToUser(pId, "group_updated", updatedGroup);
        });

        res.status(200).json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const senderId = req.id;
        const { conversationId, userId } = req.body;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ success: false });

        const isAdmin = conversation.groupAdmin.some(adminId => String(adminId) === String(senderId));
        const isSelf = String(senderId) === String(userId);

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Check if user is actually in group before removing
        if (!conversation.participants.some(p => String(p) === String(userId))) {
            return res.status(200).json({ success: true, message: "User is already not a member" });
        }

        const removedUser = await User.findById(userId).select("username");
        const admin = await User.findById(senderId).select("username");

        console.log(`[API DBG] Group Leave Request for User: ${userId} FROM Conversation: ${conversationId}`);
        console.log(`[API DBG] Current Participants BEFORE removal:`, conversation.participants.map(p => String(p._id || p)));
        
        conversation.participants = conversation.participants.filter(id => id.toString() !== String(userId));
        console.log(`[API DBG] Remaining Participants AFTER removal:`, conversation.participants.map(p => String(p._id || p)));

        // Track that they left so it stays in their sidebar
        if (conversation.leftParticipants) {
            if (!conversation.leftParticipants.some(id => String(id) === String(userId))) {
                conversation.leftParticipants.push(userId);
                
                // FREEZE THEME: Store the current theme for this user
                if (conversation.leftAtThemes && conversation.theme) {
                    conversation.leftAtThemes.set(String(userId), {
                        id: conversation.theme.id,
                        name: conversation.theme.name,
                        backgroundImage: conversation.theme.backgroundImage,
                        bubbleColor: conversation.theme.bubbleColor,
                        receivedColor: conversation.theme.receivedColor,
                        textColor: conversation.theme.textColor,
                        receivedTextColor: conversation.theme.receivedTextColor,
                        isDark: conversation.theme.isDark
                    });
                }
            }
        }

        // If admin removed, assign new admin if any members left
        if (conversation.groupAdmin.some(id => String(id) === String(userId))) {
            conversation.groupAdmin = conversation.groupAdmin.filter(id => String(id) !== String(userId));
            if (conversation.groupAdmin.length === 0 && conversation.participants.length > 0) {
                conversation.groupAdmin.push(conversation.participants[0]);
            }
        }

        // Create System Message
        const systemMessage = {
            senderId: senderId,
            message: isSelf ? `${removedUser?.username} left the group` : `${admin?.username} removed ${removedUser?.username}`,
            messageType: 'system'
        };
        conversation.messages.push(systemMessage);

        await conversation.save();
        await conversation.populate('participants', 'username profilePicture');
        await conversation.populate('messages.senderId', 'username profilePicture');

        const savedMsg = conversation.messages[conversation.messages.length - 1];
        const msgObj = savedMsg.toObject();
        msgObj.conversationId = conversation._id.toString();
        msgObj.isGroup = true;
        msgObj.groupName = conversation.groupName;

        // Broadcast the system message only to remaining members
        broadcastToRoomParticipants(conversation.participants, "receive_message", msgObj);

        const updatedGroup = {
            _id: conversation._id,
            username: conversation.groupName,
            profilePicture: conversation.groupProfilePicture,
            isGroup: true,
            participants: conversation.participants,
            groupAdmin: conversation.groupAdmin,
            conversationId: conversation._id,
            updatedAt: conversation.updatedAt
        };

        // Notify all remaining participants about the change
        conversation.participants.forEach(p => {
            const pId = p._id ? p._id.toString() : p.toString();
            broadcastToUser(pId, "group_updated", updatedGroup);
        });

        // NOTIFY THE REMOVED USER EXPLICITLY
        broadcastToUser(userId.toString(), "removed_from_group", { conversationId: conversation._id });

        // FORCE REMOVE FROM SOCKET ROOM
        removeFromRoom(userId.toString(), conversation._id.toString());

        res.status(200).json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const updateChatTheme = async (req, res) => {
    try {
        const { conversationId, recipientId, theme } = req.body;
        const userId = req.id;

        let conversation = null;
        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        } else if (recipientId) {
            // Find existing conversation OR create one so we can set the theme
            conversation = await Conversation.findOne({
                isGroup: false,
                participants: { $all: [userId, recipientId], $size: 2 }
            });
            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [userId, recipientId],
                    isGroup: false
                });
            }
        }

        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

        // Check if user is a participant
        if (!conversation.participants.some(p => p.toString() === userId.toString())) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // If it's a group, only admins can set the theme as per user requirement
        if (conversation.isGroup && !conversation.groupAdmin.some(a => a.toString() === userId.toString())) {
            return res.status(403).json({ success: false, message: "Only group admins can change the theme" });
        }

        conversation.theme = theme;
        await conversation.save();

        const actualConvId = conversation._id.toString();

        // Broadcast to all active participants in the conversation
        broadcastToRoomParticipants(conversation.participants, "update_theme", { conversationId: actualConvId, theme });

        res.status(200).json({ success: true, theme, conversationId: actualConvId });
    } catch (error) {
        console.error("updateChatTheme Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const saveCallLog = async (req, res) => {
    try {
        const senderId = req.id;
        const { receiverId, callType, status, duration } = req.body;
        const file = req.file;

        let recordingUrl = null;

        if (file) {
            const uploadRecording = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({
                        resource_type: "video",
                        folder: "metagram/recordings",
                        format: "mp4"
                    }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                    stream.end(file.buffer);
                });
            };
            const cloudResponse = await uploadRecording();
            recordingUrl = cloudResponse.secure_url;
        }

        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [senderId, receiverId], $size: 2 }
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
            messageType: 'call_log',
            callLog: {
                callType,
                status,
                duration: parseInt(duration),
                recordingUrl
            }
        };

        conversation.messages.push(newMessageData);
        await conversation.save();

        const savedMessage = conversation.messages[conversation.messages.length - 1];
        await conversation.populate([
            { path: 'participants', select: 'username profilePicture' },
            { path: 'messages.senderId', select: 'username profilePicture' }
        ]);

        const newMessage = conversation.messages.id(savedMessage._id);
        const messageObj = newMessage.toObject();
        messageObj.conversationId = conversation._id.toString();

        broadcastToUser(senderId, "receive_message", messageObj);
        broadcastToUser(receiverId, "receive_message", messageObj);

        return res.status(201).json({ success: true, message: messageObj });
    } catch (error) {
        console.error("SaveCallLog Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};