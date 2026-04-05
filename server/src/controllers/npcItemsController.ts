import { Request, Response } from "express";
import { npcItemsService } from "../services/npcItemsService.js";
import { getIO } from "../socket/index.js";

export const npcItemsController = {
  async getAll(req: Request, res: Response) {
    try {
      const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
      const item_id = req.query.item_id ? Number(req.query.item_id) : undefined;
      const is_equipped =
        req.query.is_equipped !== undefined
          ? req.query.is_equipped === "true"
          : undefined;
      const with_details = req.query.with_details === "true";

      const data = await npcItemsService.getAll({
        npc_id,
        item_id,
        is_equipped,
        with_details,
      });
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const { npc_id, item_id, quantity = 1, is_equipped = false } = req.body;

    if (!npc_id || typeof npc_id !== "number" || npc_id <= 0) {
      return res
        .status(400)
        .json({ error: "npc_id должен быть положительным числом" });
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

    try {
      const result = await npcItemsService.create(
        npc_id,
        item_id,
        quantity,
        is_equipped,
      );
      getIO().emit("npc_item:created", result);
      res.status(201).json({ success: true, npc_item: result });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка добавления предмета" });
    }
  },

  async delete(req: Request, res: Response) {
    const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
    const item_id = req.query.item_id ? Number(req.query.item_id) : undefined;
    if (!npc_id || !item_id) {
      return res.status(400).json({ error: "Необходимы npc_id и item_id" });
    }
    try {
      await npcItemsService.delete(npc_id, item_id);
      getIO().emit("npc_item:deleted", { npc_id, item_id });
      res.json({ success: true, message: "Предмет удалён" });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Предмет не найден у NPC" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления предмета" });
    }
  },

  async toggleEquip(req: Request, res: Response) {
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
    try {
      const updated = await npcItemsService.toggleEquip(id, is_equipped);
      getIO().emit("npc_item:updated", updated);
      res.json({ success: true, npc_item: updated });
    } catch (error: any) {
      if (error.message === "Not found") {
        return res.status(404).json({ error: "Запись не найдена" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления экипировки" });
    }
  },
};
