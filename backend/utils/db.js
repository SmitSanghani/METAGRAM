import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URI;
        if (!mongoUrl) {
            console.error("FATAL ERROR: MONGO_URI is not defined in environment variables.");
            process.exit(1);
        }

        console.log('Attempting to connect to MongoDB...');
        
        // Mongoose 6+ has these as default but adding serverSelectionTimeoutMS
        // to fail faster if the connection is impossible (e.g. firewall)
        const conn = await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 5000, // 5 seconds instead of 30
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        if (error.message.includes('ESERVFAIL') || error.message.includes('ETIMEDOUT')) {
            console.error('TIP: Check if your MongoDB Atlas IP Whitelist allows connections from 0.0.0.0/0 (for dynamic hosting like Render/Vercel).');
        }
        // Throw the error so the caller can handle it (essential for production startup)
        throw error;
    }
}

export default connectDB;
