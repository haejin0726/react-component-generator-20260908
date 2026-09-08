import { describe, it, expect } from 'vitest';
import { validatePromptLength, MAX_PROMPT_LENGTH } from './validatePromptLength';

describe('validatePromptLength', () => {
  it('500자 이하 프롬프트는 유효하다', () => {
    const result = validatePromptLength('a'.repeat(500));
    expect(result.isValid).toBe(true);
  });

  it('500자를 초과하면 유효하지 않다', () => {
    const result = validatePromptLength('a'.repeat(501));
    expect(result.isValid).toBe(false);
  });

  it('500자를 초과하면 에러 메시지를 반환한다', () => {
    const result = validatePromptLength('a'.repeat(501));
    expect(result.error).toBe(`프롬프트는 최대 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있습니다.`);
  });

  it('빈 문자열은 유효하다', () => {
    const result = validatePromptLength('');
    expect(result.isValid).toBe(true);
  });
});
