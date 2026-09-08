import { describe, it, expect } from 'vitest';
import { extractAnthropicDelta, extractGoogleDelta } from './providerParsers';

describe('extractAnthropicDelta', () => {
  it('content_block_delta의 text_delta에서 텍스트를 추출한다', () => {
    const payload = { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
    expect(extractAnthropicDelta(payload)).toBe('Hello');
  });

  it('text_delta가 아닌 delta 타입이면 null을 반환한다', () => {
    const payload = { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } };
    expect(extractAnthropicDelta(payload)).toBeNull();
  });

  it('content_block_delta가 아닌 이벤트면 null을 반환한다', () => {
    expect(extractAnthropicDelta({ type: 'message_stop' })).toBeNull();
  });
});

describe('extractGoogleDelta', () => {
  it('candidates의 parts에서 텍스트를 이어붙여 추출한다', () => {
    const payload = {
      candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'World' }] } }],
    };
    expect(extractGoogleDelta(payload)).toBe('Hello World');
  });

  it('candidates가 없으면 null을 반환한다', () => {
    expect(extractGoogleDelta({})).toBeNull();
  });

  it('finishReason이 MAX_TOKENS면 에러를 던진다', () => {
    const payload = {
      candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }],
    };
    expect(() => extractGoogleDelta(payload)).toThrow('생성된 코드가 너무 길어');
  });
});
