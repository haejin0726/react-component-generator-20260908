import { describe, it, expect } from 'vitest';
import { formatSSE, splitSSEEvents } from './sse';

describe('formatSSE', () => {
  it('delta 이벤트를 SSE data 라인으로 직렬화한다', () => {
    expect(formatSSE({ type: 'delta', text: 'abc' })).toBe(
      'data: {"type":"delta","text":"abc"}\n\n'
    );
  });

  it('done 이벤트를 SSE data 라인으로 직렬화한다', () => {
    expect(formatSSE({ type: 'done', code: 'const A = 1;' })).toBe(
      'data: {"type":"done","code":"const A = 1;"}\n\n'
    );
  });

  it('error 이벤트를 SSE data 라인으로 직렬화한다', () => {
    expect(formatSSE({ type: 'error', error: '실패' })).toBe(
      'data: {"type":"error","error":"실패"}\n\n'
    );
  });
});

describe('splitSSEEvents', () => {
  it('완결된 이벤트 여러 개를 payload 배열로 분리한다', () => {
    const { payloads, remainder } = splitSSEEvents('data: a\n\ndata: b\n\n');
    expect(payloads).toEqual(['a', 'b']);
    expect(remainder).toBe('');
  });

  it('마지막 이벤트가 미완결이면 remainder로 남긴다', () => {
    const { payloads, remainder } = splitSSEEvents('data: a\n\ndata: b');
    expect(payloads).toEqual(['a']);
    expect(remainder).toBe('data: b');
  });

  it('data 라인이 없는 조각은 무시한다', () => {
    const { payloads } = splitSSEEvents('event: ping\n\ndata: a\n\n');
    expect(payloads).toEqual(['a']);
  });

  it('입력이 비어 있으면 빈 결과를 반환한다', () => {
    const { payloads, remainder } = splitSSEEvents('');
    expect(payloads).toEqual([]);
    expect(remainder).toBe('');
  });

  it('CRLF(\\r\\n\\r\\n) 구분자로 온 이벤트도 분리한다 (Google API 응답 형식)', () => {
    const { payloads, remainder } = splitSSEEvents('data: a\r\n\r\ndata: b\r\n\r\n');
    expect(payloads).toEqual(['a', 'b']);
    expect(remainder).toBe('');
  });
});
