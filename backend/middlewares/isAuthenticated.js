import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
    try {
        let token = req.cookies.token;
        
        // Also check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                message: "User not authenticated",
                success: false,
            });
        }

        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        if (!decode) {
            return res.status(401).json({
                message: "Invalid",
                success: false,
            });
        }
        req.id = decode.userId;

        // If role is in the token, use it directly (fast path)
        // Otherwise, fetch from the database (fallback for old tokens)
        if (decode.role) {
            req.role = decode.role;
        } else {
            const user = await User.findById(decode.userId).select("role");
            req.role = user?.role || "user";
        }

        next();

    } catch (error) {
        console.error("Authentication Error:", error);
        return res.status(401).json({
            message: "Authentication failed",
            success: false,
        });
    }
};

export default isAuthenticated;