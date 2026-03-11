import mongoose from "mongoose";

const storyCommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story',
        required: true
    }
}, { timestamps: true });

export const StoryComment = mongoose.model('StoryComment', storyCommentSchema);
