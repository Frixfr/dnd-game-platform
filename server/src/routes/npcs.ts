import { Router } from "express";
import { npcsController } from "../controllers/npcsController.js";

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

export default router;
