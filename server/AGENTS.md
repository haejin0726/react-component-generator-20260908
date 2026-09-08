# server/AGENTS.md

## Module Context

Bun.serve 기반 단일 파일 API 프록시(`index.ts`). 프론트엔드 대신 Anthropic/Google API 키를 보관하고, AI 응답을 react-live가 실행 가능한 코드로 정규화(`generator.ts`)해 반환한다.

## Tech Stack & Constraints

- Express/Hono 등 웹 프레임워크 없음 — `Bun.serve`의 `fetch(req)` 핸들러에서 `url.pathname` 문자열 비교로 직접 라우팅한다(`index.ts` 140-219행). 새 엔드포인트 추가 시 이 패턴을 따른다.
- 외부 호출은 `fetch`만 사용 (axios 등 미도입).

## Implementation Patterns

- 새 provider를 추가하려면 세 곳을 함께 수정해야 한다: `ENV_KEYS`(59-62행), `callXxx` 함수, 그리고 프론트엔드의 `PROVIDER_CONFIG`(`src/App.tsx` 8-11행). 하나만 고치면 UI와 서버 상태가 어긋난다.
- 부수효과 없는 순수 변환 로직은 `index.ts`에 넣지 말고 `generator.ts`/`fallback.ts`처럼 별도 파일로 분리하라 (아래 Test Boundary 참고).

## Testing Strategy

- `bun run test` (vitest, `server/**/*.test.ts` 포함).
- `generator.test.ts`, `fallback.test.ts`가 존재 — 순수 함수(`stripCodeFences`, `ensureRenderCall`, `withModelFallback`)만 테스트한다.
- `index.ts`(Bun.serve 핸들러, HTTP 파싱, 상태 코드 매핑)는 테스트가 없다. 이 파일에 로직을 직접 추가하면 테스트 사각지대가 늘어난다 — 테스트 가능한 로직은 새 순수 함수로 뽑아 테스트를 함께 작성하라.

## Local Golden Rules

- **비대칭(Asymmetry) — 임의로 통일하지 마라.** `callGoogle`(134-136행)은 `withModelFallback`으로 `GOOGLE_MODELS` 여러 모델을 순차 시도하지만, `callAnthropic`(68-96행)은 단일 모델만 호출하고 폴백이 없다. 이는 의도된 비대칭이므로("우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다" — 4행 주석), Anthropic 쪽에 폴백을 추가하거나 Google 쪽 폴백을 제거하는 리팩터링은 사용자 확인 없이 하지 마라.
- **이중 방어(Double Defense) — 코드펜스 제거.** `SYSTEM_PROMPT`가 "Respond with ONLY the code block — no explanations, no markdown fences"(16행)라고 지시하고, 별도로 `stripCodeFences`(`generator.ts` 5-10행)가 응답에서 ``` 펜스를 정규식으로 제거한다. 프롬프트 지시만 믿고 `stripCodeFences` 호출을 제거하지 마라 — AI가 지시를 어기고 펜스를 붙여 응답하는 경우의 백업 장치다.
- **에러 문자열 매칭에 의존한다.** `index.ts`(194-206행)는 에러 메시지에 `"503"`/`"429"` 문자열이 포함되는지로 분기한다(`callAnthropic`/`callGoogleModel`이 `throw new Error(\`... ${response.status}\`)` 형태로 던지기 때문, 85행/112행). 에러 메시지 포맷을 바꾸면 이 분기가 조용히 깨진다.
