import { firebaseConfig, EDITORS } from "./firebase-config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

/* ================= 상수 ================= */
const PLATFORMS = [
  { key: "instagram", name: "인스타", cls: "p-instagram" },
  { key: "tiktok", name: "틱톡", cls: "p-tiktok" },
  { key: "youtube", name: "유튜브", cls: "p-youtube" },
];
const METRICS = [
  { key: "views", name: "조회" },
  { key: "likes", name: "좋아요" },
  { key: "comments", name: "댓글" },
  { key: "shares", name: "공유" },
  { key: "saves", name: "저장" },
];

/* 두 트랙: A = 친구, B = 나 */
const TRACKS = {
  A: { key: "A", name: "단편문학 드라마", owner: "친구", unit: "편", desc: "저작권 만료 근현대 단편을 한 작품당 1~3편으로", projectWord: "작품", charWord: "캐릭터", locWord: "배경" },
  B: { key: "B", name: "조선 POV", owner: "나", unit: "화", desc: "조선 사람 한 명의 하루를 1인칭으로, 계속 연재", projectWord: "연재", charWord: "인물", locWord: "배경·고증" },
};

/* 회차별 제작 체크리스트 (그룹 = 단계) */
const STEPS = {
  A: [
    { g: "기획", items: [["read", "원작 정독·장면 발췌"], ["split", "이번 편 범위 정하기"], ["hook", "첫 3초 훅"]] },
    { g: "대본", items: [["draft", "대본 초고"], ["final", "대본 확정 (60~90초)"]] },
    { g: "준비", items: [["cast", "캐릭터·배역 확정"], ["loc", "촬영 장소 확정"], ["cuts", "컷 리스트 완성"], ["props", "의상·소품 준비"]] },
    { g: "촬영", items: [["shoot", "촬영"], ["backup", "원본 드라이브 업로드"]] },
    { g: "편집", items: [["rough", "가편집"], ["sub", "자막·효과음·음악"], ["thumb", "썸네일·커버"]] },
    { g: "게시", items: [["caption", "캡션·해시태그"], ["upload", "3개 플랫폼 업로드"], ["d3", "3일차 성과 기록"]] },
  ],
  B: [
    { g: "기획", items: [["research", "고증 자료 조사"], ["persona", "인물·하루 일과 설정"], ["hook", "첫 3초 훅"]] },
    { g: "대본", items: [["draft", "대본 초고"], ["final", "대본 확정 (45~75초)"]] },
    { g: "준비", items: [["check", "고증 체크 (말투·의상·소품)"], ["loc", "촬영 장소 확정"], ["cuts", "컷 리스트 완성"], ["props", "의상·소품 준비"]] },
    { g: "촬영", items: [["shoot", "촬영"], ["backup", "원본 드라이브 업로드"]] },
    { g: "편집", items: [["rough", "가편집"], ["sub", "자막·효과음·음악"], ["thumb", "썸네일·커버"]] },
    { g: "게시", items: [["caption", "캡션·해시태그"], ["upload", "3개 플랫폼 업로드"], ["d3", "3일차 성과 기록"]] },
  ],
};
const STAGE_NAMES = ["기획", "대본", "준비", "촬영", "편집", "게시", "완료"];

const CUT_FIELDS = [
  ["scene", "장면", 110], ["loc", "장소", 110], ["who", "인물", 90], ["action", "연기·액션", 220],
  ["line", "대사·내레이션·자막", 240], ["shot", "샷", 90], ["sec", "초", 50],
];

const STATUS_ORDER = ["제작중", "후보", "아이디어", "게시됨", "보류"];
const SERIES_OPTS = [["A", "A · 단편문학 드라마"], ["B", "B · 조선 POV"], ["C", "C · 문장 하나 드라마"]];

/* ================= 편집 폼 스키마 =================
   col: Firestore 컬렉션, fields: 배열 또는 (item) => 배열 */
const statFields = PLATFORMS.flatMap((p) => [
  { k: `posts.${p.key}`, n: `${p.name} 게시물 링크`, t: "url", group: p.name },
  ...METRICS.map((m) => ({ k: `stats.${p.key}.${m.key}`, n: m.name, t: "number", fifth: true })),
]);

const SCHEMAS = {
  ideas: {
    col: "ideas", label: "아이디어",
    fields: [
      { k: "title", n: "제목", t: "text", req: true },
      { k: "series", n: "시리즈", t: "select", opts: SERIES_OPTS, half: true },
      { k: "status", n: "상태", t: "select", opts: STATUS_ORDER, half: true },
      { k: "hook", n: "훅 (첫 3초)", t: "textarea" },
      { k: "source", n: "원작/출처", t: "text", half: true },
      { k: "authorDeath", n: "작가 사망연도", t: "number", half: true },
      { k: "copyright", n: "저작권", t: "select", opts: ["OK", "확인 필요", "불가"], half: true },
      { k: "difficulty", n: "난이도", t: "select", opts: [["1", "● 쉬움"], ["2", "●● 보통"], ["3", "●●● 어려움"], ["0", "-"]], num: true, half: true },
      { k: "episodes", n: "분량", t: "text", ph: "예: 2~3편", half: true },
      { k: "cast", n: "인원", t: "text", ph: "예: 2인", half: true },
      { k: "notes", n: "메모", t: "textarea" },
      { k: "id", n: "ID (비우면 자동)", t: "text", half: true },
    ],
    defaults: { series: "A", status: "아이디어", copyright: "OK", difficulty: 1 },
  },
  references: {
    col: "references", label: "레퍼런스",
    fields: [
      { k: "url", n: "영상/계정 링크", t: "url", req: true },
      { k: "account", n: "계정 이름", t: "text", ph: "@account", half: true },
      { k: "platform", n: "플랫폼", t: "select", opts: [["", "자동 인식"], ["instagram", "인스타"], ["tiktok", "틱톡"], ["youtube", "유튜브"], ["etc", "기타"]], half: true },
      { k: "track", n: "어느 트랙 참고용?", t: "select", opts: [["", "공통"], ["A", "A · 단편문학"], ["B", "B · 조선 POV"]], half: true },
      { k: "title", n: "영상 제목", t: "text", half: true },
      { k: "why", n: "왜 참고? (훔칠 포인트)", t: "textarea" },
      { k: "tags", n: "태그 (쉼표로 구분)", t: "tags", ph: "훅, 편집, 연기" },
      { k: "thumbnail", n: "썸네일 이미지 주소 (인스타만 필요)", t: "url" },
    ],
    defaults: {},
  },
  goals: {
    col: "goals", label: "이번 주 목표",
    fields: [
      { k: "text", n: "목표", t: "text", req: true },
      { k: "track", n: "트랙", t: "select", opts: [["", "공통"], ["A", "A · 친구"], ["B", "B · 나"]], half: true },
      { k: "done", n: "완료", t: "checkbox" },
    ],
    defaults: { done: false },
  },
  project: {
    col: "projects",
    label: (it) => (it.track === "B" ? "연재 정보" : "작품 정보"),
    fields: (it) => it.track === "B" ? [
      { k: "title", n: "연재 이름", t: "text", req: true },
      { k: "owner", n: "담당", t: "text", third: true },
      { k: "cadence", n: "연재 주기", t: "text", ph: "예: 주 1회", third: true },
      { k: "color", n: "포인트 색", t: "color", third: true },
      { k: "folder", n: "구글 드라이브 폴더", t: "url" },
      { k: "concept", n: "콘셉트", t: "textarea", rows: 3 },
      { k: "format", n: "포맷 규칙 (모든 회차 공통)", t: "textarea", rows: 6 },
      { k: "research", n: "고증 원칙·참고 자료", t: "textarea", rows: 5 },
      { k: "notes", n: "메모", t: "textarea" },
    ] : [
      { k: "title", n: "작품명", t: "text", req: true, half: true },
      { k: "author", n: "작가", t: "text", third: true },
      { k: "owner", n: "담당", t: "text", third: true },
      { k: "year", n: "발표연도", t: "number", third: true },
      { k: "authorDeath", n: "작가 사망연도", t: "number", third: true },
      { k: "plannedEps", n: "총 몇 편?", t: "select", opts: [["1", "1편"], ["2", "2편"], ["3", "3편"]], num: true, third: true },
      { k: "sourceUrl", n: "원작 전문 링크", t: "url", half: true },
      { k: "folder", n: "구글 드라이브 폴더", t: "url", half: true },
      { k: "cover", n: "표지 이미지 주소 (드라이브 링크 OK)", t: "url", half: true },
      { k: "color", n: "포인트 색", t: "color", half: true },
      { k: "summary", n: "원작 줄거리 정리", t: "textarea", rows: 6 },
      { k: "adaptation", n: "각색 방향·톤", t: "textarea", rows: 4 },
      { k: "plan", n: "회차 구성 계획", t: "textarea", rows: 4 },
      { k: "notes", n: "메모", t: "textarea" },
    ],
    defaults: {},
  },
  episode: {
    col: "episodes",
    label: (it) => (it.track === "B" ? "회차" : "편"),
    fields: (it) => {
      const chars = DB.characters.filter((c) => c.projectId === it.projectId);
      const base = [
        { k: "no", n: it.track === "B" ? "회차 번호" : "몇 편?", t: "number", third: true, req: true },
        { k: "title", n: "제목", t: "text", req: true, ph: "부제 (예: 감자 거절했을 뿐인데)", third2: true },
      ];
      if (it.track === "B") base.push({ k: "persona", n: "주인공 인물", t: "select", opts: [["", "(선택)"], ...chars.map((c) => [c._id, c.name])], half: true });
      base.push(
        { k: "owner", n: "담당", t: "text", third: true },
        { k: "due", n: "완성 목표일", t: "date", third: true },
        { k: "publishDate", n: "게시일", t: "date", third: true },
        { k: "hook", n: "첫 3초 훅", t: "text" },
        { k: "logline", n: "이번 편 내용 (한두 줄)", t: "textarea", rows: 3 },
      );
      if (it.track === "B") base.push({ k: "research", n: "이번 회 고증 메모·출처", t: "textarea", rows: 4 });
      base.push({ k: "notes", n: "메모", t: "textarea" });
      return base;
    },
    defaults: {},
  },
  character: {
    col: "characters",
    label: (it) => (it.track === "B" ? "인물" : "캐릭터"),
    fields: (it) => [
      { k: "name", n: "이름", t: "text", req: true, half: true },
      { k: "role", n: it.track === "B" ? "신분·직업" : "역할", t: "text", half: true },
      { k: "age", n: "나이", t: "text", third: true },
      { k: "actor", n: "연기자", t: "text", third: true },
      { k: "image", n: "사진 주소 (드라이브 링크 OK)", t: "url", third: true },
      { k: "personality", n: "성격·욕망", t: "textarea", rows: 2 },
      { k: "speech", n: "말투 (예시 대사)", t: "textarea", rows: 2 },
      { k: "look", n: "외형·의상", t: "textarea", rows: 2 },
      { k: "notes", n: it.track === "B" ? "고증 메모" : "메모", t: "textarea" },
    ],
    defaults: {},
  },
  location: {
    col: "locations",
    label: (it) => (it.track === "B" ? "배경·고증" : "배경"),
    fields: (it) => [
      { k: "name", n: "장소 이름", t: "text", req: true, half: true },
      { k: "time", n: "시간·계절", t: "text", half: true },
      { k: "desc", n: it.track === "B" ? "어떤 곳이었나 (고증)" : "원작 속 묘사", t: "textarea", rows: 3 },
      { k: "shootAt", n: "실제 촬영 장소 후보", t: "text" },
      { k: "props", n: "필요한 소품", t: "text" },
      { k: "image", n: "참고 사진 주소 (드라이브 링크 OK)", t: "url" },
      { k: "notes", n: "메모", t: "textarea" },
    ],
    defaults: {},
  },
  links: {
    col: "episodes", label: "작업 링크",
    fields: [
      { k: "links.folder", n: "이 편 작업 폴더 (구글 드라이브)", t: "url" },
      { k: "links.final", n: "최종 영상 파일", t: "url" },
      { k: "links.thumb", n: "썸네일 이미지 (드라이브 링크 OK)", t: "url" },
    ],
  },
  script: {
    col: "episodes", label: "대본",
    fields: [{ k: "script", n: "대본", t: "textarea", rows: 20, ph: "#1 마당 / 낮\n점순: 느 집엔 이거 없지?\n나(속): ..." }],
    wide: true,
  },
  stats: {
    col: "episodes", label: "SNS 성과",
    fields: statFields,
    beforeSave: (data, item) => {
      const today = todayStr();
      data.statsAt = today;
      data.history = [...(item.history || []).filter((h) => h.d !== today), { d: today, v: data.stats }].slice(-60);
    },
  },
  settings: {
    col: "meta", label: "연동 설정",
    fields: [
      { k: "youtubeKey", n: "YouTube Data API 키 (리퍼러 제한 필수)", t: "text", ph: "AIza..." },
    ],
  },
};

