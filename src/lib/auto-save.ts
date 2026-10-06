import { useEffect, useRef } from "react";

interface AutoSaveOptions {
  data: any;
  onSave: (data: any) => void | Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave({ data, onSave, delay = 2000, enabled = true }: AutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<any>(data);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if data has changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);

    if (!hasChanged) return;

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(data);
        previousDataRef.current = data;
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, delay, enabled]);
}

export function useLocalStorageAutoSave<T>(key: string, data: T, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [key, data, enabled]);

  useEffect(() => {
    if (!enabled) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, [key, enabled]);
}
