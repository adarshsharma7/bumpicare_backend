import mongoose from "mongoose";
import dns from "dns";

let isConnected = false;

const log = (...msg) => console.log("[DB]", new Date().toISOString(), ...msg);
const errLog = (...msg) => console.error("[DB-ERROR]", new Date().toISOString(), ...msg);

const connect = async () => {
  if (isConnected) {
    log("✅ MongoDB already connected");
    return;
  }

  const uri = process.env.MONGODB_URL;

  if (!uri) {
    errLog("❌ MONGODB_URL is missing in .env file!");
    throw new Error("MONGODB_URL not found");
  }

  // DNS test (to detect cluster unreachable or ENOTFOUND)
  try {
    const match = uri.match(/@([^/]+)\//);
    if (match) {
      const host = match[1];
      const srvName = `_mongodb._tcp.${host}`;
      log("🔍 Resolving DNS for:", srvName);
      const records = await new Promise((resolve, reject) =>
        dns.resolveSrv(srvName, (err, addresses) =>
          err ? reject(err) : resolve(addresses)
        )
      );
      log("✅ DNS SRV Records Found:", records.map(r => r.name));
    } else {
      log("⚠️ Could not extract host from MongoDB URI");
    }
  } catch (dnsErr) {
    errLog("❌ DNS resolution failed:", dnsErr.message);
  }

  // Connection events listener
  mongoose.connection.on("connecting", () => log("⏳ Mongoose connecting..."));
  mongoose.connection.on("connected", () => log("✅ Mongoose connected successfully"));
  mongoose.connection.on("reconnected", () => log("🔁 Mongoose reconnected"));
  mongoose.connection.on("disconnected", () => errLog("⚠️ Mongoose disconnected"));
  mongoose.connection.on("error", (err) => errLog("❌ Mongoose error:", err.message));

  try {
    log("🚀 Attempting MongoDB connection...");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });

    isConnected = true;
    log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Ping test
    try {
      const admin = conn.connection.db.admin();
      const ping = await admin.ping();
      log("📡 MongoDB ping response:", ping);
    } catch (pingErr) {
      errLog("⚠️ Ping failed:", pingErr.message);
    }

  } catch (error) {
    errLog("❌ MongoDB connection failed:", error.message);
    throw error; // rethrow so index.js catch kare
  }
};

export default connect;