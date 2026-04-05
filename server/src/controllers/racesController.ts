import { Request, Response } from "express";
import { racesService } from "../services/racesService.js";
import { getIO } from "../socket/index.js";

export const racesController = {
  async getAll(req: Request, res: Response) {
    try {
      const races = await racesService.getAll();
      res.json(races);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const race = await racesService.getWithEffects(id);
      if (!race) return res.status(404).json({ error: "Раса не найдена" });
      res.json({ success: true, race });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const { name, description = "", effect_ids = [] } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Название обязательно" });
    }
    if (name.length > 50) {
      return res
        .status(400)
        .json({ error: "Название не должно превышать 50 символов" });
    }
    try {
      const race = await racesService.create(
        { name: name.trim(), description: description || null },
        effect_ids,
      );
      getIO().emit("race:created", race);
      res.status(201).json({ success: true, message: "Раса создана", race });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Раса с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания расы" });
    }
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const { name, description, effect_ids } = req.body;
    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0)
    ) {
      return res.status(400).json({ error: "Название не может быть пустым" });
    }
    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined)
        updateData.description = description || null;
      const updated = await racesService.update(id, updateData, effect_ids);
      if (!updated) return res.status(404).json({ error: "Раса не найдена" });
      getIO().emit("race:updated", updated);
      res.json({ success: true, race: updated });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Раса с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления расы" });
    }
  },

  async delete(req: Request, res: Response) {
    const id = String(req.params.id);
    try {
      const deleted = await racesService.delete(id);
      if (!deleted) return res.status(404).json({ error: "Раса не найдена" });
      getIO().emit("race:deleted", { id: Number(id) });
      res.json({ success: true, message: "Раса удалена" });
    } catch (error: any) {
      if (
        error.message === "Race is used by players" ||
        error.message === "Race is used by NPCs"
      ) {
        return res.status(409).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления расы" });
    }
  },
};
