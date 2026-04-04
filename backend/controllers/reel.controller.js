import cloudinary from "../utils/cloudinary.js";
import { Reel } from "../models/reel.model.js";
import { ReelComment } from "../models/reelComment.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Setting } from "../models/setting.model.js";

export const uploadReel = async (req, res) => {
    try {
        const settings = await Setting.findOne();
        if (settings && !settings.reelsEnabled && req.role !== 'admin') {
            return res.status(403).json({
                message: "Reel uploading is currently disabled by admin.",
                success: false
            });
        }
        const { caption, allowComments = true, allowLikes = true, allowSave = true, allowShare = true } = req.body;
        const video = req.file;
        const authorId = req.id;

        if (!video) {
            return res.status(400).json({ message: 'Video file is required', success: false });
        }

        const uploadVideoPromise = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({
                    resource_type: "video",
                    folder: "metagram/reels",
                }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
                stream.end(video.buffer);
            });
        };

        const cloudResponse = await uploadVideoPromise();

        const newReel = await Reel.create({
            author: authorId,
            videoUrl: cloudResponse.secure_url,
            caption,
            allowComments,
            allowLikes,
            allowSave,
            allowShare
        });

        const user = await User.findById(authorId);
        if (user) {
            user.reels.push(newReel._id); // Changed from reel to newReel
            await user.save();
        }

        await newReel.populate({ path: 'author', select: 'username profilePicture' });

        return res.status(201).json({
            message: "Reel uploaded successfully",
            success: true,
            reel: newReel
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getReelsFeed = async (req, res) => {
    try {
        const { page = 1, limit = 5 } = req.query;
        const reels = await Reel.find()
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture isDeleted' })
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username profilePicture' }
            })
            .populate('likes', 'username profilePicture');

        const filteredReels = reels.filter(reel => reel.author && !reel.author.isDeleted);
        const paginatedReels = filteredReels.slice(0, parseInt(limit));

        return res.status(200).json({ reels: paginatedReels, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const likeOrUnlikeReel = async (req, res) => {
    try {
        const userId = req.id;
        const reelId = req.params.id;
        const reel = await Reel.findById(reelId);

        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        const author = await User.findById(reel.author);
        if (author.blockedUsers.includes(userId) || author.blockedBy.includes(userId)) {
            return res.status(403).json({ message: "Action not allowed due to a block", success: false });
        }

        const isLiked = reel.likes.includes(userId);
        let updatedLikes;
        if (isLiked) {
            await reel.updateOne({ $pull: { likes: userId } });
            updatedLikes = reel.likes.filter(id => id.toString() !== userId);
            io.emit('likeReel', { reelId, likes: updatedLikes });
            return res.status(200).json({ message: "Reel unliked", success: true, type: 'unlike' });
        } else {
            await reel.updateOne({ $addToSet: { likes: userId } });
            updatedLikes = [...reel.likes, userId];
            io.emit('likeReel', { reelId, likes: updatedLikes });

            // Notification
            if (reel.author.toString() !== userId) {
                const notification = await Notification.create({
                    sender: userId,
                    receiver: reel.author,
                    type: 'like',
                    reel: reelId
                });
                await notification.populate("sender", "username profilePicture");
                const receiverSocketId = getReceiverSocketId(reel.author);
                if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);
            }

            return res.status(200).json({ message: "Reel liked", success: true, type: 'like' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const addCommentToReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const userId = req.id;
        const { text, parentId = null } = req.body;

        if (!text) return res.status(400).json({ message: "Text is required", success: false });

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        const author = await User.findById(reel.author);
        if (author.blockedUsers.includes(userId) || author.blockedBy.includes(userId)) {
            return res.status(403).json({ message: "Action not allowed due to a block", success: false });
        }

        const comment = await ReelComment.create({
            text,
            author: userId,
            reel: reelId,
            parentId
        });

        await comment.populate({ path: 'author', select: 'username profilePicture' });

        reel.comments.push(comment._id);
        await reel.save();

        // Notifications
        // 1. Notify Reel Owner (type: 'comment')
        const reelOwnerId = reel.author.toString();
        if (reelOwnerId !== userId) {
            const notification = await Notification.create({
                sender: userId,
                receiver: reelOwnerId,
                type: 'comment',
                reel: reelId,
                text
            });
            await notification.populate("sender", "username profilePicture");
            const receiverSocketId = getReceiverSocketId(reelOwnerId);
            if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);
        }

        // 2. Notify Parent Comment Author (type: 'reply') if it's a reply
        if (parentId) {
            const parentComment = await ReelComment.findById(parentId);
            if (parentComment && parentComment.author.toString() !== userId) {
                // If it's a reply, we also notify the parent commenter
                // Note: We already notified the reel owner above, so this is a second notification if they are different people
                const replyNotification = await Notification.create({
                    sender: userId,
                    receiver: parentComment.author,
                    type: 'reply',
                    reel: reelId,
                    text
                });
                await replyNotification.populate("sender", "username profilePicture");
                const replyReceiverSocketId = getReceiverSocketId(parentComment.author);
                if (replyReceiverSocketId) {
                    io.to(replyReceiverSocketId).emit('notification', replyNotification);
                }
            }
        }

        io.emit('newReelComment', comment);

        return res.status(201).json({ message: "Comment added", success: true, comment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const incrementViews = async (req, res) => {
    try {
        const reelId = req.params.id;
        const updatedReel = await Reel.findByIdAndUpdate(reelId, { $inc: { viewsCount: 1 } }, { new: true });
        io.emit('updateReelViews', { reelId, viewsCount: updatedReel.viewsCount });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const toggleSaveReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const userId = req.id;
        const reel = await Reel.findById(reelId);

        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        const isSaved = reel.savedBy.includes(userId);
        if (isSaved) {
            await Promise.all([
                reel.updateOne({ $pull: { savedBy: userId } }),
                User.findByIdAndUpdate(userId, { $pull: { savedReels: reelId } })
            ]);
            return res.status(200).json({ message: "Reel unsaved", success: true, type: 'unsave' });
        } else {
            await Promise.all([
                reel.updateOne({ $addToSet: { savedBy: userId } }),
                User.findByIdAndUpdate(userId, { $addToSet: { savedReels: reelId } })
            ]);
            return res.status(200).json({ message: "Reel saved", success: true, type: 'save' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};
export const deleteCommentFromReel = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;

        const comment = await ReelComment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        const reel = await Reel.findById(comment.reel);

        // Authorization: Only the Comment author can delete OR admin
        if (comment.author.toString() !== userId && req.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized. You can only delete your own comments.", success: false });
        }

        await ReelComment.findByIdAndDelete(commentId);

        // Remove comment reference from reel
        await Reel.findByIdAndUpdate(comment.reel, { $pull: { comments: commentId } });

        io.emit('deleteReelComment', { commentId, reelId: comment.reel });

        return res.status(200).json({ message: "Comment deleted", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const editCommentFromReel = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Text is required", success: false });
        }

        const comment = await ReelComment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        if (comment.author.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized", success: false });
        }

        comment.text = text;
        await comment.save();

        io.emit('editReelComment', { commentId, reelId: comment.reel, text });

        return res.status(200).json({ message: "Comment updated", success: true, text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const likeOrUnlikeComment = async (req, res) => {
    try {
        const userId = req.id;
        const commentId = req.params.id;
        const comment = await ReelComment.findById(commentId);

        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        const isLiked = comment.likes.includes(userId);
        if (isLiked) {
            await comment.updateOne({ $pull: { likes: userId } });

            const updatedLikes = comment.likes.filter(id => id.toString() !== userId.toString());
            io.emit('updateReelCommentLikes', { commentId, reelId: comment.reel, likes: updatedLikes });

            return res.status(200).json({ success: true, message: "Comment unliked" });
        } else {
            await comment.updateOne({ $addToSet: { likes: userId } });

            // Notification to comment author
            try {
                if (comment.author.toString() !== userId.toString()) {
                    const notification = await Notification.create({
                        sender: userId,
                        receiver: comment.author,
                        type: 'reel_comment_like',
                        reel: comment.reel
                    });
                    await notification.populate("sender", "username profilePicture");
                    const receiverSocketId = getReceiverSocketId(comment.author);
                    if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);
                }
            } catch (notifErr) {
                console.log("Notification error (non-blocking):", notifErr.message);
            }

            const updatedLikes = [...comment.likes, userId];
            io.emit('updateReelCommentLikes', { commentId, reelId: comment.reel, likes: updatedLikes });

            return res.status(200).json({ success: true, message: "Comment liked" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const deleteReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const userId = req.id;

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        if (reel.author.toString() !== userId && req.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to delete this reel", success: false });
        }

        // Delete from Cloudinary
        const publicId = reel.videoUrl.split('/').pop().split('.')[0];
        try {
            await cloudinary.uploader.destroy(`metagram/reels/${publicId}`, { resource_type: "video" });
        } catch (err) {
            console.log("Cloudinary destroy failed:", err);
        }

        // Delete related comments
        await ReelComment.deleteMany({ reel: reelId });

        // Delete Reel
        await Reel.findByIdAndDelete(reelId);

        // Remove from the actual author's reel list
        await User.findByIdAndUpdate(reel.author, { $pull: { reels: reelId } });

        return res.status(200).json({ message: "Reel deleted successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};
export const editReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const userId = req.id;
        const { caption, allowLikes, allowComments, allowShare, allowSave } = req.body;

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        if (reel.author.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to edit this reel", success: false });
        }

        if (caption !== undefined) reel.caption = caption;
        if (allowLikes !== undefined) reel.allowLikes = allowLikes;
        if (allowComments !== undefined) reel.allowComments = allowComments;
        if (allowShare !== undefined) reel.allowShare = allowShare;
        if (allowSave !== undefined) reel.allowSave = allowSave;

        await reel.save();

        const updatedReel = await Reel.findById(reelId).populate("author", "username profilePicture");

        return res.status(200).json({ message: "Reel updated successfully", reel: updatedReel, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};
export const getReelById = async (req, res) => {
    try {
        const reelId = req.params.id;
        const reel = await Reel.findById(reelId)
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username profilePicture' }
            })
            .populate('likes', 'username profilePicture');

        if (!reel) return res.status(404).json({ message: "Reel not found", success: false });

        return res.status(200).json({ reel, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};
