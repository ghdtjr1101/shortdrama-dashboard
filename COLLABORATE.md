# 같이 작업하는 법

사이트: https://ghdtjr1101.github.io/shortdrama-dashboard/

## 어디서 뭘 고치나

| 고치고 싶은 것 | 어디서 |
|---|---|
| 아이디어, 제작 단계, 성과 숫자, 레퍼런스, 이번 주 목표 | **노션 「숏드라마 스튜디오」** (사이트에 하루 두 번 자동 반영) |
| 사이트 디자인, 새 기능, 탭 추가 | **GitHub 저장소** 코드 (Claude Code로 수정) |

> `data/db.json`은 노션에서 자동으로 덮어써요. 데이터는 꼭 노션에서 고치세요.

## 처음 한 번 세팅 (Claude Code 쓰는 사람)

1. 메일로 온 GitHub 초대 수락: https://github.com/ghdtjr1101/shortdrama-dashboard/invitations
2. 노션 초대 메일 수락
3. Claude Code에서 이렇게 부탁하면 끝:
   > "github.com/ghdtjr1101/shortdrama-dashboard 저장소를 내 컴퓨터에 clone 해줘. 앞으로 이 폴더에서 작업할게. COLLABORATE.md 읽어줘."

## 작업할 때마다 규칙

1. 시작 전에 **최신 버전 받기** (`git pull`) — Claude에게 "최신으로 받아와"
2. 수정
3. 끝나면 **올리기** (`git push`) — Claude에게 "커밋하고 푸시해줘"
4. 1~2분 뒤 사이트에 반영됨

동시에 같은 파일을 고치면 충돌이 날 수 있어요. 큰 작업은 서로 말하고 시작하기.

## 자동으로 도는 것 (아무도 컴퓨터 안 켜도 됨)

- 사이트: GitHub Pages가 호스팅
- 노션 → 사이트 동기화: GitHub Actions가 매일 06:00 / 18:00 (한국시간) 실행
- 즉시 반영: 저장소 → Actions → 「노션 동기화」 → Run workflow
