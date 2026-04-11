import { Request, Response } from "express";
import { abilitiesService } from "../services/abilitiesService.js";
import { playerAbilitiesService } from "../services/playerAbilitiesService.js";
import { getIO } from "../socket/index.js";

export const abilitiesController = {
  async getAll(req: Request, res: Response) {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const result = await abilitiesService.getAll(page, limit);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const ability = await abilitiesService.getById(id);
      if (!ability)
        return res.status(404).json({ error: "Способность не найдена" });
      res.json(ability);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const {
      name,
      description = "",
      ability_type = "active",
      cooldown_turns = 0,
      cooldown_days = 0,
      effect_id = null,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Название обязательно" });
    }
    if (name.length > 100) {
      return res
        .status(400)
        .json({ error: "Название не должно превышать 100 символов" });
    }
    if (ability_type !== "active" && ability_type !== "passive") {
      return res
        .status(400)
        .json({ error: 'Тип способности должен быть "active" или "passive"' });
    }
    if (typeof cooldown_turns !== "number" || cooldown_turns < 0) {
      return res
        .status(400)
        .json({ error: "cooldown_turns должен быть неотрицательным числом" });
    }
    if (typeof cooldown_days !== "number" || cooldown_days < 0) {
      return res
        .status(400)
        .json({ error: "cooldown_days должен быть неотрицательным числом" });
    }
    if (effect_id !== null) {
      const effectExists = await abilitiesService.checkEffectExists(effect_id);
      if (!effectExists) {
        return res
          .status(404)
          .json({ error: `Эффект с ID ${effect_id} не найден` });
      }
    }

    try {
      const ability = await abilitiesService.create({
        name: name.trim(),
        description: description || null,
        ability_type,
        cooldown_turns,
        cooldown_days,
        effect_id,
      });
      getIO().emit("ability:created", ability);
      res.status(201).json({ success: true, ability });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Способность с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания способности" });
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

    if (updateData.effect_id !== undefined) {
      if (updateData.effect_id !== null) {
        const effectExists = await abilitiesService.checkEffectExists(
          updateData.effect_id,
        );
        if (!effectExists) {
          return res
            .status(404)
            .json({ error: `Эффект с ID ${updateData.effect_id} не найден` });
        }
      }
    }

    try {
      const updated = await abilitiesService.update(id, updateData);
      if (!updated)
        return res.status(404).json({ error: "Способность не найдена" });
      getIO().emit("ability:updated", updated);
      res.json({ success: true, ability: updated });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Способность с таким именем уже существует" });
      }
      if (error.message.includes("FOREIGN KEY")) {
        return res.status(404).json({ error: "Связанный эффект не найден" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления способности" });
    }
  },

  async delete(req: Request, res: Response) {
    const id = String(req.params.id);
    try {
      const deleted = await abilitiesService.delete(id);
      if (!deleted)
        return res.status(404).json({ error: "Способность не найдена" });
      getIO().emit("ability:deleted", { id: Number(id) });
      res.json({ success: true, message: "Способность удалена" });
    } catch (error: any) {
      if (error.message === "Ability is in use") {
        return res
          .status(409)
          .json({ error: "Способность используется игроками или NPC" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления способности" });
    }
  },

  async useAbility(req: Request, res: Response) {
    const abilityId = Number(req.params.id);
    const { playerId } = req.body;

    if (isNaN(abilityId) || !playerId || isNaN(Number(playerId))) {
      return res.status(400).json({ error: "Invalid abilityId or playerId" });
    }

    try {
      // Заменяем abilitiesService.useAbility на playerAbilitiesService.useAbility
      const result = await playerAbilitiesService.useAbility(
        Number(playerId),
        abilityId,
      );
      res.json(result);
    } catch (error: any) {
      console.error(error);
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },
};
