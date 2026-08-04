// server/src/controllers/roomsController.ts
import { Request, Response } from "express";
import { roomsService } from "../services/roomsService.js";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

// Вспомогательная функция для парсинга id из params
function parseIdParam(param: string | string[]): number {
  const str = Array.isArray(param) ? param[0] : param;
  return parseInt(str);
}

export const roomsController = {
  async getAll(_req: Request, res: Response) {
    try {
      const rooms = await roomsService.getAll();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения комнат" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Название комнаты обязательно" });
      }
      const room = await roomsService.create(name);
      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({ error: "Ошибка создания комнаты" });
    }
  },

  async enter(req: Request, res: Response) {
    try {
      const id = parseIdParam(req.params.id);
      const { password } = req.body;

      const isValid = await roomsService.verifyPassword(id, password || "");
      if (!isValid) {
        return res.status(401).json({ error: "Неверный пароль" });
      }

      const room = await roomsService.getById(id);
      if (!room) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const token = jwt.sign({ role: "master", roomId: id }, jwtConfig.secret);

      res.json({ token, room });
    } catch (error) {
      res.status(500).json({ error: "Ошибка входа в комнату" });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseIdParam(req.params.id);
      const { name, password } = req.body;

      if (req.roomId !== id) {
        return res.status(403).json({ error: "Нет доступа к этой комнате" });
      }

      const updated = await roomsService.update(id, { name, password });
      if (!updated) {
        return res.status(404).json({ error: "Комната не найдена" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Ошибка обновления комнаты" });
    }
  },

  async setActive(req: Request, res: Response) {
    try {
      const id = parseIdParam(req.params.id);
      const room = await roomsService.getById(id);
      if (!room) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const result = await roomsService.setActive(id);
      const io = req.app.get("io");
      if (io) {
        io.emit("room:active-changed", { roomId: id, roomName: room.name });
      }
      res.json({ success: true, activeRoomId: result.activeRoomId });
    } catch (error) {
      res.status(500).json({ error: "Ошибка переключения активности" });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = parseIdParam(req.params.id);
      if (req.roomId !== id) {
        return res.status(403).json({ error: "Нет доступа к этой комнате" });
      }

      const deleted = await roomsService.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Комната не найдена" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Ошибка удаления комнаты" });
    }
  },
};
