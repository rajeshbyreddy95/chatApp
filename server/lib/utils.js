// lib/utils.js
import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: false, // ❌ false for localhost (no HTTPS)
    sameSite: "lax", // allow sending cookies from http://localhost:3000
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
