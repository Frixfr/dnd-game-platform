import { Router } from "express";
import { racesController } from "../controllers/racesController.js";

const router = Router();

router.get("/", racesController.getAll);
router.get("/:id", racesController.getOne);
router.post("/", racesController.create);
router.put("/:id", racesController.update);
router.delete("/:id", racesController.delete);

export default router;
