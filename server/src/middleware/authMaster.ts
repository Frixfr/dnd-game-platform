// server/src/middleware/authMaster.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig, JwtPayload } from "../config/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      roomId?: number;
    }
  }
}

export function authMaster(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    if (decoded.role !== "master") {
      return res.status(403).json({ error: "Доступ только для мастера" });
    }
    req.user = decoded;
    req.roomId = decoded.roomId;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Недействительный или просроченный токен" });
  }
}
