import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['voice', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'missed', 'rejected', 'busy'],
        required: true
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number, // in seconds
        default: 0
    }
}, { timestamps: true });

export const Call = mongoose.model("Call", callSchema);
