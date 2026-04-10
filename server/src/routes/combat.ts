import { Router } from "express";
import { combatController } from "../controllers/combatController.js";

const router = Router();

router.get("/active", combatController.getActiveSession);
router.post("/start", combatController.startNewSession);
router.post("/participant", combatController.addParticipant);
router.delete(
  "/participant/:participantId",
  combatController.removeParticipant,
);
router.post("/reorder", combatController.reorderParticipants);
router.post("/end-round", combatController.endRound);
router.post("/health", combatController.updateHealth);
router.post("/effect", combatController.addEffect);
router.post("/next-turn", combatController.nextTurn);
router.post("/use-ability", combatController.useAbility);

export default router;
