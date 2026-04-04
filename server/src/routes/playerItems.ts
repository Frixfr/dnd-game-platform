import { Router } from "express";
import { playerItemsController } from "../controllers/playerItemsController.js";

const router = Router();

router.get("/", playerItemsController.getAll);
router.post("/", playerItemsController.create);
router.delete("/", playerItemsController.delete);
router.put("/:id/equip", playerItemsController.toggleEquip);

export default router;
