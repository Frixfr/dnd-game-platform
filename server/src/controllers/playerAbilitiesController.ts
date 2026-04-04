import { Request, Response } from "express";
import { playerAbilitiesService } from "../services/playerAbilitiesService.js";
import { getIO } from "../socket/index.js";

export const playerAbilitiesController = {
  async getAll(req: Request, res: Response) {
    try {
      const player_id = req.query.player_id
        ? Number(req.query.player_id)
        : undefined;
      const ability_id = req.query.ability_id
        ? Number(req.query.ability_id)
        : undefined;
      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined;
      const with_details = req.query.with_details === "true";

      const data = await playerAbilitiesService.getAll({
        player_id,
        ability_id,
        is_active,
        with_details,
      });
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const { player_id, ability_id, is_active = true } = req.body;

    if (!player_id || typeof player_id !== "number" || player_id <= 0) {
      return res
        .status(400)
        .json({ error: "player_id должен быть положительным числом" });
    }
    if (!ability_id || typeof ability_id !== "number" || ability_id <= 0) {
      return res
        .status(400)
        .json({ error: "ability_id должен быть положительным числом" });
    }
    if (typeof is_active !== "boolean") {
      return res
        .status(400)
        .json({ error: "is_active должен быть булевым значением" });
    }

    try {
      const result = await playerAbilitiesService.create(
        player_id,
        ability_id,
        is_active,
      );
      getIO().emit("player_ability:created", result);
      res.status(201).json({ success: true, player_ability: result });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания связи" });
    }
  },

  async delete(req: Request, res: Response) {
    const player_id = req.query.player_id
      ? Number(req.query.player_id)
      : undefined;
    const ability_id = req.query.ability_id
      ? Number(req.query.ability_id)
      : undefined;
    if (!player_id || !ability_id) {
      return res
        .status(400)
        .json({ error: "Необходимы player_id и ability_id" });
    }
    try {
      await playerAbilitiesService.delete(player_id, ability_id);
      getIO().emit("player_ability:deleted", { player_id, ability_id });
      res.json({ success: true, message: "Связь удалена" });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Связь не найдена" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления связи" });
    }
  },
};
