"""가짜 데이터 미리보기 사이트를 .mock/ 에 만든다.

- Firebase 연결 없이 data/db.json 으로 화면을 띄움
- 수정 권한을 켜고, 저장·삭제는 메모리에서만 처리 (실제 DB에 안 씀)
- 레퍼런스 예시 몇 개를 넣어 둠

사용: python tools/mock.py   →   python -m http.server 8792 --directory .mock
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".mock"

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
shutil.copy(ROOT / "index.html", OUT / "index.html")
shutil.copytree(ROOT / "assets", OUT / "assets")
shutil.copytree(ROOT / "data", OUT / "data")

(OUT / "assets" / "firebase-config.js").write_text(
    "export const firebaseConfig = null;\nexport const EDITORS = [];\n", encoding="utf-8")

app = (OUT / "assets" / "app.js").read_text(encoding="utf-8")
PATCHES = [
    ('const canEdit = () => !!(live && user && EDITORS.includes((user.email || "").toLowerCase()));',
     "const canEdit = () => true; // MOCK"),
    ("async function saveDoc(col, docId, data) {\n",
     "async function saveDoc(col, docId, data) {\n"
     "  if (!live) { const arr = DB[col]; let it = docId && arr.find((x) => x._id === docId);"
     " if (!it) { it = { _id: docId || 'm' + Date.now() }; arr.unshift(it); }"
     " Object.assign(it, data); console.log('MOCK save', col, it._id, JSON.stringify(data)); rerender(); return it._id; }\n"),
    ("async function deleteItem(key, col, item) {\n",
     "async function deleteItem(key, col, item) {\n"
     "  if (!live) { if (!confirm('삭제할까요?')) return; DB[col] = DB[col].filter((x) => x._id !== item._id);"
     " console.log('MOCK delete', item._id); modal.close(); rerender(); return; }\n"),
]
for old, new in PATCHES:
    if old not in app:
        raise SystemExit(f"app.js 구조가 바뀌어 mock 패치를 못 했어요. tools/mock.py 를 고쳐 주세요:\n{old[:80]}")
    app = app.replace(old, new, 1)
(OUT / "assets" / "app.js").write_text(app, encoding="utf-8")

db_path = OUT / "data" / "db.json"
db = json.loads(db_path.read_text(encoding="utf-8"))
if not db.get("references"):
    db["references"] = [
        {"_id": "r1", "url": "https://www.youtube.com/shorts/dQw4w9WgXcQ", "track": "B", "tags": ["훅"], "why": "첫 3초 훅"},
        {"_id": "r2", "url": "https://www.tiktok.com/@scout2015/video/6718335390845095173", "tags": ["편집"], "memo": "컷 전환 타이밍"},
        {"_id": "r3", "url": "https://www.instagram.com/p/fA9uwTtkSN/", "track": "A"},
    ]
db_path.write_text(json.dumps(db, ensure_ascii=False), encoding="utf-8")
print(f"mock 준비 완료: {OUT}")
