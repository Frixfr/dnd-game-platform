import { createContext } from "react";

export interface NotificationContextType {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);
