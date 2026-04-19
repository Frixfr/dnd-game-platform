// server/src/routes/maps.ts
import { Router } from "express";
import { mapsController } from "../controllers/mapsController.js";
import { uploadMap } from "../middleware/upload.js";

const router = Router();

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
