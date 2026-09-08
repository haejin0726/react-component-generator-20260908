import type { GeneratedComponent } from '../types';

export function serializeComponents(components: GeneratedComponent[]): string {
  return JSON.stringify(components);
}

export function deserializeComponents(raw: string | null): GeneratedComponent[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    }));
  } catch {
    return [];
  }
}
