---
name: create-pr
description: |
  현재 브랜치의 커밋된 변경사항으로 GitHub Pull Request를 생성한다. git diff/log와 기존 PR 이력을 분석해 제목과 본문 초안을 작성하고, 저장소가 한국 프로젝트인지 해외 오픈소스 프로젝트인지 자동 감지해 한국어(references/pr_template_ko.md) 또는 영문(references/pr_template_en.md) 템플릿을 고른다 — 저장소에 자체 .github/PULL_REQUEST_TEMPLATE.md가 있으면 그것을 최우선으로 따른다. 초안을 사용자에게 보여주고 승인받은 뒤에만 fork 서브에이전트가 브랜치 push와 `gh pr create`를 실행한다.
  "PR 만들어줘", "PR 열어줘", "PR 올려줘", "pull request 생성해줘", "이 브랜치 리뷰 받게 올려줘", "create a PR", "open a pull request", "PR로 올려줘" 같은 요청에 반드시 사용한다. 사용자가 "PR"이라는 단어를 쓰지 않아도 커밋된 변경사항을 리뷰/머지를 위해 GitHub에 올리려는 의도가 보이면(예: "이거 팀원한테 리뷰 받아야 하는데", "머지 요청 넣어줘") 이 스킬을 사용한다. 단순히 "커밋해줘"라는 요청에는 사용하지 않는다 — 그건 별도의 commit 스킬의 영역이다.
---

# create-pr: PR 초안 작성 → 승인 → fork 실행

PR 생성은 GitHub에 공개적으로 남고 되돌리기 번거로운 행위다. 그래서 이 스킬은 "판단"과 "실행"을 분리한다 — 제목/본문/브랜치를 정하는 판단은 항상 메인 스레드에서 사용자 승인을 받아 끝내고, 승인된 내용을 그대로 실행하는 기계적인 작업(push, `gh pr create`)만 fork 서브에이전트에 맡긴다. fork는 창작하지 않는다, 승인된 것을 실행할 뿐이다. fork를 쓰는 이유는 git/gh 명령의 장황한 출력으로 메인 대화가 오염되는 것을 막기 위함이지, 승인 절차를 생략하기 위함이 아니다.

## Step 1: 브랜치/변경사항 상태 확인

- `git status`로 커밋되지 않은 변경이 남아있는지 확인한다. 남아있다면 먼저 커밋부터 하라고 안내하고 중단한다(필요하면 `commit` 스킬을 쓰라고 제안한다) — 이 스킬은 "이미 커밋된 것을 PR로 올리는" 역할만 한다.
- base 브랜치를 확인한다: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`을 우선 시도하고, 실패하면 `git symbolic-ref refs/remotes/origin/HEAD`를 시도하고, 그래도 안 되면 `main`으로 가정한다.
- 현재 브랜치가 base 브랜치와 같으면 PR을 열 대상이 없다. 커밋 내용을 근거로 브랜치 이름을 제안하고, 사용자 확인 후 `git switch -c <branch>`로 새 브랜치를 만든다. 이름을 마음대로 정해서 바로 만들지 말고 반드시 확인받는다.
- `git log <base>..HEAD --oneline`과 `git diff <base>...HEAD --stat`으로 이번 PR에 실릴 커밋과 변경 규모를 파악한다. 커밋이 하나도 없으면 PR을 만들 이유가 없으니 그 사실을 안내하고 중단한다.

## Step 2: PR 템플릿 언어 판별

우선순위대로 확인한다. 앞 단계에서 이미 답이 나오면 뒤 단계는 건너뛴다.

1. **저장소 자체 템플릿이 있는지 먼저 확인한다.** `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `docs/pull_request_template.md`, `PULL_REQUEST_TEMPLATE.md`를 Glob으로 찾는다. 있으면 **그 파일을 그대로 사용한다** — 이 스킬이 들고 있는 `references/` 템플릿보다 저장소 자신의 컨벤션이 항상 우선이다.
2. 없으면 신호를 모은다: README.md의 주 언어, `git log -20 --format='%s %b'`의 언어, `gh pr list --state all --limit 5`로 가져온 기존 PR 제목/본문의 언어. 하나의 언어로 뚜렷하게 모이면(예: 셋 다 한국어, 혹은 셋 다 영어) 그 언어를 쓴다.
3. 신호가 없거나 상충하면(예: README는 영어인데 커밋은 한국어) 추측하지 말고 사용자에게 직접 물어본다 — "이 PR은 영문 템플릿과 한국어 템플릿 중 어느 쪽으로 작성할까요?"
4. 최종적으로 `references/pr_template_en.md` 또는 `references/pr_template_ko.md`를 읽어 구조를 따른다.

## Step 3: 초안 작성

- 고른 템플릿의 섹션 구조를 그대로 따르되, 내용은 Step 1에서 파악한 커밋 로그와 diff를 근거로 채운다. 커밋 메시지를 그대로 복사하지 말고 "왜"가 드러나게 요약한다.
- PR 제목은 저장소의 기존 커밋/PR 제목 컨벤션(Conventional Commits 등)이 보이면 그것을 따른다. 없으면 변경의 핵심을 한 줄로 요약한다.
- 테스트 방법 섹션은 실제로 실행하거나 확인한 것만 적는다. 하지 않은 검증을 했다고 쓰지 않는다.

## Step 4: 사용자 승인 (게이트)

다음을 있는 그대로 보여주고 명시적인 승인을 받는다:

- PR 제목 전문
- PR 본문 전문
- head 브랜치 → base 브랜치
- (새 브랜치를 만든 경우) 브랜치 이름

수정을 요청하면 반영해서 다시 보여준다. **승인 전에는 push든 `gh pr create`든 어떤 명령도 실행하지 않는다.**

## Step 5: fork로 실행

승인을 받으면 `Agent` 도구를 `subagent_type: "fork"`로 호출해 다음을 지시한다. fork는 이미 승인된 내용을 정확히 그대로 실행해야 하므로, 프롬프트에 제목/본문 전문과 브랜치 정보를 그대로 포함시킨다(fork가 다시 문구를 다듬거나 바꾸지 않도록):

```
다음을 순서대로 실행해줘. 이미 사용자 승인이 끝난 내용이니 문구를 바꾸지 말고 그대로 실행해:
1. 현재 브랜치(<head-branch>)를 원격에 push (`git push -u origin <head-branch>`, 이미 push된 상태면 그냥 `git push`)
2. 아래 내용 그대로 `gh pr create --title "<제목>" --base <base-branch> --body "$(cat <<'EOF'
<승인된 본문 전문>
EOF
)"` 실행
3. 생성된 PR URL만 보고해줘
```

## Step 6: 결과 보고

fork가 반환한 PR URL을 사용자에게 전달한다. fork 실행 중 오류(예: push 거부, `gh` 인증 만료)가 나면 원인과 함께 보고하고, 임의로 강제 push나 다른 브랜치로 우회하지 않는다.

## 필요 조건

- `gh` CLI가 설치되어 있고 `gh auth status`로 로그인된 상태여야 한다. 로그인되어 있지 않으면 사용자에게 안내하고 중단한다.
- 현재 디렉토리가 git 저장소이고 `origin` 리모트가 GitHub를 가리켜야 한다.
