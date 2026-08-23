// client/src/contexts/notificationContext.tsx
import { createContext } from "react";

export interface NotificationContextType {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  showNotification: (
    message: string,
    options?: {
      type?: "success" | "error" | "info";
      duration?: number;
      action?: { label: string; onClick: () => void };
    },
  ) => void;
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);
