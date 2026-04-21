import { Router } from "express";
import { playerItemsController } from "../controllers/playerItemsController.js";

const router = Router();

router.get("/", playerItemsController.getAll);
router.post("/", playerItemsController.create);
router.delete("/", playerItemsController.delete);
router.put("/:id/equip", playerItemsController.toggleEquip);
router.post(
  "/:playerId/items/:playerItemId/use",
  playerItemsController.useItem,
);
router.delete(
  "/:playerId/items/:playerItemId/discard",
  playerItemsController.discardItem,
);
router.post(
  "/:playerId/items/:playerItemId/transfer",
  playerItemsController.transferItem,
);

export default router;
