import { db } from "../db/index.js";
import type { Log } from "../types/index.js";
import { getIO } from "../socket/index.js";

export const logsService = {
  async create(data: Omit<Log, "id" | "created_at">): Promise<Log> {
    const [log] = await db("logs")
      .insert({
        action_type: data.action_type,
        player_id: data.player_id,
        npc_id: data.npc_id,
        entity_name: data.entity_name,
        action_name: data.action_name,
        details: data.details,
        created_at: db.fn.now(),
      })
      .returning("*");
    getIO().emit("log:new", log);
    return log;
  },

  async getAll(limit: number = 200): Promise<Log[]> {
    return db("logs").select("*").orderBy("created_at", "desc").limit(limit);
  },
};
