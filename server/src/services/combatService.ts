// server/src/services/combatService.ts

import { db } from "../db/index.js";
import { getIO, emitPlayerUpdate, emitNpcUpdate } from "../socket/index.js";
import type { CombatParticipant, CombatSession } from "../types/index.js";
import { playersService } from "./playersService.js";
import { npcsService } from "./npcsService.js";
import { playerAbilitiesService } from "./playerAbilitiesService.js";
import { npcAbilitiesService } from "./npcAbilitiesService.js";
import {
  applyInstantHealthChange,
  getFullPlayerData,
  getFullNpcData,
} from "../utils/helpers.js";

export const combatService = {
  // ADDED roomId support
  async getActiveSession(roomId: number): Promise<CombatSession | null> {
    const session = await db("combat_sessions")
      .where({ is_active: true, room_id: roomId }) // ADDED room_id filter
      .orderBy("created_at", "desc")
      .first();
    return session || null;
  },

  // ADDED roomId support
  async startNewSession(roomId: number): Promise<CombatSession> {
    const oldSession = await this.getActiveSession(roomId);
    if (oldSession) {
      const participants = await db("combat_participants").where({
        session_id: oldSession.id,
      });
      for (const p of participants) {
        await this.updateInBattleStatus(
          roomId,
          p.entity_type,
          p.entity_id,
          false,
        );
      }
      await db("combat_sessions")
        .where({ id: oldSession.id })
        .update({ is_active: false, ended_at: db.fn.now() });
    }

    const [session] = await db("combat_sessions")
      .insert({ is_active: true, room_id: roomId, created_at: db.fn.now() }) // ADDED room_id
      .returning("*");
    return session;
  },

  // ADDED roomId support
  async addParticipant(
    roomId: number,
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
  ): Promise<CombatParticipant> {
    // Проверяем, что сессия принадлежит комнате
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    // Проверяем, что сущность существует в комнате (через сервисы)
    if (entityType === "player") {
      const player = await playersService.getById(roomId, entityId);
      if (!player) throw new Error("Игрок не найден в этой комнате");
    } else {
      const npc = await npcsService.getById(roomId, String(entityId));
      if (!npc) throw new Error("NPC не найден в этой комнате");
    }

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

    await this.updateInBattleStatus(roomId, entityType, entityId, true);
    return participant;
  },

  // ADDED roomId support
  async removeParticipant(
    roomId: number,
    participantId: number,
  ): Promise<void> {
    const participant = await db("combat_participants")
      .where({ id: participantId })
      .first();
    if (!participant) return;

    // Проверяем, что сессия принадлежит комнате
    const session = await db("combat_sessions")
      .where({ id: participant.session_id, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    await this.updateInBattleStatus(
      roomId,
      participant.entity_type,
      participant.entity_id,
      false,
    );
    await db("combat_participants").where({ id: participantId }).delete();
  },

  // ADDED roomId support
  async reorderParticipants(
    roomId: number,
    sessionId: number,
    participantIdsInOrder: number[],
  ): Promise<void> {
    // Проверяем сессию
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    const updates = participantIdsInOrder.map((id, idx) =>
      db("combat_participants")
        .where({ id, session_id: sessionId })
        .update({ order_index: idx, is_current_turn: idx === 0 }),
    );
    await Promise.all(updates);
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async setCurrentTurn(
    roomId: number,
    sessionId: number,
    participantId: number,
  ): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    await db("combat_participants")
      .where({ session_id: sessionId })
      .update({ is_current_turn: false });
    await db("combat_participants")
      .where({ id: participantId, session_id: sessionId })
      .update({ is_current_turn: true });
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async endRound(roomId: number, sessionId: number): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

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
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async advanceDay(roomId: number): Promise<void> {
    // 1. Уменьшаем дневные кулдауны эффектов для игроков в этой комнате
    await db("player_active_effects")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .whereNotNull("remaining_days")
      .where("remaining_days", ">", 0)
      .decrement("remaining_days", 1);
    await db("player_active_effects")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .where("remaining_days", 0)
      .delete();

    await db("npc_active_effects")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .whereNotNull("remaining_days")
      .where("remaining_days", ">", 0)
      .decrement("remaining_days", 1);
    await db("npc_active_effects")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .where("remaining_days", 0)
      .delete();

    // 2. Уменьшаем дневные кулдауны способностей для игроков в этой комнате
    await db("player_abilities")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .whereNotNull("remaining_cooldown_days")
      .where("remaining_cooldown_days", ">", 0)
      .decrement("remaining_cooldown_days", 1);
    await db("player_abilities")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .where("remaining_cooldown_days", "<", 0)
      .update({ remaining_cooldown_days: 0 });

    await db("npc_abilities")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .whereNotNull("remaining_cooldown_days")
      .where("remaining_cooldown_days", ">", 0)
      .decrement("remaining_cooldown_days", 1);
    await db("npc_abilities")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .where("remaining_cooldown_days", "<", 0)
      .update({ remaining_cooldown_days: 0 });

    // 3. Сбрасываем ходовые кулдауны в 0 для игроков в этой комнате
    await db("player_abilities")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .update({ remaining_cooldown_turns: 0 })
      .whereNotNull("remaining_cooldown_turns");

    await db("npc_abilities")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .update({ remaining_cooldown_turns: 0 })
      .whereNotNull("remaining_cooldown_turns");

    // 4. Удаляем все временные эффекты (действующие по ходам) для игроков в этой комнате
    await db("player_active_effects")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .whereNotNull("remaining_turns")
      .where("remaining_turns", ">", 0)
      .delete();

    await db("npc_active_effects")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .whereNotNull("remaining_turns")
      .where("remaining_turns", ">", 0)
      .delete();

    // 5. Собираем ID всех затронутых игроков и NPC для сокет-обновлений (только в этой комнате)
    const affectedPlayers = await db("player_abilities")
      .select("player_id")
      .whereIn("player_id", function () {
        this.select("id").from("players").where("room_id", roomId);
      })
      .union(
        db("player_active_effects")
          .select("player_id")
          .whereIn("player_id", function () {
            this.select("id").from("players").where("room_id", roomId);
          }),
      )
      .groupBy("player_id");

    const affectedNpcs = await db("npc_abilities")
      .select("npc_id")
      .whereIn("npc_id", function () {
        this.select("id").from("npcs").where("room_id", roomId);
      })
      .union(
        db("npc_active_effects")
          .select("npc_id")
          .whereIn("npc_id", function () {
            this.select("id").from("npcs").where("room_id", roomId);
          }),
      )
      .groupBy("npc_id");

    const io = getIO();
    for (const row of affectedPlayers) {
      const fullData = await getFullPlayerData(String(row.player_id));
      if (fullData) io.to(`room:${roomId}`).emit("player:updated", fullData);
    }
    for (const row of affectedNpcs) {
      const fullData = await getFullNpcData(String(row.npc_id));
      if (fullData) io.to(`room:${roomId}`).emit("npc:updated", fullData);
    }

    // 6. Обновляем активную боевую сессию, если есть
    const activeSession = await this.getActiveSession(roomId);
    if (activeSession) {
      await this.emitCombatUpdate(roomId, activeSession.id);
    }
  },

  // ADDED roomId support
  async updateHealth(
    roomId: number,
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    newHealth: number,
  ): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    if (entityType === "player") {
      const player = await db("players")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!player) throw new Error("Игрок не найден");

      // Получаем финальное максимальное здоровье с учётом эффектов
      const fullPlayerData = await getFullPlayerData(entityId);
      const effectiveMaxHealth = fullPlayerData
        ? fullPlayerData.final_stats.max_health
        : player.max_health;

      const clampedHealth = Math.max(
        0,
        Math.min(newHealth, effectiveMaxHealth),
      );
      await db("players")
        .where({ id: entityId })
        .update({ health: clampedHealth });
    } else {
      const npc = await db("npcs")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!npc) throw new Error("NPC не найден");

      const fullNpcData = await getFullNpcData(entityId);
      const effectiveMaxHealth = fullNpcData
        ? fullNpcData.final_stats.max_health
        : npc.max_health;

      const clampedHealth = Math.max(
        0,
        Math.min(newHealth, effectiveMaxHealth),
      );
      await db("npcs")
        .where({ id: entityId })
        .update({ health: clampedHealth });
    }
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async addEffectToParticipant(
    roomId: number,
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    effectId: number,
    durationTurns: number | null,
  ): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    const effect = await db("effects")
      .where({ id: effectId, room_id: roomId })
      .first();
    if (!effect) throw new Error("Эффект не найден в этой комнате");

    // Обработка мгновенных эффектов
    if (effect.is_instant) {
      let entity: any;
      if (entityType === "player") {
        entity = await db("players")
          .where({ id: entityId, room_id: roomId })
          .first();
        if (!entity) throw new Error("Игрок не найден");

        // Собираем все активные эффекты игрока (кроме добавляемого)
        const allActiveEffects = await db("player_active_effects")
          .where({ player_id: entityId })
          .join("effects", "player_active_effects.effect_id", "effects.id")
          .select("effects.*");

        const playerItems = await db("player_items")
          .where({ player_id: entityId })
          .join("items", "player_items.item_id", "items.id")
          .select("items.id");
        const itemIds = playerItems.map((row) => row.id);
        let passiveEffects: any[] = [];
        if (itemIds.length > 0) {
          passiveEffects = await db("item_effects")
            .whereIn("item_id", itemIds)
            .where({ effect_type: "passive" })
            .join("effects", "item_effects.effect_id", "effects.id")
            .select("effects.*");
        }

        let raceEffects: any[] = [];
        if (entity.race_id) {
          const raceEffectsRaw = await db("race_effects")
            .where("race_id", entity.race_id)
            .join("effects", "race_effects.effect_id", "effects.id")
            .select("effects.*");
          raceEffects = raceEffectsRaw;
        }

        let maxHealthBonus = 0;
        const allEffects = [
          ...allActiveEffects,
          ...passiveEffects,
          ...raceEffects,
        ];
        for (const e of allEffects) {
          if (e.attribute === "max_health" && typeof e.modifier === "number") {
            maxHealthBonus += e.modifier;
          }
        }
        if (
          effect.attribute === "max_health" &&
          typeof effect.modifier === "number"
        ) {
          maxHealthBonus += effect.modifier;
        }
        const effectiveMaxHealth = entity.max_health + maxHealthBonus;

        const newHealth = applyInstantHealthChange(
          entity.health,
          { attribute: effect.attribute, modifier: effect.modifier },
          effectiveMaxHealth,
        );
        if (newHealth !== null && newHealth !== entity.health) {
          await db("players")
            .where("id", entityId)
            .update({ health: newHealth });
          const full = await getFullPlayerData(entityId);
          if (full) getIO().to(`room:${roomId}`).emit("player:updated", full);
        }
        await this.emitCombatUpdate(roomId, sessionId);
        return;
      } else {
        entity = await db("npcs")
          .where({ id: entityId, room_id: roomId })
          .first();
        if (!entity) throw new Error("NPC не найден");

        const allActiveEffects = await db("npc_active_effects")
          .where({ npc_id: entityId })
          .join("effects", "npc_active_effects.effect_id", "effects.id")
          .select("effects.*");

        const npcItems = await db("npc_items")
          .where({ npc_id: entityId })
          .join("items", "npc_items.item_id", "items.id")
          .select("items.id");
        const itemIds = npcItems.map((row) => row.id);
        let passiveEffects: any[] = [];
        if (itemIds.length > 0) {
          passiveEffects = await db("item_effects")
            .whereIn("item_id", itemIds)
            .where({ effect_type: "passive" })
            .join("effects", "item_effects.effect_id", "effects.id")
            .select("effects.*");
        }

        let raceEffects: any[] = [];
        if (entity.race_id) {
          const raceEffectsRaw = await db("race_effects")
            .where("race_id", entity.race_id)
            .join("effects", "race_effects.effect_id", "effects.id")
            .select("effects.*");
          raceEffects = raceEffectsRaw;
        }

        let maxHealthBonus = 0;
        const allEffects = [
          ...allActiveEffects,
          ...passiveEffects,
          ...raceEffects,
        ];
        for (const e of allEffects) {
          if (e.attribute === "max_health" && typeof e.modifier === "number") {
            maxHealthBonus += e.modifier;
          }
        }
        if (
          effect.attribute === "max_health" &&
          typeof effect.modifier === "number"
        ) {
          maxHealthBonus += effect.modifier;
        }
        const effectiveMaxHealth = entity.max_health + maxHealthBonus;

        const newHealth = applyInstantHealthChange(
          entity.health,
          { attribute: effect.attribute, modifier: effect.modifier },
          effectiveMaxHealth,
        );
        if (newHealth !== null && newHealth !== entity.health) {
          await db("npcs").where("id", entityId).update({ health: newHealth });
          const full = await getFullNpcData(entityId);
          if (full) getIO().to(`room:${roomId}`).emit("npc:updated", full);
        }
        await this.emitCombatUpdate(roomId, sessionId);
        return;
      }
    }

    // ---- Не мгновенный эффект: создаём запись ----
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
        const full = await getFullPlayerData(entityId);
        if (full) getIO().to(`room:${roomId}`).emit("player:updated", full);
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
        const full = await getFullNpcData(entityId);
        if (full) getIO().to(`room:${roomId}`).emit("npc:updated", full);
      }
    }
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async getFullCombatData(
    roomId: number,
    sessionId: number,
  ): Promise<{
    session: CombatSession;
    participants: any[];
  }> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена");

    let participants = await db("combat_participants")
      .where({ session_id: sessionId })
      .orderBy("order_index", "asc");

    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        let entity = null;
        if (p.entity_type === "player") {
          entity = await playersService.getFullDetails(roomId, p.entity_id);
        } else {
          entity = await npcsService.getFullDetails(
            roomId,
            p.entity_id.toString(),
          );
        }
        return { ...p, entity };
      }),
    );

    return { session, participants: participantsWithDetails };
  },

  // ADDED roomId support
  async emitCombatUpdate(roomId: number, sessionId: number): Promise<void> {
    const data = await this.getFullCombatData(roomId, sessionId);
    getIO().to(`room:${roomId}`).emit("combat:updated", data);
  },

  // ADDED roomId support
  async nextTurn(roomId: number, sessionId: number): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    const participants = await db("combat_participants")
      .where({ session_id: sessionId })
      .orderBy("order_index", "asc");
    const currentIndex = participants.findIndex((p) => p.is_current_turn);
    if (currentIndex === -1) {
      if (participants.length > 0) {
        await this.setCurrentTurn(roomId, sessionId, participants[0].id);
      }
      return;
    }
    const nextIndex = (currentIndex + 1) % participants.length;
    const nextParticipant = participants[nextIndex];
    await this.setCurrentTurn(roomId, sessionId, nextParticipant.id);
    if (nextIndex === 0) {
      await this.endRound(roomId, sessionId);
    }
  },

  // ADDED roomId support
  async useAbility(
    roomId: number,
    sessionId: number,
    entityType: "player" | "npc",
    entityId: number,
    abilityId: number,
  ): Promise<void> {
    const session = await db("combat_sessions")
      .where({ id: sessionId, room_id: roomId })
      .first();
    if (!session) throw new Error("Сессия не найдена в этой комнате");

    // Проверяем, что способность принадлежит комнате
    const ability = await db("abilities")
      .where({ id: abilityId, room_id: roomId })
      .first();
    if (!ability) throw new Error("Способность не найдена в этой комнате");

    if (entityType === "player") {
      // TODO: когда playerAbilitiesService будет доработан, передавать roomId
      await playerAbilitiesService.useAbility(roomId, entityId, abilityId);
    } else {
      // TODO: когда npcAbilitiesService будет доработан, передавать roomId
      await npcAbilitiesService.useAbility(roomId, entityId, abilityId);
    }
    await this.emitCombatUpdate(roomId, sessionId);
  },

  // ADDED roomId support
  async updateInBattleStatus(
    roomId: number,
    entityType: "player" | "npc",
    entityId: number,
    inBattle: boolean,
  ): Promise<void> {
    const value = inBattle ? 1 : 0;
    if (entityType === "player") {
      const player = await db("players")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!player) throw new Error("Игрок не найден в этой комнате");
      await db("players").where({ id: entityId }).update({ in_battle: value });
      const full = await getFullPlayerData(String(entityId));
      if (full) getIO().to(`room:${roomId}`).emit("player:updated", full);
    } else {
      const npc = await db("npcs")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!npc) throw new Error("NPC не найден в этой комнате");
      await db("npcs").where({ id: entityId }).update({ in_battle: value });
      const full = await getFullNpcData(String(entityId));
      if (full) getIO().to(`room:${roomId}`).emit("npc:updated", full);
    }
  },
};
