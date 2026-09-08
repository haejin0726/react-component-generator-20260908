import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import { formatSSE, splitSSEEvents } from './sse';
import { extractAnthropicDelta, extractGoogleDelta } from './providerParsers';

// 우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다.
const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

/**
 * SSE 응답 body를 순서대로 읽어, 완결된 payload마다 onPayload를 호출한다.
 * response.ok가 아니면(스트리밍 시작 전) 즉시 에러를 던진다 — Google 폴백은
 * 이 시점의 에러만으로 다음 모델로 넘어간다.
 */
async function streamFetch(
  url: string,
  init: RequestInit,
  errorPrefix: string,
  onPayload: (payload: string) => void
): Promise<void> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { payloads, remainder } = splitSSEEvents(buffer);
    buffer = remainder;

    for (const payload of payloads) {
      onPayload(payload);
    }
  }
}

async function callAnthropicStream(
  prompt: string,
  apiKey: string,
  onChunk: (text: string) => void
): Promise<void> {
  await streamFetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    },
    'Claude API error',
    (payload) => {
      const delta = extractAnthropicDelta(JSON.parse(payload));
      if (delta) onChunk(delta);
    }
  );
}

async function callGoogleModelStream(
  prompt: string,
  apiKey: string,
  model: string,
  onChunk: (text: string) => void
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  await streamFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
    'Gemini API error',
    (payload) => {
      const delta = extractGoogleDelta(JSON.parse(payload));
      if (delta) onChunk(delta);
    }
  );
}

async function callGoogleStream(
  prompt: string,
  apiKey: string,
  onChunk: (text: string) => void
): Promise<void> {
  return withModelFallback(GOOGLE_MODELS, (model) =>
    callGoogleModelStream(prompt, apiKey, model, onChunk)
  );
}

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      let body: { prompt: string; apiKey?: string; provider?: Provider };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return Response.json(
          { error: 'Invalid request body' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const { prompt, apiKey, provider = 'anthropic' } = body;
      const resolvedKey = resolveApiKey(provider, apiKey);

      if (!resolvedKey) {
        return Response.json(
          { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!prompt) {
        return Response.json(
          { error: 'Prompt is required' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (event: Parameters<typeof formatSSE>[0]) =>
            controller.enqueue(encoder.encode(formatSSE(event)));

          let raw = '';
          const onChunk = (text: string) => {
            raw += text;
            send({ type: 'delta', text });
          };

          try {
            if (provider === 'google') {
              await callGoogleStream(prompt, resolvedKey, onChunk);
            } else {
              await callAnthropicStream(prompt, resolvedKey, onChunk);
            }

            const code = ensureRenderCall(stripCodeFences(raw));
            send({ type: 'done', code });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';

            const friendly = message.includes('503')
              ? 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.'
              : message.includes('429')
                ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
                : message;

            send({ type: 'error', error: friendly });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);
