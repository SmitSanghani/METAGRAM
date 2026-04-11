import mongoose from "mongoose";

const messageschema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        default: ""
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'gif', 'story_reply', 'story_reaction', 'reel', 'post', 'file', 'call_log'],
        default: 'text'
    },
    callLog: {
        callType: { type: String, enum: ['audio', 'video'] },
        status: { type: String, enum: ['completed', 'missed', 'rejected', 'busy', 'outgoing'] },
        duration: { type: Number }, // in seconds
        recordingUrl: { type: String }
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story'
    },
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel'
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    seen: {
        type: Boolean,
        default: false
    },
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Message = mongoose.model('Message', messageschema);    