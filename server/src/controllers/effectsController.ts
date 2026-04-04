import { Request, Response } from "express";
import { effectsService } from "../services/effectsService.js";
import { getIO } from "../socket/index.js";

export const effectsController = {
  async getAll(req: Request, res: Response) {
    try {
      const effects = await effectsService.getAll();
      res.json(effects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const effect = await effectsService.getById(id);
      if (!effect) return res.status(404).json({ error: "Эффект не найден" });
      res.json({ success: true, effect });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },

  async create(req: Request, res: Response) {
    const {
      name,
      description = "",
      attribute = null,
      modifier = 0,
      duration_turns = null,
      duration_days = null,
      is_permanent = false,
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
    if (!is_permanent) {
      if (duration_turns === null && duration_days === null) {
        return res
          .status(400)
          .json({ error: "Для непостоянных эффектов укажите длительность" });
      }
    } else {
      if (duration_turns !== null || duration_days !== null) {
        return res
          .status(400)
          .json({ error: "Постоянные эффекты не могут иметь длительность" });
      }
    }

    try {
      const effect = await effectsService.create({
        name: name.trim(),
        description: description || null,
        attribute: attribute || null,
        modifier,
        duration_turns: is_permanent ? null : duration_turns,
        duration_days: is_permanent ? null : duration_days,
        is_permanent,
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
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;

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
      } else {
        // если меняем на временный, нужно проверить, что хотя бы одна длительность будет задана (но тут может быть частичное обновление, поэтому только если оба явно установлены в null)
        // для простоты: если is_permanent = false и в updateData пришли оба duration_* = null, то ошибка
        const turns =
          updateData.duration_turns !== undefined
            ? updateData.duration_turns
            : null;
        const days =
          updateData.duration_days !== undefined
            ? updateData.duration_days
            : null;
        if (turns === null && days === null) {
          return res
            .status(400)
            .json({ error: "Для непостоянных эффектов укажите длительность" });
        }
      }
    }
    // ---- КОНЕЦ ВАЛИДАЦИИ ----

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await effectsService.update(id, updateData);
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
    const id = String(req.params.id);
    const updateData = req.body;
    delete updateData.id;

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
      return res
        .status(400)
        .json({
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
          return res
            .status(400)
            .json({
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
      } else {
        // если меняем на временный, нужно проверить, что хотя бы одна длительность будет задана (но тут может быть частичное обновление, поэтому только если оба явно установлены в null)
        // для простоты: если is_permanent = false и в updateData пришли оба duration_* = null, то ошибка
        const turns =
          updateData.duration_turns !== undefined
            ? updateData.duration_turns
            : null;
        const days =
          updateData.duration_days !== undefined
            ? updateData.duration_days
            : null;
        if (turns === null && days === null) {
          return res
            .status(400)
            .json({ error: "Для непостоянных эффектов укажите длительность" });
        }
      }
    }
    // ---- КОНЕЦ ВАЛИДАЦИИ ----

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    try {
      const updated = await effectsService.update(id, updateData);
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
    const id = String(req.params.id);
    try {
      const deleted = await effectsService.delete(id);
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
