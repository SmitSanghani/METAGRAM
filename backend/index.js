import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postroute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import storyRoute from "./routes/story.route.js";
import notificationRoute from "./routes/notification.route.js";
import reelRoute from "./routes/reel.route.js";
import cron from "node-cron";
import { Story } from "./models/story.model.js";
import { app, server } from "./socket/socket.js";


// dotenv.config({});
dotenv.config({ quiet: true });

const PORT = process.env.PORT || 3000;

// app.get("/", (req, res) => {                  // if req. not use
app.get("/", (_, res) => {
    return res.status(200).json({
        message: "I Am Coming From Backend...",
        success: true
    })
})


// Middlewares - By default
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true
}
app.use(cors(corsOptions));


// All APIs Are Show Here :
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postroute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/story", storyRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/reels", reelRoute);

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


server.listen(PORT, () => {
    connectDB();
    console.log(`Server listen at port ${PORT}`)
})


