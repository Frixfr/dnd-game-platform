import { create } from "zustand";
import type { CombatSession, CombatParticipantWithDetails } from "../types";
import { socket } from "../lib/socket";

interface CombatStore {
  session: CombatSession | null;
  participants: CombatParticipantWithDetails[];
  loading: boolean;
  initializeSocket: () => void;
  fetchActiveSession: () => Promise<void>;
  startNewSession: () => Promise<void>;
  addParticipant: (
    entityType: "player" | "npc",
    entityId: number,
  ) => Promise<void>;
  removeParticipant: (participantId: number) => Promise<void>;
  reorderParticipants: (participantIds: number[]) => Promise<void>;
  endRound: () => Promise<void>;
  updateHealth: (
    entityType: "player" | "npc",
    entityId: number,
    health: number,
  ) => Promise<void>;
  addEffect: (
    entityType: "player" | "npc",
    entityId: number,
    effectId: number,
    durationTurns?: number,
  ) => Promise<void>;
  nextTurn: () => Promise<void>;
  callUseAbility: (
    entityType: "player" | "npc",
    entityId: number,
    abilityId: number,
  ) => Promise<void>;
  advanceDay: () => Promise<void>;
}

let combatSocketInitialized = false;

export const useCombatStore = create<CombatStore>((set, get) => ({
  session: null,
  participants: [],
  loading: false,

  initializeSocket: () => {
    if (combatSocketInitialized) return;
    combatSocketInitialized = true;

    socket.on(
      "combat:updated",
      (data: {
        session: CombatSession;
        participants: CombatParticipantWithDetails[];
      }) => {
        console.log("Combat updated", data);
        set({ session: data.session, participants: data.participants });
      },
    );
  },

  fetchActiveSession: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/combat/active");
      const data = await res.json();
      if (data.success) {
        set({ session: data.session, participants: data.participants || [] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      set({ loading: false });
    }
  },

  startNewSession: async () => {
    try {
      const res = await fetch("/api/combat/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await get().fetchActiveSession();
      }
    } catch (error) {
      console.error(error);
    }
  },

  addParticipant: async (entityType, entityId) => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, entityType, entityId }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  removeParticipant: async (participantId) => {
    try {
      await fetch(`/api/combat/participant/${participantId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error(error);
    }
  },

  reorderParticipants: async (participantIds) => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, participantIds }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  endRound: async () => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/end-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  updateHealth: async (entityType, entityId, health) => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          entityType,
          entityId,
          health,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  addEffect: async (entityType, entityId, effectId, durationTurns) => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/effect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          entityType,
          entityId,
          effectId,
          durationTurns,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  nextTurn: async () => {
    const session = get().session;
    if (!session) return;
    try {
      await fetch("/api/combat/next-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch (error) {
      console.error(error);
    }
  },

  callUseAbility: async (entityType, entityId, abilityId) => {
    const session = get().session;
    if (!session) return;
    try {
      const res = await fetch("/api/combat/use-ability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          entityType,
          entityId,
          abilityId,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Ошибка использования способности");
      }
    } catch (error) {
      console.error("Ошибка использования способности:", error);
    }
  },

  advanceDay: async () => {
    try {
      const res = await fetch("/api/combat/advance-day", { method: "POST" });
      if (!res.ok) throw new Error("Ошибка при завершении дня");
    } catch (error) {
      console.error(error);
      alert("Не удалось завершить день");
    }
  },
}));
