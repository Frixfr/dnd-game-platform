// server/src/config/jwt.ts
import dotenv from "dotenv";

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
  //expiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

export interface JwtPayload {
  role: "master" | "player";
  roomId?: number;
  playerId?: number;
  iat?: number;
  exp?: number;
}
