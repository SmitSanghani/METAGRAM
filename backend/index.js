import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import authRoute from "./routes/auth.route.js";
import postroute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import storyRoute from "./routes/story.route.js";
import notificationRoute from "./routes/notification.route.js";
import reelRoute from "./routes/reel.route.js";
import settingRoute from "./routes/setting.route.js";
import cron from "node-cron";
import { Story } from "./models/story.model.js";
import { app, server } from "./socket/socket.js";


// dotenv.config({});
dotenv.config({ quiet: true });

const PORT = process.env.PORT || 3000;

// app.get("/", (req, res) => {                  // if req. not use
// 1. CORS - Must be first
const allowedOrigins = [
    'https://metagram-nine.vercel.app',
    'https://www.metagram-nine.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

if (process.env.URL) {
    allowedOrigins.push(process.env.URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const lowerOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
        const isAllowed = allowedOrigins.some(o => o.trim().toLowerCase().replace(/\/$/, "") === lowerOrigin);
        const isVercel = /\.vercel\.app$/.test(lowerOrigin);
        const isLocalNetwork = /^http:\/\/192\.168\.\d+\.\d+:5173$/.test(lowerOrigin);

        if (isAllowed || isVercel || isLocalNetwork) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204
}
app.use(cors(corsOptions));

// 2. Global Parsers
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

// 3. Test Route
app.get("/", (_, res) => {
    return res.status(200).json({
        message: "I Am Coming From Backend...",
        success: true
    })
})

const __dirname = path.resolve();

// 4. API Routes
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postroute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/story", storyRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/reels", reelRoute);
app.use("/api/v1/setting", settingRoute);

app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*path", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "frontend", "dist", "index.html"));
});

// Cron job to clean up expired stories every hour
cron.schedule('0 * * * *', async () => {
    try {
        console.log('Running cron job to delete expired stories...');
        const now = new Date();
        const result = await Story.deleteMany({ expiresAt: { $lt: now } });
        console.log(`Deleted ${result.deletedCount} expired stories.`);
    } catch (error) {
        console.error('Error deleting expired stories:', error);
    }
});


const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        await connectDB();
        server.listen(PORT, () => {
            console.log(`Server listening at port ${PORT}`);
        });
    } catch (error) {
        console.error("FAILED to start server due to database connection failure.");
        process.exit(1);
    }
};

startServer();