/* ================= 상태 ================= */
const COLS = ["projects", "episodes", "characters", "locations", "ideas", "references", "goals"];
const DB = { meta: {}, projects: [], episodes: [], characters: [], locations: [], ideas: [], references: [], goals: [] };
const state = { series: "all", status: "all", q: "", sort: null, sortDir: 1, refTag: "all", persona: "all" };
let fb = null;
let user = null;
let live = false;
let cutDraft = null;          // 컷 편집 중인 { epId, rows }
let pendingRender = false;
const ytSynced = new Set();
const view = document.getElementById("view");
const modal = document.getElementById("modal");
const modalForm = document.getElementById("modalForm");

const canEdit = () => !!(live && user && EDITORS.includes((user.email || "").toLowerCase()));

/* ================= 유틸 ================= */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n == null || n === "" ? "-" : n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + "만" : Number(n).toLocaleString("ko-KR"));
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); let c = o; ks.slice(0, -1).forEach((k) => (c = c[k] ??= {})); c[ks.at(-1)] = v; };
const todayStr = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const nl = (s) => esc(s).replace(/\n/g, "<br>");
const resolve = (v, it) => (typeof v === "function" ? v(it) : v);
const def = (o) => esc(JSON.stringify(o));
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2400);
}
function imgSrc(u) {
  if (!u) return null;
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : u;
}
const copyTag = (c) => (c === "OK" ? `<span class="tag ok">저작권 OK</span>` : c === "불가" ? `<span class="tag bad">사용 불가</span>` : `<span class="tag warn">확인 필요</span>`);
const statusTag = (s) => `<span class="tag ${s === "제작중" ? "violet" : s === "게시됨" ? "ok" : "plain"}">${esc(s)}</span>`;
const dots = (n) => (n ? `<span class="dots" title="난이도 ${n}/3">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "-");
const newBtn = (key, label, d = {}, cls = "primary") => (canEdit() ? `<button class="btn ${cls}" data-new="${key}" data-def="${def(d)}">+ ${label}</button>` : "");
const editBtn = (key, id, label = "수정", cls = "small") => (canEdit() ? `<button class="btn ${cls}" data-edit="${key}:${id}">${label}</button>` : "");

/* 진행률·단계 계산 */
function progress(ep) {
  const steps = STEPS[ep.track] || STEPS.A;
  const all = steps.flatMap((g) => g.items);
  const done = all.filter(([k]) => ep.checklist?.[k]).length;
  let stage = "완료", next = null;
  for (const g of steps) {
    const it = g.items.find(([k]) => !ep.checklist?.[k]);
    if (it) { stage = g.g; next = it[1]; break; }
  }
  return { pct: Math.round((done / all.length) * 100), stage, next, done, total: all.length, posted: !!ep.checklist?.upload };
}
const stageChip = (st) => `<span class="stage st-${STAGE_NAMES.indexOf(st)}">${esc(st)}</span>`;

function epTotals(ep) {
  const all = {};
  METRICS.forEach((m) => (all[m.key] = PLATFORMS.reduce((a, p) => a + (Number(ep.stats?.[p.key]?.[m.key]) || 0), 0)));
  return all;
}
function sumTotals(eps) {
  const all = {}; METRICS.forEach((m) => (all[m.key] = 0));
  const byPlat = {}; PLATFORMS.forEach((p) => (byPlat[p.key] = 0));
  eps.forEach((ep) => {
    const t = epTotals(ep); METRICS.forEach((m) => (all[m.key] += t[m.key]));
    PLATFORMS.forEach((p) => (byPlat[p.key] += Number(ep.stats?.[p.key]?.views) || 0));
  });
  return { all, byPlat };
}

const projectsOf = (tr) => DB.projects.filter((p) => p.track === tr);
const episodesOf = (pid) => DB.episodes.filter((e) => e.projectId === pid).sort((a, b) => (a.no || 0) - (b.no || 0));
const charsOf = (pid) => DB.characters.filter((c) => c.projectId === pid);
const locsOf = (pid) => DB.locations.filter((c) => c.projectId === pid);
const projectById = (id) => DB.projects.find((p) => p._id === id);
const epLabel = (ep) => (ep.track === "B" ? `EP.${String(ep.no || 0).padStart(2, "0")}` : `${ep.no || "?"}편`);
const trackEpisodes = (tr) => DB.episodes.filter((e) => e.track === tr);
const accentStyle = (p) => (p?.color ? `style="--pc:${esc(p.color)}"` : "");

function gem(size = 40) {
  return `<svg class="gem" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3cf"/><stop offset=".5" stop-color="#b9a4ff"/><stop offset="1" stop-color="#7fdcff"/></linearGradient>
      <linearGradient id="gB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0d6"/><stop offset="1" stop-color="#8b6cff"/></linearGradient>
    </defs>
    <polygon points="10,17 16,8 32,8 38,17 24,42" fill="url(#gA)"/>
    <polygon points="16,8 32,8 28,17 20,17" fill="#fff" opacity=".55"/>
    <polygon points="10,17 16,8 20,17" fill="#fff" opacity=".25"/>
    <polygon points="32,8 38,17 28,17" fill="url(#gB)" opacity=".7"/>
    <polygon points="10,17 20,17 24,42" fill="#ff9cc2" opacity=".55"/>
    <polygon points="20,17 28,17 24,42" fill="#fff" opacity=".35"/>
    <polygon points="28,17 38,17 24,42" fill="url(#gB)" opacity=".85"/>
    <path d="M40 4 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2-2.8 -2.8-1.2 2.8-1.2z" fill="#b9a4ff"/>
  </svg>`;
}

/* ================= HOME ================= */
function trackPanel(tr) {
  const T = TRACKS[tr];
  const eps = trackEpisodes(tr);
  const projs = projectsOf(tr);
  const current = eps.filter((e) => progress(e).stage !== "완료" && !progress(e).posted)
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (a.no || 0) - (b.no || 0))[0];
  const posted = eps.filter((e) => progress(e).posted);
  const tot = sumTotals(posted);
  const link = tr === "A" ? "#a" : "#b";
  const latest = [...posted].sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""))[0];
  let cur = latest
    ? `<a class="tp-current" href="#e/${latest._id}"><div class="tp-kicker">최근 게시 · ${esc(projectById(latest.projectId)?.title || "")} ${epLabel(latest)}</div><div class="tp-title">${esc(latest.title || "")}</div><div class="tp-row">${stageChip("게시")}<span class="muted">조회 <b>${fmt(epTotals(latest).views)}</b> · 좋아요 ${fmt(epTotals(latest).likes)}</span></div><div class="muted small" style="margin-top:8px">진행 중인 ${tr === "A" ? "편" : "회차"}가 없어요. 다음 걸 시작해볼까요?</div></a>`
    : `<div class="tp-empty">진행 중인 ${tr === "A" ? "편" : "회차"}가 없어요.</div>`;
  if (current) {
    const p = projectById(current.projectId);
    const pr = progress(current);
    cur = `<a class="tp-current" href="#e/${current._id}">
      <div class="tp-kicker">${esc(p?.title || "")} · ${epLabel(current)}</div>
      <div class="tp-title">${esc(current.title || "")}</div>
      <div class="tp-row">${stageChip(pr.stage)}<span class="muted">다음 할 일 · <b>${esc(pr.next || "-")}</b></span></div>
      <div class="progress"><span style="width:${pr.pct}%"></span></div>
      <div class="tp-row muted small"><span>${pr.pct}% 완료</span><span>${current.due ? "목표일 " + esc(current.due) : "목표일 미정"}</span></div>
    </a>`;
  }
  return `<section class="track-panel t-${tr}">
    <div class="tp-head">
      <span class="tbadge">${tr}</span>
      <div><h3>${esc(T.name)}</h3><div class="muted small">담당 ${esc(projs[0]?.owner || T.owner)} · ${esc(T.desc)}</div></div>
    </div>
    ${cur}
    <div class="tp-stats">
      <div><b>${projs.length}</b><span>${T.projectWord}</span></div>
      <div><b>${eps.length}</b><span>${tr === "A" ? "편" : "회차"}</span></div>
      <div><b>${posted.length}</b><span>게시</span></div>
      <div><b>${fmt(tot.all.views)}</b><span>총 조회</span></div>
    </div>
    <a class="btn ${tr === "A" ? "a" : "b"} block" href="${link}">${tr === "A" ? "단편문학 작업실" : "조선 POV 작업실"} 열기 →</a>
  </section>`;
}

function renderHome() {
  const goals = DB.goals;
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
  const posted = DB.episodes.filter((e) => progress(e).posted)
    .sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));
  const tot = sumTotals(posted);
  const maxV = Math.max(1, ...PLATFORMS.map((p) => tot.byPlat[p.key]));
  const d = new Date();
  view.innerHTML = `
    ${seedBanner()}
    <section class="hero">
      <div>
        <div class="hero-kicker">${d.getMonth() + 1}월 ${d.getDate()}일 · Studio_Facet</div>
        <h2 class="hero-title">오늘도, 과거 속으로.</h2>
        <p class="muted">A는 친구, B는 나. 각자 작업실에서 만들고, 여기서 같이 봐요.</p>
      </div>
      <div class="hero-goal">
        <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
        <div><b>이번 주 목표</b><div class="muted small">${done}/${goals.length} 완료</div></div>
      </div>
    </section>

    <div class="grid two-even">${trackPanel("A")}${trackPanel("B")}</div>

    <div class="grid two" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h3>이번 주 목표</h3>${canEdit() ? `<button class="btn small" data-new="goals" data-def="${def({})}">+ 목표</button>` : ""}</div>
        <ul class="checklist">${goals.map((g) => `<li>
          <button class="box ${g.done ? "on" : ""}" ${canEdit() ? `data-toggle="${g._id}"` : "disabled"} aria-label="완료 표시">${g.done ? "✓" : ""}</button>
          ${g.track ? `<span class="tbadge mini t-${g.track}">${g.track}</span>` : ""}
          <span class="${g.done ? "done" : ""} ${canEdit() ? "editable" : ""}" ${canEdit() ? `data-edit="goals:${g._id}"` : ""}>${esc(g.text)}</span></li>`).join("") || `<li class="muted">목표가 없어요.</li>`}</ul>
      </div>
      <div class="card">
        <h3>전체 성과</h3>
        <div class="kpi-row">
          ${["views", "likes", "shares", "saves"].map((k) => `<div class="kpi"><div class="label">${METRICS.find((m) => m.key === k).name}</div><div class="value">${fmt(tot.all[k])}</div></div>`).join("")}
        </div>
        ${posted.length ? `<div class="bars" style="margin-top:14px">${PLATFORMS.map((p) => `<div class="bar-row"><span>${p.name}</span><div class="bar-track"><div class="bar-fill ${p.cls}" style="width:${(tot.byPlat[p.key] / maxV) * 100}%"></div></div><span class="num">${fmt(tot.byPlat[p.key])}</span></div>`).join("")}</div>`
          : `<div class="muted small" style="margin-top:12px">게시한 편이 생기면 플랫폼별 조회수가 여기에 쌓여요.</div>`}
      </div>
    </div>

    ${posted.length ? `<div class="section-head" style="margin-top:28px"><div><h2>최근 게시</h2></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>편</th><th>게시일</th>${METRICS.map((m) => `<th class="num">${m.name}</th>`).join("")}</tr></thead>
      <tbody>${posted.slice(0, 8).map((ep) => { const t = epTotals(ep); const p = projectById(ep.projectId); return `<tr class="link-row" data-go="#e/${ep._id}">
        <td><span class="tbadge mini t-${ep.track}">${ep.track}</span> <b>${esc(p?.title || "")} ${epLabel(ep)}</b> <span class="muted">${esc(ep.title || "")}</span></td>
        <td class="muted">${esc(ep.publishDate || "-")}</td>
        ${METRICS.map((m) => `<td class="num">${fmt(t[m.key])}</td>`).join("")}</tr>`; }).join("")}</tbody>
    </table></div>` : ""}
  `;
}

/* ================= TRACK A: 작품 목록 ================= */
function epDots(pid, planned) {
  const eps = episodesOf(pid);
  const n = Math.max(planned || 0, eps.length);
  return Array.from({ length: n }, (_, i) => {
    const ep = eps[i];
    if (!ep) return `<span class="epdot" title="${i + 1}편 미생성">${i + 1}</span>`;
    const pr = progress(ep);
    return `<span class="epdot ${pr.posted ? "posted" : pr.pct > 0 ? "doing" : ""}" style="--pct:${pr.pct}" title="${i + 1}편 · ${pr.stage} ${pr.pct}%">${ep.no || i + 1}</span>`;
  }).join("");
}

function renderTrackA() {
  const projs = projectsOf("A");
  const candidates = DB.ideas.filter((i) => i.series === "A" && i.status === "후보" && !DB.projects.some((p) => p.ideaId === i._id));
  view.innerHTML = `
    ${seedBanner()}
    <div class="track-hero t-A">
      <span class="tbadge big">A</span>
      <div><h2>단편문학 드라마</h2><p class="muted">한 작품을 1~3편으로. 작품마다 원작 정리 · 캐릭터 · 배경 · 편별 컷과 성과를 따로 관리해요.</p></div>
      ${newBtn("project", "새 작품", { track: "A", owner: TRACKS.A.owner, plannedEps: 2 }, "a")}
    </div>
    ${projs.length ? `<div class="story-grid">${projs.map((p) => {
      const eps = episodesOf(p._id);
      const tot = sumTotals(eps);
      const cover = imgSrc(p.cover);
      return `<a class="story" href="#p/${p._id}" ${accentStyle(p)}>
        <div class="story-cover">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : ""}<span class="story-title">${esc(p.title)}</span></div>
        <div class="story-body">
          <div class="muted small">${esc(p.author || "")}${p.year ? ", " + esc(p.year) : ""} · 담당 ${esc(p.owner || "-")}</div>
          <div class="epdots">${epDots(p._id, p.plannedEps)}</div>
          <div class="story-meta"><span>캐릭터 ${charsOf(p._id).length}</span><span>배경 ${locsOf(p._id).length}</span><span>조회 ${fmt(tot.all.views)}</span></div>
        </div>
      </a>`;
    }).join("")}</div>` : `<div class="empty"><b>아직 작품이 없어요</b>${canEdit() ? "+ 새 작품 버튼이나 아래 후보에서 시작해요." : ""}</div>`}
    ${candidates.length ? `<div class="section-head" style="margin-top:30px"><div><h2>다음 작품 후보</h2><p class="muted">아이디어 시트에서 '후보'인 A 작품</p></div></div>
      <div class="cand-list">${candidates.map((i) => `<div class="cand">
        <div><b>${esc(i.title)}</b> <span class="muted small">${esc(i.source || "")}</span><div class="muted small">“${esc(i.hook || "")}”</div></div>
        ${canEdit() ? `<button class="btn small a" data-start="${i._id}">작품으로 시작</button>` : ""}
      </div>`).join("")}</div>` : ""}
  `;
}

/* ================= 프로젝트(작품/연재) 페이지 ================= */
function subtabs(base, items, active) {
  return `<nav class="subtabs">${items.map(([k, n]) => `<a href="${base}/${k}" class="${k === active ? "on" : ""}">${n}</a>`).join("")}</nav>`;
}

function renderProject(pid, sub) {
  const p = projectById(pid);
  if (!p) { view.innerHTML = `<div class="empty"><b>찾을 수 없어요</b><a href="#home">홈으로</a></div>`; return; }
  const T = TRACKS[p.track];
  const isB = p.track === "B";
  const eps = episodesOf(pid);
  const chars = charsOf(pid);
  const locs = locsOf(pid);
  sub = sub || (isB ? "episodes" : "overview");
  const tabs = isB
    ? [["episodes", `회차 ${eps.length}`], ["characters", `인물 ${chars.length}`], ["locations", `배경·고증 ${locs.length}`], ["overview", "포맷·원칙"], ["stats", "성과"]]
    : [["overview", "원작 정리"], ["episodes", `편 ${eps.length}/${p.plannedEps || "?"}`], ["characters", `캐릭터 ${chars.length}`], ["locations", `배경 ${locs.length}`], ["stats", "성과"]];
  const others = isB ? projectsOf("B").filter((x) => x._id !== pid) : [];
  const crumb = isB ? `<a href="#b">B · 조선 POV</a>` : `<a href="#a">A · 단편문학</a> <span>›</span> ${esc(p.title)}`;
  let body = "";
  if (sub === "overview") body = isB ? projectOverviewB(p) : projectOverviewA(p);
  else if (sub === "episodes") body = episodeList(p, eps, chars);
  else if (sub === "characters") body = charGallery(p, chars);
  else if (sub === "locations") body = locGallery(p, locs);
  else if (sub === "stats") body = statsTable(p, eps);
  view.innerHTML = `
    <div class="crumb">${crumb}</div>
    <div class="proj-head t-${p.track}" ${accentStyle(p)}>
      <span class="tbadge big">${p.track}</span>
      <div class="ph-main">
        <h2>${esc(p.title)}</h2>
        <div class="muted small">${isB ? `${esc(p.cadence || "연재")} · 담당 ${esc(p.owner || T.owner)}` : `${esc(p.author || "")}${p.year ? ", " + esc(p.year) : ""} · 담당 ${esc(p.owner || T.owner)}`}
          ${!isB && p.authorDeath ? ` · ${p.authorDeath <= 1962 ? `<span class="tag ok">저작권 만료 (작가 ${p.authorDeath} 사망)</span>` : `<span class="tag bad">저작권 확인 (작가 ${p.authorDeath} 사망)</span>`}` : ""}</div>
        ${!isB ? `<div class="epdots" style="margin-top:8px">${epDots(pid, p.plannedEps)}</div>` : ""}
      </div>
      <div class="ph-actions">
        ${p.folder ? `<a class="btn small" href="${esc(p.folder)}" target="_blank" rel="noopener">📁 드라이브</a>` : ""}
        ${!isB && p.sourceUrl ? `<a class="btn small" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">📜 원작 전문</a>` : ""}
        ${editBtn("project", pid, isB ? "연재 정보 수정" : "작품 정보 수정")}
      </div>
    </div>
    ${others.length ? `<div class="chips" style="margin:-4px 0 12px">${others.map((o) => `<a class="chip" href="#p/${o._id}">${esc(o.title)}</a>`).join("")}</div>` : ""}
    ${subtabs(`#p/${pid}`, tabs, sub)}
    <div class="subbody">${body}</div>`;
}

function infoCard(title, text, empty) {
  return `<div class="card"><h3>${title}</h3>${text ? `<div class="prose">${nl(text)}</div>` : `<div class="muted small">${empty}</div>`}</div>`;
}
function projectOverviewA(p) {
  return `<div class="grid two">
    <div class="stack">
      ${infoCard("원작 줄거리 정리", p.summary, "원작을 읽고 줄거리를 정리해두세요.")}
      ${infoCard("각색 방향·톤", p.adaptation, "어떤 톤으로 바꿀지 적어두세요.")}
    </div>
    <div class="stack">
      ${infoCard("회차 구성 계획", p.plan, "몇 편으로, 어디서 끊을지 적어두세요.")}
      <div class="card"><h3>작업 흐름</h3>
        <ol class="flow">
          <li><a href="#p/${p._id}/overview">원작 정리</a> — 줄거리·톤·회차 나누기</li>
          <li><a href="#p/${p._id}/characters">캐릭터 시트</a> · <a href="#p/${p._id}/locations">배경 시트</a></li>
          <li><a href="#p/${p._id}/episodes">편별 작업실</a> — 체크리스트 · 대본 · 컷 · 링크</li>
          <li>게시 후 편 페이지에서 성과 기록 → <a href="#p/${p._id}/stats">작품 성과</a></li>
        </ol>
      </div>
      ${p.notes ? infoCard("메모", p.notes, "") : ""}
    </div>
  </div>`;
}
function projectOverviewB(p) {
  return `<div class="grid two">
    <div class="stack">
      ${infoCard("콘셉트", p.concept, "어떤 연재인지 한두 줄로.")}
      ${infoCard("포맷 규칙 (모든 회차 공통)", p.format, "길이, 시점, 오프닝·엔딩 규칙 등.")}
    </div>
    <div class="stack">
      ${infoCard("고증 원칙·참고 자료", p.research, "자주 쓰는 사료·사이트, 고증 기준.")}
      ${p.notes ? infoCard("메모", p.notes, "") : ""}
    </div>
  </div>`;
}

function episodeCard(ep, p) {
  const pr = progress(ep);
  const t = epTotals(ep);
  const persona = ep.persona ? DB.characters.find((c) => c._id === ep.persona) : null;
  const thumb = imgSrc(ep.links?.thumb);
  return `<a class="ep-card" href="#e/${ep._id}">
    <div class="ep-thumb">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<span>${epLabel(ep)}</span>`}</div>
    <div class="ep-body">
      <div class="ep-top"><b>${epLabel(ep)}</b>${stageChip(pr.posted ? "게시" : pr.stage)}${persona ? `<span class="tag plain">${esc(persona.name)}</span>` : ""}</div>
      <div class="ep-title">${esc(ep.title || "")}</div>
      ${ep.hook ? `<div class="muted small clamp">“${esc(ep.hook)}”</div>` : ""}
      <div class="progress thin"><span style="width:${pr.pct}%"></span></div>
      <div class="ep-foot muted small"><span>${pr.posted ? `조회 ${fmt(t.views)} · 좋아요 ${fmt(t.likes)}` : `다음: ${esc(pr.next || "-")}`}</span><span>${esc(ep.publishDate || ep.due || "")}</span></div>
    </div>
  </a>`;
}
function episodeList(p, eps, chars) {
  const isB = p.track === "B";
  const nextNo = (eps.at(-1)?.no || 0) + 1;
  let list = eps;
  if (isB && state.persona !== "all") list = eps.filter((e) => e.persona === state.persona);
  const chips = isB && chars.length ? `<div class="chips" style="margin-bottom:12px">${[["all", "전체 인물"], ...chars.map((c) => [c._id, c.name])].map(([k, n]) => `<button class="chip ${state.persona === k ? "on" : ""}" data-persona="${k}">${esc(n)}</button>`).join("")}</div>` : "";
  const planned = !isB && p.plannedEps && eps.length < p.plannedEps;
  return `<div class="section-head"><div><p class="muted">${isB ? "연재는 계속 이어져요. 회차마다 인물을 고르고, 회차 안에서 대본·컷·성과까지 관리해요." : `총 ${p.plannedEps || "?"}편 계획 · 편을 누르면 그 편 작업실로 들어가요.`}</p></div>
    ${newBtn("episode", isB ? `EP.${String(nextNo).padStart(2, "0")} 추가` : `${nextNo}편 추가`, { projectId: p._id, track: p.track, no: nextNo, owner: p.owner || TRACKS[p.track].owner, checklist: {} }, p.track === "A" ? "a" : "b")}</div>
    ${chips}
    ${list.length ? `<div class="ep-grid">${(isB ? [...list].reverse() : list).map((e) => episodeCard(e, p)).join("")}</div>` : `<div class="empty"><b>아직 ${isB ? "회차" : "편"}가 없어요</b></div>`}
    ${planned ? `<div class="muted small" style="margin-top:10px">계획 ${p.plannedEps}편 중 ${eps.length}편 생성됨</div>` : ""}`;
}

