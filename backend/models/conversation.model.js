import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for groups
    message: { type: String, default: "" },
    messageType: { type: String, enum: ['text', 'image', 'video', 'gif', 'story_reply', 'story_reaction', 'reel', 'post', 'file', 'system'], default: 'text' },
    mediaUrl: { type: String, default: "" },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    replyTo: { type: mongoose.Schema.Types.ObjectId }, // Reference by ID within the array
    seen: { type: Boolean, default: false },
    reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For group seen state
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const conversationschema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    clearedAt: {
        type: Map,
        of: Date,
        default: {}
    },
    hiddenAt: {
        type: Map,
        of: Date,
        default: {}
    },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
    groupProfilePicture: { type: String },
    groupAdmin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [messageSchema]
}, { timestamps: true });

export const Conversation = mongoose.model('Conversation', conversationschema);
