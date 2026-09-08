import { describe, it, expect } from 'vitest';
import { splitSSEEvents, parseGenerateStreamPayloads } from './sse';

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

  it('입력이 비어 있으면 빈 결과를 반환한다', () => {
    const { payloads, remainder } = splitSSEEvents('');
    expect(payloads).toEqual([]);
    expect(remainder).toBe('');
  });

  it('CRLF(\\r\\n\\r\\n) 구분자로 온 이벤트도 분리한다', () => {
    const { payloads, remainder } = splitSSEEvents('data: a\r\n\r\ndata: b\r\n\r\n');
    expect(payloads).toEqual(['a', 'b']);
    expect(remainder).toBe('');
  });
});

describe('parseGenerateStreamPayloads', () => {
  it('delta payload를 파싱한다', () => {
    const events = parseGenerateStreamPayloads(['{"type":"delta","text":"ab"}']);
    expect(events).toEqual([{ type: 'delta', text: 'ab' }]);
  });

  it('done payload를 파싱한다', () => {
    const events = parseGenerateStreamPayloads(['{"type":"done","code":"const A=1;"}']);
    expect(events).toEqual([{ type: 'done', code: 'const A=1;' }]);
  });

  it('error payload를 파싱한다', () => {
    const events = parseGenerateStreamPayloads(['{"type":"error","error":"실패"}']);
    expect(events).toEqual([{ type: 'error', error: '실패' }]);
  });

  it('여러 payload를 순서대로 파싱한다', () => {
    const events = parseGenerateStreamPayloads([
      '{"type":"delta","text":"a"}',
      '{"type":"delta","text":"b"}',
    ]);
    expect(events).toEqual([
      { type: 'delta', text: 'a' },
      { type: 'delta', text: 'b' },
    ]);
  });
});