function avatar(name, img) {
  const s = imgSrc(img);
  return s ? `<img class="avatar" src="${esc(s)}" alt="" loading="lazy">` : `<span class="avatar">${esc((name || "?").slice(0, 1))}</span>`;
}
function charGallery(p, chars) {
  const T = TRACKS[p.track];
  return `<div class="section-head"><div><p class="muted">${p.track === "B" ? "회차에 등장하는 조선 사람들. 반응 좋은 인물은 시즌으로 이어가요." : "배역별 성격·말투·의상을 정리해두면 대본과 촬영이 빨라져요."}</p></div>${newBtn("character", `${T.charWord} 추가`, { projectId: p._id, track: p.track }, p.track === "A" ? "a" : "b")}</div>
  ${chars.length ? `<div class="sheet-grid">${chars.map((c) => {
    const eps = p.track === "B" ? DB.episodes.filter((e) => e.persona === c._id) : [];
    return `<div class="sheet ${canEdit() ? "editable" : ""}" ${canEdit() ? `data-edit="character:${c._id}"` : ""}>
      <div class="sheet-head">${avatar(c.name, c.image)}<div><b>${esc(c.name)}</b><div class="muted small">${esc([c.role, c.age && c.age + (/\d$/.test(c.age) ? "세" : "")].filter(Boolean).join(" · "))}</div></div></div>
      <dl>
        ${c.personality ? `<dt>성격</dt><dd>${nl(c.personality)}</dd>` : ""}
        ${c.speech ? `<dt>말투</dt><dd>${nl(c.speech)}</dd>` : ""}
        ${c.look ? `<dt>외형·의상</dt><dd>${nl(c.look)}</dd>` : ""}
        ${c.actor ? `<dt>연기</dt><dd>${esc(c.actor)}</dd>` : ""}
        ${c.notes ? `<dt>${p.track === "B" ? "고증" : "메모"}</dt><dd>${nl(c.notes)}</dd>` : ""}
        ${eps.length ? `<dt>등장</dt><dd>${eps.map((e) => `<a href="#e/${e._id}" class="tag plain">${epLabel(e)}</a>`).join(" ")}</dd>` : ""}
      </dl>
    </div>`;
  }).join("")}</div>` : `<div class="empty"><b>아직 ${T.charWord} 시트가 없어요</b></div>`}`;
}
function locGallery(p, locs) {
  const T = TRACKS[p.track];
  return `<div class="section-head"><div><p class="muted">${p.track === "B" ? "그 시대 장소가 실제로 어땠는지, 어디서 찍을지." : "원작 속 장소와 실제 촬영 장소를 짝지어 둬요."}</p></div>${newBtn("location", `${T.locWord} 추가`, { projectId: p._id, track: p.track }, p.track === "A" ? "a" : "b")}</div>
  ${locs.length ? `<div class="sheet-grid">${locs.map((l) => {
    const s = imgSrc(l.image);
    return `<div class="sheet loc ${canEdit() ? "editable" : ""}" ${canEdit() ? `data-edit="location:${l._id}"` : ""}>
      ${s ? `<div class="loc-img"><img src="${esc(s)}" alt="" loading="lazy"></div>` : ""}
      <div class="sheet-head"><div><b>${esc(l.name)}</b><div class="muted small">${esc(l.time || "")}</div></div></div>
      <dl>
        ${l.desc ? `<dt>${p.track === "B" ? "고증" : "원작"}</dt><dd>${nl(l.desc)}</dd>` : ""}
        ${l.shootAt ? `<dt>촬영지</dt><dd>${esc(l.shootAt)}</dd>` : ""}
        ${l.props ? `<dt>소품</dt><dd>${esc(l.props)}</dd>` : ""}
        ${l.notes ? `<dt>메모</dt><dd>${nl(l.notes)}</dd>` : ""}
      </dl>
    </div>`;
  }).join("")}</div>` : `<div class="empty"><b>아직 ${T.locWord} 시트가 없어요</b></div>`}`;
}
function statsTable(p, eps) {
  const posted = eps.filter((e) => progress(e).posted || Object.keys(e.stats || {}).length);
  const tot = sumTotals(posted);
  if (!posted.length) return `<div class="empty"><b>아직 게시한 ${p.track === "B" ? "회차" : "편"}가 없어요</b>편 작업실 → 성과 탭에서 링크와 숫자를 넣으면 여기서 모아 봐요.</div>`;
  return `<div class="kpi-row big">${METRICS.map((m) => `<div class="kpi"><div class="label">총 ${m.name}</div><div class="value">${fmt(tot.all[m.key])}</div></div>`).join("")}</div>
  <div class="table-wrap" style="margin-top:14px"><table>
    <thead><tr><th>${p.track === "B" ? "회차" : "편"}</th>${PLATFORMS.map((pl) => `<th class="num">${pl.name} 조회</th>`).join("")}${METRICS.map((m) => `<th class="num">합계 ${m.name}</th>`).join("")}<th>기록일</th></tr></thead>
    <tbody>${posted.map((ep) => { const t = epTotals(ep); return `<tr class="link-row" data-go="#e/${ep._id}/stats">
      <td><b>${epLabel(ep)}</b> <span class="muted">${esc(ep.title || "")}</span></td>
      ${PLATFORMS.map((pl) => `<td class="num">${fmt(ep.stats?.[pl.key]?.views)}</td>`).join("")}
      ${METRICS.map((m) => `<td class="num">${fmt(t[m.key])}</td>`).join("")}
      <td class="muted">${esc(ep.statsAt || "-")}</td></tr>`; }).join("")}</tbody>
  </table></div>`;
}

