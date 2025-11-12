import mongoose from "mongoose";

let isConnected = false;

const connect = async () => {
if (isConnected) {
console.log("✅ MongoDB already connected");
return;
}

try {
const conn = await mongoose.connect(process.env.MONGODB_URL);
isConnected = true;
console.log(✅ MongoDB Connected: ${conn.connection.host});
} catch (error) {
console.error("❌ MongoDB connection failed:", error.message);
process.exit(1);
}
};

export default connect;