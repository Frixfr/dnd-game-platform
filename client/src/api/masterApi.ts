// client/src/api/masterApi.ts
import apiClient from "./client";

export interface MasterLoginResponse {
  token: string;
}

/**
 * Вход мастера по паролю (хардкод dm123 на бэке)
 */
export const loginMaster = async (
  password: string,
): Promise<MasterLoginResponse> => {
  const response = await apiClient.post<MasterLoginResponse>("/master/login", {
    password,
  });
  return response.data;
};
