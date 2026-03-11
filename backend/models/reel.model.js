import mongoose from "mongoose";

const reelSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: { type: String, required: true },
    caption: { type: String, default: "" },
    allowComments: { type: Boolean, default: true },
    allowLikes: { type: Boolean, default: true },
    allowSave: { type: Boolean, default: true },
    allowShare: { type: Boolean, default: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ReelComment' }],
    viewsCount: { type: Number, default: 0 },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const Reel = mongoose.model('Reel', reelSchema);
