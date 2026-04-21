import { Request, Response } from "express";
import { npcAbilitiesService } from "../services/npcAbilitiesService.js";
import { getIO } from "../socket/index.js";
import { npcsService } from "../services/npcsService.js";

export const npcAbilitiesController = {
  async getAll(req: Request, res: Response) {
    try {
      const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
      const ability_id = req.query.ability_id
        ? Number(req.query.ability_id)
        : undefined;
      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined;
      const with_details = req.query.with_details === "true";

      const data = await npcAbilitiesService.getAll({
        npc_id,
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
    const { npc_id, ability_id, is_active = true } = req.body;
    if (!npc_id || typeof npc_id !== "number" || npc_id <= 0) {
      return res
        .status(400)
        .json({ error: "npc_id должен быть положительным числом" });
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
      const result = await npcAbilitiesService.create(
        npc_id,
        ability_id,
        is_active,
      );
      getIO().emit("npc_ability:created", result);
      res.status(201).json({ success: true, npc_ability: result });
    } catch (error: any) {
      if (error.message.includes("not found"))
        return res.status(404).json({ error: error.message });
      if (error.message.includes("already exists"))
        return res.status(409).json({ error: error.message });
      console.error(error);
      res.status(500).json({ error: "Ошибка создания связи" });
    }
  },

  async delete(req: Request, res: Response) {
    const npc_id = req.query.npc_id ? Number(req.query.npc_id) : undefined;
    const ability_id = req.query.ability_id
      ? Number(req.query.ability_id)
      : undefined;
    if (!npc_id || !ability_id) {
      return res.status(400).json({ error: "Необходимы npc_id и ability_id" });
    }
    try {
      await npcAbilitiesService.delete(npc_id, ability_id);
      getIO().emit("npc_ability:deleted", { npc_id, ability_id });
      res.json({ success: true, message: "Связь удалена" });
    } catch (error: any) {
      if (error.message === "Not found")
        return res.status(404).json({ error: "Связь не найдена" });
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления связи" });
    }
  },

  async useAbility(req: Request, res: Response) {
    const npcId = Number(req.params.npcId);
    const abilityId = Number(req.params.abilityId);
    if (isNaN(npcId) || isNaN(abilityId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    try {
      const result = await npcAbilitiesService.useAbility(npcId, abilityId);
      // После использования способности обновляем данные NPC
      const fullNpc = await npcsService.getFullDetails(npcId.toString());
      getIO().emit("npc:updated", fullNpc);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
