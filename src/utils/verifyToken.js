import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const verifyToken = async () => {
  try {
    const cookieStore =await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return decoded.userId;
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
};
