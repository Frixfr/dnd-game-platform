// client/src/components/ui/useMediaQuery.ts
import { useSyncExternalStore } from "react";

export const useMediaQuery = (query: string): boolean => {
  const getSnapshot = () => window.matchMedia(query).matches;
  const subscribe = (callback: () => void) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList.removeEventListener("change", callback);
  };
  return useSyncExternalStore(subscribe, getSnapshot);
};
