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
    // We can add other global settings here in the future
}, { timestamps: true });

export const Setting = mongoose.model('Setting', settingSchema);
