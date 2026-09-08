export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePromptLength(prompt: string): PromptValidationResult {
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `프롬프트는 최대 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있습니다.`,
    };
  }
  return { isValid: true };
}
