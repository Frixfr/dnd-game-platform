import { useNotification } from "./useNotification";

export const useErrorHandler = () => {
  const { showError } = useNotification();

  const handleError = (
    error: unknown,
    defaultMessage: string = "Произошла ошибка",
  ) => {
    if (error instanceof Error) {
      showError(error.message);
    } else if (typeof error === "string") {
      showError(error);
    } else {
      showError(defaultMessage);
    }
  };

  return { showError: handleError };
};
