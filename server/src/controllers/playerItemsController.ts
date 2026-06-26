// server/src/controllers/playerItemsController.ts
import { Request, Response } from "express";
import { playerItemsService } from "../services/playerItemsService.js";
import { getIO, emitToPlayer } from "../socket/index.js";

export const playerItemsController = {
  async getAll(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const player_id = req.query.player_id
        ? Number(req.query.player_id)
        : undefined;
      const item_id = req.query.item_id ? Number(req.query.item_id) : undefined;
      const is_equipped =
        req.query.is_equipped !== undefined
          ? req.query.is_equipped === "true"
          : undefined;
      const with_details = req.query.with_details === "true";

      const data = await playerItemsService.getAll(roomId, {
        player_id,
        item_id,
        is_equipped,
        with_details,
      });
      res.json({ success: true, data, count: data.length });
    } catch (error: any) {
      if (error.message.includes("не найден в этой комнате")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const {
        player_id,
        item_id,
        quantity = 1,
        is_equipped = false,
      } = req.body;

      if (!player_id || typeof player_id !== "number" || player_id <= 0) {
        return res
          .status(400)
          .json({ error: "player_id должен быть положительным числом" });
      }
      if (!item_id || typeof item_id !== "number" || item_id <= 0) {
        return res
          .status(400)
          .json({ error: "item_id должен быть положительным числом" });
      }
      if (typeof quantity !== "number" || quantity < 1) {
        return res
          .status(400)
          .json({ error: "quantity должно быть положительным числом" });
      }
      if (typeof is_equipped !== "boolean") {
        return res
          .status(400)
          .json({ error: "is_equipped должен быть булевым значением" });
      }

      const result = await playerItemsService.create(
        roomId,
        player_id,
        item_id,
        quantity,
        is_equipped,
      );
      const io = getIO();
      io.to(`room:${roomId}`).emit("player_item:created", result);
      res.status(201).json({ success: true, player_item: result });
    } catch (error: any) {
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления предмета" });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const player_id = req.query.player_id
        ? Number(req.query.player_id)
        : undefined;
      const item_id = req.query.item_id ? Number(req.query.item_id) : undefined;
      if (!player_id || !item_id) {
        return res
          .status(400)
          .json({ error: "Необходимы player_id и item_id" });
      }
      await playerItemsService.delete(roomId, player_id, item_id);
      const io = getIO();
      io.to(`room:${roomId}`).emit("player_item:deleted", {
        player_id,
        item_id,
      });
      res.json({ success: true, message: "Предмет удалён" });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Предмет не найден у игрока" });
      }
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления предмета" });
    }
  },

  async toggleEquip(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const id = req.params.id ? Number(req.params.id) : undefined;
      const { is_equipped } = req.body;
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Некорректный id записи" });
      }
      if (typeof is_equipped !== "boolean") {
        return res
          .status(400)
          .json({ error: "is_equipped должен быть булевым значением" });
      }
      const updated = await playerItemsService.toggleEquip(
        roomId,
        id,
        is_equipped,
      );
      const io = getIO();
      io.to(`room:${roomId}`).emit("player_item:updated", updated);
      res.json({ success: true, player_item: updated });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Запись не найдена" });
      }
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления экипировки" });
    }
  },

  async useItem(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const playerId = parseInt(String(req.params.playerId));
      const playerItemId = parseInt(String(req.params.playerItemId));
      if (isNaN(playerId) || isNaN(playerItemId)) {
        return res.status(400).json({ error: "Неверный идентификатор" });
      }
      const updatedPlayer = await playerItemsService.useItem(
        roomId,
        playerId,
        playerItemId,
      );
      // Отправляем обновление конкретному игроку
      emitToPlayer(playerId, "player:updated", updatedPlayer);
      // Также отправляем в комнату для мастера и других клиентов
      const io = getIO();
      io.to(`room:${roomId}`).emit("player:updated", updatedPlayer);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },

  async discardItem(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const playerId = parseInt(String(req.params.playerId));
      const playerItemId = parseInt(String(req.params.playerItemId));
      const { quantity } = req.body; // опционально, число

      if (isNaN(playerId) || isNaN(playerItemId)) {
        return res.status(400).json({ error: "Неверный идентификатор" });
      }
      if (
        quantity !== undefined &&
        (typeof quantity !== "number" || quantity <= 0)
      ) {
        return res
          .status(400)
          .json({ error: "Количество должно быть положительным числом" });
      }

      const updatedPlayer = await playerItemsService.discardItem(
        roomId,
        playerId,
        playerItemId,
        quantity,
      );
      emitToPlayer(playerId, "player:updated", updatedPlayer);
      const io = getIO();
      io.to(`room:${roomId}`).emit("player:updated", updatedPlayer);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },

  async transferItem(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const playerId = parseInt(String(req.params.playerId));
      const playerItemId = parseInt(String(req.params.playerItemId));
      const { targetPlayerId, quantity = 1 } = req.body;
      if (
        isNaN(playerId) ||
        isNaN(playerItemId) ||
        !targetPlayerId ||
        isNaN(Number(targetPlayerId))
      ) {
        return res.status(400).json({ error: "Неверные идентификаторы" });
      }
      const { sender, target } = await playerItemsService.transferItem(
        roomId,
        playerId,
        playerItemId,
        Number(targetPlayerId),
        Number(quantity),
      );
      emitToPlayer(playerId, "player:updated", sender);
      emitToPlayer(Number(targetPlayerId), "player:updated", target);
      const io = getIO();
      io.to(`room:${roomId}`).emit("player:updated", sender);
      io.to(`room:${roomId}`).emit("player:updated", target);
      res.json({ success: true, sender, target });
    } catch (error: any) {
      if (error.message.includes("не найден")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },
};
