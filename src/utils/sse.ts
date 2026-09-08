// /api/generate가 보내는 SSE 스트림을 파싱하는 순수 함수들.
// fetch/ReadableStream 등 실제 네트워크 처리는 useComponentGenerator가 담당한다.

export type GenerateStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

/**
 * SSE 스트림 버퍼를 완결된 이벤트(payload 문자열)들과, 아직 끝나지 않은
 * 나머지(remainder)로 분리한다. remainder는 다음 chunk와 이어붙여 재시도한다.
 */
export function splitSSEEvents(buffer: string): { payloads: string[]; remainder: string } {
  const parts = buffer.split(/\r\n\r\n|\n\n/);
  const remainder = parts.pop() ?? '';

  const payloads = parts
    .map((part) =>
      part
        .split(/\r\n|\n/)
        .find((line) => line.startsWith('data:'))
        ?.slice('data:'.length)
        .trim()
    )
    .filter((payload): payload is string => !!payload);

  return { payloads, remainder };
}

export function parseGenerateStreamPayloads(payloads: string[]): GenerateStreamEvent[] {
  return payloads.map((payload) => JSON.parse(payload) as GenerateStreamEvent);
}
