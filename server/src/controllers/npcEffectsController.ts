import { Request, Response } from "express";
import { npcEffectsService } from "../services/npcEffectsService.js";
import { getIO } from "../socket/index.js";

export const npcEffectsController = {
  async getAll(req: Request, res: Response) {
    try {
      const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
      const effect_id = req.query.effect_id
        ? Number(req.query.effect_id)
        : undefined;
      const source_type = req.query.source_type
        ? String(req.query.source_type)
        : undefined;
      const with_details = req.query.with_details === "true";

      const data = await npcEffectsService.getAll({
        npc_id,
        effect_id,
        source_type,
        with_details,
      });
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const {
      npc_id,
      effect_id,
      source_type = "admin",
      source_id = null,
      remaining_turns = null,
      remaining_days = null,
    } = req.body;

    if (!npc_id || typeof npc_id !== "number" || npc_id <= 0) {
      return res
        .status(400)
        .json({ error: "npc_id должен быть положительным числом" });
    }
    if (!effect_id || typeof effect_id !== "number" || effect_id <= 0) {
      return res
        .status(400)
        .json({ error: "effect_id должен быть положительным числом" });
    }
    const allowedSources = ["ability", "item", "admin"];
    if (!allowedSources.includes(source_type)) {
      return res
        .status(400)
        .json({
          error: `source_type должен быть: ${allowedSources.join(", ")}`,
        });
    }
    if (
      source_id !== null &&
      (typeof source_id !== "number" || source_id <= 0)
    ) {
      return res
        .status(400)
        .json({ error: "source_id должен быть положительным числом или null" });
    }

    try {
      const result = await npcEffectsService.create({
        npc_id,
        effect_id,
        source_type,
        source_id,
        remaining_turns,
        remaining_days,
      });
      getIO().emit("npc_effect:created", result);
      res.status(201).json({ success: true, npc_effect: result });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка применения эффекта" });
    }
  },

  async delete(req: Request, res: Response) {
    const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
    const effect_id = req.query.effect_id
      ? Number(req.query.effect_id)
      : undefined;
    if (!npc_id || !effect_id) {
      return res.status(400).json({ error: "Необходимы npc_id и effect_id" });
    }
    try {
      await npcEffectsService.delete(npc_id, effect_id);
      getIO().emit("npc_effect:deleted", { npc_id, effect_id });
      res.json({ success: true, message: "Эффект удалён" });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Эффект не найден" });
      }
      if (error.message === "Cannot delete non-admin effect") {
        return res
          .status(403)
          .json({
            error: "Можно удалять только эффекты, добавленные администратором",
          });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления эффекта" });
    }
  },
};
