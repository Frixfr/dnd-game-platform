import { Router } from "express";
import { abilitiesController } from "../controllers/abilitiesController.js";

const router = Router();

router.get("/", abilitiesController.getAll);
router.get("/:id", abilitiesController.getOne);
router.post("/", abilitiesController.create);
router.put("/:id", abilitiesController.update);
router.delete("/:id", abilitiesController.delete);

export default router;
