// server/src/controllers/mapsController.ts
import { Request, Response } from "express";
import { mapsService } from "../services/mapsService.js";
import { getIO } from "../socket/index.js";

export const mapsController = {
  // Получить все карты
  async getAllMaps(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const maps = await mapsService.getAllMaps(roomId);
      res.json(maps);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения карт" });
    }
  },

  // Получить карту с токенами
  async getMapWithTokens(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      const map = await mapsService.getMapById(roomId, id);
      if (!map) {
        return res.status(404).json({ error: "Карта не найдена" });
      }
      const tokens = await mapsService.getTokensByMapId(roomId, id);
      res.json({ ...map, tokens });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения карты" });
    }
  },

  // Создать карту (с загрузкой изображения)
  async createMap(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const { name, show_to_players } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Название карты обязательно" });
      }
      const file = (req as any).file;
      if (!file) {
        return res
          .status(400)
          .json({ error: "Изображение карты не загружено" });
      }
      const imageUrl = `/uploads/maps/${file.filename}`;
      const map = await mapsService.createMap(
        roomId,
        { name, show_to_players: show_to_players === "true" },
        imageUrl,
        file.path,
      );
      const io = getIO();
      io.to(`room:${roomId}`).emit("map:created", map);
      res.status(201).json(map);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка создания карты" });
    }
  },

  // Обновить карту (только имя, show_to_players)
  async updateMap(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      const { name, show_to_players } = req.body;
      const updated = await mapsService.updateMap(roomId, id, {
        name,
        show_to_players,
      });
      if (!updated) {
        return res.status(404).json({ error: "Карта не найдена" });
      }
      const io = getIO();
      io.to(`room:${roomId}`).emit("map:updated", updated);
      // Если show_to_players изменился, обновляем всех
      if (show_to_players !== undefined) {
        await mapsService.setShowToPlayers(roomId, id, show_to_players);
        const activeMap = await mapsService.getActiveMapForPlayers(roomId);
        io.to(`room:${roomId}`).emit("map:active-changed", activeMap);
      }
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления карты" });
    }
  },

  // Удалить карту
  async deleteMap(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      await mapsService.deleteMap(roomId, id);
      const io = getIO();
      io.to(`room:${roomId}`).emit("map:deleted", id);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления карты" });
    }
  },

  // Получить активную карту для игроков
  async getActiveMap(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const map = await mapsService.getActiveMapForPlayers(roomId);
      if (!map) {
        return res.json(null);
      }
      const tokens = await mapsService.getTokensByMapId(roomId, map.id);
      res.json({ ...map, tokens });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения активной карты" });
    }
  },

  // --- Токены ---
  async getTokens(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const mapId = parseInt(String(req.params.mapId));
      if (isNaN(mapId)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      const tokens = await mapsService.getTokensByMapId(roomId, mapId);
      res.json(tokens);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения токенов" });
    }
  },

  async addOrUpdateToken(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const mapId = parseInt(String(req.params.mapId));
      if (isNaN(mapId)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      const { entity_type, entity_id, x, y, is_grayscale, scale } = req.body;
      if (!entity_type || !entity_id) {
        return res
          .status(400)
          .json({ error: "entity_type и entity_id обязательны" });
      }
      const token = await mapsService.addOrUpdateToken(
        roomId,
        mapId,
        entity_type,
        entity_id,
        { x, y, is_grayscale, scale },
      );
      const io = getIO();
      // Отправляем обновлённый список токенов для этой карты
      const allTokens = await mapsService.getTokensByMapId(roomId, mapId);
      io.to(`room:${roomId}`).emit("map:tokens-updated", {
        mapId,
        tokens: allTokens,
      });
      // Также обновляем активную карту, если эта карта показывается игрокам
      const map = await mapsService.getMapById(roomId, mapId);
      if (map?.show_to_players) {
        io.to(`room:${roomId}`).emit("map:active-tokens-updated", allTokens);
      }
      res.json(token);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления токена" });
    }
  },

  async deleteToken(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const mapId = parseInt(String(req.params.mapId));
      if (isNaN(mapId)) {
        return res.status(400).json({ error: "Неверный ID карты" });
      }
      const entity_type = String(req.params.entity_type);
      const entity_id = parseInt(String(req.params.entity_id));
      if (isNaN(entity_id)) {
        return res.status(400).json({ error: "Неверный ID сущности" });
      }
      await mapsService.deleteToken(
        roomId,
        mapId,
        entity_type as any,
        entity_id,
      );
      const io = getIO();
      const allTokens = await mapsService.getTokensByMapId(roomId, mapId);
      io.to(`room:${roomId}`).emit("map:tokens-updated", {
        mapId,
        tokens: allTokens,
      });
      const map = await mapsService.getMapById(roomId, mapId);
      if (map?.show_to_players) {
        io.to(`room:${roomId}`).emit("map:active-tokens-updated", allTokens);
      }
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления токена" });
    }
  },

  async getAvailableEntities(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const data = await mapsService.getAvailableEntities(roomId);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения списка сущностей" });
    }
  },
};
