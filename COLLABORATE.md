# 같이 작업하는 법

사이트: https://ghdtjr1101.github.io/shortdrama-dashboard/

## 내용 수정 = 대시보드에서 바로

1. 오른쪽 위 **구글 로그인** (ghdtjr1101@gmail.com, coalrla@gmail.com 두 계정만 수정 가능)
2. 각 탭의 **+ 버튼**으로 추가, 행·카드를 **누르면** 수정·삭제
3. 저장하면 서로의 화면에 **바로** 반영 (새로고침 필요 없음)

데이터는 Firebase(구글 클라우드 DB)에 저장돼요. 컴퓨터를 꺼도 상관없어요.
수정 권한 계정을 바꾸려면 `assets/firebase-config.js`의 `EDITORS`와 Firebase 콘솔의 Firestore 규칙을 같이 고쳐야 해요.

## 사이트 디자인·기능 수정 = GitHub 코드 (Claude Code)

1. GitHub 초대 수락: https://github.com/ghdtjr1101/shortdrama-dashboard/invitations
2. Claude Code에 부탁:
   > "github.com/ghdtjr1101/shortdrama-dashboard 저장소를 clone 해주고 COLLABORATE.md 읽어줘."
3. 작업 규칙
   - 시작 전 "최신으로 받아와" (`git pull`)
   - 끝나면 "커밋하고 푸시해줘" (`git push`) → 1~2분 뒤 사이트 반영
   - 큰 작업은 서로 말하고 시작하기 (같은 파일 동시 수정 시 충돌)

## 화면 구조

- **A · 단편문학** (친구): 작품 = 작업실. 원작 정리 · 편(1~3) · 캐릭터 · 배경 · 성과
- **B · 조선 POV** (나): 연재 하나에 회차(EP.01, 02…)가 계속 쌓임. 인물 · 배경·고증 · 포맷 규칙은 연재 공통
- 편/회차 작업실: 진행(체크리스트·드라이브 링크) · 대본 · 컷 · SNS 성과
- 영상·사진 파일은 구글 드라이브 공유 폴더에 두고, 대시보드엔 링크만

Firestore 컬렉션: `projects`(작품/연재), `episodes`(편/회차, 컷·체크리스트·성과 포함), `characters`, `locations`, `ideas`, `references`, `goals`, `meta/main`

## 코드 구조

- `index.html`, `assets/` : 사이트 코드 (GitHub Pages가 호스팅)
- `assets/firebase-config.js` : Firebase 연결 정보 + 수정 가능 계정
- `data/db.json` : 예전 데이터 사본 (Firebase가 안 될 때 보기 전용으로 사용)
