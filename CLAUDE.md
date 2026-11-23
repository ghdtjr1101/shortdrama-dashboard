# Studio_Facet 대시보드 — Claude 작업 메모

인스타·틱톡·유튜브 숏드라마 채널 Studio_Facet("과거 속으로") 제작 대시보드.
사이트: https://ghdtjr1101.github.io/shortdrama-dashboard/ (GitHub Pages, main 브랜치가 바로 배포됨)

## 구조

- 바닐라 JS ES module, 해시 라우팅, 한국어 UI, 밝은 테마만. 빌드 도구 없음.
- `assets/app.js` 화면·라우팅·편집 모달·Firestore 동기화·드라이브 연동 / `assets/drive.js` Drive API / `assets/style.css` / `index.html`
- 데이터: Firebase 프로젝트 `studio-facet`(무료 Spark 요금제) Firestore, onSnapshot 실시간 동기화.
  규칙: 누구나 읽기, 쓰기는 `assets/firebase-config.js`의 `EDITORS` 두 계정만. 새 컬렉션은 규칙 수정 없이 추가 가능.
- 컬렉션: `projects`(A 작품/B 연재), `episodes`, `characters`, `locations`, `files`(드라이브 캐시), `ideas`, `references`, `goals`, `meta/main`(driveRoot, youtubeKey)
- 트랙 A 단편문학(친구 담당, 작품당 1~3편) / 트랙 B 조선 POV(사용자 담당, 회차 연재)
- 자세한 화면 구조는 `COLLABORATE.md`

## 작업 규칙

1. 시작할 때 `git pull` (원격에 새 커밋이 있으면 **rebase 말고 merge**. Windows에서 rebase는 "Filename too long" 오류가 남)
2. 고친 뒤엔 미리보기로 확인 (`.claude/launch.json`)
   - `dashboard`(8791): 실제 Firebase. 로그인 안 하면 보기만 가능.
   - `dashboard-mock`(8792): 먼저 `python tools/mock.py` 실행 → `.mock/`에 가짜 데이터 사이트 생성. 수정 권한이 켜져 있고 저장·삭제는 메모리에서만 처리됨.
3. 커밋·push는 사용자가 요청할 때만. push 후 1~2분 뒤 사이트가 HTTP 200인지, 콘솔 에러가 없는지 확인.
   - 배포 상태: `gh api repos/ghdtjr1101/shortdrama-dashboard/pages/builds/latest --jq '.status + " " + .commit'`
4. 지킬 것
   - 비밀번호·토큰은 Claude가 직접 입력하지 않음 (사용자가 입력)
   - Firebase는 무료 Spark 요금제 유지, 결제 정보 등록 금지
   - 약관 동의·계정 설정 변경은 사용자가 직접
   - Notion 안 씀
   - 외부 API는 무료 한도 안에서만 (예: 레퍼런스의 유튜브 조회수는 화면 표시만, 50개당 1회 호출, 30분 캐시)

## 작업용 PC에서 쓰는 경우

이 저장소를 개인 PC가 아닌 작업용 PC(회사 계정 Claude)에서 열 수도 있음. 그 PC의 GitHub 연결은
**이 저장소 전용 fine-grained 토큰 `shortdrama-work-pc`** 하나로만 함 (사용자가 직접 만들고 `gh auth login`으로 입력).
push는 `gh auth setup-git`을 한 번 해 두면 `git push origin main`으로 됨.

### "여기 그만두니까 정리해줘" 요청을 받으면

사용자가 채팅으로 이런 요청을 했을 때만 아래 순서로 진행. 각 단계 결과를 짧게 알리고, 표시된 곳에서는 사용자 확인을 받음.

0. **이 PC가 작업용 PC가 맞는지 사용자에게 확인.** 개인 PC라면 중단.
1. **안 올린 작업 확인**: `git status`, `git fetch && git log origin/main..HEAD`. 남은 변경·커밋이 있으면 push할지 버릴지 물어봄.
2. **GitHub 토큰 폐기 (브라우저)**: Aside 브라우저 도구를 우선 사용 (없으면 Claude in Chrome → 내장 브라우저 순).
   - https://github.com/settings/personal-access-tokens 열기 → `shortdrama-work-pc` 토큰 찾기
   - 토큰 이름을 사용자에게 보여 주고 확인받은 뒤 Delete/Revoke 클릭
   - GitHub 로그인·비밀번호·2단계 인증 화면이 나오면 사용자가 직접 입력하도록 요청 (Claude는 입력하지 않음)
   - 목록에 없으면 `gh auth status`로 어떤 방식으로 로그인했는지 확인.
     OAuth(브라우저 로그인)였다면 Applications 탭의 "GitHub CLI"를 해지하면 **개인 PC의 gh 로그인까지 같이 끊긴다**는 점을 알리고, 해지 여부는 사용자가 정하게 함.
3. **gh 로그아웃**: `gh auth logout -h github.com -u ghdtjr1101`
4. **Windows 자격 증명 삭제**: `cmdkey /list`에서 github 관련 항목(`git:https://github.com` 등)을 찾아 `cmdkey /delete:<대상>`
5. **git 전역 설정**: `git config --global --list`에서 이 작업 때문에 넣은 user.name/user.email 등이 있으면 사용자에게 확인 후 `--unset`
6. **로컬 파일 삭제 (마지막, 사용자 확인 후)**: 이 저장소 폴더, `~/.claude/projects/` 안의 이 저장소 관련 폴더(대화 메모리)
7. **사용자에게 남길 안내**: Claude 채팅 기록은 원하면 앱에서 직접 삭제. 대시보드·코드·데이터는 GitHub와 Firebase에 그대로 남아 있어 개인 PC에서 계속 작업 가능.
