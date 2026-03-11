import connectDB from './utils/db.js';
import { User } from './models/user.model.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const clear = async () => {
    try {
        await connectDB();
        await User.updateMany({}, { followers: [], following: [] });
        console.log('Successfully unfollowed everyone and cleared all follower lists.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

clear();
