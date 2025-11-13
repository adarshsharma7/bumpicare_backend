import mongoose from "mongoose";

const connect = async () => {
try {
const conn = await mongoose.connect(process.env.MONGODB_URL);
console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
} catch (error) {
console.error("❌ MongoDB connection failed:", error.message);
process.exit(1);
}
};

export default connect;