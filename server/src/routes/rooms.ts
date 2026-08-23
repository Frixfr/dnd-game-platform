// server/src/routes/rooms.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { jwtConfig } from "../config/jwt.js";
import { authMaster } from "../middleware/authMaster.js";
import type { Room } from "../types/index.js";

const router = Router();

// Вспомогательная функция для парсинга id из params
function parseIdParam(param: string | string[]): number {
  const str = Array.isArray(param) ? param[0] : param;
  return parseInt(str);
}

// GET /api/rooms
router.get("/", authMaster, async (_req, res) => {
  // _req вместо req
  try {
    const rooms = await db("rooms").select("*");
    const safeRooms = rooms.map((room: Room) => ({
      ...room,
      password_hash: undefined,
      has_password: !!room.password_hash,
    }));
    res.json(safeRooms);
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения комнат" });
  }
});

// POST /api/rooms
router.post("/", authMaster, async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Название комнаты обязательно" });
    }

    const insertData: any = {
      name: name.trim(),
      is_active_for_players: false,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    // Если пароль указан, хешируем и сохраняем
    if (password && typeof password === "string" && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      insertData.password_hash = await bcrypt.hash(password, salt);
    }

    const [room] = await db("rooms")
      .insert(insertData)
      .returning("*");

    const safeRoom = { ...room, password_hash: undefined };
    res.status(201).json(safeRoom);
  } catch (error) {
    res.status(500).json({ error: "Ошибка создания комнаты" });
  }
});

// POST /api/rooms/:id/enter
router.post("/:id/enter", async (req, res) => {
  try {
    const roomId = parseIdParam(req.params.id);
    const { password } = req.body;

    const room = await db("rooms").where("id", roomId).first();
    if (!room) {
      return res.status(404).json({ error: "Комната не найдена" });
    }

    if (room.password_hash) {
      if (!password) {
        return res.status(401).json({ error: "Требуется пароль комнаты" });
      }
      const isValid = await bcrypt.compare(password, room.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Неверный пароль" });
      }
    }

    // Бессрочный токен с roomId
    const token = jwt.sign(
      { role: "master", roomId: room.id },
      jwtConfig.secret,
    );

    await db("rooms").where("id", roomId).update({ updated_at: db.fn.now() });

    res.json({ token, room: { id: room.id, name: room.name } });
  } catch (error) {
    res.status(500).json({ error: "Ошибка входа в комнату" });
  }
});

// PUT /api/rooms/:id
router.put("/:id", authMaster, async (req, res) => {
  try {
    const roomId = parseIdParam(req.params.id);
    const { name, password } = req.body;

    if (req.roomId !== roomId) {
      return res.status(403).json({ error: "Нет доступа к этой комнате" });
    }

    const updateData: any = { updated_at: db.fn.now() };
    if (
      name !== undefined &&
      typeof name === "string" &&
      name.trim().length > 0
    ) {
      updateData.name = name.trim();
    }
    if (password !== undefined) {
      if (password === "" || password === null) {
        updateData.password_hash = null;
      } else if (typeof password === "string" && password.length > 0) {
        const salt = await bcrypt.genSalt(10);
        updateData.password_hash = await bcrypt.hash(password, salt);
      }
    }

    const [updated] = await db("rooms")
      .where("id", roomId)
      .update(updateData)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Комната не найдена" });
    }

    const safeRoom = { ...updated, password_hash: undefined };
    res.json(safeRoom);
  } catch (error) {
    res.status(500).json({ error: "Ошибка обновления комнаты" });
  }
});

// POST /api/rooms/:id/set-active
router.post("/:id/set-active", authMaster, async (req, res) => {
  try {
    const roomId = parseIdParam(req.params.id);
    const room = await db("rooms").where("id", roomId).first();
    if (!room) {
      return res.status(404).json({ error: "Комната не найдена" });
    }

    await db("rooms").update({ is_active_for_players: false });
    await db("rooms")
      .where("id", roomId)
      .update({ is_active_for_players: true, updated_at: db.fn.now() });

    const io = req.app.get("io");
    if (io) {
      io.emit("room:active-changed", { roomId, roomName: room.name });
    }

    res.json({ success: true, activeRoomId: roomId });
  } catch (error) {
    res.status(500).json({ error: "Ошибка переключения активности" });
  }
});

// DELETE /api/rooms/:id
router.delete("/:id", authMaster, async (req, res) => {
  try {
    const roomId = parseIdParam(req.params.id);
    if (req.roomId !== roomId) {
      return res.status(403).json({ error: "Нет доступа к этой комнате" });
    }

    const deleted = await db("rooms").where("id", roomId).delete();
    if (!deleted) {
      return res.status(404).json({ error: "Комната не найдена" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка удаления комнаты" });
  }
});

export default router;
