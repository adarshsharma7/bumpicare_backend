import app from "./app.js";
import dotenv from "dotenv";
import connect from "./db/dbConnection.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    console.log("🟡 Starting server...");
    await connect();
    console.log("🟢 Database connected successfully.");

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  }
})();