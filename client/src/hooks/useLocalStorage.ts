// client/src/hooks/useLocalStorage.ts
import { useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  isMobileSpecific: boolean = false,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Если нужна отдельная версия для мобильных, добавляем суффикс
  const storageKey =
    isMobileSpecific && window.innerWidth < 768 ? `${key}_mobile` : key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      setStoredValue(newValue);
      window.localStorage.setItem(storageKey, JSON.stringify(newValue));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
