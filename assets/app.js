(() => {
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

  let DB = null;
  const view = document.getElementById("view");
  const state = { series: "all", status: "all", q: "", sort: null, sortDir: 1, refTag: "all" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (n == null ? "-" : n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + "만" : n.toLocaleString("ko-KR"));
  const seriesName = (k) => (DB.meta.series.find((s) => s.key === k) || {}).name || k;
  const copyTag = (c) => (c === "OK" ? `<span class="tag ok">저작권 OK</span>` : c === "불가" ? `<span class="tag bad">사용 불가</span>` : `<span class="tag warn">확인 필요</span>`);
  const statusTag = (s) => `<span class="tag ${s === "제작중" ? "" : s === "보류" ? "plain" : s === "게시됨" ? "ok" : "plain"}">${esc(s)}</span>`;
  const dots = (n) => (n ? `<span class="dots" title="난이도 ${n}/3">${"●".repeat(n)}${"○".repeat(3 - n)}</span>` : "-");

  function totals(posts) {
    const t = {};
    PLATFORMS.forEach((p) => { t[p.key] = {}; METRICS.forEach((m) => (t[p.key][m.key] = 0)); });
    posts.forEach((post) => PLATFORMS.forEach((p) => METRICS.forEach((m) => {
      t[p.key][m.key] += (post.stats?.[p.key]?.[m.key]) || 0;
    })));
    const all = {};
    METRICS.forEach((m) => (all[m.key] = PLATFORMS.reduce((a, p) => a + t[p.key][m.key], 0)));
    return { byPlatform: t, all };
  }

  /* ---------------- HOME ---------------- */
  function renderHome() {
    const { meta, ideas, pipeline, posts } = DB;
    const t = totals(posts);
    const goals = meta.weekGoals || [];
    const done = goals.filter((g) => g.done).length;
    const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
    const maxViews = Math.max(1, ...PLATFORMS.map((p) => t.byPlatform[p.key].views));

    const seriesCards = meta.series.map((s) => {
      const list = ideas.filter((i) => i.series === s.key && i.copyright !== "불가");
      const active = list.filter((i) => i.status === "제작중" || i.status === "후보").length;
      return `<div class="card series-card s-${s.key}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="tag">시리즈 ${s.key} · ${esc(s.role)}</span>
          <span class="count">${list.length}</span>
        </div>
        <h3 style="margin:10px 0 4px">${esc(s.name)}</h3>
        <div class="muted" style="font-size:13px">${esc(s.desc)}</div>
        <div style="font-size:12.5px;margin-top:8px" class="muted">제작중·후보 ${active}개</div>
      </div>`;
    }).join("");

    const inProgress = pipeline.filter((p) => p.stage !== "게시");

    view.innerHTML = `
      <div class="section-head"><div><h2>이번 주 한눈에</h2><p class="muted">콘텐츠에만 집중할 수 있게, 나머지는 여기서 확인</p></div></div>
      <div class="grid kpis">
        <div class="card kpi"><div class="label">게시한 영상</div><div class="value">${posts.length}</div><div class="sub">플랫폼 3곳 동시 업로드 기준</div></div>
        <div class="card kpi"><div class="label">총 조회수</div><div class="value">${fmt(t.all.views)}</div><div class="sub">인스타+틱톡+유튜브</div></div>
        <div class="card kpi"><div class="label">총 좋아요</div><div class="value">${fmt(t.all.likes)}</div><div class="sub">댓글 ${fmt(t.all.comments)}</div></div>
        <div class="card kpi"><div class="label">총 공유·저장</div><div class="value">${fmt(t.all.shares + t.all.saves)}</div><div class="sub">공유 ${fmt(t.all.shares)} · 저장 ${fmt(t.all.saves)}</div></div>
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card">
          <h3>이번 주 목표</h3>
          <div class="muted" style="font-size:13px">${done}/${goals.length} 완료 · ${pct}%</div>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <ul class="checklist">${goals.map((g) => `<li><span class="box ${g.done ? "on" : ""}">${g.done ? "✓" : ""}</span><span class="${g.done ? "done" : ""}">${esc(g.text)}</span></li>`).join("")}</ul>
        </div>
        <div class="card">
          <h3>지금 만드는 중</h3>
          ${inProgress.length ? inProgress.map((p) => `
            <div class="task" style="margin-bottom:8px">
              <b>${esc(p.title)}</b>
              <span class="tag">${esc(p.stage)}</span> <span class="tag plain">${esc(p.owner)}</span>
              <div class="muted" style="margin-top:6px">마감 ${esc(p.due || "-")} · ${esc(p.notes || "")}</div>
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
          }).join("")}</div>` : `<div class="empty" style="padding:24px"><b>아직 게시된 영상이 없어요</b>첫 영상이 올라가면 여기에 플랫폼별 성과가 쌓여요.</div>`}
        </div>
        <div class="card">
          <h3>아이디어 창고</h3>
          <div class="muted" style="font-size:13px;margin-bottom:10px">총 ${ideas.filter((i) => i.copyright !== "불가").length}개 아이디어</div>
          <div class="bars">${STATUS_ORDER.map((s) => {
            const n = ideas.filter((i) => i.status === s && i.copyright !== "불가").length;
            return `<div class="bar-row"><span>${s}</span><div class="bar-track"><div class="bar-fill" style="background:var(--accent);width:${(n / Math.max(1, ideas.length)) * 100}%"></div></div><span class="num" style="text-align:right">${n}</span></div>`;
          }).join("")}</div>
          <a href="#ideas" class="muted" style="font-size:13px;display:inline-block;margin-top:12px">아이디어 시트 열기 →</a>
        </div>
      </div>

      <div class="section-head" style="margin-top:26px"><div><h2>시리즈</h2></div></div>
      <div class="grid three">${seriesCards}</div>
    `;
  }

  /* ---------------- IDEAS ---------------- */
  function filteredIdeas() {
    const q = state.q.trim().toLowerCase();
    let list = DB.ideas.filter((i) =>
      (state.series === "all" || i.series === state.series) &&
      (state.status === "all" || i.status === state.status) &&
      (!q || [i.title, i.source, i.hook, i.notes, i.cast].join(" ").toLowerCase().includes(q))
    );
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
    const seriesChips = [{ key: "all", name: "전체" }, ...DB.meta.series.map((s) => ({ key: s.key, name: `${s.key} · ${s.name}` }))];
    view.innerHTML = `
      <div class="section-head">
        <div><h2>콘텐츠 아이디어 시트</h2><p class="muted">구상한 모든 소재를 쌓아두는 곳. 언제든 꺼내 쓰기.</p></div>
      </div>
      <div class="toolbar">
        <input id="q" type="search" placeholder="작품명, 훅, 메모 검색" value="${esc(state.q)}">
        <select id="status">${statuses.map((s) => `<option value="${s}" ${state.status === s ? "selected" : ""}>${s === "all" ? "상태: 전체" : s}</option>`).join("")}</select>
      </div>
      <div class="chips" style="margin-bottom:14px">${seriesChips.map((c) => `<button class="chip ${state.series === c.key ? "on" : ""}" data-series="${c.key}">${esc(c.name)}</button>`).join("")}</div>
      <div id="ideaBody"></div>
    `;
    const q = view.querySelector("#q");
    q.addEventListener("input", () => { state.q = q.value; drawIdeaBody(); });
    view.querySelector("#status").addEventListener("change", (e) => { state.status = e.target.value; drawIdeaBody(); });
    view.querySelectorAll("[data-series]").forEach((b) => b.addEventListener("click", () => { state.series = b.dataset.series; renderIdeas(); }));
    drawIdeaBody();
  }

  function drawIdeaBody() {
    const list = filteredIdeas();
    const body = view.querySelector("#ideaBody");
    const cols = [
      ["id", "ID"], ["series", "시리즈"], ["title", "제목"], ["source", "원작/출처"], ["copyright", "저작권"],
      ["hook", "훅 (첫 3초)"], ["episodes", "분량"], ["cast", "인원"], ["difficulty", "난이도"], ["status", "상태"], ["notes", "메모"],
    ];
    if (!list.length) { body.innerHTML = `<div class="empty"><b>조건에 맞는 아이디어가 없어요</b>필터를 바꿔보세요.</div>`; return; }
    body.innerHTML = `
      <div class="muted" style="font-size:13px;margin-bottom:8px">${list.length}개</div>
      <div class="table-wrap ideas-table"><table>
        <thead><tr>${cols.map(([k, n]) => `<th data-sort="${k}">${n}${state.sort === k ? (state.sortDir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
        <tbody>${list.map((i) => `<tr>
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
      <div class="cards-list">${list.map((i) => `<div class="card idea-card">
        <div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(i.title)}</h3>${statusTag(i.status)}</div>
        <div class="row"><span class="tag s-${i.series}">${esc(seriesName(i.series))}</span>${copyTag(i.copyright)}<span class="tag plain">${esc(i.cast)}</span><span class="tag plain">${esc(i.episodes)}</span></div>
        <div class="muted" style="font-size:12.5px">${esc(i.source)}</div>
        <div class="hook">“${esc(i.hook)}”</div>
        <div class="notes">${esc(i.notes)}</div>
      </div>`).join("")}</div>
    `;
    body.querySelectorAll("th[data-sort]").forEach((th) => th.addEventListener("click", () => {
      const k = th.dataset.sort;
      state.sortDir = state.sort === k ? -state.sortDir : 1;
      state.sort = k;
      drawIdeaBody();
    }));
  }

  /* ---------------- PIPELINE ---------------- */
  function renderPipeline() {
    view.innerHTML = `
      <div class="section-head"><div><h2>제작 보드</h2><p class="muted">아이디어 → 대본 → 촬영 → 편집 → 예약 → 게시</p></div></div>
      <div class="kanban">${STAGES.map((st) => {
        const items = DB.pipeline.filter((p) => p.stage === st);
        return `<div class="col"><h4><span>${st}</span><span class="muted">${items.length}</span></h4>
          ${items.map((p) => `<div class="task"><b>${esc(p.title)}</b>
            <span class="tag plain">${esc(p.owner)}</span>
            <div class="muted" style="margin-top:6px">마감 ${esc(p.due || "-")}</div>
            ${p.notes ? `<div class="muted" style="margin-top:4px">${esc(p.notes)}</div>` : ""}
          </div>`).join("")}
        </div>`;
      }).join("")}</div>
    `;
  }

  /* ---------------- STATS ---------------- */
  function renderStats() {
    const posts = DB.posts;
    const t = totals(posts);
    if (!posts.length) {
      view.innerHTML = `
        <div class="section-head"><div><h2>성과</h2><p class="muted">영상별 · 플랫폼별 조회 / 좋아요 / 댓글 / 공유 / 저장</p></div></div>
        <div class="empty"><b>아직 게시된 영상이 없어요</b>첫 영상을 올리면 여기에 영상별 표와 플랫폼별 합계가 나타나요.<br>노션 「성과」 데이터베이스에 숫자를 넣으면 사이트에 자동 반영돼요.</div>`;
      return;
    }
    const rows = posts.map((post) => {
      const sum = (m) => PLATFORMS.reduce((a, p) => a + ((post.stats?.[p.key]?.[m]) || 0), 0);
      return `<tr>
        <td class="title">${esc(post.title)}<div class="muted" style="font-weight:400;font-size:12px">${esc(post.date || "")} · ${esc(seriesName(post.series))}</div></td>
        ${PLATFORMS.map((p) => `<td class="num">${post.links?.[p.key] ? `<a href="${esc(post.links[p.key])}" target="_blank" rel="noopener">${fmt(post.stats?.[p.key]?.views)}</a>` : fmt(post.stats?.[p.key]?.views)}</td>`).join("")}
        ${METRICS.map((m) => `<td class="num">${fmt(sum(m.key))}</td>`).join("")}
      </tr>`;
    }).join("");
    view.innerHTML = `
      <div class="section-head"><div><h2>성과</h2><p class="muted">마지막 갱신 ${esc(DB.meta.updatedAt)}</p></div></div>
      <div class="grid kpis">${METRICS.slice(0, 4).map((m) => `<div class="card kpi"><div class="label">총 ${m.name}</div><div class="value">${fmt(t.all[m.key])}</div><div class="sub">${PLATFORMS.map((p) => `${p.name} ${fmt(t.byPlatform[p.key][m.key])}`).join(" · ")}</div></div>`).join("")}</div>
      <div class="table-wrap" style="margin-top:14px"><table>
        <thead><tr><th>영상</th>${PLATFORMS.map((p) => `<th style="text-align:right">${p.name} 조회</th>`).join("")}${METRICS.map((m) => `<th style="text-align:right">합계 ${m.name}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  /* ---------------- REFERENCES ---------------- */
  const PLAT_COLOR = { instagram: "#c13584", tiktok: "#111", youtube: "#e62117" };
  function detectPlatform(url = "") {
    if (/youtu\.?be/.test(url)) return "youtube";
    if (/tiktok\.com/.test(url)) return "tiktok";
    if (/instagram\.com/.test(url)) return "instagram";
    return "etc";
  }
  function youtubeId(url = "") {
    const m = url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function thumbFor(r) {
    if (r.thumbnail) return r.thumbnail;
    const yt = youtubeId(r.url);
    if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    return null;
  }
  async function hydrateTikTok(card, url) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return;
      const j = await res.json();
      if (j.thumbnail_url) card.querySelector(".thumb").insertAdjacentHTML("beforeend", `<img src="${esc(j.thumbnail_url)}" alt="" loading="lazy">`);
    } catch (_) { /* oEmbed 차단 시 기본 아이콘 유지 */ }
  }

  function renderRefs() {
    const refs = DB.references;
    const tags = [...new Set(refs.flatMap((r) => r.tags || []))];
    const list = state.refTag === "all" ? refs : refs.filter((r) => (r.tags || []).includes(state.refTag));
    view.innerHTML = `
      <div class="section-head"><div><h2>레퍼런스 보드</h2><p class="muted">참고할 계정 · 영상 · 훔칠 포인트</p></div></div>
      ${tags.length ? `<div class="chips" style="margin-bottom:14px">${["all", ...tags].map((t) => `<button class="chip ${state.refTag === t ? "on" : ""}" data-tag="${esc(t)}">${t === "all" ? "전체" : esc(t)}</button>`).join("")}</div>` : ""}
      ${list.length ? `<div class="gallery">${list.map((r, idx) => {
        const plat = r.platform || detectPlatform(r.url);
        const th = thumbFor(r);
        return `<a class="ref" href="${esc(r.url)}" target="_blank" rel="noopener" data-idx="${idx}" data-plat="${plat}">
          <div class="thumb"><span class="plat" style="background:${PLAT_COLOR[plat] || "#666"}">${plat}</span>🎬${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : ""}</div>
          <div class="body"><span class="acct">${esc(r.account || "")}</span>
            ${r.title ? `<span style="font-size:13px">${esc(r.title)}</span>` : ""}
            ${r.why ? `<span class="why">💡 ${esc(r.why)}</span>` : ""}
            <div class="chips">${(r.tags || []).map((t) => `<span class="tag plain">${esc(t)}</span>`).join("")}</div>
          </div></a>`;
      }).join("")}</div>`
      : `<div class="empty"><b>레퍼런스를 모아볼까요?</b>
          노션 「레퍼런스」 데이터베이스에 <code>링크</code>만 붙여 넣으면 여기에 썸네일 카드로 떠요.<br>
          유튜브·틱톡은 썸네일이 자동으로, 인스타는 썸네일 칸에 이미지를 넣으면 보여요.</div>`}
    `;
    view.querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => { state.refTag = b.dataset.tag; renderRefs(); }));
    view.querySelectorAll('.ref[data-plat="tiktok"]').forEach((card) => {
      const r = list[+card.dataset.idx];
      if (!thumbFor(r)) hydrateTikTok(card, r.url);
    });
  }

  /* ---------------- GUIDE ---------------- */
  function renderGuide() {
    view.innerHTML = `<div class="guide">
      <h2>운영 가이드</h2>
      <p class="muted">새로 합류한 사람도 이 페이지만 보면 되게.</p>

      <h3>📌 데이터는 어디서 고치나요?</h3>
      <ul>
        <li><b>노션이 원본</b>이에요. 아이디어·제작·성과·레퍼런스를 노션에서 고치면 이 사이트가 자동으로 따라와요.</li>
        <li>노션 연결 전까지는 GitHub 저장소의 <code>data/db.json</code>을 직접 고치면 반영돼요.</li>
      </ul>

      <h3>🎬 영상 1개 만드는 흐름</h3>
      <ol>
        <li>아이디어 시트에서 고르기 → 제작 보드에 카드 만들기</li>
        <li>대본: 첫 3초 훅을 먼저 쓰고, 60~90초 안에 끝내기</li>
        <li>촬영 → 편집 (자막 필수, 고정 오프닝 카드 1초)</li>
        <li>Buffer/Metricool로 인스타·틱톡·유튜브 <b>워터마크 없는 원본</b> 예약 업로드</li>
        <li>게시 후 2~3일 뒤 성과 입력 → 다음 기획에 반영</li>
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

  /* ---------------- ROUTER ---------------- */
  const routes = { home: renderHome, ideas: renderIdeas, pipeline: renderPipeline, stats: renderStats, refs: renderRefs, guide: renderGuide };
  function route() {
    const tab = (location.hash || "#home").slice(1);
    const fn = routes[tab] || renderHome;
    document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (routes[tab] ? tab : "home")));
    fn();
    window.scrollTo(0, 0);
  }

  fetch("data/db.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((db) => {
      DB = db;
      DB.posts ||= []; DB.references ||= []; DB.pipeline ||= []; DB.ideas ||= [];
      document.getElementById("channelName").textContent = db.meta.channelName;
      document.getElementById("tagline").textContent = db.meta.tagline;
      document.getElementById("updated").textContent = `마지막 갱신 ${db.meta.updatedAt} · 데이터 출처: ${db.meta.source}`;
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(() => { view.innerHTML = `<div class="empty"><b>데이터를 불러오지 못했어요</b>잠시 후 새로고침 해주세요.</div>`; });
})();
