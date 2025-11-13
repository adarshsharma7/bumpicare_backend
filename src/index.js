import app from "./app.js";
import dotenv from "dotenv";
import connect from "./db/dbConnection.js";

dotenv.config({
  path: "./.env",
});

connect()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server is running at port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Some error while running the server:", err);
  });

