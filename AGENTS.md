# AGENTS.md

## Operational Commands

- 패키지 매니저: `bun` 고정 (npm/yarn/pnpm 금지). `bun.lock`만 커밋 대상.
- `bun install` — 의존성 설치
- `bun run dev` — API 서버(3002) + Vite(5173) 동시 실행 (`concurrently`)
- `bun run server` — API 서버만 실행 (`bun --watch run server/index.ts`)
- `bun run test` — vitest 전체 실행 (`src/**/*.test.{ts,tsx}`, `server/**/*.test.ts`)
- `bun run lint` — eslint
- `bun run build` — `tsc -b && vite build`

## Golden Rules

### Immutable

- **API 키를 클라이언트에 노출하지 않는다.** `server/index.ts`의 `GET /api/config`(147-157행)는 키 보유 여부만 boolean(`envKeys.anthropic`, `envKeys.google`)으로 반환한다. 실제 키 값을 반환하는 응답이나 로그를 추가하지 마라.
- **AI가 생성한 코드에 `import` 구문이나 TypeScript 문법을 넣지 마라.** `server/index.ts`의 `SYSTEM_PROMPT`(7-49행)가 명시적으로 금지하고 있다 — react-live 실행 스코프에는 모듈 시스템이 없고 React는 전역으로만 주입된다.

### Do's & Don'ts

- **생성된 컴포넌트 코드는 반드시 `render(<Component />)` 호출로 끝나야 한다.** `src/components/LivePreview.tsx:14`가 `<LiveProvider code={code} noInline>`로 렌더링하는데, `noInline` 모드는 `render()` 호출 없이는 아무것도 그리지 않는다. `server/generator.ts`의 `ensureRenderCall`(16-24행)이 이 호출이 빠졌을 때 자동 주입하는 안전장치이므로, 이 함수나 `SYSTEM_PROMPT`의 관련 지시(13행)를 건드릴 때는 반드시 함께 검토하라.
- API 키 처리 우선순위는 "클라이언트 입력값 > 서버 `.env`"다 (`server/index.ts`의 `resolveApiKey`, 64-66행). 이 우선순위를 뒤집지 마라 — 사용자가 의도적으로 다른 키를 입력해 서버 키를 덮어쓰는 시나리오(`src/App.tsx` 104-107행 UI 문구 참고)를 깨뜨린다.

## Project Context

프롬프트를 입력하면 AI(Anthropic Claude 또는 Google Gemini)가 React 컴포넌트를 생성하고, react-live로 즉시 미리보기와 코드를 보여주는 도구다.

**Tech Stack**: React 19, TypeScript, Vite, Bun, react-live, Vitest, ESLint.

## Standards & References

- 프로젝트 소개/실행 방법은 `README.md` 참고 (여기서 반복하지 않음).
- 커밋 메시지: Conventional Commits 스타일 + 한국어 설명 (예: `feat: React 컴포넌트 생성기 프로젝트 초기 설정`).
- **Maintenance Policy**: 코드와 이 문서의 Golden Rules 사이에 괴리가 발견되면(예: 근거로 든 파일/라인이 변경·삭제됨), 코드 변경과 함께 이 문서 업데이트를 제안하라.

## Nested AGENTS.md

- **[API 프록시 서버 수정](./server/AGENTS.md)** — `server/` 이하 파일(Bun.serve 핸들러, AI provider 연동, 폴백 로직) 작업 시 반드시 확인.
- **[프론트엔드 컴포넌트/훅 수정](./src/AGENTS.md)** — `src/` 이하 파일(React 컴포넌트, `useComponentGenerator` 훅) 작업 시 반드시 확인.
