import { User } from "../models/user.model.js";
import { OTP } from "../models/otp.model.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required", success: false });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "No account found with this identity", success: false });
        }

        // Check for resend limit (60 seconds)
        const existingOTP = await OTP.findOne({ email });
        if (existingOTP) {
            const timeDiff = (Date.now() - existingOTP.last_sent_at) / 1000;
            if (timeDiff < 60) {
                return res.status(429).json({
                    message: `Please wait ${Math.ceil(60 - timeDiff)} seconds before requesting a new OTP`,
                    success: false
                });
            }
        }

        // Generate 6 digit numeric code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now

        if (existingOTP) {
            existingOTP.otp = otpCode;
            existingOTP.expires_at = expires_at;
            existingOTP.last_sent_at = Date.now();
            existingOTP.attempts = 0;
            await existingOTP.save();
        } else {
            await OTP.create({
                email,
                otp: otpCode,
                expires_at,
                last_sent_at: Date.now()
            });
        }

        // Send Email
        const mailOptions = {
            from: `"Metagram" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Metagram Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                    <h2 style="color: #32b096; text-align: center;">METAGRAM</h2>
                    <p>Hello,</p>
                    <p>Your OTP for resetting your Metagram password is:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                        ${otpCode}
                    </div>
                    <p>This OTP is valid for <strong>3 minutes only</strong>.</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Metagram Digital Identity</p>
                </div>
            `
        };

        // Check if credentials are placeholders or missing
        const isPlaceholder = process.env.EMAIL_USER?.includes('aapka-email') || process.env.EMAIL_PASS?.includes('woh-16-digit');
        const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS && !isPlaceholder;

        if (hasCredentials) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Email sent successfully to ${email}`);
            } catch (mailError) {
                console.error("Nodemailer Error: Fallback to console...");
                console.log("------------------------------------------");
                console.log("LOGIN FAILED: Using Terminal Fallback");
                console.log(`METAGRAM OTP FOR ${email}: ${otpCode}`);
                console.log("------------------------------------------");
            }
        } else {
            console.log("------------------------------------------");
            console.log("NOTICE: EMAIL CREDENTIALS MISSING OR PLACEHOLDERS IN .env");
            console.log(`METAGRAM OTP FOR ${email}: ${otpCode}`);
            console.log("------------------------------------------");
        }

        return res.status(200).json({
            message: "OTP generated successfully (Check terminal if email not received)",
            success: true
        });

    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required", success: false });
        }

        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord) {
            return res.status(400).json({ message: "Verification code expired or not found. Please request a new one.", success: false });
        }

        // Check expiry
        if (otpRecord.expires_at < Date.now()) {
            return res.status(400).json({ message: "OTP expired. Request a new OTP.", success: false });
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            return res.status(429).json({ message: "Maximum attempts reached. Request a new OTP.", success: false });
        }

        if (otpRecord.otp !== otp) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({
                message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
                success: false
            });
        }

        return res.status(200).json({
            message: "OTP verified successfully",
            success: true
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, password, otp } = req.body;
        if (!email || !password || !otp) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }

        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp || otpRecord.expires_at < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP", success: false });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Unable to find the associated account for this reset.", success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        // Delete OTP record after success
        await OTP.deleteOne({ email });

        return res.status(200).json({
            message: "Password reset successful. You can now login.",
            success: true
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};
