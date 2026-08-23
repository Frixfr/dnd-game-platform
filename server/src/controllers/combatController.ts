import { Request, Response } from "express";
import { combatService } from "../services/combatService.js";

export const combatController = {
  async getActiveSession(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const session = await combatService.getActiveSession(roomId);
      if (!session) {
        return res.json({ success: true, session: null, participants: [] });
      }
      const fullData = await combatService.getFullCombatData(
        roomId,
        session.id,
      );
      res.json({ success: true, ...fullData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения сессии" });
    }
  },

  async startNewSession(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const session = await combatService.startNewSession(roomId);
      if (session) await combatService.emitCombatUpdate(roomId, session.id);
      res.json({ success: true, session });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка начала битвы" });
    }
  },

  async addParticipant(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId, entityType, entityId } = req.body;
      if (!sessionId || !entityType || !entityId) {
        return res.status(400).json({ error: "Недостаточно данных" });
      }
      const participant = await combatService.addParticipant(
        roomId,
        sessionId,
        entityType,
        entityId,
      );
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true, participant });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления участника" });
    }
  },

  async removeParticipant(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const participantId = Number(req.params.participantId);
      await combatService.removeParticipant(roomId, participantId);
      const session = await combatService.getActiveSession(roomId);
      if (session) await combatService.emitCombatUpdate(roomId, session.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления участника" });
    }
  },

  async reorderParticipants(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId, participantIds } = req.body;
      if (!sessionId || !Array.isArray(participantIds)) {
        return res.status(400).json({ error: "Некорректные данные" });
      }
      await combatService.reorderParticipants(
        roomId,
        sessionId,
        participantIds,
      );
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка изменения порядка" });
    }
  },

  async endRound(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId } = req.body;
      if (!sessionId)
        return res.status(400).json({ error: "sessionId обязателен" });
      await combatService.endRound(roomId, sessionId);
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка завершения раунда" });
    }
  },

  async updateHealth(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId, entityType, entityId, health } = req.body;
      if (!sessionId || !entityType || !entityId || health === undefined) {
        return res.status(400).json({ error: "Недостаточно данных" });
      }
      await combatService.updateHealth(
        roomId,
        sessionId,
        entityType,
        entityId,
        health,
      );
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления здоровья" });
    }
  },

  async nextTurn(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId } = req.body;
      if (!sessionId)
        return res.status(400).json({ error: "sessionId обязателен" });
      await combatService.nextTurn(roomId, sessionId);
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка передачи хода" });
    }
  },

  async addEffect(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId, entityType, entityId, effectId, durationTurns } =
        req.body;
      if (!sessionId || !entityType || !entityId || !effectId) {
        return res.status(400).json({ error: "Недостаточно данных" });
      }
      await combatService.addEffectToParticipant(
        roomId,
        sessionId,
        entityType,
        entityId,
        effectId,
        durationTurns,
      );
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления эффекта" });
    }
  },

  async useAbility(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { sessionId, entityType, entityId, abilityId } = req.body;
      if (!sessionId || !entityType || !entityId || !abilityId) {
        return res.status(400).json({ error: "Недостаточно данных" });
      }
      await combatService.useAbility(
        roomId,
        sessionId,
        entityType,
        entityId,
        abilityId,
      );
      await combatService.emitCombatUpdate(roomId, sessionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async advanceDay(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      await combatService.advanceDay(roomId);
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
