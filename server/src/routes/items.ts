import { Router } from "express";
import { itemsController } from "../controllers/itemsController.js";

const router = Router();

router.get("/", itemsController.getAll);
router.get("/:id", itemsController.getOne);
router.post("/", itemsController.create);
router.put("/:id", itemsController.update);
router.patch("/:id", itemsController.partialUpdate);
router.delete("/:id", itemsController.delete);

export default router;
