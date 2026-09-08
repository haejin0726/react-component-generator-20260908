import { describe, it, expect } from 'vitest';
import { addPromptToHistory } from './promptHistory';

describe('addPromptToHistory', () => {
  it('빈 히스토리에 프롬프트를 추가하면 배열에 담긴다', () => {
    expect(addPromptToHistory([], '프로필 카드')).toEqual(['프로필 카드']);
  });

  it('새 프롬프트는 배열 맨 앞에 추가된다', () => {
    expect(addPromptToHistory(['이전 프롬프트'], '새 프롬프트')).toEqual([
      '새 프롬프트',
      '이전 프롬프트',
    ]);
  });

  it('이미 있는 프롬프트를 다시 추가하면 중복 없이 맨 앞으로 이동한다', () => {
    expect(addPromptToHistory(['A', 'B', 'C'], 'B')).toEqual(['B', 'A', 'C']);
  });

  it('최대 개수를 넘으면 가장 오래된 항목부터 잘린다', () => {
    const history = ['A', 'B', 'C'];
    expect(addPromptToHistory(history, 'D', 3)).toEqual(['D', 'A', 'B']);
  });
});