/* ================= 편/회차 작업실 ================= */
function renderEpisode(eid, sub) {
  const ep = DB.episodes.find((e) => e._id === eid);
  if (!ep) { view.innerHTML = `<div class="empty"><b>찾을 수 없어요</b><a href="#home">홈으로</a></div>`; return; }
  const p = projectById(ep.projectId) || {};
  const isB = ep.track === "B";
  const pr = progress(ep);
  sub = sub || "work";
  const cuts = ep.cuts || [];
  const tabs = [["work", "진행"], ["script", "대본"], ["cuts", `컷 ${cuts.length}`], ["stats", "SNS 성과"]];
  const siblings = episodesOf(ep.projectId);
  const idx = siblings.findIndex((e) => e._id === eid);
  const prev = siblings[idx - 1], next = siblings[idx + 1];
  const persona = ep.persona ? DB.characters.find((c) => c._id === ep.persona) : null;
  let body = "";
  if (sub === "work") body = epWork(ep, p, persona);
  else if (sub === "script") body = `<div class="card script-card"><div class="card-head"><h3>대본</h3>${editBtn("script", eid, ep.script ? "대본 수정" : "대본 쓰기")}</div>
      ${ep.script ? `<div class="script">${nl(ep.script)}</div>` : `<div class="muted small">아직 대본이 없어요. 장면 번호(#1)와 장소를 붙이면 컷 리스트 만들기가 쉬워요.</div>`}</div>`;
  else if (sub === "cuts") body = epCuts(ep, p);
  else if (sub === "stats") body = epStats(ep);
  view.innerHTML = `
    <div class="crumb">${isB ? `<a href="#b">B · 조선 POV</a>` : `<a href="#a">A · 단편문학</a> <span>›</span> <a href="#p/${p._id}">${esc(p.title || "")}</a>`} <span>›</span> ${epLabel(ep)}</div>
    <div class="proj-head t-${ep.track}" ${accentStyle(p)}>
      <span class="tbadge big">${epLabel(ep).replace("EP.", "")}</span>
      <div class="ph-main">
        <div class="muted small">${esc(p.title || "")} · ${epLabel(ep)}${persona ? ` · ${esc(persona.name)}` : ""}</div>
        <h2>${esc(ep.title || "")}</h2>
        <div class="tp-row">${stageChip(pr.posted ? "게시" : pr.stage)}<span class="muted small">${pr.pct}% · ${pr.done}/${pr.total} 단계</span>${ep.due ? `<span class="muted small">목표일 ${esc(ep.due)}</span>` : ""}<span class="muted small">담당 ${esc(ep.owner || p.owner || "-")}</span></div>
        <div class="progress"><span style="width:${pr.pct}%"></span></div>
      </div>
      <div class="ph-actions">
        ${prev ? `<a class="btn small" href="#e/${prev._id}/${sub}">← ${epLabel(prev)}</a>` : ""}
        ${next ? `<a class="btn small" href="#e/${next._id}/${sub}">${epLabel(next)} →</a>` : ""}
        ${editBtn("episode", eid, "정보 수정")}
      </div>
    </div>
    ${subtabs(`#e/${eid}`, tabs, sub)}
    <div class="subbody">${body}</div>`;
  if (sub === "stats") maybeSyncYouTube(ep, false);
}

function linkBtn(url, label) {
  return url ? `<a class="linkbox" href="${esc(url)}" target="_blank" rel="noopener"><b>${label}</b><span class="muted small">열기 ↗</span></a>` : `<div class="linkbox empty-link"><b>${label}</b><span class="muted small">링크 없음</span></div>`;
}
function epWork(ep, p, persona) {
  const ed = canEdit();
  const steps = STEPS[ep.track] || STEPS.A;
  const pr = progress(ep);
  const thumb = imgSrc(ep.links?.thumb);
  const chars = charsOf(ep.projectId);
  return `<div class="grid work-grid">
    <div class="card">
      <div class="card-head"><h3>제작 체크리스트</h3><span class="muted small">체크하면 바로 저장돼요</span></div>
      <div class="steps">${steps.map((g) => {
        const d = g.items.filter(([k]) => ep.checklist?.[k]).length;
        return `<div class="step-group ${g.g === pr.stage ? "now" : ""} ${d === g.items.length ? "complete" : ""}">
          <div class="sg-head"><b>${g.g}</b><span class="muted small">${d}/${g.items.length}</span></div>
          ${g.items.map(([k, n]) => `<label class="step"><input type="checkbox" ${ep.checklist?.[k] ? "checked" : ""} ${ed ? `data-check="${ep._id}:${k}"` : "disabled"}> <span>${esc(n)}</span></label>`).join("")}
        </div>`;
      }).join("")}</div>
    </div>
    <div class="stack">
      <div class="card">
        <div class="card-head"><h3>작업 파일</h3>${editBtn("links", ep._id, "링크 넣기")}</div>
        ${thumb ? `<img class="ep-cover" src="${esc(thumb)}" alt="썸네일" loading="lazy">` : ""}
        <div class="links">
          ${linkBtn(ep.links?.folder || p.folder, ep.links?.folder ? "📁 이 편 작업 폴더" : "📁 작품 드라이브 폴더")}
          ${linkBtn(ep.links?.final, "🎬 최종 영상")}
        </div>
        <div class="muted small" style="margin-top:8px">영상·사진은 구글 드라이브에, 여기엔 링크만.</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>이번 ${ep.track === "B" ? "회" : "편"}</h3>${editBtn("episode", ep._id)}</div>
        <dl class="kv">
          ${ep.hook ? `<dt>훅</dt><dd>“${esc(ep.hook)}”</dd>` : ""}
          ${ep.logline ? `<dt>내용</dt><dd>${nl(ep.logline)}</dd>` : ""}
          ${persona ? `<dt>인물</dt><dd><a href="#p/${p._id}/characters">${esc(persona.name)}</a> · ${esc(persona.role || "")}</dd>` : ""}
          ${ep.research ? `<dt>고증</dt><dd>${nl(ep.research)}</dd>` : ""}
          ${ep.notes ? `<dt>메모</dt><dd>${nl(ep.notes)}</dd>` : ""}
          ${ep.track === "A" && chars.length ? `<dt>캐릭터</dt><dd>${chars.map((c) => `<a class="tag plain" href="#p/${p._id}/characters">${esc(c.name)}</a>`).join(" ")}</dd>` : ""}
        </dl>
        ${!ep.hook && !ep.logline ? `<div class="muted small">훅과 이번 편 내용을 적어두세요.</div>` : ""}
      </div>
    </div>
  </div>`;
}

function epCuts(ep, p) {
  const ed = canEdit();
  const editing = cutDraft && cutDraft.epId === ep._id;
  const rows = editing ? cutDraft.rows : ep.cuts || [];
  const total = rows.reduce((a, c) => a + (Number(c.sec) || 0), 0);
  const done = rows.filter((c) => c.done).length;
  const head = `<div class="section-head"><div><p class="muted">컷 ${rows.length}개 · 예상 길이 <b>${total}초</b>${rows.length ? ` · 촬영 완료 ${done}/${rows.length}` : ""}</p></div>
    ${ed ? (editing ? `<div class="btns"><button class="btn" data-cutcancel>취소</button><button class="btn primary" data-cutsave>저장</button></div>` : `<button class="btn primary" data-cutedit="${ep._id}">컷 편집</button>`) : ""}</div>`;
  if (editing) {
    return `${head}<div class="table-wrap cut-edit"><table>
      <thead><tr><th>#</th>${CUT_FIELDS.map(([, n]) => `<th>${n}</th>`).join("")}<th></th></tr></thead>
      <tbody>${rows.map((c, i) => `<tr>
        <td class="muted">${i + 1}</td>
        ${CUT_FIELDS.map(([k, , w]) => `<td><textarea rows="2" style="min-width:${w}px" data-ci="${i}" data-cf="${k}" ${k === "sec" ? 'inputmode="numeric"' : ""}>${esc(c[k] ?? "")}</textarea></td>`).join("")}
        <td class="cut-ops"><button class="btn tiny" data-cutmove="${i}:-1" ${i === 0 ? "disabled" : ""} aria-label="위로">↑</button><button class="btn tiny" data-cutmove="${i}:1" ${i === rows.length - 1 ? "disabled" : ""} aria-label="아래로">↓</button><button class="btn tiny" data-cutins="${i}" aria-label="아래에 추가">＋</button><button class="btn tiny danger" data-cutdel="${i}" aria-label="삭제">✕</button></td>
      </tr>`).join("")}</tbody></table></div>
      <button class="btn" data-cutins="${rows.length - 1}" style="margin-top:10px">+ 컷 추가</button>`;
  }
  if (!rows.length) return `${head}<div class="empty"><b>컷 리스트가 비어 있어요</b>${ed ? "컷 편집을 눌러 장면·장소·인물·대사·샷을 한 줄씩 적어요." : ""}</div>`;
  return `${head}<div class="table-wrap"><table class="cut-table">
    <thead><tr><th>#</th>${CUT_FIELDS.map(([, n]) => `<th>${n}</th>`).join("")}<th>촬영</th></tr></thead>
    <tbody>${rows.map((c, i) => `<tr class="${c.done ? "cut-done" : ""}">
      <td class="muted">${i + 1}</td>
      ${CUT_FIELDS.map(([k]) => `<td class="${k === "sec" ? "num" : ""} c-${k}">${nl(c[k] ?? "")}</td>`).join("")}
      <td><input type="checkbox" ${c.done ? "checked" : ""} ${ed ? `data-cutdone="${ep._id}:${i}"` : "disabled"} aria-label="촬영 완료"></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function sparkline(hist) {
  if (!hist || hist.length < 2) return "";
  const pts = hist.map((h) => PLATFORMS.reduce((a, p) => a + (Number(h.v?.[p.key]?.views) || 0), 0));
  const max = Math.max(1, ...pts);
  const W = 320, H = 70;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (W - 8) + 4, H - 6 - (v / max) * (H - 14)]);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="조회수 추이">
    <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${xy.map((p) => p.join(",")).join(" ")}"/>
    ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="var(--paper)" stroke="var(--accent)" stroke-width="2"/>`).join("")}
  </svg><div class="muted small spark-cap"><span>${esc(hist[0].d)}</span><span>${esc(hist.at(-1).d)}</span></div>`;
}
function epStats(ep) {
  const t = epTotals(ep);
  const ytKey = DB.meta.youtubeKey;
  return `<div class="section-head"><div><p class="muted">${ep.statsAt ? `마지막 기록 ${esc(ep.statsAt)}` : "아직 기록 없음"} · 유튜브는 ${ytKey ? "링크만 넣으면 <b>자동</b>으로 갱신" : "API 키 연결 전 (가이드 탭 참고)"} · 인스타·틱톡은 3일차 숫자를 직접 입력</p></div>
    <div class="btns">${ytKey && ep.posts?.youtube && canEdit() ? `<button class="btn" data-yt="${ep._id}">유튜브 새로고침</button>` : ""}${editBtn("stats", ep._id, "링크·숫자 입력", "primary")}</div></div>
  <div class="kpi-row big">${METRICS.map((m) => `<div class="kpi"><div class="label">${m.name}</div><div class="value">${fmt(t[m.key])}</div></div>`).join("")}</div>
  <div class="plat-grid">${PLATFORMS.map((pl) => {
    const s = ep.stats?.[pl.key] || {};
    const url = ep.posts?.[pl.key];
    return `<div class="card plat-card ${pl.cls}-b">
      <div class="card-head"><h3><span class="pdot ${pl.cls}"></span>${pl.name}</h3>${url ? `<a class="small" href="${esc(url)}" target="_blank" rel="noopener">게시물 ↗</a>` : `<span class="muted small">링크 없음</span>`}</div>
      <div class="plat-nums">${METRICS.map((m) => `<div><span class="muted small">${m.name}</span><b>${fmt(s[m.key])}</b></div>`).join("")}</div>
    </div>`;
  }).join("")}</div>
  ${(ep.history || []).length > 1 ? `<div class="card" style="margin-top:14px"><h3>조회수 추이</h3>${sparkline(ep.history)}</div>` : ""}`;
}

/* 유튜브 통계 자동 갱신 (API 키가 있을 때만) */
const youtubeId = (url = "") => (url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || null;
async function maybeSyncYouTube(ep, manual) {
  const key = DB.meta.youtubeKey;
  const vid = youtubeId(ep.posts?.youtube || "");
  if (!key || !vid || !canEdit()) return;
  if (!manual && (ytSynced.has(ep._id) || ep.ytAt === todayStr())) return;
  ytSynced.add(ep._id);
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${vid}&key=${encodeURIComponent(key)}`);
    const j = await r.json();
    const s = j.items?.[0]?.statistics;
    if (!s) { if (manual) toast("유튜브 숫자를 못 가져왔어요"); return; }
    const yt = { ...(ep.stats?.youtube || {}), views: +s.viewCount || 0, likes: +s.likeCount || 0, comments: +s.commentCount || 0 };
    const stats = { ...(ep.stats || {}), youtube: yt };
    const today = todayStr();
    const history = [...(ep.history || []).filter((h) => h.d !== today), { d: today, v: stats }].slice(-60);
    await saveDoc("episodes", ep._id, { stats, history, ytAt: today, statsAt: today });
    if (manual) toast("유튜브 숫자 갱신 완료");
  } catch (e) { console.error(e); if (manual) toast("유튜브 연결 실패"); }
}

