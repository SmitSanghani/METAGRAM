import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
    },
    caption: {
        type: String,
        default: ""
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "StoryComment"
    }],
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    audience: {
        type: String,
        enum: ['all', 'closeFriends'],
        default: 'all'
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
}, { timestamps: true });

// Optional index for automatic deletion (if cron is not preferred, MongoDB TTL handles it)
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model("Story", storySchema);
