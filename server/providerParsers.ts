// Anthropic/Google 스트리밍 응답의 개별 SSE payload(JSON)에서
// 텍스트 delta만 뽑아내는 순수 함수들. 네트워크/스트림 처리는 index.ts가 담당한다.

interface AnthropicStreamPayload {
  type?: string;
  delta?: { type?: string; text?: string };
}

export function extractAnthropicDelta(payload: AnthropicStreamPayload): string | null {
  if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') {
    return payload.delta.text ?? '';
  }
  return null;
}

interface GoogleStreamPayload {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

export function extractGoogleDelta(payload: GoogleStreamPayload): string | null {
  const candidate = payload.candidates?.[0];
  if (!candidate) return null;

  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  const text = candidate.content?.parts?.map((part) => part.text ?? '').join('');
  return text || null;
}
