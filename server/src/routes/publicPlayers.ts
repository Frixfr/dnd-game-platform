// server/src/routes/publicPlayers.ts
// Публичные эндпоинты для игроков (без мастер-токена):
// список доступных персонажей, вход по паролю, установка пароля.
// Все операции привязаны к активной комнате (is_active_for_players).

import { Router } from "express";
import { playersController } from "../controllers/playersController.js";

const router = Router();

// GET /api/public/players — список персонажей, доступных для выбора
router.get("/players", playersController.publicGetPlayers);

// POST /api/public/players/login — вход игрока по паролю
router.post("/players/login", playersController.publicLogin);

// POST /api/public/players/:id/set-password — установка пароля выбранным игроком
router.post(
  "/players/:id/set-password",
  playersController.publicSetPassword,
);

export default router;
