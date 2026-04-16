import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve('e:/METAGRAM/backend/.env') });

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

async function testCloudinary() {
    try {
        console.log("Testing Cloudinary with Cloud Name:", process.env.CLOUD_NAME);
        const result = await cloudinary.api.ping();
        console.log("Ping Success:", result);
        
        // Try to fetch one of the failing images to see what the API says
        const ids = ["instagram-clone/posts/gthannjv22s0tt8utiqz", "bzjeksnevchrfbv0x7t2"];
        for (const id of ids) {
            try {
                const resource = await cloudinary.api.resource(id);
                console.log(`Resource [${id}] found!`);
            } catch (e) {
                console.log(`Resource [${id}] NOT found in this account.`);
            }
        }
    } catch (error) {
        console.error("Cloudinary connection failed:", error.message);
    }
}

testCloudinary();
