import { Router } from "express";
import { npcsController } from "../controllers/npcsController.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", npcsController.getAll);
router.get("/:id", npcsController.getOne);
router.post("/", npcsController.create);
router.put("/:id", npcsController.update);
router.patch("/:id", npcsController.partialUpdate);
router.delete("/:id", npcsController.delete);
router.get("/:id/details", npcsController.getDetails);

// Специальные эндпоинты для агрессии
router.post("/:id/intimidate", npcsController.intimidate);
router.post("/:id/modify-aggression", npcsController.modifyAggression);
router.post("/:id/calm", npcsController.calm);
router.patch("/:id/aggression", npcsController.setAggression);

// Добавить в конец существующих маршрутов:
router.post("/:id/items/batch", npcsController.addItemsBatch);
router.post("/:id/abilities/batch", npcsController.addAbilitiesBatch);
router.post("/:id/effects/batch", npcsController.addEffectsBatch);
router.delete("/:id/items/:itemId", npcsController.removeItem);
router.delete("/:id/abilities/:abilityId", npcsController.removeAbility);
router.delete("/:id/effects/:effectId", npcsController.removeEffect);
router.put("/:id/items/:itemId/equip", npcsController.toggleEquip);
router.put("/:id/abilities/:abilityId/toggle", npcsController.toggleAbility);
router.post(
  "/:id/avatar",
  upload.single("avatar"),
  npcsController.uploadAvatar,
);
router.delete("/:id/avatar", npcsController.deleteAvatar);
router.post("/:id/duplicate", npcsController.duplicate);

export default router;
