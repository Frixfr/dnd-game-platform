import { Router } from "express";
import { playerEffectsController } from "../controllers/playerEffectsController.js";

const router = Router();

router.get("/", playerEffectsController.getAll);
router.post("/", playerEffectsController.create);
router.delete("/", playerEffectsController.delete);

export default router;