/* ================= IDEAS ================= */
function filteredIdeas() {
  const q = state.q.trim().toLowerCase();
  let list = DB.ideas.filter((i) =>
    (state.series === "all" || i.series === state.series) &&
    (state.status === "all" || i.status === state.status) &&
    (!q || [i.title, i.source, i.hook, i.notes, i.cast].join(" ").toLowerCase().includes(q)));
  if (state.sort) {
    const k = state.sort;
    list = [...list].sort((a, b) => {
      const va = k === "status" ? STATUS_ORDER.indexOf(a.status) : a[k] ?? "";
      const vb = k === "status" ? STATUS_ORDER.indexOf(b.status) : b[k] ?? "";
      return (va > vb ? 1 : va < vb ? -1 : 0) * state.sortDir;
    });
  }
  return list;
}
function renderIdeas() {
  const statuses = ["all", ...STATUS_ORDER];
  const chips = [["all", "전체"], ...SERIES_OPTS];
  view.innerHTML = `
    <div class="section-head">
      <div><h2>아이디어 시트</h2><p class="muted">모든 소재 창고. A·B 후보는 <b>시작</b> 버튼으로 바로 작업실을 만들 수 있어요.</p></div>
      ${newBtn("ideas", "아이디어", {})}
    </div>
    <div class="toolbar">
      <input id="q" type="search" placeholder="작품명, 훅, 메모 검색" value="${esc(state.q)}">
      <select id="status">${statuses.map((s) => `<option value="${s}" ${state.status === s ? "selected" : ""}>${s === "all" ? "상태: 전체" : s}</option>`).join("")}</select>
    </div>
    <div class="chips" style="margin-bottom:14px">${chips.map(([k, n]) => `<button class="chip ${state.series === k ? "on" : ""}" data-series="${k}">${esc(n)}</button>`).join("")}</div>
    <div id="ideaBody"></div>`;
  const q = view.querySelector("#q");
  q.addEventListener("input", () => { state.q = q.value; drawIdeaBody(); });
  view.querySelector("#status").addEventListener("change", (e) => { state.status = e.target.value; drawIdeaBody(); });
  view.querySelectorAll("[data-series]").forEach((b) => b.addEventListener("click", () => { state.series = b.dataset.series; renderIdeas(); }));
  drawIdeaBody();
}
function startBtn(i) {
  if (!canEdit() || !["A", "B"].includes(i.series)) return "";
  const linked = i.series === "A" ? DB.projects.find((p) => p.ideaId === i._id) : DB.episodes.find((e) => e.ideaId === i._id);
  if (linked) return `<a class="btn tiny" href="${i.series === "A" ? "#p/" : "#e/"}${linked._id}" data-stop>작업실 →</a>`;
  return `<button class="btn tiny ${i.series === "A" ? "a" : "b"}" data-start="${i._id}">시작</button>`;
}
function drawIdeaBody() {
  const list = filteredIdeas();
  const body = view.querySelector("#ideaBody");
  if (!body) return;
  const cols = [["id", "ID"], ["series", "시리즈"], ["title", "제목"], ["source", "원작/출처"], ["copyright", "저작권"], ["hook", "훅 (첫 3초)"], ["episodes", "분량"], ["cast", "인원"], ["difficulty", "난이도"], ["status", "상태"], ["notes", "메모"]];
  if (!list.length) { body.innerHTML = `<div class="empty"><b>아이디어가 없어요</b>${DB.ideas.length ? "필터를 바꿔보세요." : ""}</div>`; return; }
  const ed = canEdit();
  body.innerHTML = `
    <div class="muted small" style="margin-bottom:8px">${list.length}개</div>
    <div class="table-wrap ideas-table"><table>
      <thead><tr>${cols.map(([k, n]) => `<th data-sort="${k}" class="sortable">${n}${state.sort === k ? (state.sortDir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
      <tbody>${list.map((i) => `<tr class="${ed ? "editable" : ""}" ${ed ? `data-edit="ideas:${i._id}"` : ""}>
        <td class="muted">${esc(i.id)}</td>
        <td><span class="tbadge mini t-${esc(i.series)}">${esc(i.series)}</span></td>
        <td class="title">${esc(i.title)} ${startBtn(i)}</td>
        <td class="muted nowrap">${esc(i.source)}${i.authorDeath ? `<br><span class="small">작가 사망 ${i.authorDeath}</span>` : ""}</td>
        <td>${copyTag(i.copyright)}</td>
        <td class="hook">${esc(i.hook)}</td>
        <td class="nowrap">${esc(i.episodes)}</td>
        <td class="nowrap">${esc(i.cast)}</td>
        <td>${dots(i.difficulty)}</td>
        <td>${statusTag(i.status)}</td>
        <td class="notes">${esc(i.notes)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="cards-list">${list.map((i) => `<div class="card idea-card ${ed ? "editable" : ""}" ${ed ? `data-edit="ideas:${i._id}"` : ""}>
      <div class="row-between"><h3>${esc(i.title)}</h3>${statusTag(i.status)}</div>
      <div class="row"><span class="tbadge mini t-${esc(i.series)}">${esc(i.series)}</span>${copyTag(i.copyright)}<span class="tag plain">${esc(i.cast)}</span><span class="tag plain">${esc(i.episodes)}</span>${startBtn(i)}</div>
      <div class="muted small">${esc(i.source)}</div>
      <div class="hook">“${esc(i.hook)}”</div>
      <div class="notes">${esc(i.notes)}</div>
    </div>`).join("")}</div>`;
  body.querySelectorAll("th[data-sort]").forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.sort;
    state.sortDir = state.sort === k ? -state.sortDir : 1;
    state.sort = k;
    drawIdeaBody();
  }));
}

/* 아이디어 → 작업실 만들기 */
async function startFromIdea(ideaDocId) {
  const i = DB.ideas.find((x) => x._id === ideaDocId);
  if (!i) return;
  const { fs, db } = fb;
  const stamp = { createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(), updatedBy: user.email };
  if (i.series === "A") {
    const [author, year] = (i.source || "").split(",").map((s) => s.trim());
    const ref = fs.doc(fs.collection(db, "projects"));
    const batch = fs.writeBatch(db);
    batch.set(ref, { track: "A", title: i.title, author: author || "", year: Number(year) || null, authorDeath: i.authorDeath || null, plannedEps: Number((i.episodes || "").match(/\d/g)?.pop()) || 2, owner: TRACKS.A.owner, adaptation: [i.hook && `훅: ${i.hook}`, i.notes].filter(Boolean).join("\n"), ideaId: i._id, ...stamp });
    batch.set(fs.doc(fs.collection(db, "episodes")), { projectId: ref.id, track: "A", no: 1, title: "", hook: i.hook || "", owner: TRACKS.A.owner, checklist: {}, ...stamp });
    batch.set(fs.doc(db, "ideas", i._id), { status: "제작중" }, { merge: true });
    await batch.commit();
    location.hash = `#p/${ref.id}`;
  } else {
    let bp = projectsOf("B")[0];
    if (!bp) { toast("먼저 B 연재를 만들어 주세요"); return; }
    const no = (episodesOf(bp._id).at(-1)?.no || 0) + 1;
    const ref = fs.doc(fs.collection(db, "episodes"));
    const batch = fs.writeBatch(db);
    batch.set(ref, { projectId: bp._id, track: "B", no, title: i.title, hook: i.hook || "", notes: i.notes || "", owner: bp.owner || TRACKS.B.owner, checklist: {}, ideaId: i._id, ...stamp });
    batch.set(fs.doc(db, "ideas", i._id), { status: "제작중" }, { merge: true });
    await batch.commit();
    location.hash = `#e/${ref.id}`;
  }
  toast("작업실을 만들었어요");
}

/* ================= REFERENCES ================= */
const PLAT_COLOR = { instagram: "#d6249f", tiktok: "#111", youtube: "#ff0033" };
const detectPlatform = (url = "") => (/youtu\.?be/.test(url) ? "youtube" : /tiktok\.com/.test(url) ? "tiktok" : /instagram\.com/.test(url) ? "instagram" : "etc");
function thumbFor(r) {
  if (r.thumbnail) return imgSrc(r.thumbnail);
  const yt = youtubeId(r.url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}
async function hydrateTikTok(card, url) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return;
    const j = await res.json();
    if (j.thumbnail_url) card.querySelector(".thumb").insertAdjacentHTML("beforeend", `<img src="${esc(j.thumbnail_url)}" alt="" loading="lazy">`);
  } catch (_) { /* 썸네일 없이 표시 */ }
}
function renderRefs() {
  const refs = DB.references;
  const ed = canEdit();
  const tags = [...new Set(refs.flatMap((r) => r.tags || []))];
  const filters = [["all", "전체"], ["tr:A", "A용"], ["tr:B", "B용"], ...tags.map((t) => [t, "#" + t])];
  const f = state.refTag;
  const list = f === "all" ? refs : f.startsWith("tr:") ? refs.filter((r) => r.track === f.slice(3)) : refs.filter((r) => (r.tags || []).includes(f));
  view.innerHTML = `
    <div class="section-head"><div><h2>레퍼런스 보드</h2><p class="muted">참고할 계정 · 영상 · 훔칠 포인트</p></div>${newBtn("references", "레퍼런스", {})}</div>
    ${refs.length ? `<div class="chips" style="margin-bottom:14px">${filters.map(([k, n]) => `<button class="chip ${f === k ? "on" : ""}" data-tag="${esc(k)}">${esc(n)}</button>`).join("")}</div>` : ""}
    ${list.length ? `<div class="gallery">${list.map((r, idx) => {
      const plat = r.platform || detectPlatform(r.url);
      const th = thumbFor(r);
      return `<div class="ref" data-idx="${idx}" data-plat="${plat}">
        <a class="thumb" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="plat" style="background:${PLAT_COLOR[plat] || "#666"}">${plat}</span>🎬${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : ""}</a>
        <div class="body"><span class="acct">${r.track ? `<span class="tbadge mini t-${r.track}">${r.track}</span> ` : ""}${esc(r.account || "")}</span>
          ${r.title ? `<span class="small">${esc(r.title)}</span>` : ""}
          ${r.why ? `<span class="why">💡 ${esc(r.why)}</span>` : ""}
          <div class="chips">${(r.tags || []).map((t) => `<span class="tag plain">${esc(t)}</span>`).join("")}</div>
          ${ed ? `<button class="btn tiny" data-edit="references:${r._id}" style="justify-self:start;margin-top:4px">수정</button>` : ""}
        </div></div>`;
    }).join("")}</div>`
    : `<div class="empty"><b>레퍼런스를 모아볼까요?</b>${ed ? "+ 레퍼런스 버튼을 누르고 링크만 붙여 넣으면 썸네일 카드로 떠요." : "로그인하면 링크를 추가할 수 있어요."}<br>유튜브·틱톡은 썸네일이 자동, 인스타는 썸네일 주소를 넣으면 보여요.</div>`}`;
  view.querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => { state.refTag = b.dataset.tag; renderRefs(); }));
  view.querySelectorAll('.ref[data-plat="tiktok"]').forEach((card) => {
    const r = list[+card.dataset.idx];
    if (!thumbFor(r)) hydrateTikTok(card, r.url);
  });
}

