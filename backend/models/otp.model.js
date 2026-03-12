import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expires_at: {
        type: Date,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    last_sent_at: {
        type: Date,
        default: Date.now,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

// Add TTL index to automatically delete expired OTPs
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model("OTP", otpSchema);
