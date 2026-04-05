import { Router } from "express";
import { npcEffectsController } from "../controllers/npcEffectsController";

const router = Router();
router.get("/", npcEffectsController.getAll);
router.post("/", npcEffectsController.create);
router.delete("/", npcEffectsController.delete);

export default router;
