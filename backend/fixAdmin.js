import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/user.model.js";

dotenv.config();

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('mongoDB connected successfully...');

        const username = 'mohit'; // The user we see in the screenshot
        const user = await User.findOne({ username });

        if (user) {
            user.role = 'admin';
            await user.save();
            console.log(`User ${username} is now an admin.`);
        } else {
            console.log(`User ${username} not found.`);
        }

        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

fixAdmin();
