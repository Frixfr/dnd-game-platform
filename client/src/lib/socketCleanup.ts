import { usePlayerStore } from "../stores/playerStore";
import { useNpcStore } from "../stores/npcStore";
import { useRaceStore } from "../stores/raceStore";
import { useAbilityStore } from "../stores/abilityStore";
import { useEffectStore } from "../stores/effectStore";
import { useItemStore } from "../stores/itemStore";
import { useMapStore } from "../stores/mapStore";
import { useCombatStore } from "../stores/combatStore";
import { useLogStore } from "../stores/logStore";
import { usePlayerSessionStore } from "../stores/playerSessionStore";

export const disconnectAllSocketHandlers = () => {
  usePlayerStore.getState().disconnectSocket?.();
  useNpcStore.getState().disconnectSocket?.();
  useRaceStore.getState().disconnectSocket?.();
  useAbilityStore.getState().disconnectSocket?.();
  useEffectStore.getState().disconnectSocket?.();
  useItemStore.getState().disconnectSocket?.();
  useMapStore.getState().disconnectSocket?.();
  useCombatStore.getState().disconnectSocket?.();
  useLogStore.getState().disconnectSocket?.();
  usePlayerSessionStore.getState().disconnectSocket?.();
};