/* ================= GUIDE ================= */
function renderGuide() {
  view.innerHTML = `<div class="guide">
    <h2>운영 가이드</h2>
    <p class="muted">새로 합류한 사람도 이 페이지만 보면 되게.</p>

    <h3>🗂 구조</h3>
    <ul>
      <li><b>A · 단편문학</b> (친구): 작품 1개 = 작업실 1개. 안에 <b>원작 정리 · 편(1~3) · 캐릭터 · 배경 · 성과</b>.</li>
      <li><b>B · 조선 POV</b> (나): 연재 1개 안에 <b>회차(EP.01, 02…)</b>가 계속 쌓여요. 인물·배경·고증 시트는 연재 전체가 같이 써요.</li>
      <li>편/회차를 누르면 작업실: <b>진행</b>(체크리스트·파일 링크) → <b>대본</b> → <b>컷</b>(장면별 표) → <b>SNS 성과</b>.</li>
      <li>단계는 체크리스트에서 자동으로 계산돼요. '3개 플랫폼 업로드'를 체크하면 게시됨으로 바뀌어요.</li>
    </ul>

    <h3>✏️ 수정하는 법</h3>
    <ul>
      <li>오른쪽 위 <b>구글 로그인</b> → 등록된 두 계정만 수정. 로그인 안 하면 보기만 가능.</li>
      <li><b>+ 버튼</b>으로 추가, 카드·행을 <b>누르면</b> 수정·삭제. 저장하면 서로의 화면에 <b>바로</b> 반영.</li>
    </ul>

    <h3>📁 영상·사진은 구글 드라이브에</h3>
    <ul>
      <li>공유 폴더 <code>Studio_Facet / A 동백꽃 / 1편 / 01 대본 · 02 촬영 원본 · 03 편집본 · 04 최종·썸네일</code></li>
      <li>둘 다 <b>Google Drive 데스크톱</b> 앱을 깔면 내 컴퓨터 폴더처럼 쓰고, 자동으로 서로 동기화돼요.</li>
      <li>대시보드에는 <b>링크만</b>. 사진 칸에 드라이브 이미지 링크를 넣으면 미리보기가 떠요 ('링크가 있는 모든 사용자' 공유 필요).</li>
    </ul>

    <h3>📈 SNS 성과</h3>
    <ul>
      <li>편 작업실 → SNS 성과 → <b>링크·숫자 입력</b>. 기록할 때마다 날짜별로 쌓여서 추이 그래프가 그려져요.</li>
      <li><b>유튜브</b>: API 키를 연결하면 링크만 넣어도 조회·좋아요·댓글이 자동 갱신 (페이지 열 때 하루 1번).</li>
      <li><b>인스타·틱톡</b>: 자동 연동은 비즈니스 계정·개발자 앱 승인이 필요해서, 계정이 자리 잡을 때까지는 3일차 숫자를 직접 입력.</li>
      ${canEdit() ? `<li><button class="btn small" data-edit="settings:main">유튜브 API 키 설정</button> ${DB.meta.youtubeKey ? `<span class="tag ok">연결됨</span>` : `<span class="tag plain">미연결</span>`}</li>` : ""}
    </ul>

    <h3>⚖️ 저작권 체크</h3>
    <ul>
      <li>한국: 저자 사망 후 70년. <b>1962년 12월 31일까지 사망한 작가</b>의 작품은 보호기간 만료.</li>
      <li>원작 본문은 OK. 단, 출판사 현대어 편집본·주석·기존 드라마 각색본은 따로 저작권이 있어요.</li>
      <li>❌ 헷갈리기 쉬운 보호 작품: 황순원 「소나기」, 주요섭 「사랑손님과 어머니」, 염상섭(1963 사망) 작품</li>
      <li>음악은 각 플랫폼 앱 내 라이브러리 사운드만. 상업 음원은 유튜브 Content ID에 걸려요.</li>
    </ul>
  </div>`;
}

/* ================= 편집 모달 ================= */
function fieldHtml(f, item) {
  const v = getPath(item, f.k);
  const id = `f_${f.k.replace(/\./g, "_")}`;
  const cls = f.fifth ? "fifth" : f.third ? "third" : f.third2 ? "third2" : f.half ? "half" : "full";
  let input;
  if (f.t === "textarea") input = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 2}" placeholder="${esc(f.ph || "")}">${esc(v ?? "")}</textarea>`;
  else if (f.t === "select") input = `<select id="${id}" name="${f.k}">${f.opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v ?? "") === String(val) ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>`;
  else if (f.t === "checkbox") return `<label class="field full check"><input type="checkbox" name="${f.k}" ${v ? "checked" : ""}> ${esc(f.n)}</label>`;
  else if (f.t === "tags") input = `<input id="${id}" name="${f.k}" type="text" value="${esc((v || []).join(", "))}" placeholder="${esc(f.ph || "")}">`;
  else if (f.t === "color") input = `<input id="${id}" name="${f.k}" type="color" value="${esc(v || "#7c5cff")}">`;
  else {
    const type = f.t === "number" ? "number" : f.t === "date" ? "date" : f.t === "url" ? "url" : "text";
    input = `<input id="${id}" name="${f.k}" type="${type}" ${type === "number" ? 'min="0" inputmode="numeric"' : ""} value="${esc(v ?? "")}" placeholder="${esc(f.ph || "")}" ${f.req ? "required" : ""}>`;
  }
  return `<label class="field ${cls}" for="${id}"><span>${esc(f.n)}${f.req ? " *" : ""}</span>${input}</label>`;
}

function findItem(col, id) {
  if (col === "meta") return DB.meta;
  return DB[col].find((x) => x._id === id);
}

