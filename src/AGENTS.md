# src/AGENTS.md

## Module Context

Vite + React 프론트엔드. UI 컴포넌트(`components/`), 상태/네트워킹을 담당하는 커스텀 훅(`hooks/useComponentGenerator.ts`), 공용 타입(`types/index.ts`)으로 구성된다. 백엔드와는 `fetch('/api/generate')`, `fetch('/api/config')`로만 통신하며, `vite.config.ts`의 proxy 설정(9-14행)이 이를 `server/`(3002 포트)로 전달한다.

## Tech Stack & Constraints

- 전역 CSS(`App.css`, `index.css`)만 사용 — CSS 모듈, styled-components, Tailwind 미도입.
- 미리보기 렌더링은 `react-live`의 `LiveProvider`/`LivePreview`에 위임한다(`components/LivePreview.tsx`). 자체 iframe이나 별도 렌더러를 만들지 마라.
- 코드 복사는 `navigator.clipboard.writeText`(`components/CodeView.tsx:11`) — 보안 컨텍스트(HTTPS/localhost) 밖에서는 실패한다.

## Testing Strategy

- `bun run test` (vitest + `@testing-library/react` + jsdom, `src/test/setup.ts`에서 각 테스트 후 `cleanup()` 실행).
- 아래 Test Boundary 참고: 외부 side effect(브라우저 API, 서드파티 렌더러)가 없는 순수 폼/로직 컴포넌트만 테스트 대상이었다. 새 컴포넌트도 이 경계를 따르되, 억지로 못 채운 커버리지를 위해 `LiveProvider`나 `clipboard`를 mocking하는 테스트를 무리해서 추가하지 마라.

## Local Golden Rules

- **Test Boundary.** `components/PromptInput.tsx`만 테스트(`PromptInput.test.tsx`)가 있다 — 외부 API 호출이나 브라우저 API 없이 폼 상태만 다루는 순수 컴포넌트이기 때문이다. `CodeView.tsx`(`navigator.clipboard` 의존), `LivePreview.tsx`(`react-live` 외부 렌더러 의존), `ComponentCard.tsx`(둘을 조합)는 테스트가 없다. 새 컴포넌트를 추가할 때 이 경계 밖(외부 API/서드파티 렌더러 직접 사용)이라면 기존 컨벤션처럼 테스트를 생략해도 되지만, 순수 로직이라면 `PromptInput.test.tsx` 패턴을 따라 테스트를 작성하라.
- **미리보기 리마운트는 `key` prop으로만 처리한다.** `ComponentCard.tsx`의 `previewKey` state(17행)를 `setPreviewKey((k) => k + 1)`(33행)로 증가시켜 `<LivePreview key={previewKey} ...>`(70행)를 강제 리마운트한다. `react-live`의 `LiveProvider`에는 imperative reset API가 없으므로, "새로고침" 기능을 ref나 effect 기반으로 다시 구현하려 하지 마라 — key 변경이 유일하게 검증된 방식이다.
