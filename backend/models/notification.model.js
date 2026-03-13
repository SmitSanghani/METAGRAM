import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["follow", "like", "comment", "story_like", "story_comment", "follow_request", "follow_accept", "reply", "comment_like", "reel_comment_like", "profile_visit"],
        required: true,
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    },
    story: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
    },
    reel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reel",
    },
    text: {
        type: String, // For comment text or generic message
    },
    read: {
        type: Boolean,
        default: false,
    },
    requestStatus: {
        type: String,
        enum: ['accepted', 'deleted'],
        default: null
    }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);
