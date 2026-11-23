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
3. 커밋·push는 사용자가 요청할 때만 (방법은 아래 "GitHub push"). push 후 1~2분 뒤 사이트가 HTTP 200인지, 콘솔 에러가 없는지 확인.
   - 배포 상태: `gh api repos/ghdtjr1101/shortdrama-dashboard/pages/builds/latest --jq '.status + " " + .commit'`
4. 지킬 것
   - 비밀번호·토큰은 Claude가 직접 입력하지 않음 (사용자가 입력)
   - Firebase는 무료 Spark 요금제 유지, 결제 정보 등록 금지
   - 약관 동의·계정 설정 변경은 사용자가 직접
   - Notion 안 씀
   - 외부 API는 무료 한도 안에서만 (예: 레퍼런스의 유튜브 조회수는 화면 표시만, 50개당 1회 호출, 30분 캐시)

## GitHub push

Claude 계정(개인/회사)과 상관없이 GitHub는 이 PC의 gh에 로그인된 **ghdtjr1101** 계정으로 push함.
gh에 다른 계정도 로그인돼 있을 수 있으니 계정을 지정해서 push:

```bash
TOKEN=$(gh auth token -u ghdtjr1101) && AUTH=$(printf 'x-access-token:%s' "$TOKEN" | base64 -w0) && git -c credential.helper= -c "http.extraheader=AUTHORIZATION: basic $AUTH" push origin main
```

Claude 계정만 바꿔 쓰는 거라 계정을 바꿀 때 PC·GitHub 쪽은 정리할 것이 없음.
