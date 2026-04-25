// server/src/services/combatService.ts

import { db } from "../db/index.js";
import { getIO, emitPlayerUpdate, emitNpcUpdate } from "../socket/index.js";
import type { CombatParticipant, CombatSession } from "../types/index.js";
import { playersService } from "./playersService.js";
import { npcsService } from "./npcsService.js";
import { playerAbilitiesService } from "./playerAbilitiesService.js";
import { npcAbilitiesService } from "./npcAbilitiesService.js";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";

export const combatService = {
  async getActiveSession(): Promise<CombatSession | null> {
    const session = await db("combat_sessions")
      .where({ is_active: true })
      .orderBy("created_at", "desc")
      .first();
    return session || null;
  },

  async startNewSession(): Promise<CombatSession> {
    const oldSession = await this.getActiveSession();
    if (oldSession) {
      const participants = await db("combat_participants").where({
        session_id: oldSession.id,
      });
      for (const p of participants) {
        await this.updateInBattleStatus(p.entity_type, p.entity_id, false);
      }
      await db("combat_sessions")
        .where({ id: oldSession.id })
        .update({ is_active: false, ended_at: db.fn.now() });
    }

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

    await this.updateInBattleStatus(entityType, entityId, true);
    return participant;
  },

  async removeParticipant(participantId: number): Promise<void> {
    const participant = await db("combat_participants")
      .where({ id: participantId })
      .first();
    if (participant) {
      await this.updateInBattleStatus(
        participant.entity_type,
        participant.entity_id,
        false,
      );
      await db("combat_participants").where({ id: participantId }).delete();
    }
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

        await emitPlayerUpdate(p.entity_id);
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

        await emitNpcUpdate(p.entity_id);
      }
    }
    await this.emitCombatUpdate(sessionId);
  },

  async advanceDay(): Promise<void> {
    // 1. Уменьшаем дневные кулдауны эффектов
    await db("player_active_effects")
      .whereNotNull("remaining_days")
      .where("remaining_days", ">", 0)
      .decrement("remaining_days", 1);
    await db("player_active_effects").where("remaining_days", 0).delete();

    await db("npc_active_effects")
      .whereNotNull("remaining_days")
      .where("remaining_days", ">", 0)
      .decrement("remaining_days", 1);
    await db("npc_active_effects").where("remaining_days", 0).delete();

    // 2. Уменьшаем дневные кулдауны способностей
    await db("player_abilities")
      .whereNotNull("remaining_cooldown_days")
      .where("remaining_cooldown_days", ">", 0)
      .decrement("remaining_cooldown_days", 1);
    await db("player_abilities")
      .where("remaining_cooldown_days", "<", 0)
      .update({ remaining_cooldown_days: 0 });

    await db("npc_abilities")
      .whereNotNull("remaining_cooldown_days")
      .where("remaining_cooldown_days", ">", 0)
      .decrement("remaining_cooldown_days", 1);
    await db("npc_abilities")
      .where("remaining_cooldown_days", "<", 0)
      .update({ remaining_cooldown_days: 0 });

    // 3. Сбрасываем ходовые кулдауны в 0
    await db("player_abilities")
      .update({ remaining_cooldown_turns: 0 })
      .whereNotNull("remaining_cooldown_turns");
    await db("npc_abilities")
      .update({ remaining_cooldown_turns: 0 })
      .whereNotNull("remaining_cooldown_turns");

    // 4. Удаляем все временные эффекты (действующие по ходам)
    await db("player_active_effects")
      .whereNotNull("remaining_turns")
      .where("remaining_turns", ">", 0)
      .delete();
    await db("npc_active_effects")
      .whereNotNull("remaining_turns")
      .where("remaining_turns", ">", 0)
      .delete();

    // 5. Собираем ID всех затронутых игроков и NPC для сокет-обновлений
    const affectedPlayers = await db("player_abilities")
      .select("player_id")
      .union(db("player_active_effects").select("player_id"))
      .groupBy("player_id");

    const affectedNpcs = await db("npc_abilities")
      .select("npc_id")
      .union(db("npc_active_effects").select("npc_id"))
      .groupBy("npc_id");

    const io = getIO();
    for (const row of affectedPlayers) {
      const fullData = await getFullPlayerData(String(row.player_id));
      if (fullData) io.emit("player:updated", fullData);
    }
    for (const row of affectedNpcs) {
      const fullData = await getFullNpcData(String(row.npc_id));
      if (fullData) io.emit("npc:updated", fullData);
    }

    // 6. Обновляем активную боевую сессию, если есть
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      await this.emitCombatUpdate(activeSession.id);
    }
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
    if (nextIndex === 0) {
      await this.endRound(sessionId);
    }
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

  async updateInBattleStatus(
    entityType: "player" | "npc",
    entityId: number,
    inBattle: boolean,
  ): Promise<void> {
    const value = inBattle ? 1 : 0;
    if (entityType === "player") {
      await db("players").where({ id: entityId }).update({ in_battle: value });
      const full = await getFullPlayerData(String(entityId));
      if (full) getIO().emit("player:updated", full);
    } else {
      await db("npcs").where({ id: entityId }).update({ in_battle: value });
      const full = await getFullNpcData(String(entityId));
      if (full) getIO().emit("npc:updated", full);
    }
  },
};
