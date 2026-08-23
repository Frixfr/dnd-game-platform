// server/src/controllers/logsController.ts
import { Request, Response } from "express";
import { logsService } from "../services/logsService.js";

export const logsController = {
  async getAll(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const limit = req.query.limit ? Number(req.query.limit) : 200;
      const logs = await logsService.getAll(limit, roomId);
      res.json(logs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка получения логов" });
    }
  },
};
