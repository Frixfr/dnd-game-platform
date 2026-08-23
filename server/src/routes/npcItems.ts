import { Router } from "express";
import { npcItemsController } from "../controllers/npcItemsController";

const router = Router();
router.get("/", npcItemsController.getAll);
router.post("/", npcItemsController.create);
router.delete("/", npcItemsController.delete);
router.put("/:id/equip", npcItemsController.toggleEquip);
router.post("/:npcId/items/:npcItemId/use", npcItemsController.useItem);

export default router;
