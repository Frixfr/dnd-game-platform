// server/src/services/roomsService.ts
import { db } from "../db/index.js";
import bcrypt from "bcryptjs";
import type { Room } from "../types/index.js";

export const roomsService = {
  async getAll(): Promise<Omit<Room, "password_hash">[]> {
    const rooms = await db("rooms").select("*");
    return rooms.map((room) => {
      const { password_hash, ...safe } = room;
      return safe;
    });
  },

  async getById(id: number): Promise<Omit<Room, "password_hash"> | null> {
    const room = await db("rooms").where("id", id).first();
    if (!room) return null;
    const { password_hash, ...safe } = room;
    return safe;
  },

  async create(
    name: string,
    password?: string | null,
  ): Promise<Omit<Room, "password_hash">> {
    const updateData: any = {
      name: name.trim(),
      is_active_for_players: false,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    if (password !== undefined && password !== null && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const [room] = await db("rooms").insert(updateData).returning("*");
    const { password_hash, ...safe } = room;
    return safe;
  },

  async update(
    id: number,
    data: { name?: string; password?: string | null },
  ): Promise<Omit<Room, "password_hash"> | null> {
    const updateData: any = { updated_at: db.fn.now() };
    if (data.name !== undefined && data.name.trim().length > 0) {
      updateData.name = data.name.trim();
    }
    if (data.password !== undefined) {
      if (data.password === "" || data.password === null) {
        updateData.password_hash = null;
      } else if (
        typeof data.password === "string" &&
        data.password.length > 0
      ) {
        const salt = await bcrypt.genSalt(10);
        updateData.password_hash = await bcrypt.hash(data.password, salt);
      }
    }

    const [updated] = await db("rooms")
      .where("id", id)
      .update(updateData)
      .returning("*");
    if (!updated) return null;
    const { password_hash, ...safe } = updated;
    return safe;
  },

  async delete(id: number): Promise<boolean> {
    const deleted = await db("rooms").where("id", id).delete();
    return deleted > 0;
  },

  async setActive(id: number): Promise<{ activeRoomId: number }> {
    // Снимаем флаг со всех комнат
    await db("rooms").update({ is_active_for_players: false });
    // Устанавливаем флаг для выбранной
    await db("rooms")
      .where("id", id)
      .update({ is_active_for_players: true, updated_at: db.fn.now() });
    return { activeRoomId: id };
  },

  async getActiveRoom(): Promise<Omit<Room, "password_hash"> | null> {
    const room = await db("rooms").where("is_active_for_players", true).first();
    if (!room) return null;
    const { password_hash, ...safe } = room;
    return safe;
  },

  async verifyPassword(id: number, password: string): Promise<boolean> {
    const room = await db("rooms").where("id", id).first();
    if (!room) return false;
    if (!room.password_hash) return true; // пароль не установлен
    return bcrypt.compare(password, room.password_hash);
  },

  async getPasswordHash(id: number): Promise<string | null> {
    const room = await db("rooms").where("id", id).first();
    return room ? room.password_hash : null;
  },
};
