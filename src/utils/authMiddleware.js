import { verifyToken } from "./verifyToken.js";
import User from "../models/User.js";
import { dbConnect } from "../dbConfig/dbConfig.js";

export const authMiddleware = async () => {
  await dbConnect();
  const userId = await verifyToken();

  if (!userId) {
    return null;
  }

  const user = await User.findById(userId).select("-password");
  return user;
};