function openEditor(key, docId, defaults = {}) {
  if (!canEdit()) return;
  const schema = SCHEMAS[key];
  const col = schema.col;
  const item = docId ? findItem(col, docId) : { ...structuredClone(schema.defaults || {}), ...defaults };
  if (!item) return;
  const fields = resolve(schema.fields, item);
  let lastGroup = null;
  const fieldsHtml = fields.map((f) => {
    const g = f.group && f.group !== lastGroup ? `<div class="group-title">${esc(f.group)}</div>` : "";
    lastGroup = f.group || lastGroup;
    return g + fieldHtml(f, item);
  }).join("");
  const canDelete = docId && !["links", "script", "stats", "settings"].includes(key);
  modal.classList.toggle("wide", !!schema.wide);
  modalForm.innerHTML = `
    <div class="modal-head"><h3>${esc(resolve(schema.label, item))} ${docId && !["links", "script", "stats", "settings"].includes(key) ? "수정" : docId ? "" : "추가"}</h3><button type="button" class="btn ghost" data-close aria-label="닫기">✕</button></div>
    <div class="fields">${fieldsHtml}</div>
    <div class="modal-foot">
      ${canDelete ? `<button type="button" class="btn danger" data-delete>삭제</button>` : "<span></span>"}
      <div class="btns"><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn primary">저장</button></div>
    </div>`;
  modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((f) => {
      const el = modalForm.elements[f.k];
      let val;
      if (f.t === "checkbox") val = el.checked;
      else if (f.t === "number" || f.num) val = el.value === "" ? (f.k.startsWith("stats.") ? 0 : null) : Number(el.value);
      else if (f.t === "tags") val = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      else val = el.value.trim();
      setPath(data, f.k, val);
    });
    if (!docId) Object.entries(defaults).forEach(([k, v]) => { if (!(k in data)) data[k] = v; });
    if (key === "ideas" && !data.id) data.id = nextIdeaId(data.series);
    if (key === "goals" && !docId) data.order = Date.now();
    schema.beforeSave?.(data, item);
    try {
      const id = await saveDoc(col, col === "meta" ? "main" : docId, data);
      modal.close();
      toast("저장했어요");
      if (!docId && key === "project") location.hash = `#p/${id}`;
      if (!docId && key === "episode") location.hash = `#e/${id}`;
    } catch (err) { console.error(err); toast("저장 실패: " + (err.code || err.message)); }
  };
  modalForm.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => modal.close()));
  const del = modalForm.querySelector("[data-delete]");
  if (del) del.onclick = () => deleteItem(key, col, item);
  modal.showModal();
  modalForm.querySelector("input,textarea,select")?.focus();
}

async function deleteItem(key, col, item) {
  const { fs, db } = fb;
  const name = item.title || item.name || item.text || item.account || "이 항목";
  let extra = [];
  if (col === "projects") extra = [...episodesOf(item._id).map((x) => ["episodes", x._id]), ...charsOf(item._id).map((x) => ["characters", x._id]), ...locsOf(item._id).map((x) => ["locations", x._id])];
  const msg = extra.length ? `'${name}'와 그 안의 편·캐릭터·배경 ${extra.length}개를 모두 삭제할까요? 되돌릴 수 없어요.` : `'${name}'을(를) 삭제할까요? 되돌릴 수 없어요.`;
  if (!confirm(msg)) return;
  try {
    const batch = fs.writeBatch(db);
    [[col, item._id], ...extra].forEach(([c, id]) => batch.delete(fs.doc(db, c, id)));
    await batch.commit();
    modal.close(); toast("삭제했어요");
    if (col === "projects") location.hash = item.track === "B" ? "#b" : "#a";
    if (col === "episodes" && location.hash.startsWith("#e/")) location.hash = `#p/${item.projectId}/episodes`;
  } catch (err) { toast("삭제 실패: " + (err.code || err.message)); }
}

