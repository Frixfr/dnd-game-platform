// client/src/api/roomsApi.ts
import apiClient from "./client";

// Локальный тип комнаты (позже будет вынесен в общие типы)
export interface Room {
  id: number;
  name: string;
  password_hash: string | null; // на фронте не используем, но для типизации
  is_active_for_players: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoomDto {
  name: string;
}

export interface UpdateRoomDto {
  name?: string;
  password?: string | null; // null означает удалить пароль
}

export interface EnterRoomResponse {
  token: string;
  room: Room;
}

/**
 * Получить список всех комнат (требуется токен мастера)
 */
export const getRooms = async (): Promise<Room[]> => {
  const response = await apiClient.get<Room[]>("/rooms");
  return response.data;
};

/**
 * Создать новую комнату
 */
export const createRoom = async (name: string): Promise<Room> => {
  const response = await apiClient.post<Room>("/rooms", { name });
  return response.data;
};

/**
 * Обновить комнату (название или пароль)
 */
export const updateRoom = async (
  id: number,
  data: UpdateRoomDto,
): Promise<Room> => {
  const response = await apiClient.put<Room>(`/rooms/${id}`, data);
  return response.data;
};

/**
 * Удалить комнату
 */
export const deleteRoom = async (id: number): Promise<void> => {
  await apiClient.delete(`/rooms/${id}`);
};

/**
 * Установить комнату активной для игроков (снимает флаг со всех остальных)
 */
export const setActiveRoom = async (id: number): Promise<void> => {
  await apiClient.post(`/rooms/${id}/set-active`);
};

/**
 * Войти в комнату (мастер вводит пароль, если он установлен)
 * Возвращает новый JWT-токен с привязкой к комнате и данные комнаты
 */
export const enterRoom = async (
  id: number,
  password?: string,
): Promise<EnterRoomResponse> => {
  const response = await apiClient.post<EnterRoomResponse>(
    `/rooms/${id}/enter`,
    { password },
  );
  return response.data;
};
