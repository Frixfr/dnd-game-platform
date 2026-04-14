// Файл: client/src/hooks/useErrorHandler.ts
import { useCallback } from "react";
import { useNotification } from "./useNotification";

export const useErrorHandler = () => {
  const { showError: showNotificationError } = useNotification();

  const handleError = useCallback(
    (error: unknown, defaultMessage: string = "Произошла ошибка") => {
      if (error instanceof Error) {
        showNotificationError(error.message);
      } else if (typeof error === "string") {
        showNotificationError(error);
      } else {
        showNotificationError(defaultMessage);
      }
    },
    [showNotificationError],
  );

  return { showError: handleError };
};
