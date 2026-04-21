import { Request, Response } from "express";
import { combatService } from "../services/combatService.js";

export const combatController = {
  async getActiveSession(req: Request, res: Response) {
    try {
      const session = await combatService.getActiveSession();
      if (!session) {
        return res.json({ success: true, session: null, participants: [] });
      }
      const fullData = await combatService.getFullCombatData(session.id);
      res.json({ success: true, ...fullData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения сессии" });
    }
  },

  async startNewSession(req: Request, res: Response) {
    try {
      const session = await combatService.startNewSession();
      // FIX: added emitCombatUpdate
      if (session) await combatService.emitCombatUpdate(session.id);
      res.json({ success: true, session });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка начала битвы" });
    }
  },

  async addParticipant(req: Request, res: Response) {
    const { sessionId, entityType, entityId } = req.body;
    if (!sessionId || !entityType || !entityId) {
      return res.status(400).json({ error: "Недостаточно данных" });
    }
    try {
      const participant = await combatService.addParticipant(
        sessionId,
        entityType,
        entityId,
      );
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true, participant });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления участника" });
    }
  },

  async removeParticipant(req: Request, res: Response) {
    const { participantId } = req.params;
    try {
      await combatService.removeParticipant(Number(participantId));
      const session = await combatService.getActiveSession();
      if (session) await combatService.emitCombatUpdate(session.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления участника" });
    }
  },

  async reorderParticipants(req: Request, res: Response) {
    const { sessionId, participantIds } = req.body;
    if (!sessionId || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: "Некорректные данные" });
    }
    try {
      await combatService.reorderParticipants(sessionId, participantIds);
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка изменения порядка" });
    }
  },

  async endRound(req: Request, res: Response) {
    const { sessionId } = req.body;
    if (!sessionId)
      return res.status(400).json({ error: "sessionId обязателен" });
    try {
      await combatService.endRound(sessionId);
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка завершения раунда" });
    }
  },

  async updateHealth(req: Request, res: Response) {
    const { sessionId, entityType, entityId, health } = req.body;
    if (!sessionId || !entityType || !entityId || health === undefined) {
      return res.status(400).json({ error: "Недостаточно данных" });
    }
    try {
      await combatService.updateHealth(sessionId, entityType, entityId, health);
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления здоровья" });
    }
  },

  async nextTurn(req: Request, res: Response) {
    const { sessionId } = req.body;
    if (!sessionId)
      return res.status(400).json({ error: "sessionId обязателен" });
    try {
      await combatService.nextTurn(sessionId);
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка передачи хода" });
    }
  },

  async addEffect(req: Request, res: Response) {
    const { sessionId, entityType, entityId, effectId, durationTurns } =
      req.body;
    if (!sessionId || !entityType || !entityId || !effectId) {
      return res.status(400).json({ error: "Недостаточно данных" });
    }
    try {
      await combatService.addEffectToParticipant(
        sessionId,
        entityType,
        entityId,
        effectId,
        durationTurns,
      );
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления эффекта" });
    }
  },

  async useAbility(req: Request, res: Response) {
    const { sessionId, entityType, entityId, abilityId } = req.body;
    if (!sessionId || !entityType || !entityId || !abilityId) {
      return res.status(400).json({ error: "Недостаточно данных" });
    }
    try {
      await combatService.useAbility(
        sessionId,
        entityType,
        entityId,
        abilityId,
      );
      // FIX: added emitCombatUpdate
      await combatService.emitCombatUpdate(sessionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async advanceDay(req: Request, res: Response) {
    try {
      await combatService.advanceDay();
      res.json({
        success: true,
        message: "День завершён, эффекты и кулдауны обновлены",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка при завершении дня" });
    }
  },
};
