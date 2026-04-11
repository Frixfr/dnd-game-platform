import { db } from "../db/index.js";
import { getIO } from "../socket/index.js";
import type { CombatParticipant, CombatSession } from "../types/index.js";
import { playersService } from "./playersService.js";
import { npcsService } from "./npcsService.js";
import { playerAbilitiesService } from "./playerAbilitiesService.js";
import { npcAbilitiesService } from "./npcAbilitiesService.js";

export const combatService = {
  async getActiveSession(): Promise<CombatSession | null> {
    const session = await db("combat_sessions")
      .where({ is_active: true })
      .orderBy("created_at", "desc")
      .first();
    return session || null;
  },

  async startNewSession(): Promise<CombatSession> {
    await db("combat_sessions")
      .where({ is_active: true })
      .update({ is_active: false, ended_at: db.fn.now() });
    const [session] = await db("combat_sessions")
      .insert({ is_active: true, created_at: db.fn.now() })
      .returning("*");
    return session;
  },

  async addParticipant(
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
  ): Promise<CombatParticipant> {
    const existing = await db("combat_participants")
      .where({
        session_id: sessionId,
        entity_type: entityType,
        entity_id: entityId,
      })
      .first();
    if (existing) return existing;

    const maxOrder = await db("combat_participants")
      .where({ session_id: sessionId })
      .max("order_index as max")
      .first();
    const newIndex = (maxOrder?.max ?? -1) + 1;

    const [participant] = await db("combat_participants")
      .insert({
        session_id: sessionId,
        entity_type: entityType,
        entity_id: entityId,
        order_index: newIndex,
        is_current_turn: false,
      })
      .returning("*");
    return participant;
  },

  async removeParticipant(participantId: number): Promise<void> {
    await db("combat_participants").where({ id: participantId }).delete();
  },

  async reorderParticipants(
    sessionId: number,
    participantIdsInOrder: number[],
  ): Promise<void> {
    const updates = participantIdsInOrder.map((id, idx) =>
      db("combat_participants")
        .where({ id, session_id: sessionId })
        .update({ order_index: idx, is_current_turn: idx === 0 }),
    );
    await Promise.all(updates);
    await this.emitCombatUpdate(sessionId);
  },

  async setCurrentTurn(
    sessionId: number,
    participantId: number,
  ): Promise<void> {
    await db("combat_participants")
      .where({ session_id: sessionId })
      .update({ is_current_turn: false });
    await db("combat_participants")
      .where({ id: participantId, session_id: sessionId })
      .update({ is_current_turn: true });
    await this.emitCombatUpdate(sessionId);
  },

  async endRound(sessionId: number): Promise<void> {
    const participants = await db("combat_participants").where({
      session_id: sessionId,
    });
    for (const p of participants) {
      if (p.entity_type === "player") {
        await db("player_active_effects")
          .where({ player_id: p.entity_id })
          .whereNotNull("remaining_turns")
          .where("remaining_turns", ">", 0)
          .decrement("remaining_turns", 1);
        await db("player_active_effects")
          .where({ player_id: p.entity_id })
          .where("remaining_turns", 0)
          .delete();

        await db("player_abilities")
          .where({ player_id: p.entity_id })
          .whereNotNull("remaining_cooldown_turns")
          .where("remaining_cooldown_turns", ">", 0)
          .decrement("remaining_cooldown_turns", 1);
        await db("player_abilities")
          .where({ player_id: p.entity_id })
          .where("remaining_cooldown_turns", "<", 0)
          .update({ remaining_cooldown_turns: 0 });
      } else {
        await db("npc_active_effects")
          .where({ npc_id: p.entity_id })
          .whereNotNull("remaining_turns")
          .where("remaining_turns", ">", 0)
          .decrement("remaining_turns", 1);
        await db("npc_active_effects")
          .where({ npc_id: p.entity_id })
          .where("remaining_turns", 0)
          .delete();

        await db("npc_abilities")
          .where({ npc_id: p.entity_id })
          .whereNotNull("remaining_cooldown_turns")
          .where("remaining_cooldown_turns", ">", 0)
          .decrement("remaining_cooldown_turns", 1);
        await db("npc_abilities")
          .where({ npc_id: p.entity_id })
          .where("remaining_cooldown_turns", "<", 0)
          .update({ remaining_cooldown_turns: 0 });
      }
    }
    await this.emitCombatUpdate(sessionId);
  },

  async updateHealth(
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    newHealth: number,
  ): Promise<void> {
    if (entityType === "player") {
      const player = await db("players").where({ id: entityId }).first();
      if (!player) throw new Error("Игрок не найден");
      const clampedHealth = Math.max(0, Math.min(newHealth, player.max_health));
      await db("players")
        .where({ id: entityId })
        .update({ health: clampedHealth });
    } else {
      const npc = await db("npcs").where({ id: entityId }).first();
      if (!npc) throw new Error("NPC не найден");
      const clampedHealth = Math.max(0, Math.min(newHealth, npc.max_health));
      await db("npcs")
        .where({ id: entityId })
        .update({ health: clampedHealth });
    }
    await this.emitCombatUpdate(sessionId);
  },

  async addEffectToParticipant(
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    effectId: number,
    durationTurns: number | null,
  ): Promise<void> {
    const effect = await db("effects").where({ id: effectId }).first();
    if (!effect) throw new Error("Эффект не найден");

    if (entityType === "player") {
      const existing = await db("player_active_effects")
        .where({ player_id: entityId, effect_id: effectId })
        .first();
      if (!existing) {
        await db("player_active_effects").insert({
          player_id: entityId,
          effect_id: effectId,
          source_type: "admin",
          remaining_turns: durationTurns ?? effect.duration_turns,
          remaining_days: effect.duration_days,
        });
      }
    } else {
      const existing = await db("npc_active_effects")
        .where({ npc_id: entityId, effect_id: effectId })
        .first();
      if (!existing) {
        await db("npc_active_effects").insert({
          npc_id: entityId,
          effect_id: effectId,
          source_type: "admin",
          remaining_turns: durationTurns ?? effect.duration_turns,
          remaining_days: effect.duration_days,
        });
      }
    }
    await this.emitCombatUpdate(sessionId);
  },

  async getFullCombatData(sessionId: number): Promise<{
    session: CombatSession;
    participants: any[];
  }> {
    const session = await db("combat_sessions")
      .where({ id: sessionId })
      .first();
    if (!session) throw new Error("Сессия не найдена");

    let participants = await db("combat_participants")
      .where({ session_id: sessionId })
      .orderBy("order_index", "asc");

    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        let entity = null;
        if (p.entity_type === "player") {
          entity = await playersService.getFullDetails(p.entity_id);
        } else {
          entity = await npcsService.getFullDetails(p.entity_id.toString());
        }
        return { ...p, entity };
      }),
    );

    return { session, participants: participantsWithDetails };
  },

  async emitCombatUpdate(sessionId: number): Promise<void> {
    const data = await this.getFullCombatData(sessionId);
    getIO().emit("combat:updated", data);
  },

  async nextTurn(sessionId: number): Promise<void> {
    const participants = await db("combat_participants")
      .where({ session_id: sessionId })
      .orderBy("order_index", "asc");
    const currentIndex = participants.findIndex((p) => p.is_current_turn);
    if (currentIndex === -1) {
      if (participants.length > 0) {
        await this.setCurrentTurn(sessionId, participants[0].id);
      }
      return;
    }
    const nextIndex = (currentIndex + 1) % participants.length;
    const nextParticipant = participants[nextIndex];
    await this.setCurrentTurn(sessionId, nextParticipant.id);
  },

  async useAbility(
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    abilityId: number,
  ): Promise<void> {
    if (entityType === "player") {
      await playerAbilitiesService.useAbility(entityId, abilityId);
    } else {
      await npcAbilitiesService.useAbility(entityId, abilityId);
    }
    await this.emitCombatUpdate(sessionId);
  },
};
