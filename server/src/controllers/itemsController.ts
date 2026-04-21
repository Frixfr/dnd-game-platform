import { Request, Response } from "express";
import { itemsService } from "../services/itemsService.js";
import { getIO } from "../socket/index.js";

export const itemsController = {
  async getAll(req: Request, res: Response) {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const result = await itemsService.getAll(page, limit);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const id =
        typeof idParam === "string"
          ? parseInt(idParam, 10)
          : Number(idParam[0]);
      if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" });

      const item = await itemsService.getById(id);
      if (!item) return res.status(404).json({ error: "Предмет не найден" });
      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const {
      name,
      description,
      rarity,
      base_quantity,
      is_deletable,
      is_usable,
      infinite_uses,
      active_effect_ids,
      passive_effect_ids,
    } = req.body;

    try {
      const item = await itemsService.create({
        name,
        description,
        rarity,
        base_quantity,
        is_deletable,
        is_usable,
        infinite_uses,
        active_effect_ids,
        passive_effect_ids,
      });
      getIO().emit("item:created", item);
      res.status(201).json({ success: true, item });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Предмет с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания предмета" });
    }
  },

  async update(req: Request, res: Response) {
    const idParam = req.params.id;
    const id =
      typeof idParam === "string" ? parseInt(idParam, 10) : Number(idParam[0]);
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" });

    const {
      name,
      description,
      rarity,
      base_quantity,
      is_deletable,
      is_usable,
      infinite_uses,
      active_effect_ids,
      passive_effect_ids,
    } = req.body;

    const updated = await itemsService.update(id, {
      name,
      description,
      rarity,
      base_quantity,
      is_deletable,
      is_usable,
      infinite_uses,
      active_effect_ids,
      passive_effect_ids,
    });
    if (!updated) return res.status(404).json({ error: "Item not found" });
    getIO().emit("item:updated", updated);
    res.json(updated);
  },

  async partialUpdate(req: Request, res: Response) {
    const idParam = req.params.id;
    const id =
      typeof idParam === "string" ? parseInt(idParam, 10) : Number(idParam[0]);
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" });

    const updateData = req.body;
    delete updateData.id;
    delete updateData.created_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await itemsService.update(id, updateData);
      if (!updated) return res.status(404).json({ error: "Предмет не найден" });
      getIO().emit("item:updated", updated);
      res.json({ success: true, item: updated });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Предмет с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления предмета" });
    }
  },

  async delete(req: Request, res: Response) {
    const idParam = req.params.id;
    const id =
      typeof idParam === "string" ? parseInt(idParam, 10) : Number(idParam[0]);
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" });

    try {
      const deleted = await itemsService.delete(id);
      if (!deleted) return res.status(404).json({ error: "Предмет не найден" });
      getIO().emit("item:deleted", { id });
      res.json({ success: true, message: "Предмет удалён" });
    } catch (error: any) {
      if (error.message === "Item is in use") {
        return res
          .status(409)
          .json({ error: "Предмет используется игроками или NPC" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления предмета" });
    }
  },
};
