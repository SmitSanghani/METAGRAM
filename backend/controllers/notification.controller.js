import { Notification } from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const notifications = await Notification.find({ receiver: userId })
            .populate("sender", "username profilePicture")
            .populate("post", "image")
            .populate("story", "mediaUrl mediaType")
            .populate("reel", "thumbnail videoUrl")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            notifications,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error fetching notifications" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.id;
        await Notification.updateMany({ receiver: userId, read: false }, { read: true });

        return res.status(200).json({
            success: true,
            message: "Notifications marked as read",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error marking notifications" });
    }
};
