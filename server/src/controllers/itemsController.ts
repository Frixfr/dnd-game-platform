import { Request, Response } from "express";
import { itemsService } from "../services/itemsService.js";
import { getIO } from "../socket/index.js";

const allowedRarities = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythical",
  "story",
];

export const itemsController = {
  async getAll(req: Request, res: Response) {
    try {
      const items = await itemsService.getAll();
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
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
      description = "",
      rarity = "common",
      base_quantity = 1,
      active_effect_id = null,
      passive_effect_id = null,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Название обязательно" });
    }
    if (name.length > 100) {
      return res
        .status(400)
        .json({ error: "Название не должно превышать 100 символов" });
    }
    if (!allowedRarities.includes(rarity)) {
      return res.status(400).json({
        error: `Недопустимая редкость. Допустимые: ${allowedRarities.join(", ")}`,
      });
    }
    if (typeof base_quantity !== "number" || base_quantity < 1) {
      return res
        .status(400)
        .json({ error: "base_quantity должно быть положительным числом" });
    }

    if (active_effect_id) {
      const exists = await itemsService.checkEffectExists(active_effect_id);
      if (!exists)
        return res.status(404).json({
          error: `Активный эффект с ID ${active_effect_id} не найден`,
        });
    }
    if (passive_effect_id) {
      const exists = await itemsService.checkEffectExists(passive_effect_id);
      if (!exists)
        return res.status(404).json({
          error: `Пассивный эффект с ID ${passive_effect_id} не найден`,
        });
    }
    if (
      active_effect_id &&
      passive_effect_id &&
      active_effect_id === passive_effect_id
    ) {
      return res.status(400).json({
        error: "Активный и пассивный эффекты не могут быть одинаковыми",
      });
    }

    try {
      const item = await itemsService.create({
        name: name.trim(),
        description: description || null,
        rarity,
        base_quantity,
        active_effect_id: active_effect_id || null,
        passive_effect_id: passive_effect_id || null,
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
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    // Проверка активного эффекта
    if (updateData.active_effect_id !== undefined) {
      if (updateData.active_effect_id !== null) {
        const exists = await itemsService.checkEffectExists(
          updateData.active_effect_id,
        );
        if (!exists) {
          return res
            .status(404)
            .json({
              error: `Активный эффект с ID ${updateData.active_effect_id} не найден`,
            });
        }
      }
    }
    // Проверка пассивного эффекта
    if (updateData.passive_effect_id !== undefined) {
      if (updateData.passive_effect_id !== null) {
        const exists = await itemsService.checkEffectExists(
          updateData.passive_effect_id,
        );
        if (!exists) {
          return res
            .status(404)
            .json({
              error: `Пассивный эффект с ID ${updateData.passive_effect_id} не найден`,
            });
        }
      }
    }
    // Нельзя одинаковые эффекты
    if (
      updateData.active_effect_id &&
      updateData.passive_effect_id &&
      updateData.active_effect_id === updateData.passive_effect_id
    ) {
      return res
        .status(400)
        .json({
          error: "Активный и пассивный эффекты не могут быть одинаковыми",
        });
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
      if (error.message.includes("FOREIGN KEY")) {
        return res.status(404).json({ error: "Связанный эффект не найден" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления предмета" });
    }
  },

  async partialUpdate(req: Request, res: Response) {
    const id = String(req.params.id);
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
    const id = String(req.params.id);
    try {
      const deleted = await itemsService.delete(id);
      if (!deleted) return res.status(404).json({ error: "Предмет не найден" });
      getIO().emit("item:deleted", { id: Number(id) });
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
