// server/src/routes/master.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

const router = Router();

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "dm123";

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Пароль обязателен" });
  }
  if (password !== MASTER_PASSWORD) {
    return res.status(401).json({ error: "Неверный пароль" });
  }

  // Бессрочный токен
  const token = jwt.sign({ role: "master" }, jwtConfig.secret);
  return res.json({ token });
});

export default router;
