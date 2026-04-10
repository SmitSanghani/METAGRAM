import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
    postsEnabled: {
        type: Boolean,
        default: true
    },
    reelsEnabled: {
        type: Boolean,
        default: true
    },
    callingEnabled: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

export const Setting = mongoose.model('Setting', settingSchema);
