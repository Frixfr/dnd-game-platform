import { Request, Response } from "express";
import { effectsService } from "../services/effectsService.js";
import { getIO } from "../socket/index.js";

export const effectsController = {
  async getAll(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const result = await effectsService.getAll(roomId, page, limit);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const roomId = req.roomId!;
      const id = String(req.params.id);
      const effect = await effectsService.getById(roomId, id);
      if (!effect) return res.status(404).json({ error: "Эффект не найден" });
      res.json({ success: true, effect });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const roomId = req.roomId!;
    const {
      name,
      description = "",
      attribute = null,
      modifier = 0,
      duration_turns = null,
      duration_days = null,
      is_permanent = false,
      is_instant = false,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Название обязательно" });
    }
    if (name.length > 100) {
      return res
        .status(400)
        .json({ error: "Название не должно превышать 100 символов" });
    }
    const allowedAttributes = [
      "health",
      "max_health",
      "armor",
      "strength",
      "agility",
      "intelligence",
      "physique",
      "wisdom",
      "charisma",
    ];
    if (attribute && !allowedAttributes.includes(attribute)) {
      return res.status(400).json({
        error: `Недопустимый атрибут. Допустимые: ${allowedAttributes.join(", ")}`,
      });
    }
    if (modifier !== undefined && (modifier < -100 || modifier > 100)) {
      return res
        .status(400)
        .json({ error: "Модификатор должен быть в диапазоне -100..100" });
    }
    // Валидация трёх взаимоисключающих типов: временный / постоянный / мгновенный
    if (is_instant && is_permanent) {
      return res
        .status(400)
        .json({
          error: "Эффект не может быть одновременно мгновенным и постоянным",
        });
    }
    if (is_instant) {
      if (duration_turns !== null || duration_days !== null) {
        return res
          .status(400)
          .json({ error: "Мгновенные эффекты не могут иметь длительность" });
      }
    } else if (is_permanent) {
      if (duration_turns !== null || duration_days !== null) {
        return res
          .status(400)
          .json({ error: "Постоянные эффекты не могут иметь длительность" });
      }
    } else {
      if (duration_turns === null && duration_days === null) {
        return res
          .status(400)
          .json({ error: "Для непостоянных эффектов укажите длительность" });
      }
    }

    // Валидация тегов
    let tags: string[] = [];
    if (req.body.tags) {
      if (!Array.isArray(req.body.tags)) {
        return res
          .status(400)
          .json({ error: "Теги должны быть массивом строк" });
      }
      tags = req.body.tags.filter(
        (t: string) => typeof t === "string" && t.trim().length > 0,
      );
      if (tags.some((t) => t.length > 30)) {
        return res
          .status(400)
          .json({ error: "Длина тега не более 30 символов" });
      }
      if (tags.length > 10) {
        return res.status(400).json({ error: "Не более 10 тегов" });
      }
    }

    try {
      const effect = await effectsService.create(roomId, {
        name: name.trim(),
        description: description || null,
        attribute: attribute || null,
        modifier,
        duration_turns: is_permanent || is_instant ? null : duration_turns,
        duration_days: is_permanent || is_instant ? null : duration_days,
        is_permanent,
        is_instant,
        tags,
      });
      getIO().emit("effect:created", effect);
      res.status(201).json({ success: true, message: "Эффект создан", effect });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Эффект с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка создания эффекта" });
    }
  },

  async update(req: Request, res: Response) {
    const roomId = req.roomId!;
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;
    delete updateData.room_id; // не разрешаем менять комнату

    // ---- НАЧАЛО ВАЛИДАЦИИ ----
    const allowedAttributes = [
      "health",
      "max_health",
      "armor",
      "strength",
      "agility",
      "intelligence",
      "physique",
      "wisdom",
      "charisma",
    ];
    if (
      updateData.attribute !== undefined &&
      updateData.attribute !== null &&
      !allowedAttributes.includes(updateData.attribute)
    ) {
      return res.status(400).json({
        error: `Недопустимый атрибут. Допустимые: ${allowedAttributes.join(", ")}`,
      });
    }
    if (
      updateData.modifier !== undefined &&
      (updateData.modifier < -100 || updateData.modifier > 100)
    ) {
      return res
        .status(400)
        .json({ error: "Модификатор должен быть в диапазоне -100..100" });
    }
    if (updateData.is_permanent !== undefined) {
      if (updateData.is_permanent === true) {
        if (
          updateData.duration_turns !== undefined &&
          updateData.duration_turns !== null
        ) {
          return res.status(400).json({
            error: "Постоянные эффекты не могут иметь duration_turns",
          });
        }
        if (
          updateData.duration_days !== undefined &&
          updateData.duration_days !== null
        ) {
          return res
            .status(400)
            .json({ error: "Постоянные эффекты не могут иметь duration_days" });
        }
        // Постоянный → сбросить is_instant
        updateData.is_instant = false;
      } else {
        // Если меняем на непостоянный и не мгновенный — нужна длительность
        const turns =
          updateData.duration_turns !== undefined
            ? updateData.duration_turns
            : null;
        const days =
          updateData.duration_days !== undefined
            ? updateData.duration_days
            : null;
        const isInstant = updateData.is_instant === true;
        if (!isInstant && turns === null && days === null) {
          return res
            .status(400)
            .json({ error: "Для непостоянных эффектов укажите длительность" });
        }
      }
    }
    // Валидация is_instant
    if (updateData.is_instant === true) {
      updateData.is_permanent = false;
      if (
        (updateData.duration_turns !== undefined &&
          updateData.duration_turns !== null) ||
        (updateData.duration_days !== undefined &&
          updateData.duration_days !== null)
      ) {
        return res
          .status(400)
          .json({ error: "Мгновенные эффекты не могут иметь длительность" });
      }
      updateData.duration_turns = null;
      updateData.duration_days = null;
    }
    // ---- КОНЕЦ ВАЛИДАЦИИ ----

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await effectsService.update(roomId, id, updateData);
      if (!updated) return res.status(404).json({ error: "Эффект не найден" });
      getIO().emit("effect:updated", updated);
      res.json({ success: true, effect: updated });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Эффект с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления эффекта" });
    }
  },

  async partialUpdate(req: Request, res: Response) {
    const roomId = req.roomId!;
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;
    delete updateData.room_id; // не разрешаем менять комнату

    // ---- НАЧАЛО ВАЛИДАЦИИ ----
    const allowedAttributes = [
      "health",
      "max_health",
      "armor",
      "strength",
      "agility",
      "intelligence",
      "physique",
      "wisdom",
      "charisma",
    ];
    if (
      updateData.attribute !== undefined &&
      updateData.attribute !== null &&
      !allowedAttributes.includes(updateData.attribute)
    ) {
      return res.status(400).json({
        error: `Недопустимый атрибут. Допустимые: ${allowedAttributes.join(", ")}`,
      });
    }
    if (
      updateData.modifier !== undefined &&
      (updateData.modifier < -100 || updateData.modifier > 100)
    ) {
      return res
        .status(400)
        .json({ error: "Модификатор должен быть в диапазоне -100..100" });
    }
    if (updateData.is_permanent !== undefined) {
      if (updateData.is_permanent === true) {
        if (
          updateData.duration_turns !== undefined &&
          updateData.duration_turns !== null
        ) {
          return res.status(400).json({
            error: "Постоянные эффекты не могут иметь duration_turns",
          });
        }
        if (
          updateData.duration_days !== undefined &&
          updateData.duration_days !== null
        ) {
          return res
            .status(400)
            .json({ error: "Постоянные эффекты не могут иметь duration_days" });
        }
        updateData.is_instant = false;
      } else {
        const turns =
          updateData.duration_turns !== undefined
            ? updateData.duration_turns
            : null;
        const days =
          updateData.duration_days !== undefined
            ? updateData.duration_days
            : null;
        const isInstant = updateData.is_instant === true;
        if (!isInstant && turns === null && days === null) {
          return res
            .status(400)
            .json({ error: "Для непостоянных эффектов укажите длительность" });
        }
      }
    }
    if (updateData.is_instant === true) {
      updateData.is_permanent = false;
      if (
        (updateData.duration_turns !== undefined &&
          updateData.duration_turns !== null) ||
        (updateData.duration_days !== undefined &&
          updateData.duration_days !== null)
      ) {
        return res
          .status(400)
          .json({ error: "Мгновенные эффекты не могут иметь длительность" });
      }
      updateData.duration_turns = null;
      updateData.duration_days = null;
    }
    // ---- КОНЕЦ ВАЛИДАЦИИ ----

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await effectsService.update(roomId, id, updateData);
      if (!updated) return res.status(404).json({ error: "Эффект не найден" });
      getIO().emit("effect:updated", updated);
      res.json({ success: true, effect: updated });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ error: "Эффект с таким именем уже существует" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка обновления эффекта" });
    }
  },

  async delete(req: Request, res: Response) {
    const roomId = req.roomId!;
    const id = String(req.params.id);
    try {
      const deleted = await effectsService.delete(roomId, id);
      if (!deleted) return res.status(404).json({ error: "Эффект не найден" });
      getIO().emit("effect:deleted", { id: Number(id) });
      res.json({ success: true, message: "Эффект удалён" });
    } catch (error: any) {
      if (error.message === "Effect is in use") {
        return res
          .status(409)
          .json({ error: "Эффект используется в способностях или предметах" });
      }
      console.error(error);
      res.status(500).json({ error: "Ошибка удаления эффекта" });
    }
  },
};
