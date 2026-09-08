import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { serializeComponents, deserializeComponents } from '../utils/componentsStorage';
import { splitSSEEvents, parseGenerateStreamPayloads } from '../utils/sse';

const COMPONENTS_STORAGE_KEY = 'rcg:components';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useLocalStorage<GeneratedComponent[]>(
    COMPONENTS_STORAGE_KEY,
    [],
    { serialize: serializeComponents, deserialize: deserializeComponents }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const placeholder: GeneratedComponent = {
      id,
      prompt,
      code: '',
      createdAt: new Date(),
      isStreaming: true,
    };
    setComponents((prev) => [placeholder, ...prev]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { payloads, remainder } = splitSSEEvents(buffer);
        buffer = remainder;

        for (const event of parseGenerateStreamPayloads(payloads)) {
          if (event.type === 'delta') {
            setComponents((prev) =>
              prev.map((c) => (c.id === id ? { ...c, code: c.code + event.text } : c))
            );
          } else if (event.type === 'done') {
            setComponents((prev) =>
              prev.map((c) => (c.id === id ? { ...c, code: event.code, isStreaming: false } : c))
            );
          } else if (event.type === 'error') {
            streamError = event.error;
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
