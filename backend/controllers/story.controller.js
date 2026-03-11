import { Story } from "../models/story.model.js";
import cloudinary from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { StoryComment } from "../models/storyComment.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const uploadStory = async (req, res) => {
    try {
        const userId = req.id;
        const mediaFiles = req.files;
        const { audience = 'all' } = req.body;

        if (!mediaFiles || mediaFiles.length === 0) {
            return res.status(400).json({ message: "At least one media file is required", success: false });
        }

        const uploadedStories = [];

        for (const mediaFile of mediaFiles) {
            const b64 = Buffer.from(mediaFile.buffer).toString("base64");
            let dataURI = "data:" + mediaFile.mimetype + ";base64," + b64;

            let resourceType = "image";
            if (mediaFile.mimetype.startsWith("video/")) {
                resourceType = "video";
            }

            const cloudResponse = await cloudinary.uploader.upload(dataURI, {
                resource_type: resourceType,
            });

            if (resourceType === 'video' && cloudResponse.duration > 60) {
                const parts = Math.ceil(cloudResponse.duration / 60);
                for (let i = 0; i < parts; i++) {
                    const start = i * 60;
                    const end = Math.min((i + 1) * 60, Math.floor(cloudResponse.duration));
                    const splitUrl = cloudResponse.secure_url.replace('/upload/', `/upload/so_${start},eo_${end}/`);

                    const story = await Story.create({
                        userId,
                        mediaUrl: splitUrl,
                        mediaType: resourceType,
                        audience
                    });
                    await story.populate({ path: "userId", select: "username profilePicture" });
                    uploadedStories.push(story);
                }
            } else {
                const story = await Story.create({
                    userId,
                    mediaUrl: cloudResponse.secure_url,
                    mediaType: resourceType,
                    audience
                });

                await story.populate({ path: "userId", select: "username profilePicture" });
                uploadedStories.push(story);
            }
        }

        // Emit new story event to followers for real-time updates
        const user = await User.findById(userId).populate('followers');
        if (user) {
            user.followers.forEach(follower => {
                const receiverSocketId = getReceiverSocketId(follower._id.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('new_story', {
                        userId: user._id,
                        username: user.username,
                        profilePicture: user.profilePicture,
                        stories: uploadedStories
                    });
                }
            });
            // Also emit to self to update UI
            const myId = getReceiverSocketId(userId);
            if (myId) io.to(myId).emit('new_story', {
                userId: user._id,
                username: user.username,
                profilePicture: user.profilePicture,
                stories: uploadedStories
            });
        }

        return res.status(201).json({
            message: "Stories uploaded successfully",
            stories: uploadedStories,
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getAllStories = async (req, res) => {
    try {
        const userId = req.id;
        const now = new Date();
        const user = await User.findById(userId).select('following closeFriends');

        // Fetch stories of people user follows OR their own stories
        const authors = [...user.following, userId];

        const stories = await Story.find({
            userId: { $in: authors },
            expiresAt: { $gt: now }
        })
            .populate({ path: "userId", select: "username profilePicture closeFriends" })
            .populate({ path: "viewers", select: "username profilePicture" })
            .sort({ createdAt: -1 });

        // Filter stories based on Close Friends logic
        const filteredStories = stories.filter(story => {
            // Own stories always visible
            if (story.userId._id.toString() === userId.toString()) return true;

            // Public stories visible to all followers
            if (story.audience === 'all') return true;

            // Close friends stories only visible if user is in author's CF list
            if (story.audience === 'closeFriends') {
                return story.userId.closeFriends?.map(id => id.toString()).includes(userId.toString());
            }

            return false;
        });

        // Group stories by user
        const groupedStoriesMap = new Map();

        filteredStories.forEach(story => {
            const authorIdStr = story.userId._id.toString();
            if (!groupedStoriesMap.has(authorIdStr)) {
                groupedStoriesMap.set(authorIdStr, {
                    userId: story.userId,
                    stories: []
                });
            }
            groupedStoriesMap.get(authorIdStr).stories.push(story);
        });

        const groupedStories = Array.from(groupedStoriesMap.values());

        return res.status(200).json({
            groupedStories,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const updateCloseFriends = async (req, res) => {
    try {
        const userId = req.id;
        const { targetId } = req.body; // friend to add/remove

        const user = await User.findById(userId);
        const isCF = user.closeFriends.some(id => id.toString() === targetId.toString());

        if (isCF) {
            user.closeFriends = user.closeFriends.filter(id => id.toString() !== targetId.toString());
        } else {
            user.closeFriends.push(targetId);
        }

        await user.save();
        return res.status(200).json({
            message: isCF ? "Removed from Close Friends" : "Added to Close Friends",
            success: true,
            isCloseFriend: !isCF
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const viewStory = async (req, res) => {
    try {
        const storyId = req.params.id;
        const userId = req.id;

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ message: "Story not found", success: false });
        }

        const authorIdStr = story.userId.toString();
        const userIdStr = userId.toString();

        if (authorIdStr !== userIdStr && !story.viewers.some(id => id.toString() === userIdStr)) {
            story.viewers.push(userId);
            await story.save();
        }

        return res.status(200).json({ message: "Story viewed", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getUserStories = async (req, res) => {
    try {
        const userId = req.params.id;
        const now = new Date();

        const stories = await Story.find({ userId, expiresAt: { $gt: now } })
            .populate({ path: "userId", select: "username profilePicture" })
            .populate({ path: "viewers", select: "username profilePicture" })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            stories,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const deleteStory = async (req, res) => {
    try {
        const storyId = req.params.id;
        const userId = req.id;

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ message: "Story not found", success: false });
        }

        if (story.userId.toString() !== userId) {
            return res.status(403).json({ message: "You are not authorized", success: false });
        }

        await Story.findByIdAndDelete(storyId);

        // Delete associated messages in conversations using arrayFilters
        try {
            await Conversation.updateMany(
                { "messages.storyId": storyId },
                { $set: { "messages.$[elem].isDeleted": true } },
                { arrayFilters: [{ "elem.storyId": storyId }] }
            );

            // Also emit socket deletion update to participants of those modified conversations
            const conversations = await Conversation.find({ "messages.storyId": storyId });
            conversations.forEach(conv => {
                conv.participants.forEach(pId => {
                    const receiverSocketId = getReceiverSocketId(pId.toString());
                    if (receiverSocketId) {
                        // Emit an event that tells the client to fetch messages again or update UI
                        io.to(receiverSocketId).emit('story_deleted_from_chat', storyId);
                    }
                });
            });
        } catch (convErr) { }

        // Emit global story delete to followers
        const user = await User.findById(userId).populate('followers');
        if (user) {
            user.followers.forEach(follower => {
                const receiverSocketId = getReceiverSocketId(follower._id.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('story_deleted', { storyId, userId });
                }
            });
            // Emit to self
            const myId = getReceiverSocketId(userId);
            if (myId) io.to(myId).emit('story_deleted', { storyId, userId });
        }

        return res.status(200).json({ message: "Story deleted", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const likeStory = async (req, res) => {
    try {
        const userId = req.id;
        const storyId = req.params.id;
        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: 'Story not found', success: false });

        const isLiked = story.likes.includes(userId);
        if (isLiked) {
            // unlike
            story.likes = story.likes.filter(id => id.toString() !== userId);
        } else {
            // like
            story.likes.push(userId);
        }
        await story.save();

        // socket io for real-time like update
        const receiverSocketId = getReceiverSocketId(story.userId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('story_like', { storyId, userId, liked: !isLiked });
        }

        if (!isLiked && story.userId.toString() !== userId) {
            const notification = await Notification.create({
                sender: userId,
                receiver: story.userId,
                type: 'like',
                story: storyId,
            });
            await notification.populate("sender", "username profilePicture");
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('notification', notification);
            }
        }

        return res.status(200).json({
            message: isLiked ? 'Story unliked' : 'Story liked',
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};

export const addStoryComment = async (req, res) => {
    try {
        const userId = req.id;
        const storyId = req.params.id;
        const { text } = req.body;

        if (!text) return res.status(400).json({ message: 'Comment text is required', success: false });

        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: 'Story not found', success: false });

        const comment = await StoryComment.create({
            text,
            userId,
            storyId
        });

        story.comments.push(comment._id);
        await story.save();

        await comment.populate({ path: 'userId', select: 'username profilePicture' });

        // socket io for real-time comment update
        const receiverSocketId = getReceiverSocketId(story.userId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('story_comment', { storyId, comment });
        }

        // Notification for story author
        if (story.userId.toString() !== userId) {
            const notification = await Notification.create({
                sender: userId,
                receiver: story.userId,
                type: 'story_comment',
                story: storyId,
                text
            });
            await notification.populate("sender", "username profilePicture");
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('notification', notification);
            }
        }

        return res.status(201).json({
            message: 'Comment added',
            comment,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};
