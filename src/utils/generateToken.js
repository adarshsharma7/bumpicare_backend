import jwt from "jsonwebtoken";

export const generateToken = async (userId) => {
  const token = jwt.sign(
    { _id: userId }, 
    process.env.JWT_SECRET_KEY, 
    { expiresIn: "7d" }
  );
  return token;
};
