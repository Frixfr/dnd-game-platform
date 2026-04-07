import { Request, Response } from "express";
import { playersService } from "../services/playersService.js";
import { getIO } from "../socket/index.js";

// Разрешённые поля для обновления игрока (соответствуют схеме таблицы players)
const ALLOWED_UPDATE_FIELDS = new Set([
  "name",
  "gender",
  "health",
  "max_health",
  "armor",
  "strength",
  "agility",
  "intelligence",
  "physique",
  "wisdom",
  "charisma",
  "history",
  "in_battle",
  "is_online",
  "is_card_shown",
  "race_id",
]);

export const playersController = {
  async getAll(req: Request, res: Response) {
    try {
      const players = await playersService.getAll();
      res.json(players);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Некорректный ID" });
      const player = await playersService.getById(id);
      if (!player) return res.status(404).json({ error: "Игрок не найден" });
      res.json({ success: true, player });
    } catch (error) {
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },

  async getFullDetails(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Некорректный ID" });
      const fullData = await playersService.getFullDetails(id);
      if (!fullData) return res.status(404).json({ error: "Игрок не найден" });
      res.json(fullData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
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
      is_online = false,
      is_card_shown = true,
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

    try {
      const newPlayer = await playersService.create({
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
        in_battle: false,
        is_online: Boolean(is_online),
        is_card_shown: Boolean(is_card_shown),
        race_id: null, // добавлено
      });
      getIO().emit("player:created", newPlayer);
      res
        .status(201)
        .json({ success: true, message: "Игрок создан", player: newPlayer });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return res
          .status(409)
          .json({ error: "Игрок с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания игрока" });
    }
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Некорректный ID" });

    const updateData = req.body;
    delete updateData.id;
    delete updateData.created_at;

    // Фильтруем только разрешённые поля
    const filteredData: any = {};
    for (const key of Object.keys(updateData)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        filteredData[key] = updateData[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res
        .status(400)
        .json({ error: "Нет допустимых данных для обновления" });
    }

    try {
      const updatedPlayer = await playersService.update(id, filteredData);
      if (!updatedPlayer)
        return res.status(404).json({ error: "Игрок не найден" });
      getIO().emit("player:updated", updatedPlayer);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("Health cannot exceed max health")) {
          return res.status(400).json({
            error: "Текущее здоровье не может превышать максимальное",
          });
        }
        if (error.message.includes("UNIQUE constraint failed")) {
          return res
            .status(409)
            .json({ error: "Игрок с таким именем уже существует" });
        }
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления игрока" });
    }
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Некорректный ID" });
    try {
      const deleted = await playersService.delete(id);
      if (!deleted) return res.status(404).json({ error: "Игрок не найден" });
      getIO().emit("player:deleted", id);
      res.json({ success: true, message: "Игрок удален", deleted_id: id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления игрока" });
    }
  },

  // BATCH операции
  async addItemsBatch(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Некорректный ID игрока" });
    }
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items должен быть массивом" });
    }
    try {
      const result = await playersService.addItemsBatch(playerId, items);
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async addAbilitiesBatch(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Некорректный ID игрока" });
    }
    const { ability_ids } = req.body;
    if (!Array.isArray(ability_ids)) {
      return res
        .status(400)
        .json({ error: "ability_ids должен быть массивом" });
    }
    try {
      const result = await playersService.addAbilitiesBatch(
        playerId,
        ability_ids,
      );
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async addEffectsBatch(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Некорректный ID игрока" });
    }
    const { effect_ids } = req.body;
    if (!Array.isArray(effect_ids)) {
      return res.status(400).json({ error: "effect_ids должен быть массивом" });
    }
    try {
      const result = await playersService.addEffectsBatch(playerId, effect_ids);
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeItem(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    const itemId = Number(req.params.itemId);
    if (isNaN(playerId) || isNaN(itemId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    try {
      await playersService.removeItem(playerId, itemId);
      getIO().emit("player_item:deleted", {
        player_id: playerId,
        item_id: itemId,
      });
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json({ success: true, message: "Предмет удален" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeAbility(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    const abilityId = Number(req.params.abilityId);
    if (isNaN(playerId) || isNaN(abilityId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    try {
      await playersService.removeAbility(playerId, abilityId);
      getIO().emit("player_ability:deleted", {
        player_id: playerId,
        ability_id: abilityId,
      });
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json({ success: true, message: "Способность удалена" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async removeEffect(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    const effectId = Number(req.params.effectId);
    if (isNaN(playerId) || isNaN(effectId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    try {
      await playersService.removeEffect(playerId, effectId);
      getIO().emit("player_effect:deleted", {
        player_id: playerId,
        effect_id: effectId,
      });
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json({ success: true, message: "Эффект удален" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async toggleEquip(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    const itemId = Number(req.params.itemId);
    const { is_equipped } = req.body;
    if (isNaN(playerId) || isNaN(itemId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    if (typeof is_equipped !== "boolean") {
      return res.status(400).json({ error: "is_equipped должен быть boolean" });
    }
    try {
      const updated = await playersService.toggleEquip(
        playerId,
        itemId,
        is_equipped,
      );
      getIO().emit("player_item:updated", updated);
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json({ success: true, player_item: updated });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },

  async toggleAbility(req: Request, res: Response) {
    const playerId = Number(req.params.playerId);
    const abilityId = Number(req.params.abilityId);
    const { is_active } = req.body;
    if (isNaN(playerId) || isNaN(abilityId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }
    const isActiveValue =
      typeof is_active === "boolean" ? is_active : Boolean(is_active);
    try {
      const updated = await playersService.toggleAbility(
        playerId,
        abilityId,
        isActiveValue,
      );
      getIO().emit("player_ability:updated", updated);
      const fullPlayer = await playersService.getFullDetails(playerId);
      if (fullPlayer) getIO().emit("player:updated", fullPlayer);
      res.json({ success: true, player_ability: updated });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Неизвестная ошибка" });
      }
    }
  },
};
