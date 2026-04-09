// server/src/routes/players.ts

import { Router } from "express";
import { playersController } from "../controllers/playersController.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Основные CRUD
router.get("/", playersController.getAll);
router.get("/:id", playersController.getById);
router.get("/:id/details", playersController.getFullDetails);
router.post("/", playersController.create);
router.post("/login", playersController.loginByPassword);
router.post("/:id/set-password", playersController.setPassword);
router.patch("/:id", playersController.update);
router.put("/:id", playersController.update); // или можно отдельный replace
router.delete("/:id", playersController.delete);
router.post(
  "/:id/avatar",
  upload.single("avatar"),
  playersController.uploadAvatar,
);
router.delete("/:id/avatar", playersController.deleteAvatar);

// Batch операции
router.post("/:playerId/items/batch", playersController.addItemsBatch);
router.post("/:playerId/abilities/batch", playersController.addAbilitiesBatch);
router.post("/:playerId/effects/batch", playersController.addEffectsBatch);

// Удаление связей
router.delete("/:playerId/items/:itemId", playersController.removeItem);
router.delete(
  "/:playerId/abilities/:abilityId",
  playersController.removeAbility,
);
router.delete("/:playerId/effects/:effectId", playersController.removeEffect);

// Переключение состояний
router.put("/:playerId/items/:itemId/equip", playersController.toggleEquip);
router.put(
  "/:playerId/abilities/:abilityId/toggle",
  playersController.toggleAbility,
);

export default router;
