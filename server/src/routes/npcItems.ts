import { Router } from "express";
import { npcItemsController } from "../controllers/npcItemsController";

const router = Router();
router.get("/", npcItemsController.getAll);
router.post("/", npcItemsController.create);
router.delete("/", npcItemsController.delete);
router.put("/:id/equip", npcItemsController.toggleEquip);

export default router;
