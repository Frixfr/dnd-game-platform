import { Router } from "express";
import { effectsController } from "../controllers/effectsController.js";

const router = Router();

router.get("/", effectsController.getAll);
router.get("/:id", effectsController.getOne);
router.post("/", effectsController.create);
router.put("/:id", effectsController.update);
router.patch("/:id", effectsController.partialUpdate);
router.delete("/:id", effectsController.delete);

export default router;
