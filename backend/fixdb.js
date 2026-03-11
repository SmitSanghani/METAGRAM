import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        await mongoose.connection.collection('conversations').drop();
        console.log("Conversations dropped");
    } catch (e) { }
    try {
        await mongoose.connection.collection('messages').drop();
        console.log("Messages dropped");
    } catch (e) { }
    process.exit(0);
});