function nextIdeaId(s) {
  const nums = DB.ideas.filter((i) => (i.id || "").startsWith(s)).map((i) => parseInt(i.id.slice(1), 10)).filter((n) => n < 90);
  return s + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

async function saveDoc(col, docId, data) {
  const { fs, db } = fb;
  const stamp = { updatedAt: fs.serverTimestamp(), updatedBy: user.email };
  if (docId) { await fs.setDoc(fs.doc(db, col, docId), { ...data, ...stamp }, { merge: true }); return docId; }
  const ref = await fs.addDoc(fs.collection(db, col), { ...data, ...stamp, createdAt: fs.serverTimestamp() });
  return ref.id;
}
const fail = (err) => toast("실패: " + (err.code || err.message));

/* ================= 클릭·입력 위임 ================= */
view.addEventListener("click", async (e) => {
  const go = e.target.closest("[data-go]");
  if (go && !e.target.closest("a,button,input")) { location.hash = go.dataset.go; return; }
  const pf = e.target.closest("[data-persona]");
  if (pf) { state.persona = pf.dataset.persona; route(true); return; }
  if (e.target.closest("[data-stop]")) { e.stopPropagation(); return; }
  const t = e.target.closest("[data-new],[data-edit],[data-toggle],[data-seed],[data-start],[data-check],[data-cutdone],[data-cutedit],[data-cutsave],[data-cutcancel],[data-cutins],[data-cutdel],[data-cutmove],[data-yt]");
  if (!t || !canEdit()) return;
  const d = t.dataset;
  if (d.new) return openEditor(d.new, null, JSON.parse(d.def || "{}"));
  if (d.edit) { const [k, id] = d.edit.split(":"); return openEditor(k, id); }
  if (d.toggle) { const g = DB.goals.find((x) => x._id === d.toggle); return saveDoc("goals", g._id, { done: !g.done }).catch(fail); }
  if (d.seed !== undefined) { t.disabled = true; return seed().catch((err) => { t.disabled = false; fail(err); }); }
  if (d.start) { e.stopPropagation(); t.disabled = true; return startFromIdea(d.start).catch(fail); }
  if (d.check) {
    const [id, k] = d.check.split(":");
    const ep = DB.episodes.find((x) => x._id === id);
    return saveDoc("episodes", id, { checklist: { [k]: !ep.checklist?.[k] } }).catch(fail);
  }
  if (d.cutdone) {
    const [id, i] = d.cutdone.split(":");
    const ep = DB.episodes.find((x) => x._id === id);
    const cuts = structuredClone(ep.cuts || []);
    cuts[+i].done = !cuts[+i].done;
    return saveDoc("episodes", id, { cuts }).catch(fail);
  }
  if (d.cutedit) {
    const ep = DB.episodes.find((x) => x._id === d.cutedit);
    cutDraft = { epId: ep._id, rows: structuredClone(ep.cuts?.length ? ep.cuts : [{}]) };
    return route(true);
  }
  if (!cutDraft) return;
  if (d.cutcancel !== undefined) { cutDraft = null; return route(true); }
  if (d.cutsave !== undefined) {
    const rows = cutDraft.rows.filter((r) => CUT_FIELDS.some(([k]) => String(r[k] ?? "").trim()))
      .map((r) => ({ ...Object.fromEntries(CUT_FIELDS.map(([k]) => [k, k === "sec" ? (Number(r[k]) || 0) : String(r[k] ?? "").trim()])), done: !!r.done }));
    const id = cutDraft.epId;
    try { await saveDoc("episodes", id, { cuts: rows }); cutDraft = null; toast("컷 리스트 저장"); route(true); } catch (err) { fail(err); }
    return;
  }
  if (d.cutins) { cutDraft.rows.splice(+d.cutins + 1, 0, {}); return route(true); }
  if (d.cutdel) { cutDraft.rows.splice(+d.cutdel, 1); return route(true); }
  if (d.cutmove) {
    const [i, dir] = d.cutmove.split(":").map(Number);
    const r = cutDraft.rows; [r[i], r[i + dir]] = [r[i + dir], r[i]];
    return route(true);
  }
  if (d.yt) { const ep = DB.episodes.find((x) => x._id === d.yt); return maybeSyncYouTube(ep, true); }
});
view.addEventListener("input", (e) => {
  const el = e.target;
  if (cutDraft && el.dataset.ci != null) cutDraft.rows[+el.dataset.ci][el.dataset.cf] = el.value;
});
window.addEventListener("beforeunload", (e) => { if (cutDraft) { e.preventDefault(); e.returnValue = ""; } });

/* ================= 새 구조 초기 데이터 ================= */
function seedBanner() {
  if (!canEdit() || DB.projects.length) return "";
  return `<div class="card banner"><div><b>새 작업실 구조로 시작할까요?</b><div class="muted small">A 「동백꽃」 작품(원작 정리·캐릭터·배경·1편 컷 초안)과 B 「조선 POV」 연재(EP.01 매품팔이 가안)를 만들고, 이번 주 목표를 바뀐 역할에 맞게 바꿔요.</div></div>
    <button class="btn primary" data-seed>작업실 만들기</button></div>`;
}
async function seed() {
  const { fs, db } = fb;
  const batch = fs.writeBatch(db);
  const stamp = { createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(), updatedBy: user.email };
  const nd = (c) => fs.doc(fs.collection(db, c));
  const idea = (id) => DB.ideas.find((i) => i.id === id);

  /* A: 동백꽃 */
  const pa = nd("projects");
  batch.set(pa, {
    track: "A", title: "동백꽃", author: "김유정", year: 1936, authorDeath: 1937, plannedEps: 2, owner: "친구", color: "#f0607a",
    sourceUrl: "https://ko.wikisource.org/wiki/%EB%8F%99%EB%B0%B1%EA%BD%83", ideaId: idea("A04")?._id || null,
    summary: "산골 마을. 소작농의 아들인 '나'(열일곱)에게 마름집 딸 점순이가 몰래 구운 감자를 내밀지만, \"느 집엔 이거 없지?\"라는 말에 자존심이 상한 '나'는 거절한다.\n그 뒤로 점순이는 자기네 큰 수탉을 '나'네 수탉과 싸움 붙이며 괴롭힌다. '나'는 닭에게 고추장까지 먹여보지만 번번이 진다.\n결국 화가 난 '나'는 점순이네 닭을 때려 죽이고, 마름집에 땅을 떼일까 겁이 나 울음을 터뜨린다. 점순이는 \"다시 안 그럴 테냐\"며 일러바치지 않겠다고 하고, 둘은 노란 동백꽃(생강나무꽃) 속으로 함께 쓰러진다.",
    adaptation: "• 로맨틱 코미디 톤. 눈치 없는 '나'의 1인칭 속마음을 자막·보이스오버로 살리기\n• 닭싸움은 실제 닭 대신 소리·깃털·리액션 인서트로\n• 노란 동백꽃 = 생강나무꽃 (강원도 말). 빨간 동백꽃 쓰면 고증 오류!",
    plan: "1편: 감자 거절 → 닭싸움 시작 → 고추장 작전 실패 (엔딩: 또 당하는 우리 닭, 씩 웃는 점순이)\n2편: 나무하고 내려오는 길 → 점순이네 닭을 때려 죽임 → 울음 → 동백꽃 속으로",
    ...stamp,
  });
  const chA = [
    { name: "나", role: "주인공 · 소작인의 아들", age: "17", personality: "순박하고 눈치가 하나도 없음. 점순이 마음을 끝까지 모름", speech: "투박한 강원도 말투\n\"난 감자 안 먹는다. 너나 먹어라\"", look: "베 바지저고리, 지게" },
    { name: "점순이", role: "마름집 딸", age: "17", personality: "당차고 적극적. 좋아하는 마음을 괴롭힘으로 표현", speech: "툭 던지는 말투\n\"느 집엔 이거 없지?\"", look: "댕기머리, 치마저고리" },
    { name: "수탉 두 마리", role: "점순이네 큰 수탉 vs 우리 작은 수탉", notes: "실제 닭 섭외 X. 소리·그림자·깃털·리액션 컷으로 대체" },
  ];
  chA.forEach((c) => batch.set(nd("characters"), { projectId: pa.id, track: "A", ...c, ...stamp }));
  const locA = [
    { name: "우리 집 울타리 앞 마당", time: "봄, 낮", desc: "점순이가 감자를 내미는 곳. 닭싸움이 벌어지는 곳", shootAt: "시골 담장·흙마당 (민속촌, 시골집)", props: "구운 감자, 고추장 종지, 바구니" },
    { name: "산기슭 동백꽃 덤불", time: "3월 말~4월 초 (생강나무 개화기)", desc: "엔딩. 노란 꽃 속으로 둘이 쓰러지는 곳", shootAt: "생강나무 군락이 있는 야산", props: "지게, 나뭇짐", notes: "개화기 놓치면 노란 조화로 대체" },
    { name: "산길", time: "봄, 오후", desc: "나무하고 내려오는 길", shootAt: "동네 뒷산 오솔길" },
  ];
  locA.forEach((l) => batch.set(nd("locations"), { projectId: pa.id, track: "A", ...l, ...stamp }));
  batch.set(nd("episodes"), {
    projectId: pa.id, track: "A", no: 1, title: "감자 거절했을 뿐인데", owner: "친구", checklist: { read: true, split: true },
    hook: "감자 거절했을 뿐인데, 걔가 우리 닭을 패기 시작했다", logline: "감자를 거절한 다음 날부터 점순이의 닭싸움 공격이 시작된다. 고추장 작전도 실패.",
    cuts: [
      { scene: "#1 인트로", loc: "마당", who: "점순, 나", action: "점순이 치마폭에서 감자를 꺼내 내민다", line: "점순: \"느 집엔 이거 없지?\"", shot: "투샷", sec: 4 },
      { scene: "", loc: "마당", who: "나", action: "자존심 상한 얼굴, 고개 홱", line: "나(속): 뭐? 우리 집엔 없다고?", shot: "클로즈업", sec: 3 },
      { scene: "", loc: "마당", who: "나", action: "감자를 손으로 밀어낸다", line: "나: \"난 감자 안 먹는다. 너나 먹어라\"", shot: "손 인서트", sec: 3 },
      { scene: "", loc: "마당", who: "점순", action: "얼굴이 빨개지고 눈물 그렁, 홱 돌아섬", line: "", shot: "클로즈업", sec: 3 },
      { scene: "#2 며칠 뒤", loc: "울타리", who: "나", action: "닭 비명에 달려 나감. 우리 닭이 쪼이고 있다", line: "효과음: 닭싸움", shot: "핸드헬드", sec: 5 },
      { scene: "", loc: "울타리 너머", who: "점순", action: "태연하게 구경하며 호드기를 분다", line: "나(속): 저게 일부러…!", shot: "와이드", sec: 4 },
      { scene: "#3 작전", loc: "부엌", who: "나", action: "고추장 종지를 몰래 챙김", line: "나: \"너도 이거 먹고 힘 좀 내라\"", shot: "인서트", sec: 4 },
      { scene: "", loc: "마당", who: "나", action: "의기양양 → 또 짐. 망연자실", line: "자막: 고추장 작전, 실패", shot: "미디엄", sec: 4 },
      { scene: "#4 엔딩", loc: "마당", who: "점순", action: "카메라를 보고 씩 웃는다", line: "자막: 2편에 계속", shot: "클로즈업", sec: 2 },
    ],
    ...stamp,
  });
  batch.set(nd("episodes"), { projectId: pa.id, track: "A", no: 2, title: "동백꽃 속으로", owner: "친구", checklist: {}, hook: "", logline: "점순이네 닭을 죽여버린 나, 그리고 노란 동백꽃.", ...stamp });

  /* B: 조선 POV */
  const pb = nd("projects");
  batch.set(pb, {
    track: "B", title: "조선 POV", owner: "나", cadence: "주 1회", color: "#14a38b",
    concept: "조선 사람 한 명을 골라, 그 사람의 하루를 1인칭 시점으로 안에서 보여준다.\n교과서 속 그 사람들, 진짜로 살아 있었다면.",
    format: "• 길이 45~75초, 세로 9:16\n• 첫 3초: 직업·상황을 한 문장 훅으로 (자막)\n• 시점: 카메라 = 주인공 눈, 또는 주인공이 카메라에 말 거는 브이로그형\n• 끝: '실제 기록' 한 줄 자막으로 고증 포인트\n• 회차마다 다른 인물, 반응 좋은 인물은 연작으로",
    research: "• 자료: 한국민족문화대백과사전, 조선왕조실록(국사편찬위원회), 국립민속박물관\n• 고증 우선순위: 직업의 실제 일과 > 말투 > 의상\n• 확실하지 않은 건 '~했다고 전해진다'로 처리",
    ...stamp,
  });
  const maep = nd("characters");
  batch.set(maep, { projectId: pb.id, track: "B", name: "매품팔이", role: "매품팔이 · 상민", age: "30대", personality: "넉살 좋은 생계형 프로. 맞는 것도 기술이다", speech: "\"오늘은 열 대요? 선금부터 주시오\"", look: "베 바지저고리, 패랭이", notes: "흥부전에도 나오는 직업. 곤장 삯 액수는 사료 확인 필요", ...stamp });
  batch.set(nd("characters"), { projectId: pb.id, track: "B", name: "전기수", role: "전기수 · 이야기꾼", personality: "가장 재밌는 대목에서 딱 멈추는 밀당의 고수", notes: "후보 인물. 종로 담배가게 앞에서 소설을 읽어줬다고 전해짐", ...stamp });
  [
    { name: "관아 마당", time: "낮", desc: "곤장을 맞는 곳", shootAt: "민속촌 관아 / 한옥 마당", notes: "곤장 장면은 소리·표정 위주로" },
    { name: "장터 주막", time: "아침", desc: "일거리(매품)를 구하는 곳", shootAt: "한옥 마을 주막 세트" },
  ].forEach((l) => batch.set(nd("locations"), { projectId: pb.id, track: "B", ...l, ...stamp }));
  batch.set(nd("episodes"), {
    projectId: pb.id, track: "B", no: 1, title: "매품팔이의 하루", persona: maep.id, owner: "나", checklist: {}, ideaId: idea("B02")?._id || null,
    hook: "남 대신 곤장 맞아주고 돈 받는 직업이 있었다", logline: "아침 주막에서 일감을 받고, 관아에서 대신 매를 맞고, 삯을 받아 돌아가는 하루. (인물 가안)",
    research: "매품팔이 기록·곤장 삯 액수 출처 확인", ...stamp,
  });

  /* 아이디어 상태·목표 정리 */
  const setStatus = (id, status) => { const i = idea(id); if (i) batch.set(fs.doc(db, "ideas", i._id), { status }, { merge: true }); };
  setStatus("A04", "제작중"); setStatus("B02", "제작중"); setStatus("A01", "후보"); setStatus("A02", "후보");
  DB.goals.forEach((g) => batch.delete(fs.doc(db, "goals", g._id)));
  [
    { text: "「동백꽃」 1편 완성", track: "A" },
    { text: "조선 POV EP.01 완성", track: "B" },
    { text: "구글 드라이브 공유 폴더 만들고 대시보드에 링크 넣기", track: "" },
    { text: "인스타·틱톡·유튜브 업로드 방법 정하기", track: "" },
    { text: "대시보드 세팅", track: "", done: true },
  ].forEach((g, i) => batch.set(nd("goals"), { done: false, ...g, order: i, ...stamp }));
  batch.set(fs.doc(db, "meta", "main"), { channelName: "Studio_Facet", tagline: "과거 속으로" }, { merge: true });
  await batch.commit();
  toast("작업실을 만들었어요!");
}

/* ================= 인증 UI ================= */
function renderAuth() {
  const el = document.getElementById("auth");
  if (!live) { el.innerHTML = ""; return; }
  if (!user) { el.innerHTML = `<button class="btn" id="login">구글 로그인</button>`; }
  else {
    const ok = canEdit();
    el.innerHTML = `<span class="who ${ok ? "" : "warn"}" title="${esc(user.email)}">${ok ? "✏️ 수정 가능" : "👀 보기 전용"} · ${esc(user.email.split("@")[0])}</span><button class="btn ghost small" id="logout">로그아웃</button>`;
  }
  el.querySelector("#login")?.addEventListener("click", () => fb.authApi.signInWithPopup(fb.auth, new fb.authApi.GoogleAuthProvider()).catch((e) => toast("로그인 실패: " + e.code)));
  el.querySelector("#logout")?.addEventListener("click", () => fb.authApi.signOut(fb.auth));
}

/* ================= 라우터 ================= */
let lastRoute = null;
function route(keepScroll = false) {
  const [head, a, b] = (location.hash || "#home").slice(1).split("/");
  const routeKey = location.hash;
  if (cutDraft && !routeKey.startsWith(`#e/${cutDraft.epId}/cuts`)) cutDraft = null;
  let tab = head;
  if (head === "p") tab = (projectById(a)?.track || "a").toLowerCase();
  if (head === "e") tab = (DB.episodes.find((e) => e._id === a)?.track || "a").toLowerCase();
  document.querySelectorAll("#tabs a").forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  view.className = tab === "a" || tab === "b" ? `track-${tab.toUpperCase()}` : "";
  const active = document.activeElement?.id;
  const pos = active === "q" ? document.getElementById("q").selectionStart : null;
  if (head === "a") renderTrackA();
  else if (head === "b") { const bp = projectsOf("B")[0]; bp ? renderProject(bp._id, a) : (view.innerHTML = `${seedBanner()}<div class="track-hero t-B"><span class="tbadge big">B</span><div><h2>조선 POV</h2><p class="muted">연재가 아직 없어요.</p></div>${newBtn("project", "연재 만들기", { track: "B", owner: TRACKS.B.owner }, "b")}</div>`); }
  else if (head === "p") renderProject(a, b);
  else if (head === "e") renderEpisode(a, b);
  else if (head === "ideas") renderIdeas();
  else if (head === "refs") renderRefs();
  else if (head === "guide") renderGuide();
  else renderHome();
  if (active === "q") { const q = document.getElementById("q"); q?.focus(); q?.setSelectionRange(pos, pos); }
  if (!keepScroll && routeKey !== lastRoute) window.scrollTo(0, 0);
  lastRoute = routeKey;
}
let rerenderQueued = false;
function rerender() {
  if (cutDraft) { pendingRender = true; return; }   // 컷 편집 중엔 화면 유지
  if (rerenderQueued) return;
  rerenderQueued = true;
  requestAnimationFrame(() => { rerenderQueued = false; route(true); });
}

/* ================= 시작 ================= */
async function startLive() {
  const [{ initializeApp }, fs, authApi] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js"), import(FB + "firebase-auth.js"),
  ]);
  const app = initializeApp(firebaseConfig);
  fb = { db: fs.getFirestore(app), auth: authApi.getAuth(app), fs, authApi };
  live = true;
  const sorters = {
    projects: (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
    episodes: (a, b) => (a.no || 0) - (b.no || 0),
    characters: (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
    locations: (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
    ideas: (a, b) => (a.id || "zz").localeCompare(b.id || "zz"),
    references: (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    goals: (a, b) => (a.order || 0) - (b.order || 0),
  };
  const loaded = new Set();
  COLS.forEach((c) => fs.onSnapshot(fs.collection(fb.db, c), (snap) => {
    DB[c] = snap.docs.map((d) => ({ _id: d.id, ...d.data() })).sort(sorters[c]);
    loaded.add(c);
    if (loaded.size >= COLS.length) rerender();
  }, (err) => { console.error(c, err); toast("데이터 연결 오류"); }));
  fs.onSnapshot(fs.doc(fb.db, "meta", "main"), (d) => { DB.meta = d.data() || {}; if (loaded.size >= COLS.length) rerender(); });
  authApi.onAuthStateChanged(fb.auth, (u) => { user = u; renderAuth(); if (loaded.size >= COLS.length) rerender(); });
  document.getElementById("updated").textContent = "실시간 연결됨 · 수정하면 모두의 화면에 바로 반영돼요";
}

async function startStatic() {
  const src = await (await fetch("data/db.json", { cache: "no-store" })).json();
  Object.assign(DB, { meta: src.meta || {}, goals: src.goals || src.meta?.weekGoals || [] });
  COLS.filter((c) => c !== "goals").forEach((c) => { DB[c] = (src[c] || []).map((x, i) => ({ _id: x._id || x.id || `${c}${i}`, ...x })); });
  document.getElementById("updated").textContent = `보기 전용 모드 · 마지막 갱신 ${src.meta?.updatedAt || "-"}`;
  route();
}

document.getElementById("brandGem").innerHTML = gem(44);
window.addEventListener("hashchange", () => {
  if (cutDraft && !location.hash.startsWith(`#e/${cutDraft.epId}/cuts`)) {
    if (!confirm("컷 편집 중이에요. 저장하지 않고 나갈까요?")) { history.back(); return; }
    cutDraft = null;
  }
  if (pendingRender) pendingRender = false;
  route();
});
(firebaseConfig ? startLive() : startStatic()).catch((err) => {
  console.error(err);
  view.innerHTML = `<div class="empty"><b>데이터를 불러오지 못했어요</b>잠시 후 새로고침 해주세요.</div>`;
});
