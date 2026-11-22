"""노션 → data/db.json 동기화.

환경 변수 NOTION_TOKEN (노션 내부 연동 토큰)이 필요하다.
노션에서 「숏드라마 스튜디오」 페이지에 그 연동을 연결해 두어야 한다.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME_PAGE = "42072b40b00d81c8a845e6cd08061c18"
DB = {
    "ideas": "42072b40b00d815e834ff92be65f1edf",
    "pipeline": "42072b40b00d81ca964ef2650760d296",
    "posts": "42072b40b00d815183fcf9fdc795f3a0",
    "references": "42072b40b00d818298e6ffeecd436b20",
}
OUT = Path(__file__).resolve().parent.parent / "data" / "db.json"
TOKEN = os.environ.get("NOTION_TOKEN")
API = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def query_all(db_id):
    rows, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        res = call("POST", f"/databases/{db_id}/query", body)
        rows += res["results"]
        if not res.get("has_more"):
            return rows
        cursor = res["next_cursor"]


def val(props, name):
    p = props.get(name)
    if not p:
        return None
    t = p["type"]
    v = p[t]
    if t in ("title", "rich_text"):
        return "".join(x["plain_text"] for x in v).strip()
    if t == "select":
        return v["name"] if v else None
    if t == "multi_select":
        return [x["name"] for x in v]
    if t == "date":
        return v["start"][:10] if v else None
    if t in ("number", "url", "checkbox"):
        return v
    return None


def num(x):
    return int(x) if isinstance(x, (int, float)) else 0


def series_key(s):
    return (s or "A")[0]


def sort_key(page):
    return page.get("created_time", "")


def build_ideas():
    out = []
    for pg in sorted(query_all(DB["ideas"]), key=sort_key):
        p = pg["properties"]
        out.append({
            "id": val(p, "ID") or "",
            "series": series_key(val(p, "시리즈")),
            "title": val(p, "제목") or "(제목 없음)",
            "source": val(p, "원작/출처") or "",
            "authorDeath": int(val(p, "작가 사망연도")) if val(p, "작가 사망연도") else None,
            "copyright": val(p, "저작권") or "확인 필요",
            "hook": val(p, "훅") or "",
            "episodes": val(p, "분량") or "",
            "cast": val(p, "인원") or "",
            "difficulty": num(val(p, "난이도")),
            "status": val(p, "상태") or "아이디어",
            "notes": val(p, "메모") or "",
        })
    out.sort(key=lambda i: (i["id"] == "", i["id"]))
    return out


def build_pipeline():
    out = []
    for pg in sorted(query_all(DB["pipeline"]), key=sort_key):
        p = pg["properties"]
        out.append({
            "id": pg["id"][:8],
            "title": val(p, "제목") or "(제목 없음)",
            "owner": val(p, "담당") or "-",
            "stage": val(p, "단계") or "아이디어",
            "due": val(p, "마감"),
            "notes": val(p, "메모") or "",
        })
    return out


PLATS = {"instagram": "인스타", "tiktok": "틱톡", "youtube": "유튜브"}
METRICS = {"views": "조회", "likes": "좋아요", "comments": "댓글", "shares": "공유", "saves": "저장"}


def build_posts():
    out = []
    for pg in query_all(DB["posts"]):
        p = pg["properties"]
        out.append({
            "id": pg["id"][:8],
            "title": val(p, "영상") or "(제목 없음)",
            "series": series_key(val(p, "시리즈")),
            "date": val(p, "게시일"),
            "links": {k: val(p, f"{n} 링크") for k, n in PLATS.items()},
            "stats": {k: {m: num(val(p, f"{n} {mn}")) for m, mn in METRICS.items()} for k, n in PLATS.items()},
        })
    out.sort(key=lambda x: x["date"] or "", reverse=True)
    return out


def build_refs():
    out = []
    for pg in sorted(query_all(DB["references"]), key=sort_key, reverse=True):
        p = pg["properties"]
        if not val(p, "링크"):
            continue
        out.append({
            "account": val(p, "계정") or "",
            "url": val(p, "링크"),
            "platform": val(p, "플랫폼"),
            "title": val(p, "영상 제목") or "",
            "why": val(p, "왜 참고?") or "",
            "tags": val(p, "태그") or [],
            "thumbnail": val(p, "썸네일"),
        })
    return out


def build_goals():
    res = call("GET", f"/blocks/{HOME_PAGE}/children?page_size=100")
    goals = []
    for b in res["results"]:
        if b["type"] == "to_do":
            td = b["to_do"]
            text = "".join(x["plain_text"] for x in td["rich_text"]).strip()
            if text:
                goals.append({"text": text, "done": td["checked"]})
    return goals


def main():
    if not TOKEN:
        sys.exit("NOTION_TOKEN 환경 변수가 없습니다.")
    db = json.loads(OUT.read_text(encoding="utf-8"))
    new = {
        "ideas": build_ideas(),
        "pipeline": build_pipeline(),
        "posts": build_posts(),
        "references": build_refs(),
    }
    goals = build_goals()
    changed = any(db.get(k) != v for k, v in new.items()) or (goals and goals != db["meta"].get("weekGoals"))
    if not changed:
        print("변경 없음")
        return
    db.update(new)
    if goals:
        db["meta"]["weekGoals"] = goals
    kst = datetime.now(timezone(timedelta(hours=9)))
    db["meta"]["updatedAt"] = kst.strftime("%Y-%m-%d %H:%M")
    db["meta"]["source"] = "노션 자동 동기화"
    OUT.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("업데이트 완료:", {k: len(v) for k, v in new.items()}, "목표", len(goals))


if __name__ == "__main__":
    main()
