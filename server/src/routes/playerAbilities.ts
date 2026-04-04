import { Router } from "express";
import { playerAbilitiesController } from "../controllers/playerAbilitiesController.js";

const router = Router();

router.get("/", playerAbilitiesController.getAll);
router.post("/", playerAbilitiesController.create);
router.delete("/", playerAbilitiesController.delete);

export default router;
