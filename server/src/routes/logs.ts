import { Router } from "express";
import { logsController } from "../controllers/logsController.js";

const router = Router();

router.get("/", logsController.getAll);

export default router;
