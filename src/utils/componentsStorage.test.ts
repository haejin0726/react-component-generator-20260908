import { describe, it, expect } from 'vitest';
import { serializeComponents, deserializeComponents } from './componentsStorage';
import type { GeneratedComponent } from '../types';

describe('deserializeComponents', () => {
  it('null이면 빈 배열을 반환한다', () => {
    expect(deserializeComponents(null)).toEqual([]);
  });

  it('직렬화된 컴포넌트 목록을 복원한다', () => {
    const components: GeneratedComponent[] = [
      { id: '1', prompt: '프로필 카드', code: 'render(<div />)', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ];
    const raw = serializeComponents(components);

    const result = deserializeComponents(raw);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].prompt).toBe('프로필 카드');
  });

  it('createdAt이 Date 인스턴스로 복원된다', () => {
    const components: GeneratedComponent[] = [
      { id: '1', prompt: '프로필 카드', code: 'render(<div />)', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ];
    const raw = serializeComponents(components);

    const result = deserializeComponents(raw);

    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('손상된 JSON이면 빈 배열을 반환한다', () => {
    expect(deserializeComponents('{invalid json')).toEqual([]);
  });

  it('배열이 아닌 JSON이면 빈 배열을 반환한다', () => {
    expect(deserializeComponents('{"foo":"bar"}')).toEqual([]);
  });
});
