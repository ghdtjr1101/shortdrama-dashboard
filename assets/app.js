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
const STAGES = ["아이디어", "대본", "촬영", "편집", "예약", "게시"];
const STATUS_ORDER = ["제작중", "후보", "아이디어", "게시됨", "보류"];
const SERIES_OPTS = [["A", "A · 단편문학 드라마"], ["B", "B · 조선 POV"], ["C", "C · 문장 하나 드라마"]];
const DEFAULT_SERIES = [
  { key: "A", name: "단편문학 드라마", desc: "저작권 만료 근현대 단편을 1~3편 숏드라마로", role: "메인" },
  { key: "B", name: "조선 POV", desc: "그 시대 한 사람의 하루를 1인칭으로", role: "2~3주차부터" },
  { key: "C", name: "문장 하나 드라마", desc: "철학자·시인의 한 문장을 현대 상황극으로", role: "사이사이 가볍게" },
];

/* 편집 폼 스키마 */
const SCHEMAS = {
  ideas: {
    label: "아이디어",
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
  pipeline: {
    label: "제작 카드",
    fields: [
      { k: "title", n: "제목", t: "text", req: true },
      { k: "stage", n: "단계", t: "select", opts: STAGES, half: true },
      { k: "owner", n: "담당", t: "text", list: ["친구 A", "친구 B", "같이"], half: true },
      { k: "due", n: "마감", t: "date", half: true },
      { k: "notes", n: "메모", t: "textarea" },
    ],
    defaults: { stage: "아이디어" },
  },
  posts: {
    label: "게시 영상",
    fields: [
      { k: "title", n: "영상 제목", t: "text", req: true },
      { k: "series", n: "시리즈", t: "select", opts: SERIES_OPTS, half: true },
      { k: "date", n: "게시일", t: "date", half: true },
      ...PLATFORMS.map((p) => ({ k: `links.${p.key}`, n: `${p.name} 링크`, t: "url" })),
      ...PLATFORMS.flatMap((p) => METRICS.map((m) => ({ k: `stats.${p.key}.${m.key}`, n: `${p.name} ${m.name}`, t: "number", third: true, group: p.name }))),
    ],
    defaults: { series: "A" },
  },
  references: {
    label: "레퍼런스",
    fields: [
      { k: "url", n: "영상/계정 링크", t: "url", req: true },
      { k: "account", n: "계정 이름", t: "text", ph: "@account", half: true },
      { k: "platform", n: "플랫폼", t: "select", opts: [["", "자동 인식"], ["instagram", "인스타"], ["tiktok", "틱톡"], ["youtube", "유튜브"], ["etc", "기타"]], half: true },
      { k: "title", n: "영상 제목", t: "text" },
      { k: "why", n: "왜 참고? (훔칠 포인트)", t: "textarea" },
      { k: "tags", n: "태그 (쉼표로 구분)", t: "tags", ph: "훅, 편집, 연기" },
      { k: "thumbnail", n: "썸네일 이미지 주소 (인스타만 필요)", t: "url" },
    ],
    defaults: {},
  },
  goals: {
    label: "이번 주 목표",
    fields: [
      { k: "text", n: "목표", t: "text", req: true },
      { k: "done", n: "완료", t: "checkbox" },
    ],
    defaults: { done: false },
  },
};

/* ================= 상태 ================= */
const DB = { meta: {}, ideas: [], pipeline: [], posts: [], references: [], goals: [] };
const state = { series: "all", status: "all", q: "", sort: null, sortDir: 1, refTag: "all" };
let fb = null;          // { db, auth, fs, authApi }
let user = null;
let live = false;       // Firestore 연결 여부
const view = document.getElementById("view");
const modal = document.getElementById("modal");
const modalForm = document.getElementById("modalForm");

const canEdit = () => !!(live && user && EDITORS.includes((user.email || "").toLowerCase()));

/* ================= 유틸 ================= */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n == null ? "-" : n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + "만" : Number(n).toLocaleString("ko-KR"));
const series = () => (DB.meta.series && DB.meta.series.length ? DB.meta.series : DEFAULT_SERIES);
const seriesName = (k) => (series().find((s) => s.key === k) || {}).name || k;
const copyTag = (c) => (c === "OK" ? `<span class="tag ok">저작권 OK</span>` : c === "불가" ? `<span class="tag bad">사용 불가</span>` : `<span class="tag warn">확인 필요</span>`);
const statusTag = (s) => `<span class="tag ${s === "제작중" ? "" : s === "게시됨" ? "ok" : "plain"}">${esc(s)}</span>`;
const dots = (n) => (n ? `<span class="dots" title="난이도 ${n}/3">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "-");
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); let c = o; ks.slice(0, -1).forEach((k) => (c = c[k] ??= {})); c[ks.at(-1)] = v; };
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2200);
}
const editBtn = (col, label) => (canEdit() ? `<button class="btn primary" data-new="${col}">+ ${label}</button>` : "");

function totals(posts) {
  const t = {};
  PLATFORMS.forEach((p) => { t[p.key] = {}; METRICS.forEach((m) => (t[p.key][m.key] = 0)); });
  posts.forEach((post) => PLATFORMS.forEach((p) => METRICS.forEach((m) => { t[p.key][m.key] += Number(post.stats?.[p.key]?.[m.key]) || 0; })));
  const all = {};
  METRICS.forEach((m) => (all[m.key] = PLATFORMS.reduce((a, p) => a + t[p.key][m.key], 0)));
  return { byPlatform: t, all };
}

/* ================= HOME ================= */
function renderHome() {
  const { ideas, pipeline, posts, goals } = DB;
  const t = totals(posts);
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
  const maxViews = Math.max(1, ...PLATFORMS.map((p) => t.byPlatform[p.key].views));
  const usable = ideas.filter((i) => i.copyright !== "불가");

  const seriesCards = series().map((s) => {
    const list = usable.filter((i) => i.series === s.key);
    const active = list.filter((i) => i.status === "제작중" || i.status === "후보").length;
    return `<div class="card series-card s-${s.key}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="tag">시리즈 ${s.key} · ${esc(s.role)}</span><span class="count">${list.length}</span>
      </div>
      <h3 style="margin:10px 0 4px">${esc(s.name)}</h3>
      <div class="muted" style="font-size:13px">${esc(s.desc)}</div>
      <div style="font-size:12.5px;margin-top:8px" class="muted">제작중·후보 ${active}개</div>
    </div>`;
  }).join("");

  const inProgress = pipeline.filter((p) => p.stage !== "게시");

  view.innerHTML = `
    ${migrationBanner()}
    <div class="section-head"><div><h2>이번 주 한눈에</h2><p class="muted">콘텐츠에만 집중할 수 있게, 나머지는 여기서 확인</p></div></div>
    <div class="grid kpis">
      <div class="card kpi"><div class="label">게시한 영상</div><div class="value">${posts.length}</div><div class="sub">플랫폼 3곳 동시 업로드 기준</div></div>
      <div class="card kpi"><div class="label">총 조회수</div><div class="value">${fmt(t.all.views)}</div><div class="sub">인스타+틱톡+유튜브</div></div>
      <div class="card kpi"><div class="label">총 좋아요</div><div class="value">${fmt(t.all.likes)}</div><div class="sub">댓글 ${fmt(t.all.comments)}</div></div>
      <div class="card kpi"><div class="label">총 공유·저장</div><div class="value">${fmt(t.all.shares + t.all.saves)}</div><div class="sub">공유 ${fmt(t.all.shares)} · 저장 ${fmt(t.all.saves)}</div></div>
    </div>

    <div class="grid two" style="margin-top:14px">
      <div class="card">
        <div class="card-head"><h3>이번 주 목표</h3>${canEdit() ? `<button class="btn small" data-new="goals">+ 목표</button>` : ""}</div>
        <div class="muted" style="font-size:13px">${done}/${goals.length} 완료 · ${pct}%</div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <ul class="checklist">${goals.map((g) => `<li>
          <button class="box ${g.done ? "on" : ""}" ${canEdit() ? `data-toggle="${g._id}"` : "disabled"} aria-label="완료 표시">${g.done ? "✓" : ""}</button>
          <span class="${g.done ? "done" : ""} ${canEdit() ? "editable" : ""}" ${canEdit() ? `data-edit="goals:${g._id}"` : ""}>${esc(g.text)}</span></li>`).join("") || `<li class="muted">목표가 없어요.</li>`}</ul>
      </div>
      <div class="card">
        <div class="card-head"><h3>지금 만드는 중</h3>${canEdit() ? `<button class="btn small" data-new="pipeline">+ 카드</button>` : ""}</div>
        ${inProgress.length ? inProgress.map((p) => `
          <div class="task ${canEdit() ? "editable" : ""}" ${canEdit() ? `data-edit="pipeline:${p._id}"` : ""}>
            <b>${esc(p.title)}</b>
            <span class="tag">${esc(p.stage)}</span> <span class="tag plain">${esc(p.owner || "-")}</span>
            <div class="muted" style="margin-top:6px">마감 ${esc(p.due || "-")}${p.notes ? " · " + esc(p.notes) : ""}</div>
          </div>`).join("") : `<div class="muted">진행 중인 작업이 없어요.</div>`}
        <a href="#pipeline" class="muted" style="font-size:13px">제작 보드 전체 보기 →</a>
      </div>
    </div>

    <div class="grid two" style="margin-top:14px">
      <div class="card">
        <h3>플랫폼별 조회수</h3>
        ${posts.length ? `<div class="bars">${PLATFORMS.map((p) => {
          const v = t.byPlatform[p.key].views;
          return `<div class="bar-row"><span>${p.name}</span><div class="bar-track"><div class="bar-fill ${p.cls}" style="width:${(v / maxViews) * 100}%"></div></div><span class="num" style="text-align:right">${fmt(v)}</span></div>`;
        }).join("")}</div>` : `<div class="empty" style="padding:24px"><b>아직 게시된 영상이 없어요</b>성과 탭에서 첫 영상을 추가하면 여기에 쌓여요.</div>`}
      </div>
      <div class="card">
        <h3>아이디어 창고</h3>
        <div class="muted" style="font-size:13px;margin-bottom:10px">총 ${usable.length}개 아이디어</div>
        <div class="bars">${STATUS_ORDER.map((s) => {
          const n = usable.filter((i) => i.status === s).length;
          return `<div class="bar-row"><span>${s}</span><div class="bar-track"><div class="bar-fill" style="background:var(--accent);width:${(n / Math.max(1, usable.length)) * 100}%"></div></div><span class="num" style="text-align:right">${n}</span></div>`;
        }).join("")}</div>
        <a href="#ideas" class="muted" style="font-size:13px;display:inline-block;margin-top:12px">아이디어 시트 열기 →</a>
      </div>
    </div>

    <div class="section-head" style="margin-top:26px"><div><h2>시리즈</h2></div></div>
    <div class="grid three">${seriesCards}</div>
  `;
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
  const chips = [{ key: "all", name: "전체" }, ...series().map((s) => ({ key: s.key, name: `${s.key} · ${s.name}` }))];
  view.innerHTML = `
    <div class="section-head">
      <div><h2>콘텐츠 아이디어 시트</h2><p class="muted">구상한 모든 소재를 쌓아두는 곳. ${canEdit() ? "행을 누르면 수정할 수 있어요." : ""}</p></div>
      ${editBtn("ideas", "아이디어")}
    </div>
    <div class="toolbar">
      <input id="q" type="search" placeholder="작품명, 훅, 메모 검색" value="${esc(state.q)}">
      <select id="status">${statuses.map((s) => `<option value="${s}" ${state.status === s ? "selected" : ""}>${s === "all" ? "상태: 전체" : s}</option>`).join("")}</select>
    </div>
    <div class="chips" style="margin-bottom:14px">${chips.map((c) => `<button class="chip ${state.series === c.key ? "on" : ""}" data-series="${c.key}">${esc(c.name)}</button>`).join("")}</div>
    <div id="ideaBody"></div>`;
  const q = view.querySelector("#q");
  q.addEventListener("input", () => { state.q = q.value; drawIdeaBody(); });
  view.querySelector("#status").addEventListener("change", (e) => { state.status = e.target.value; drawIdeaBody(); });
  view.querySelectorAll("[data-series]").forEach((b) => b.addEventListener("click", () => { state.series = b.dataset.series; renderIdeas(); }));
  drawIdeaBody();
}

function drawIdeaBody() {
  const list = filteredIdeas();
  const body = view.querySelector("#ideaBody");
  if (!body) return;
  const cols = [["id", "ID"], ["series", "시리즈"], ["title", "제목"], ["source", "원작/출처"], ["copyright", "저작권"], ["hook", "훅 (첫 3초)"], ["episodes", "분량"], ["cast", "인원"], ["difficulty", "난이도"], ["status", "상태"], ["notes", "메모"]];
  if (!list.length) { body.innerHTML = `<div class="empty"><b>아이디어가 없어요</b>${DB.ideas.length ? "필터를 바꿔보세요." : canEdit() ? "오른쪽 위 + 아이디어 버튼으로 추가해요." : ""}</div>`; return; }
  const ed = canEdit();
  body.innerHTML = `
    <div class="muted" style="font-size:13px;margin-bottom:8px">${list.length}개</div>
    <div class="table-wrap ideas-table"><table>
      <thead><tr>${cols.map(([k, n]) => `<th data-sort="${k}">${n}${state.sort === k ? (state.sortDir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
      <tbody>${list.map((i) => `<tr class="${ed ? "editable" : ""}" ${ed ? `data-edit="ideas:${i._id}"` : ""}>
        <td class="muted">${esc(i.id)}</td>
        <td><span class="tag s-${i.series}">${esc(i.series)}</span></td>
        <td class="title">${esc(i.title)}</td>
        <td class="muted" style="white-space:nowrap">${esc(i.source)}${i.authorDeath ? `<br><span style="font-size:12px">작가 사망 ${i.authorDeath}</span>` : ""}</td>
        <td>${copyTag(i.copyright)}</td>
        <td class="hook">${esc(i.hook)}</td>
        <td style="white-space:nowrap">${esc(i.episodes)}</td>
        <td style="white-space:nowrap">${esc(i.cast)}</td>
        <td>${dots(i.difficulty)}</td>
        <td>${statusTag(i.status)}</td>
        <td class="notes">${esc(i.notes)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="cards-list">${list.map((i) => `<div class="card idea-card ${ed ? "editable" : ""}" ${ed ? `data-edit="ideas:${i._id}"` : ""}>
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>${esc(i.title)}</h3>${statusTag(i.status)}</div>
      <div class="row"><span class="tag s-${i.series}">${esc(seriesName(i.series))}</span>${copyTag(i.copyright)}<span class="tag plain">${esc(i.cast)}</span><span class="tag plain">${esc(i.episodes)}</span></div>
      <div class="muted" style="font-size:12.5px">${esc(i.source)}</div>
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

/* ================= PIPELINE ================= */
function renderPipeline() {
  const ed = canEdit();
  view.innerHTML = `
    <div class="section-head"><div><h2>제작 보드</h2><p class="muted">아이디어 → 대본 → 촬영 → 편집 → 예약 → 게시 ${ed ? "· ◀ ▶로 단계 이동, 카드를 누르면 수정" : ""}</p></div>${editBtn("pipeline", "카드")}</div>
    <div class="kanban">${STAGES.map((st, si) => {
      const items = DB.pipeline.filter((p) => (p.stage || "아이디어") === st);
      return `<div class="col"><h4><span>${st}</span><span class="muted">${items.length}</span></h4>
        ${items.map((p) => `<div class="task ${ed ? "editable" : ""}" ${ed ? `data-edit="pipeline:${p._id}"` : ""}>
          <b>${esc(p.title)}</b>
          <span class="tag plain">${esc(p.owner || "-")}</span>
          <div class="muted" style="margin-top:6px">마감 ${esc(p.due || "-")}</div>
          ${p.notes ? `<div class="muted" style="margin-top:4px">${esc(p.notes)}</div>` : ""}
          ${ed ? `<div class="move">
            <button class="btn tiny" data-move="${p._id}:${si - 1}" ${si === 0 ? "disabled" : ""} aria-label="이전 단계">◀</button>
            <button class="btn tiny" data-move="${p._id}:${si + 1}" ${si === STAGES.length - 1 ? "disabled" : ""} aria-label="다음 단계">▶</button>
          </div>` : ""}
        </div>`).join("")}
      </div>`;
    }).join("")}</div>`;
}

/* ================= STATS ================= */
function renderStats() {
  const posts = DB.posts;
  const t = totals(posts);
  const ed = canEdit();
  const head = `<div class="section-head"><div><h2>성과</h2><p class="muted">게시 후 3일차 숫자 기준 · ${ed ? "행을 누르면 숫자 수정" : "영상별·플랫폼별"}</p></div>${editBtn("posts", "게시 영상")}</div>`;
  if (!posts.length) {
    view.innerHTML = `${head}<div class="empty"><b>아직 게시된 영상이 없어요</b>${ed ? "+ 게시 영상 버튼으로 영상과 플랫폼별 숫자를 넣어요." : "첫 영상이 올라가면 여기에 쌓여요."}</div>`;
    return;
  }
  const rows = posts.map((post) => {
    const sum = (m) => PLATFORMS.reduce((a, p) => a + (Number(post.stats?.[p.key]?.[m]) || 0), 0);
    return `<tr class="${ed ? "editable" : ""}" ${ed ? `data-edit="posts:${post._id}"` : ""}>
      <td class="title">${esc(post.title)}<div class="muted" style="font-weight:400;font-size:12px">${esc(post.date || "")} · ${esc(seriesName(post.series))}</div></td>
      ${PLATFORMS.map((p) => `<td class="num">${post.links?.[p.key] ? `<a href="${esc(post.links[p.key])}" target="_blank" rel="noopener">${fmt(post.stats?.[p.key]?.views)}</a>` : fmt(post.stats?.[p.key]?.views)}</td>`).join("")}
      ${METRICS.map((m) => `<td class="num">${fmt(sum(m.key))}</td>`).join("")}
    </tr>`;
  }).join("");
  view.innerHTML = `${head}
    <div class="grid kpis">${METRICS.slice(0, 4).map((m) => `<div class="card kpi"><div class="label">총 ${m.name}</div><div class="value">${fmt(t.all[m.key])}</div><div class="sub">${PLATFORMS.map((p) => `${p.name} ${fmt(t.byPlatform[p.key][m.key])}`).join(" · ")}</div></div>`).join("")}</div>
    <div class="table-wrap" style="margin-top:14px"><table>
      <thead><tr><th>영상</th>${PLATFORMS.map((p) => `<th style="text-align:right">${p.name} 조회</th>`).join("")}${METRICS.map((m) => `<th style="text-align:right">합계 ${m.name}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

/* ================= REFERENCES ================= */
const PLAT_COLOR = { instagram: "#c13584", tiktok: "#111", youtube: "#e62117" };
const detectPlatform = (url = "") => (/youtu\.?be/.test(url) ? "youtube" : /tiktok\.com/.test(url) ? "tiktok" : /instagram\.com/.test(url) ? "instagram" : "etc");
const youtubeId = (url = "") => (url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || null;
function thumbFor(r) {
  if (r.thumbnail) return r.thumbnail;
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
  const list = state.refTag === "all" ? refs : refs.filter((r) => (r.tags || []).includes(state.refTag));
  view.innerHTML = `
    <div class="section-head"><div><h2>레퍼런스 보드</h2><p class="muted">참고할 계정 · 영상 · 훔칠 포인트</p></div>${editBtn("references", "레퍼런스")}</div>
    ${tags.length ? `<div class="chips" style="margin-bottom:14px">${["all", ...tags].map((t) => `<button class="chip ${state.refTag === t ? "on" : ""}" data-tag="${esc(t)}">${t === "all" ? "전체" : esc(t)}</button>`).join("")}</div>` : ""}
    ${list.length ? `<div class="gallery">${list.map((r, idx) => {
      const plat = r.platform || detectPlatform(r.url);
      const th = thumbFor(r);
      return `<div class="ref" data-idx="${idx}" data-plat="${plat}">
        <a class="thumb" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="plat" style="background:${PLAT_COLOR[plat] || "#666"}">${plat}</span>🎬${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : ""}</a>
        <div class="body"><span class="acct">${esc(r.account || "")}</span>
          ${r.title ? `<span style="font-size:13px">${esc(r.title)}</span>` : ""}
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

    <h3>✏️ 수정하는 법</h3>
    <ul>
      <li>오른쪽 위 <b>구글 로그인</b> → 등록된 두 계정만 수정할 수 있어요. 로그인 안 하면 보기만 가능.</li>
      <li>각 탭의 <b>+ 버튼</b>으로 추가, 행·카드를 <b>누르면</b> 수정·삭제.</li>
      <li>저장하면 <b>서로의 화면에 바로</b> 반영돼요 (새로고침 필요 없음).</li>
    </ul>

    <h3>🎬 영상 1개 만드는 흐름</h3>
    <ol>
      <li>아이디어 시트에서 고르기 → 제작 보드에 카드 만들기</li>
      <li>대본: 첫 3초 훅을 먼저 쓰고, 60~90초 안에 끝내기</li>
      <li>촬영 → 편집 (자막 필수, 고정 오프닝 카드 1초)</li>
      <li>Buffer/Metricool로 인스타·틱톡·유튜브 <b>워터마크 없는 원본</b> 예약 업로드</li>
      <li>게시 후 3일차에 성과 탭에 숫자 입력 → 다음 기획에 반영</li>
    </ol>

    <h3>⚖️ 저작권 체크</h3>
    <ul>
      <li>한국: 저자 사망 후 70년. <b>1962년 12월 31일까지 사망한 작가</b>의 작품은 보호기간 만료.</li>
      <li>원작 본문은 OK. 단, 출판사 현대어 편집본·주석·기존 드라마 각색본은 따로 저작권이 있어요.</li>
      <li>❌ 헷갈리기 쉬운 보호 작품: 황순원 「소나기」, 주요섭 「사랑손님과 어머니」, 염상섭(1963 사망) 작품</li>
      <li>음악은 각 플랫폼 앱 내 라이브러리 사운드만. 상업 음원을 영상에 넣으면 유튜브 Content ID에 걸려요.</li>
    </ul>

    <h3>📈 성과 기록 규칙</h3>
    <ul>
      <li>게시 후 <b>3일차 숫자</b>를 기준으로 기록 (영상끼리 비교하려고)</li>
      <li>조회 · 좋아요 · 댓글 · 공유 · 저장 5개만</li>
    </ul>
  </div>`;
}

/* ================= 편집 모달 ================= */
function fieldHtml(f, item) {
  const v = getPath(item, f.k);
  const id = `f_${f.k.replace(/\./g, "_")}`;
  const cls = f.third ? "third" : f.half ? "half" : "full";
  let input;
  if (f.t === "textarea") input = `<textarea id="${id}" name="${f.k}" rows="2" placeholder="${esc(f.ph || "")}">${esc(v ?? "")}</textarea>`;
  else if (f.t === "select") input = `<select id="${id}" name="${f.k}">${f.opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v ?? "") === String(val) ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>`;
  else if (f.t === "checkbox") return `<label class="field full check"><input type="checkbox" name="${f.k}" ${v ? "checked" : ""}> ${esc(f.n)}</label>`;
  else if (f.t === "tags") input = `<input id="${id}" name="${f.k}" type="text" value="${esc((v || []).join(", "))}" placeholder="${esc(f.ph || "")}">`;
  else {
    const type = f.t === "number" ? "number" : f.t === "date" ? "date" : f.t === "url" ? "url" : "text";
    const list = f.list ? `list="${id}_list"` : "";
    input = `<input id="${id}" name="${f.k}" type="${type}" ${type === "number" ? 'min="0" inputmode="numeric"' : ""} value="${esc(v ?? "")}" placeholder="${esc(f.ph || "")}" ${f.req ? "required" : ""} ${list}>` +
      (f.list ? `<datalist id="${id}_list">${f.list.map((o) => `<option value="${esc(o)}">`).join("")}</datalist>` : "");
  }
  return `<label class="field ${cls}" for="${id}"><span>${esc(f.n)}${f.req ? " *" : ""}</span>${input}</label>`;
}

function openEditor(col, docId) {
  if (!canEdit()) return;
  const schema = SCHEMAS[col];
  const item = docId ? DB[col].find((x) => x._id === docId) : structuredClone(schema.defaults);
  if (!item) return;
  let lastGroup = null;
  const fieldsHtml = schema.fields.map((f) => {
    const g = f.group && f.group !== lastGroup ? `<div class="group-title full">${esc(f.group)} 숫자</div>` : "";
    lastGroup = f.group || null;
    return g + fieldHtml(f, item);
  }).join("");
  modalForm.innerHTML = `
    <div class="modal-head"><h3>${esc(schema.label)} ${docId ? "수정" : "추가"}</h3><button type="button" class="btn ghost" data-close aria-label="닫기">✕</button></div>
    <div class="fields">${fieldsHtml}</div>
    <div class="modal-foot">
      ${docId ? `<button type="button" class="btn danger" data-delete>삭제</button>` : "<span></span>"}
      <div style="display:flex;gap:8px"><button type="button" class="btn" data-close>취소</button><button type="submit" class="btn primary">저장</button></div>
    </div>`;
  modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = {};
    schema.fields.forEach((f) => {
      const el = modalForm.elements[f.k];
      let val;
      if (f.t === "checkbox") val = el.checked;
      else if (f.t === "number" || f.num) val = el.value === "" ? (f.t === "number" && f.k.startsWith("stats.") ? 0 : null) : Number(el.value);
      else if (f.t === "tags") val = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      else val = el.value.trim();
      setPath(data, f.k, val);
    });
    if (col === "ideas" && !data.id) data.id = nextIdeaId(data.series);
    if (col === "goals" && !docId) data.order = Date.now();
    try {
      await saveDoc(col, docId, data);
      modal.close();
      toast("저장했어요");
    } catch (err) { console.error(err); toast("저장 실패: " + (err.code || err.message)); }
  };
  modalForm.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => modal.close()));
  const del = modalForm.querySelector("[data-delete]");
  if (del) del.onclick = async () => {
    if (!confirm(`'${item.title || item.text || item.account || "이 항목"}'을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    try { await fb.fs.deleteDoc(fb.fs.doc(fb.db, col, docId)); modal.close(); toast("삭제했어요"); }
    catch (err) { toast("삭제 실패: " + (err.code || err.message)); }
  };
  modal.showModal();
  modalForm.querySelector("input,textarea,select")?.focus();
}

function nextIdeaId(s) {
  const nums = DB.ideas.filter((i) => (i.id || "").startsWith(s)).map((i) => parseInt(i.id.slice(1), 10)).filter((n) => n < 90);
  return s + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

async function saveDoc(col, docId, data) {
  const { fs, db } = fb;
  const stamp = { updatedAt: fs.serverTimestamp(), updatedBy: user.email };
  if (docId) await fs.setDoc(fs.doc(db, col, docId), { ...data, ...stamp }, { merge: true });
  else await fs.addDoc(fs.collection(db, col), { ...data, ...stamp, createdAt: fs.serverTimestamp() });
}

/* 클릭 위임: 추가/수정/단계이동/체크 */
view.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-new],[data-edit],[data-move],[data-toggle],[data-migrate]");
  if (!t || !canEdit()) return;
  if (t.dataset.new) return openEditor(t.dataset.new);
  if (t.dataset.edit) { const [c, id] = t.dataset.edit.split(":"); return openEditor(c, id); }
  if (t.dataset.move) {
    e.stopPropagation();
    const [id, idx] = t.dataset.move.split(":");
    return saveDoc("pipeline", id, { stage: STAGES[+idx] }).catch((err) => toast("실패: " + err.code));
  }
  if (t.dataset.toggle) {
    const g = DB.goals.find((x) => x._id === t.dataset.toggle);
    return saveDoc("goals", g._id, { done: !g.done }).catch((err) => toast("실패: " + err.code));
  }
  if (t.dataset.migrate !== undefined) return migrate();
});

/* ================= 초기 데이터 옮기기 ================= */
function migrationBanner() {
  if (!canEdit() || DB.ideas.length || DB.pipeline.length) return "";
  return `<div class="card banner"><b>데이터베이스가 비어 있어요.</b> 기존 아이디어 31개·제작 카드·목표를 한 번에 옮길까요?
    <button class="btn primary" data-migrate>기존 데이터 가져오기</button></div>`;
}
async function migrate() {
  const { fs, db } = fb;
  const src = await (await fetch("data/db.json", { cache: "no-store" })).json();
  const batch = fs.writeBatch(db);
  const stamp = { createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(), updatedBy: user.email };
  (src.ideas || []).forEach((i) => batch.set(fs.doc(fs.collection(db, "ideas")), { ...i, ...stamp }));
  (src.pipeline || []).forEach((p) => { const { id, ideaId, ...rest } = p; batch.set(fs.doc(fs.collection(db, "pipeline")), { ...rest, ...stamp }); });
  (src.posts || []).forEach((p) => { const { id, ...rest } = p; batch.set(fs.doc(fs.collection(db, "posts")), { ...rest, ...stamp }); });
  (src.references || []).forEach((r) => batch.set(fs.doc(fs.collection(db, "references")), { ...r, ...stamp }));
  (src.meta?.weekGoals || []).forEach((g, i) => batch.set(fs.doc(fs.collection(db, "goals")), { ...g, order: i, ...stamp }));
  const { weekGoals, updatedAt, source, ...meta } = src.meta || {};
  batch.set(fs.doc(db, "meta", "main"), meta);
  await batch.commit();
  toast("옮기기 완료!");
}

/* ================= 인증 UI ================= */
function renderAuth() {
  const el = document.getElementById("auth");
  if (!live) { el.innerHTML = ""; return; }
  if (!user) { el.innerHTML = `<button class="btn" id="login">구글 로그인해서 수정</button>`; }
  else {
    const ok = canEdit();
    el.innerHTML = `<span class="who ${ok ? "" : "warn"}" title="${esc(user.email)}">${ok ? "✏️ 수정 가능" : "👀 보기 전용 계정"} · ${esc(user.email.split("@")[0])}</span><button class="btn ghost small" id="logout">로그아웃</button>`;
  }
  el.querySelector("#login")?.addEventListener("click", () => fb.authApi.signInWithPopup(fb.auth, new fb.authApi.GoogleAuthProvider()).catch((e) => toast("로그인 실패: " + e.code)));
  el.querySelector("#logout")?.addEventListener("click", () => fb.authApi.signOut(fb.auth));
}

/* ================= 라우터 ================= */
const routes = { home: renderHome, ideas: renderIdeas, pipeline: renderPipeline, stats: renderStats, refs: renderRefs, guide: renderGuide };
let currentTab = null;
function route(keepScroll = false) {
  const tab = routes[(location.hash || "#home").slice(1)] ? (location.hash || "#home").slice(1) : "home";
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
  const active = document.activeElement?.id;
  const pos = active === "q" ? document.getElementById("q").selectionStart : null;
  routes[tab]();
  if (active === "q") { const q = document.getElementById("q"); q?.focus(); q?.setSelectionRange(pos, pos); }
  if (!keepScroll && tab !== currentTab) window.scrollTo(0, 0);
  currentTab = tab;
}
let rerenderQueued = false;
function rerender() {
  if (rerenderQueued) return;
  rerenderQueued = true;
  requestAnimationFrame(() => { rerenderQueued = false; route(true); });
}

function applyMeta() {
  document.getElementById("channelName").textContent = DB.meta.channelName || "숏드라마 스튜디오";
  document.getElementById("tagline").textContent = DB.meta.tagline || "";
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
    ideas: (a, b) => (a.id || "zz").localeCompare(b.id || "zz"),
    pipeline: (a, b) => (a.due || "9999").localeCompare(b.due || "9999"),
    posts: (a, b) => (b.date || "").localeCompare(a.date || ""),
    references: (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    goals: (a, b) => (a.order || 0) - (b.order || 0),
  };
  let firstLoad = 0;
  const cols = Object.keys(sorters);
  cols.forEach((c) => fs.onSnapshot(fs.collection(fb.db, c), (snap) => {
    DB[c] = snap.docs.map((d) => ({ _id: d.id, ...d.data() })).sort(sorters[c]);
    if (++firstLoad >= cols.length) rerender();
  }, (err) => { console.error(c, err); toast("데이터 연결 오류"); }));
  fs.onSnapshot(fs.doc(fb.db, "meta", "main"), (d) => { DB.meta = d.data() || {}; applyMeta(); rerender(); });
  authApi.onAuthStateChanged(fb.auth, (u) => { user = u; renderAuth(); rerender(); });
  document.getElementById("updated").textContent = "실시간 연결됨 · 수정하면 모두의 화면에 바로 반영돼요";
}

async function startStatic() {
  const src = await (await fetch("data/db.json", { cache: "no-store" })).json();
  Object.assign(DB, { meta: src.meta, ideas: src.ideas || [], pipeline: src.pipeline || [], posts: src.posts || [], references: src.references || [], goals: src.meta?.weekGoals || [] });
  applyMeta();
  document.getElementById("updated").textContent = `보기 전용 모드 · 마지막 갱신 ${src.meta.updatedAt}`;
  route();
}

window.addEventListener("hashchange", () => route());
(firebaseConfig ? startLive() : startStatic()).catch((err) => {
  console.error(err);
  view.innerHTML = `<div class="empty"><b>데이터를 불러오지 못했어요</b>잠시 후 새로고침 해주세요.</div>`;
});
