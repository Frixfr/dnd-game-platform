import { Request, Response } from "express";
import { npcsService } from "../services/npcsService.js";
import { getIO } from "../socket/index.js";

export const npcsController = {
  async getAll(req: Request, res: Response) {
    try {
      const npcs = await npcsService.getAll();
      res.json(npcs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const npc = await npcsService.getById(id);
      if (!npc) return res.status(404).json({ error: "NPC не найден" });
      res.json({ success: true, npc });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getDetails(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const fullNpc = await npcsService.getFullDetails(id);
      if (!fullNpc) return res.status(404).json({ error: "NPC не найден" });
      res.json({ success: true, npc: fullNpc });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const {
      name,
      gender = "male",
      health = 50,
      max_health = 50,
      armor = 10,
      strength = 0,
      agility = 0,
      intelligence = 0,
      physique = 0,
      wisdom = 0,
      charisma = 0,
      history = "",
      in_battle = false,
      is_online = false,
      is_card_shown = true,
      aggression = 0,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Имя обязательно" });
    }
    if (name.length > 50) {
      return res
        .status(400)
        .json({ error: "Имя не должно превышать 50 символов" });
    }
    if (gender !== "male" && gender !== "female") {
      return res
        .status(400)
        .json({ error: 'Пол должен быть "male" или "female"' });
    }
    if (health <= 0 || max_health <= 0) {
      return res
        .status(400)
        .json({ error: "Здоровье должно быть положительным" });
    }
    if (health > max_health) {
      return res
        .status(400)
        .json({ error: "Текущее здоровье не может превышать максимальное" });
    }
    if (aggression < 0 || aggression > 2) {
      return res.status(400).json({ error: "Агрессия должна быть от 0 до 2" });
    }

    try {
      const npc = await npcsService.create({
        name: name.trim(),
        gender,
        health,
        max_health,
        armor,
        strength,
        agility,
        intelligence,
        physique,
        wisdom,
        charisma,
        history: history || null,
        in_battle: Boolean(in_battle),
        is_online: Boolean(is_online),
        is_card_shown: Boolean(is_card_shown),
        aggression,
        race_id: null, // добавлено
      });
      getIO().emit("npc:created", npc);
      res.status(201).json({ success: true, npc });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return res
          .status(409)
          .json({ error: "NPC с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания NPC" });
    }
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;
    delete updateData.created_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await npcsService.update(id, updateData);
      if (!updated) return res.status(404).json({ error: "NPC не найден" });
      // --- ИЗМЕНЕНИЕ: эмитим полные данные ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc: fullNpc || updated });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return res
          .status(409)
          .json({ error: "NPC с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания NPC" });
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
      const updated = await npcsService.update(id, updateData);
      if (!updated) return res.status(404).json({ error: "NPC не найден" });
      // --- ИЗМЕНЕНИЕ: эмитим полные данные ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc: fullNpc || updated });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return res
          .status(409)
          .json({ error: "NPC с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания NPC" });
    }
  },

  async delete(req: Request, res: Response) {
    const id = String(req.params.id);
    try {
      const deleted = await npcsService.delete(id);
      if (!deleted) return res.status(404).json({ error: "NPC не найден" });
      getIO().emit("npc:deleted", Number(id));
      res.json({ success: true, message: "NPC удалён" });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "NPC has relations") {
        return res.status(409).json({
          error:
            "Невозможно удалить NPC, так как у него есть связанные способности, предметы или эффекты",
        });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления NPC" });
    }
  },

  async intimidate(req: Request, res: Response) {
    const id = String(req.params.id);
    try {
      const result = await npcsService.intimidate(id);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({
        success: true,
        message: "NPC успешно запуган",
        npc: fullNpc || result.npc,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async modifyAggression(req: Request, res: Response) {
    const id = String(req.params.id);
    const { delta } = req.body;
    if (typeof delta !== "number") {
      return res
        .status(400)
        .json({ error: "Параметр delta (число) обязателен" });
    }
    try {
      const updated = await npcsService.modifyAggression(id, delta);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({
        success: true,
        message: "Агрессия изменена",
        npc: fullNpc || updated,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async calm(req: Request, res: Response) {
    const id = String(req.params.id);
    const { playerId, abilityId } = req.body;
    try {
      const updated = await npcsService.calm(id, playerId, abilityId);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({
        success: true,
        message: "NPC успокоен",
        npc: fullNpc || updated,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async setAggression(req: Request, res: Response) {
    const id = String(req.params.id);
    const { aggression } = req.body;
    if (typeof aggression !== "number" || aggression < 0 || aggression > 2) {
      return res
        .status(400)
        .json({ error: "Агрессия должна быть числом от 0 до 2" });
    }
    try {
      const updated = await npcsService.setAggression(id, aggression);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({
        success: true,
        message: "Агрессия обновлена",
        npc: fullNpc || updated,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  // Добавить в npcsController
  async addItemsBatch(req: Request, res: Response) {
    const id = String(req.params.id);
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Некорректный массив items" });
    }
    try {
      const result = await npcsService.addItemsBatch(Number(id), items);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async addAbilitiesBatch(req: Request, res: Response) {
    const id = String(req.params.id);
    const { ability_ids } = req.body;
    if (!ability_ids || !Array.isArray(ability_ids)) {
      return res.status(400).json({ error: "Некорректный массив ability_ids" });
    }
    try {
      const result = await npcsService.addAbilitiesBatch(
        Number(id),
        ability_ids,
      );
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async addEffectsBatch(req: Request, res: Response) {
    const id = String(req.params.id);
    const { effect_ids } = req.body;
    if (!effect_ids || !Array.isArray(effect_ids)) {
      return res.status(400).json({ error: "Некорректный массив effect_ids" });
    }
    try {
      const result = await npcsService.addEffectsBatch(Number(id), effect_ids);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeItem(req: Request, res: Response) {
    const id = String(req.params.id);
    const itemId = Number(req.params.itemId);
    try {
      await npcsService.removeItem(Number(id), itemId);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, message: "Предмет удалён" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeAbility(req: Request, res: Response) {
    const id = String(req.params.id);
    const abilityId = Number(req.params.abilityId);
    try {
      await npcsService.removeAbility(Number(id), abilityId);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, message: "Способность удалена" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeEffect(req: Request, res: Response) {
    const id = String(req.params.id);
    const effectId = Number(req.params.effectId);
    try {
      await npcsService.removeEffect(Number(id), effectId);
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, message: "Эффект удалён" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async toggleEquip(req: Request, res: Response) {
    const id = String(req.params.id);
    const itemId = Number(req.params.itemId);
    const { is_equipped } = req.body;
    if (typeof is_equipped !== "boolean") {
      return res.status(400).json({ error: "is_equipped должен быть булевым" });
    }
    try {
      const updated = await npcsService.toggleEquip(
        Number(id),
        itemId,
        is_equipped,
      );
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc_item: updated });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async toggleAbility(req: Request, res: Response) {
    const id = String(req.params.id);
    const abilityId = Number(req.params.abilityId);
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active должен быть булевым" });
    }
    try {
      const updated = await npcsService.toggleAbility(
        Number(id),
        abilityId,
        is_active,
      );
      // --- ИЗМЕНЕНИЕ: эмитим полные данные NPC ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc_ability: updated });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async uploadAvatar(req: Request, res: Response) {
    const id = String(req.params.id);
    if (!req.file) return res.status(400).json({ error: "Файл не загружен" });
    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updated = await npcsService.updateAvatar(Number(id), avatarUrl);
      if (!updated) return res.status(404).json({ error: "NPC не найден" });
      // --- ИЗМЕНЕНИЕ: эмитим полные данные ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc: fullNpc || updated, avatarUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка загрузки аватарки" });
    }
  },

  async deleteAvatar(req: Request, res: Response) {
    const id = String(req.params.id);
    try {
      const updated = await npcsService.deleteAvatar(Number(id));
      if (!updated) return res.status(404).json({ error: "NPC не найден" });
      // --- ИЗМЕНЕНИЕ: эмитим полные данные ---
      const fullNpc = await npcsService.getFullDetails(id);
      if (fullNpc) getIO().emit("npc:updated", fullNpc);
      res.json({ success: true, npc: fullNpc || updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления аватарки" });
    }
  },
};
