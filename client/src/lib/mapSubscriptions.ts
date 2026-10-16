// client/src/lib/mapSubscriptions.ts
/**
 * Локальный реестр подписок на карты (`map:<id>`).
 *
 * В socket.io-client v4 клиент не знает, в каких комнатах он состоит
 * (список комнат есть только на сервере), поэтому клиент сам трекает
 * подписки, созданные через `join-map`, чтобы при leaveRoom/logout
 * (leaveAllRooms) корректно разослать `leave-map` и не оставить за собой
 * «висячие» подписки.
 */
const subscribedMaps = new Set<number>();

export function addMapSubscription(mapId: number): void {
  subscribedMaps.add(mapId);
}

export function removeMapSubscription(mapId: number): void {
  subscribedMaps.delete(mapId);
}

/** Копия текущего набора id карт, на которые подписан клиент. */
export function getSubscribedMaps(): number[] {
  return Array.from(subscribedMaps);
}
