// server/src/routes/maps.ts
import { Router } from "express";
import { mapsController } from "../controllers/mapsController.js";
import { uploadMap } from "../middleware/upload.js";
import { authMaster } from "../middleware/authMaster.js";

const router = Router();

// Все маршруты этого роутера требуют авторизацию мастера.
// ПУБЛИЧНЫЕ GET-эндпоинты карт (без авторизации) вынесены отдельно
// в app.ts: GET /api/maps/public/active и GET /api/maps/public/:id —
// они используются игроками, у которых нет мастер-токена.
router.use(authMaster);

// Карты
router.get("/", mapsController.getAllMaps);
router.get("/active", mapsController.getActiveMap);
router.get("/:id", mapsController.getMapWithTokens);
router.post("/", uploadMap.single("image"), mapsController.createMap);
router.put("/:id", mapsController.updateMap);
router.delete("/:id", mapsController.deleteMap);

// Токены на конкретной карте
router.get("/:mapId/tokens", mapsController.getTokens);
router.post("/:mapId/tokens", mapsController.addOrUpdateToken);
router.delete(
  "/:mapId/tokens/:entity_type/:entity_id",
  mapsController.deleteToken,
);

// Список доступных игроков/NPC для добавления токенов
router.get("/entities/available", mapsController.getAvailableEntities);

export default router;
