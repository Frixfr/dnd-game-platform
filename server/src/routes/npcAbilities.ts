import { Router } from "express";
import { npcAbilitiesController } from "../controllers/npcAbilitiesController.js";

const router = Router();
router.get("/", npcAbilitiesController.getAll);
router.post("/", npcAbilitiesController.create);
router.delete("/", npcAbilitiesController.delete);

export default router;
