import express from "express";
import { sendOTP, verifyOTP, resetPassword } from "../controllers/auth.controller.js";

const router = express.Router();

router.route("/send-otp").post(sendOTP);
router.route("/verify-otp").post(verifyOTP);
router.route("/reset-password").post(resetPassword);

export default router;
