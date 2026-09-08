import { useCallback, useState } from 'react';

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? ((raw: string) => JSON.parse(raw) as T);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? deserialize(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, serialize(resolved));
        } catch {
          // localStorage 용량 초과 등은 무시하고 메모리 상태만 유지한다
        }
        return resolved;
      });
    },
    [key, serialize]
  );

  return [value, setStoredValue];
}
