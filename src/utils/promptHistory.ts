export function addPromptToHistory(
  history: string[],
  prompt: string,
  maxSize = 50
): string[] {
  const withoutDuplicate = history.filter((item) => item !== prompt);
  return [prompt, ...withoutDuplicate].slice(0, maxSize);
}
