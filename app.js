/* app.js */
(() => {
  "use strict";

  const APP = {
    VERSION: "1.0.2",
    // ✅ caminho RELATIVO (GitHub Pages em subpasta)
    CONTENT_URL: "./packs/base/imports/content.json",
    LS: {
      PROFILE: "imv_vla_profile",
      XP: "imv_vla_xp",
      DONE_MISSIONS: "imv_vla_done_missions",
      DONE_LESSONS: "imv_vla_done_lessons",
      ADMIN_DRAFT: "imv_vla_admin_draft",
      CONTENT_CACHE: "imv_vla_content_cache",
      LIB_SEARCH: "imv_vla_library_search"
    },
    XP: {
      MISSION_DEFAULT: 15,
      LESSON_STUDY: 20
    }
  };

  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function safeJSONParse(str) {
    try {
      return { ok: true, value: JSON.parse(str) };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = safeJSONParse(raw);
      return parsed.ok ? parsed.value : fallback;
    } catch {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function uidFrom(title) {
    const base = (title || "item")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 42) || "item";
    const stamp = Date.now().toString(36).slice(-6);
    return `${base}_${stamp}`;
  }

  function toast(msg, ms = 2200) {
    const host = $("#toastHost");
    if (!host) return;
    host.innerHTML = `<div class="toast">${msg}</div>`;
    setTimeout(() => {
      if (host) host.innerHTML = "";
    }, ms);
  }

  function setActiveTab(hash) {
    const map = {
      "#/home": "#tab-home",
      "#/path": "#tab-path",
      "#/missions": "#tab-missions",
      "#/library": "#tab-library",
      "#/profile": "#tab-profile"
    };
    $$(".tabbar .tab").forEach((t) => t.classList.remove("isActive"));
    const root = (hash || "#/home").split("?")[0];
    const id = map[root] || "#tab-home";
    const el = $(id);
    if (el) el.classList.add("isActive");
  }

  function linkifyAll() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-link]");
      if (!target) return;
      const href = target.getAttribute("data-link");
      if (!href) return;
      e.preventDefault();
      navigate(href);
    });

    const brand = $(".brand");
    if (brand) {
      brand.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(brand.getAttribute("data-link") || "#/home");
        }
      });
    }
  }

  function navigate(hash) {
    if (!hash.startsWith("#/")) hash = "#/home";
    location.hash = hash;
  }

  function parseRoute() {
    const raw = location.hash || "#/home";
    const [path, queryString] = raw.split("?");
    const query = {};
    if (queryString) {
      queryString.split("&").forEach((pair) => {
        const [k, v] = pair.split("=");
        query[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });
    }
    return { path, query, raw };
  }

  function escapeHTML(s) {
    return (s ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Markdown leve: #, ##, ###, -, ** **, `code`, ```pre```
  function renderMarkdownLite(text) {
    const src = (text || "").replace(/\r\n/g, "\n");
    const lines = src.split("\n");

    let html = "";
    let inPre = false;
    let preBuf = [];

    const flushPre = () => {
      if (!inPre) return;
      const preText = preBuf.join("\n");
      html += `<pre><code>${escapeHTML(preText)}</code></pre>`;
      inPre = false;
      preBuf = [];
    };

    let inList = false;
    const openList = () => {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
    };
    const closeList = () => {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    };

    const inline = (s) => {
      let out = escapeHTML(s);
      out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      out = out.replace(/`([^`]+?)`/g, "<code>$1</code>");
      return out;
    };

    for (const line of lines) {
      const l = line.trimEnd();

      if (l.trim() === "```") {
        if (inPre) flushPre();
        else {
          closeList();
          inPre = true;
        }
        continue;
      }

      if (inPre) {
        preBuf.push(l);
        continue;
      }

      if (/^###\s+/.test(l)) {
        closeList();
        html += `<h3>${inline(l.replace(/^###\s+/, ""))}</h3>`;
        continue;
      }
      if (/^##\s+/.test(l)) {
        closeList();
        html += `<h2>${inline(l.replace(/^##\s+/, ""))}</h2>`;
        continue;
      }
      if (/^#\s+/.test(l)) {
        closeList();
        html += `<h1>${inline(l.replace(/^#\s+/, ""))}</h1>`;
        continue;
      }

      if (/^-\s+/.test(l)) {
        openList();
        html += `<li>${inline(l.replace(/^-+\s+/, ""))}</li>`;
        continue;
      }

      if (l.trim() === "") {
        closeList();
        continue;
      }

      closeList();
      html += `<p>${inline(l)}</p>`;
    }

    flushPre();
    closeList();
    return `<div class="markdown">${html}</div>`;
  }

  function levelToRank(level) {
    const map = {
      "Iniciante absoluto": 1,
      Iniciante: 2,
      Intermediário: 3,
      Avançado: 4
    };
    return map[level] || 2;
  }

  function xpToLevel(xp) {
    let level = 1;
    let need = 120;
    let remaining = xp;

    while (remaining >= need) {
      remaining -= need;
      level += 1;
      need = Math.floor(need * 1.18);
      if (level > 60) break;
    }

    const progress = need > 0 ? remaining / need : 0;
    return {
      level,
      need,
      remaining,
      progress: clamp(progress, 0, 1)
    };
  }

  // ---------- Data Store ----------
  const Store = {
    content: [],
    byId: new Map(),
    tracks: [],
    lessons: [],
    missions: [],
    library: [],
    loadedFrom: "remote",

    indexContent(items) {
      this.content = Array.isArray(items) ? items : [];
      this.byId = new Map();
      for (const it of this.content) {
        if (it && it.id) this.byId.set(it.id, it);
      }
      this.tracks = this.content
        .filter((x) => x.type === "track")
        .sort((a, b) => levelToRank(a.level) - levelToRank(b.level));
      this.lessons = this.content.filter((x) => x.type === "lesson");
      this.missions = this.content
        .filter((x) => x.type === "mission")
        .sort((a, b) => (b.xp || 0) - (a.xp || 0));
      this.library = this.content
        .filter((x) => x.type === "library")
        .sort((a, b) => levelToRank(a.level) - levelToRank(b.level));
    },

    get(id) {
      return this.byId.get(id);
    }
  };

  // ---------- Fallback content ----------
  const FALLBACK_CONTENT = [
    {
      id: "t_fallback_001",
      type: "track",
      title: "Conteúdo não carregou (modo fallback)",
      subtitle: "Siga as instruções abaixo para corrigir.",
      cover: "",
      level: "Iniciante absoluto",
      tags: ["fallback", "offline", "github"],
      text:
        "# Conteúdo não foi encontrado\n" +
        "O app não conseguiu carregar `packs/base/imports/content.json`.\n\n" +
        "## Como corrigir\n" +
        "- Confirme se o arquivo existe exatamente em:\n" +
        "  `packs/base/imports/content.json`\n" +
        "- Em GitHub Pages, espere o deploy terminar e recarregue.\n" +
        "- Se estiver offline, isso pode ser temporário. Reabra o app.\n\n" +
        "## Dica\n" +
        "Você pode abrir o Admin e importar/mesclar um JSON para continuar usando.",
      lessonIds: ["l_fallback_001"]
    },
    {
      id: "l_fallback_001",
      type: "lesson",
      title: "Teste rápido do app (fallback)",
      subtitle: "Se você está lendo isso, o app está funcionando.",
      cover: "",
      level: "Iniciante absoluto",
      tags: ["fallback"],
      text:
        "# App rodando ✅\n" +
        "Isso é um conteúdo de emergência para garantir que o app nunca fique em branco.\n\n" +
        "- Vá em **Admin → Importar/Mesclar**\n" +
        "- Cole o JSON oficial do seu pacote\n" +
        "- Clique em **Importar e Mesclar**"
    },
    {
      id: "m_fallback_001",
      type: "mission",
      title: "Missão de emergência: 5 min de postura",
      subtitle: "Só para manter o app funcional.",
      level: "Iniciante absoluto",
      tags: ["fallback"],
      xp: 10,
      minutes: 5,
      text:
        "Sente-se bem, ombros soltos, respire e faça 2 minutos de cordas soltas com som limpo."
    },
    {
      id: "a_fallback_001",
      type: "library",
      title: "Como atualizar o conteúdo no GitHub",
      subtitle: "Guia rápido",
      level: "Iniciante absoluto",
      tags: ["github", "conteudo"],
      text:
        "# Atualizando o conteúdo\n" +
        "1) Abra o repositório no GitHub\n" +
        "2) Vá até `packs/base/imports/content.json`\n" +
        "3) Cole o conteúdo novo e salve (Commit)\n" +
        "4) Recarregue o app\n\n" +
        "Se você usa GitHub Pages, aguarde o deploy finalizar."
    }
  ];

  // ---------- State ----------
  const State = {
    profile: lsGet(APP.LS.PROFILE, { name: "Aluno(a)", goal: "Misto" }),
    xp: lsGet(APP.LS.XP, 0),
    doneMissions: lsGet(APP.LS.DONE_MISSIONS, {}),
    doneLessons: lsGet(APP.LS.DONE_LESSONS, {}),
    adminDraft: lsGet(APP.LS.ADMIN_DRAFT, []),

    saveAll() {
      lsSet(APP.LS.PROFILE, this.profile);
      lsSet(APP.LS.XP, this.xp);
      lsSet(APP.LS.DONE_MISSIONS, this.doneMissions);
      lsSet(APP.LS.DONE_LESSONS, this.doneLessons);
      lsSet(APP.LS.ADMIN_DRAFT, this.adminDraft);
    }
  };

  // ---------- Content Load ----------
  async function loadContent() {
    // 1) Se existir conteúdo local (cache), usa
    const cached = lsGet(APP.LS.CONTENT_CACHE, null);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      Store.loadedFrom = "local";
      Store.indexContent(cached);
      return { ok: true, from: "local" };
    }

    // 2) Senão, carrega do arquivo oficial
    try {
      const res = await fetch(APP.CONTENT_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("content.json não é um array");
      Store.loadedFrom = "remote";
      Store.indexContent(json);
      return { ok: true, from: "remote" };
    } catch (err) {
      Store.loadedFrom = "fallback";
      Store.indexContent(FALLBACK_CONTENT);
      return { ok: false, error: err };
    }
  }

  // ---------- Progress ----------
  function isMissionDoneToday(missionId) {
    const d = todayKey();
    return !!(State.doneMissions[d] && State.doneMissions[d][missionId]);
  }

  function markMissionDone(missionId, xpAdd) {
    const d = todayKey();
    if (!State.doneMissions[d]) State.doneMissions[d] = {};
    if (State.doneMissions[d][missionId]) return { ok: false, reason: "already" };

    State.doneMissions[d][missionId] = true;
    State.xp = (State.xp || 0) + (xpAdd || APP.XP.MISSION_DEFAULT);
    State.saveAll();
    return { ok: true };
  }

  function wasLessonStudiedToday(lessonId) {
    const d = todayKey();
    return State.doneLessons[lessonId] === d;
  }

  function markLessonStudied(lessonId, xpAdd) {
    const d = todayKey();
    if (wasLessonStudiedToday(lessonId)) return { ok: false, reason: "already" };
    State.doneLessons[lessonId] = d;
    State.xp = (State.xp || 0) + (xpAdd || APP.XP.LESSON_STUDY);
    State.saveAll();
    return { ok: true };
  }

  function trackProgress(track) {
    const ids = Array.isArray(track.lessonIds) ? track.lessonIds : [];
    if (ids.length === 0) return { total: 0, done: 0, pct: 0 };
    let done = 0;
    for (const id of ids) {
      if (State.doneLessons[id]) done++;
    }
    const pct = Math.round((done / ids.length) * 100);
    return { total: ids.length, done, pct };
  }

  // ---------- Views ----------
  function viewShell(inner) {
    return `<div class="container">${inner}</div>`;
  }

  function coverMiniHTML(item) {
    if (item.cover) {
      return `<div class="coverMini"><img src="${escapeHTML(item.cover)}" alt=""></div>`;
    }
    return `<div class="coverMini" aria-hidden="true"></div>`;
  }

  function itemRowHTML(item, rightHTML = "") {
    const subtitle = item.subtitle ? `<div class="itemSub">${escapeHTML(item.subtitle)}</div>` : "";
    const tags = (item.tags || [])
      .slice(0, 4)
      .map((t) => `<span class="chip">${escapeHTML(t)}</span>`)
      .join("");

    const meta = `
      <div class="itemMeta">
        <span class="badge">${escapeHTML(item.level || "Nível")}</span>
        ${tags}
        ${rightHTML}
      </div>
    `;

    return `
      <div class="card">
        <div class="cardInner">
          <div class="item">
            ${coverMiniHTML(item)}
            <div style="flex:1">
              <div class="itemTitle">${escapeHTML(item.title || "")}</div>
              ${subtitle}
              ${meta}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function homeView() {
    const lvl = xpToLevel(State.xp || 0);
    const prog = Math.round(lvl.progress * 100);

    const missions = Store.missions || [];
    const mod = missions.find((m) => !isMissionDoneToday(m.id)) || missions[0] || null;

    const doneTodayCount = (() => {
      const d = todayKey();
      const map = State.doneMissions[d] || {};
      return Object.keys(map).length;
    })();

    const tracks = Store.tracks || [];
    let continueTrack = null;
    for (const t of tracks) {
      const p = trackProgress(t);
      if (p.total > 0 && p.done < p.total) {
        continueTrack = t;
        break;
      }
    }
    if (!continueTrack) continueTrack = tracks[0] || null;

    const hero = `
      <div class="card hero">
        <div class="cardInner">
          <div class="h1" style="margin:0 0 6px 0;">Sua jornada no Violão</div>
          <div class="p">Popular, Erudito ou Misto — constância + técnica. Você está no caminho.</div>

          <div class="kpis">
            <div class="kpi">
              <div class="v">Nível ${lvl.level}</div>
              <div class="l">${State.xp || 0} XP</div>
            </div>
            <div class="kpi">
              <div class="v">${prog}%</div>
              <div class="l">Progresso do nível</div>
            </div>
            <div class="kpi">
              <div class="v">${doneTodayCount}</div>
              <div class="l">Missões hoje</div>
            </div>
          </div>

          <div style="margin-top:12px;">
            <div class="progress"><i style="width:${prog}%"></i></div>
          </div>

          <div class="row" style="margin-top:14px;">
            ${continueTrack ? `<button class="btn btnPrimary" data-link="#/track?id=${encodeURIComponent(continueTrack.id)}">Continuar Trilha</button>` : ""}
            <button class="btn btnGlass" data-link="#/missions">Abrir Missões</button>
            <button class="btn btnGlass" data-link="#/library">Biblioteca</button>
          </div>
        </div>
      </div>
    `;

    const missionCard = (() => {
      if (!mod) {
        return `<div class="card"><div class="cardInner"><div class="h2">Missão do dia</div><p class="p">Nenhuma missão disponível.</p></div></div>`;
      }
      const done = isMissionDoneToday(mod.id);
      const btn = done
        ? `<button class="btn btnGlass" type="button" disabled style="opacity:.7; cursor:not-allowed;">Concluída hoje ✅</button>`
        : `<button class="btn btnPrimary" type="button" data-action="do-mission" data-id="${escapeHTML(mod.id)}">Concluir (+${mod.xp || APP.XP.MISSION_DEFAULT} XP)</button>`;
      return `
        <div class="card">
          <div class="cardInner">
            <div class="h2" style="margin-top:0;">Missão do dia</div>
            <div class="p">${escapeHTML(mod.title || "")}</div>
            <div class="chips">
              <span class="chip">${escapeHTML((mod.minutes || 7) + " min")}</span>
              <span class="chip">${escapeHTML(mod.level || "Nível")}</span>
              <span class="chip">+${escapeHTML(mod.xp || APP.XP.MISSION_DEFAULT)} XP</span>
            </div>
            <div class="sep"></div>
            <div class="p">${escapeHTML(mod.text || "")}</div>
            <div class="row" style="margin-top:12px;">
              ${btn}
              <button class="btn btnGlass" data-link="#/missions" type="button">Ver todas</button>
            </div>
          </div>
        </div>
      `;
    })();

    const weekly = (() => {
      const picks = (Store.missions || []).slice(0, 3);
      const cards = picks
        .map((m) => {
          const done = isMissionDoneToday(m.id);
          const r = done ? `<span class="badge">Concluída hoje</span>` : `<span class="chip">Disponível</span>`;
          return itemRowHTML(m, r);
        })
        .join("");
      return `
        <div class="h2">Semana (sugestões)</div>
        <div class="grid">${cards || ""}</div>
      `;
    })();

    const sourceNote =
      Store.loadedFrom === "fallback"
        ? `<div class="notice" style="margin-top:12px;">
             <strong>Atenção:</strong> o app entrou em modo fallback porque o arquivo <code>content.json</code> não carregou.
             Abra o <a class="linkLike" href="#/admin">Admin</a> para importar/mesclar um JSON.
           </div>`
        : "";

    return viewShell(`
      ${hero}
      <div class="footerSpace"></div>
      ${sourceNote}
      <div class="h2">Hoje</div>
      ${missionCard}
      ${weekly}
    `);
  }

  function pathView() {
    const tracks = Store.tracks || [];
    const list = tracks
      .map((t) => {
        const p = trackProgress(t);
        const right = `<span class="chip">${p.done}/${p.total || 0} lições</span><span class="chip">${p.pct}%</span>`;
        const html = itemRowHTML(t, right);
        return `<div data-link="#/track?id=${encodeURIComponent(t.id)}" style="cursor:pointer">${html}</div>`;
      })
      .join("");

    return viewShell(`
      <div class="h1">Trilha</div>
      <p class="p">Escolha um módulo e avance com clareza: técnica, musicalidade e consistência.</p>
      <div class="sep"></div>
      <div class="list">${list || `<div class="card"><div class="cardInner"><p class="p">Nenhuma trilha encontrada.</p></div></div>`}</div>
    `);
  }

  function trackView(id) {
    const track = Store.get(id);
    if (!track || track.type !== "track") {
      return viewShell(`
        <div class="h1">Trilha</div>
        <div class="card"><div class="cardInner">
          <div class="notice">Trilha não encontrada. Volte e selecione outra.</div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btnGlass" data-link="#/path">Voltar</button>
          </div>
        </div></div>
      `);
    }

    const ids = Array.isArray(track.lessonIds) ? track.lessonIds : [];
    const missing = [];
    const lessons = ids
      .map((lid) => {
        const l = Store.get(lid);
        if (!l) {
          missing.push(lid);
          return null;
        }
        return l;
      })
      .filter(Boolean);

    const p = trackProgress(track);

    const header = `
      <div class="card hero">
        <div class="cardInner">
          <div class="h1" style="margin:0 0 6px 0;">${escapeHTML(track.title)}</div>
          <div class="p">${escapeHTML(track.subtitle || "")}</div>
          <div class="chips">
            <span class="badge">${escapeHTML(track.level || "Nível")}</span>
            <span class="chip">${p.done}/${p.total} lições</span>
            <span class="chip">${p.pct}%</span>
          </div>
          ${track.text ? `<div class="sep"></div>${renderMarkdownLite(track.text)}` : ""}
          <div style="margin-top:12px;">
            <div class="progress"><i style="width:${p.pct}%"></i></div>
          </div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btnGlass" data-link="#/path" type="button">Voltar</button>
            ${lessons[0] ? `<button class="btn btnPrimary" data-link="#/lesson?id=${encodeURIComponent(lessons[0].id)}" type="button">Começar</button>` : ""}
          </div>
        </div>
      </div>
    `;

    const missWarn = missing.length
      ? `<div class="notice" style="margin-top:12px;">
           <strong>Conteúdo incompleto:</strong> alguns <code>lessonIds</code> não foram encontrados:
           <code>${escapeHTML(missing.join(", "))}</code>
         </div>`
      : "";

    const lessonCards = lessons
      .map((l) => {
        const done = !!State.doneLessons[l.id];
        const doneTag = done ? `<span class="badge">Estudada</span>` : `<span class="chip">Nova</span>`;
        const html = itemRowHTML(l, doneTag);
        return `<div data-link="#/lesson?id=${encodeURIComponent(l.id)}" style="cursor:pointer">${html}</div>`;
      })
      .join("");

    const empty = `
      <div class="card">
        <div class="cardInner">
          <div class="notice">Esta trilha ainda não tem lições configuradas.</div>
        </div>
      </div>
    `;

    return viewShell(`
      ${header}
      ${missWarn}
      <div class="h2">Lições</div>
      <div class="list">${lessonCards || empty}</div>
    `);
  }

  function lessonView(id) {
    const lesson = Store.get(id);
    if (!lesson || lesson.type !== "lesson") {
      return viewShell(`
        <div class="h1">Lição</div>
        <div class="card"><div class="cardInner">
          <div class="notice">Lição não encontrada.</div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btnGlass" data-action="go-back" type="button">Voltar</button>
          </div>
        </div></div>
      `);
    }

    const doneToday = wasLessonStudiedToday(lesson.id);
    const already = !!State.doneLessons[lesson.id];

    const btn = doneToday
      ? `<button class="btn btnGlass" type="button" disabled style="opacity:.7; cursor:not-allowed;">Estudada hoje ✅</button>`
      : `<button class="btn btnPrimary" type="button" data-action="do-lesson" data-id="${escapeHTML(lesson.id)}">Marcar como estudada (+${APP.XP.LESSON_STUDY} XP)</button>`;

    return viewShell(`
      <div class="card hero">
        <div class="cardInner">
          <div class="h1" style="margin:0 0 6px 0;">${escapeHTML(lesson.title)}</div>
          <div class="p">${escapeHTML(lesson.subtitle || "")}</div>

          <div class="chips">
            <span class="badge">${escapeHTML(lesson.level || "Nível")}</span>
            ${(lesson.tags || []).slice(0, 6).map((t) => `<span class="chip">${escapeHTML(t)}</span>`).join("")}
            ${already ? `<span class="chip">Estudada</span>` : `<span class="chip">Nova</span>`}
          </div>

          <div class="sep"></div>

          ${renderMarkdownLite(lesson.text || "")}

          <div class="sep"></div>

          <div class="row">
            <button class="btn btnGlass" type="button" data-action="go-back">Voltar</button>
            ${btn}
          </div>
        </div>
      </div>
    `);
  }

  function missionsView() {
    const missions = Store.missions || [];
    const d = todayKey();
    const doneMap = State.doneMissions[d] || {};
    const doneCount = Object.keys(doneMap).length;

    const cards = missions
      .map((m) => {
        const done = isMissionDoneToday(m.id);
        const right = done
          ? `<span class="badge">Concluída hoje</span>`
          : `<span class="chip">+${escapeHTML(m.xp || APP.XP.MISSION_DEFAULT)} XP</span><span class="chip">${escapeHTML((m.minutes || 7) + " min")}</span>`;

        const btn = done
          ? `<button class="btn btnGlass" type="button" disabled style="opacity:.7; cursor:not-allowed;">OK ✅</button>`
          : `<button class="btn btnPrimary" type="button" data-action="do-mission" data-id="${escapeHTML(m.id)}">Concluir</button>`;

        return `
          <div class="card">
            <div class="cardInner">
              <div class="item">
                ${coverMiniHTML(m)}
                <div style="flex:1">
                  <div class="itemTitle">${escapeHTML(m.title || "")}</div>
                  <div class="itemSub">${escapeHTML(m.subtitle || "")}</div>
                  <div class="itemMeta">
                    <span class="badge">${escapeHTML(m.level || "Nível")}</span>
                    ${right}
                  </div>
                </div>
              </div>
              <div class="sep"></div>
              <div class="p">${escapeHTML(m.text || "")}</div>
              <div class="row" style="margin-top:12px;">
                ${btn}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    return viewShell(`
      <div class="h1">Missões</div>
      <p class="p">Conclua missões curtas para ganhar XP e manter consistência. (Reset diário)</p>
      <div class="chips">
        <span class="chip">Hoje: ${escapeHTML(d)}</span>
        <span class="chip">Concluídas: ${doneCount}</span>
      </div>
      <div class="sep"></div>
      <div class="list">${cards || `<div class="card"><div class="cardInner"><p class="p">Nenhuma missão encontrada.</p></div></div>`}</div>
    `);
  }

  function libraryView() {
    const items = Store.library || [];
    const search = lsGet(APP.LS.LIB_SEARCH, "");
    const q = (search || "").trim().toLowerCase();

    const filtered = q
      ? items.filter((a) => {
          const t = (a.title || "").toLowerCase();
          const s = (a.subtitle || "").toLowerCase();
          const tx = (a.text || "").toLowerCase();
          const tags = (a.tags || []).join(" ").toLowerCase();
          return (t + " " + s + " " + tags + " " + tx).includes(q);
        })
      : items;

    const cards = filtered
      .map((a) => {
        const html = itemRowHTML(a, `<span class="chip">Ler</span>`);
        return `<div data-link="#/article?id=${encodeURIComponent(a.id)}" style="cursor:pointer">${html}</div>`;
      })
      .join("");

    return viewShell(`
      <div class="h1">Biblioteca</div>
      <p class="p">Textos práticos para estudo: rotina, técnica, cuidados e musicalidade.</p>
      <div class="sep"></div>

      <div class="card">
        <div class="cardInner">
          <div class="h2" style="margin-top:0;">Buscar</div>
          <input class="input" id="libSearch" placeholder="Digite: palheta, unhas, rotina, arpejo..." value="${escapeHTML(search)}" />
          <div class="small" style="margin-top:8px;">A busca funciona offline e filtra título, tags e texto.</div>
        </div>
      </div>

      <div class="h2">Artigos</div>
      <div class="list">${cards || `<div class="card"><div class="cardInner"><p class="p">Nenhum artigo encontrado.</p></div></div>`}</div>
    `);
  }

  function articleView(id) {
    const art = Store.get(id);
    if (!art || art.type !== "library") {
      return viewShell(`
        <div class="h1">Artigo</div>
        <div class="card"><div class="cardInner">
          <div class="notice">Artigo não encontrado.</div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btnGlass" data-action="go-back" type="button">Voltar</button>
          </div>
        </div></div>
      `);
    }

    return viewShell(`
      <div class="card hero">
        <div class="cardInner">
          <div class="h1" style="margin:0 0 6px 0;">${escapeHTML(art.title)}</div>
          <div class="p">${escapeHTML(art.subtitle || "")}</div>
          <div class="chips">
            <span class="badge">${escapeHTML(art.level || "Nível")}</span>
            ${(art.tags || []).slice(0, 8).map((t) => `<span class="chip">${escapeHTML(t)}</span>`).join("")}
          </div>
          <div class="sep"></div>
          ${renderMarkdownLite(art.text || "")}
          <div class="sep"></div>
          <div class="row">
            <button class="btn btnGlass" type="button" data-action="go-back">Voltar</button>
          </div>
        </div>
      </div>
    `);
  }

  function profileView() {
    const lvl = xpToLevel(State.xp || 0);
    const prog = Math.round(lvl.progress * 100);

    const lessonsStudied = Object.keys(State.doneLessons || {}).length;

    const d = todayKey();
    const doneToday = Object.keys(State.doneMissions[d] || {}).length;

    const goals = ["Popular", "Erudito", "Misto"];

    return viewShell(`
      <div class="h1">Perfil</div>
      <p class="p">Seu progresso fica salvo no dispositivo (offline).</p>
      <div class="sep"></div>

      <div class="card hero">
        <div class="cardInner">
          <div class="h2" style="margin-top:0;">Identidade</div>
          <div class="formGrid cols2">
            <div>
              <div class="small">Nome</div>
              <input class="input" id="profileName" value="${escapeHTML(State.profile.name || "Aluno(a)")}"/>
            </div>
            <div>
              <div class="small">Objetivo</div>
              <select class="select" id="profileGoal">
                ${goals.map((g) => `<option value="${g}" ${State.profile.goal === g ? "selected" : ""}>${g}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="sep"></div>

          <div class="h2">Progresso</div>
          <div class="kpis">
            <div class="kpi">
              <div class="v">Nível ${lvl.level}</div>
              <div class="l">${State.xp || 0} XP</div>
            </div>
            <div class="kpi">
              <div class="v">${prog}%</div>
              <div class="l">Neste nível</div>
            </div>
            <div class="kpi">
              <div class="v">${lessonsStudied}</div>
              <div class="l">Lições estudadas</div>
            </div>
            <div class="kpi">
              <div class="v">${doneToday}</div>
              <div class="l">Missões hoje</div>
            </div>
          </div>

          <div style="margin-top:12px;">
            <div class="progress"><i style="width:${prog}%"></i></div>
          </div>

          <div class="sep"></div>

          <div class="row">
            <button class="btn btnGlass" type="button" data-action="save-profile">Salvar</button>
            <button class="btn btnDanger" type="button" data-action="reset-local">Reset local</button>
          </div>
          <div class="small" style="margin-top:8px;">
            Reset apaga XP, histórico e rascunho do Admin deste dispositivo.
          </div>
        </div>
      </div>
    `);
  }

  // ---------- Admin (melhorado) ----------
  let adminActiveTab = "create";
  // modos: draft | full | append
  let adminExportMode = "draft";

  function adminView() {
    const draft = Array.isArray(State.adminDraft) ? State.adminDraft : [];
    const draftCount = draft.length;

    const lessons = Store.content
      .filter((x) => x.type === "lesson")
      .sort((a, b) => levelToRank(a.level) - levelToRank(b.level));

    const lessonOptions = lessons
      .map((l) => `<option value="${escapeHTML(l.id)}">${escapeHTML(l.title)} (${escapeHTML(l.level || "")})</option>`)
      .join("");

    const draftCards = draft
      .map((it, idx) => {
        const right = `<span class="chip">${escapeHTML(it.type)}</span><span class="chip">${escapeHTML(it.level || "")}</span>`;
        const html = itemRowHTML(it, right);
        return `
          <div class="card">
            <div class="cardInner">
              <div style="flex:1">${html}</div>
              <div class="row" style="margin-top:10px;">
                <button class="btn btnGlass btnSm" type="button" data-action="admin-dup" data-idx="${idx}">Duplicar</button>
                <button class="btn btnDanger btnSm" type="button" data-action="admin-remove" data-idx="${idx}">Remover</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    return viewShell(`
      <div class="h1">Admin</div>
      <p class="p">Crie conteúdo sem programar. Exporte JSON pronto para colar no GitHub (inclusive modo APÊNDICE).</p>

      <div class="sep"></div>

      <div class="card">
        <div class="cardInner">
          <div class="chips" style="margin-top:0;">
            <button class="btn btnGlass btnSm" type="button" data-action="admin-tab" data-tab="create">Criar</button>
            <button class="btn btnGlass btnSm" type="button" data-action="admin-tab" data-tab="export">Exportar</button>
            <button class="btn btnGlass btnSm" type="button" data-action="admin-tab" data-tab="import">Importar/Mesclar</button>
            <span class="chip">Rascunho: ${draftCount}</span>
          </div>
        </div>
      </div>

      <div id="adminTabs" style="margin-top:12px;"></div>

      <template id="tplAdminCreate">
        <div class="card hero">
          <div class="cardInner">
            <div class="h2" style="margin-top:0;">ABA 1 — Criar Conteúdo</div>
            <div class="small">
              Preencha, clique em <strong>Adicionar ao Meu Pacote</strong>. O item vai para o rascunho.
              Depois, vá em <strong>Exportar</strong> e escolha <strong>APÊNDICE</strong> para colar no final do JSON.
            </div>
            <div class="sep"></div>

            <div class="formGrid cols2">
              <div>
                <div class="small">Tipo</div>
                <select class="select" id="adType">
                  <option value="lesson">lesson (lição)</option>
                  <option value="track">track (módulo)</option>
                  <option value="library">library (artigo)</option>
                  <option value="mission">mission (missão)</option>
                </select>
              </div>
              <div>
                <div class="small">Nível</div>
                <select class="select" id="adLevel">
                  <option>Iniciante absoluto</option>
                  <option>Iniciante</option>
                  <option>Intermediário</option>
                  <option>Avançado</option>
                </select>
              </div>

              <div style="grid-column:1 / -1;">
                <div class="small">Título</div>
                <input class="input" id="adTitle" placeholder="Ex: Pestana sem dor (guia prático)" />
              </div>

              <div style="grid-column:1 / -1;">
                <div class="small">Subtítulo (opcional)</div>
                <input class="input" id="adSubtitle" placeholder="Ex: Ajustes finos de mão esquerda e postura" />
              </div>

              <div style="grid-column:1 / -1;">
                <div class="small">Capa URL (opcional)</div>
                <input class="input" id="adCover" placeholder="https://..." />
              </div>

              <div style="grid-column:1 / -1;">
                <div class="small">Tags (separe por vírgula)</div>
                <input class="input" id="adTags" placeholder="postura, tecnica, pestana, arpejo" />
              </div>

              <div id="adTrackBox" style="grid-column:1 / -1; display:none;">
                <div class="small">Para track: selecione lições (lessonIds)</div>
                <select class="select" id="adLessonPicker" multiple size="10" style="height:auto; padding:10px;">
                  ${lessonOptions}
                </select>
                <div class="small" style="margin-top:6px;">Dica: no PC segure Ctrl para selecionar várias. No celular, selecione uma por vez (ou use import/mescla).</div>
              </div>

              <div id="adMissionBox" style="grid-column:1 / -1; display:none;">
                <div class="formGrid cols2">
                  <div>
                    <div class="small">XP (missão)</div>
                    <input class="input" id="adMissionXP" type="number" min="1" value="${APP.XP.MISSION_DEFAULT}" />
                  </div>
                  <div>
                    <div class="small">Minutos</div>
                    <input class="input" id="adMissionMin" type="number" min="1" value="7" />
                  </div>
                </div>
              </div>

              <div style="grid-column:1 / -1;">
                <div class="small">Texto (conteúdo principal)</div>
                <textarea class="textarea" id="adText" placeholder="# Título&#10;## Passo a passo&#10;- Item&#10;&#10;Use &#96;&#96;&#96; para tablatura/cifras"></textarea>
              </div>
            </div>

            <div class="row" style="margin-top:12px;">
              <button class="btn btnPrimary" type="button" data-action="admin-add">Adicionar ao Meu Pacote</button>
              <button class="btn btnGlass" type="button" data-action="admin-clear-form">Limpar</button>
            </div>

            <div class="sep"></div>

            <div class="h2">Itens adicionados (rascunho)</div>
            ${draftCount ? `<div class="list">${draftCards}</div>` : `<div class="card"><div class="cardInner"><p class="p">Sem itens no rascunho ainda.</p></div></div>`}
          </div>
        </div>
      </template>

      <template id="tplAdminExport">
        <div class="card hero">
          <div class="cardInner">
            <div class="h2" style="margin-top:0;">ABA 2 — Exportar</div>
            <div class="small">
              Escolha como exportar. Para seu caso, use <strong>APÊNDICE</strong> (colar no final do JSON existente).
            </div>
            <div class="sep"></div>

            <div class="row">
              <button class="btn btnGlass btnSm" type="button" data-action="admin-export-mode" data-mode="draft">Rascunho (array)</button>
              <button class="btn btnGlass btnSm" type="button" data-action="admin-export-mode" data-mode="full">Arquivo completo</button>
              <button class="btn btnGlass btnSm" type="button" data-action="admin-export-mode" data-mode="append">APÊNDICE (colar no final)</button>
              <span class="chip" id="adExportModeChip">Modo: rascunho</span>
            </div>

            <div class="sep"></div>

            <textarea class="textarea" id="adExportArea" readonly></textarea>

            <div class="row" style="margin-top:12px;">
              <button class="btn btnPrimary" type="button" data-action="admin-copy-export">Copiar</button>
              <button class="btn btnGlass" type="button" data-action="admin-save-as-local">Salvar como conteúdo local</button>
            </div>

            <div class="sep"></div>

            <div class="notice">
              <strong>Passo a passo (GitHub):</strong><br>
              <strong>Modo APÊNDICE:</strong><br>
              1) Clique em <code>Copiar</code><br>
              2) Abra <code>packs/base/imports/content.json</code><br>
              3) Role até o final e encontre o <code>]</code> final<br>
              4) Cole o APÊNDICE <strong>antes</strong> do <code>]</code><br>
              5) Salve (Commit) e recarregue o app<br><br>
              <strong>Modo Arquivo completo:</strong> substitua o conteúdo inteiro do arquivo.
            </div>

            <div class="small" style="margin-top:10px;">
              Dica: “Salvar como conteúdo local” faz o app usar este JSON pelo localStorage (ótimo para testar).
            </div>
          </div>
        </div>
      </template>

      <template id="tplAdminImport">
        <div class="card hero">
          <div class="cardInner">
            <div class="h2" style="margin-top:0;">ABA 3 — Importar / Mesclar</div>
            <div class="small">
              Cole um JSON e importe. Aceita: <strong>array</strong>, <strong>objeto</strong> ou <strong>apêndice</strong> (trecho colado no final).
              Não apaga conteúdo e evita IDs duplicados.
            </div>
            <div class="sep"></div>

            <textarea class="textarea" id="adImportArea" placeholder='Cole aqui: [ { "id": "...", "type": "lesson", ... } ]  OU  { ... }  OU  , { ... }, { ... }'></textarea>

            <div class="row" style="margin-top:12px;">
              <button class="btn btnPrimary" type="button" data-action="admin-import-merge">Importar e Mesclar</button>
              <button class="btn btnGlass" type="button" data-action="admin-clear-import">Limpar</button>
              <button class="btn btnDanger" type="button" data-action="admin-clear-local-content">Limpar conteúdo local</button>
            </div>

            <div class="sep"></div>

            <div class="card">
              <div class="cardInner">
                <div class="h2" style="margin-top:0;">Relatório</div>
                <div class="small" id="adImportReport">Nenhuma importação ainda.</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    `);
  }

  function adminMount() {
    const host = $("#adminTabs");
    if (!host) return;

    const tplId =
      adminActiveTab === "create"
        ? "#tplAdminCreate"
        : adminActiveTab === "export"
        ? "#tplAdminExport"
        : "#tplAdminImport";

    const tpl = $(tplId);
    if (!tpl) return;
    host.innerHTML = tpl.innerHTML;

    if (adminActiveTab === "create") adminMountCreate();
    if (adminActiveTab === "export") adminMountExport();
  }

  function adminMountCreate() {
    const type = $("#adType");
    const trackBox = $("#adTrackBox");
    const missionBox = $("#adMissionBox");

    const refreshType = () => {
      const v = type.value;
      if (trackBox) trackBox.style.display = v === "track" ? "block" : "none";
      if (missionBox) missionBox.style.display = v === "mission" ? "block" : "none";
    };

    if (type) type.addEventListener("change", refreshType);
    refreshType();
  }

  function adminValidateItem(item) {
    const errors = [];
    if (!item.type) errors.push("Tipo é obrigatório.");
    if (!item.title || !item.title.trim()) errors.push("Título é obrigatório.");
    if (!item.level) errors.push("Nível é obrigatório.");

    if (item.type === "track") {
      if (!Array.isArray(item.lessonIds)) errors.push("track precisa de lessonIds (array).");
    }
    if (item.type === "mission") {
      if (typeof item.xp !== "number" || item.xp <= 0) errors.push("mission precisa de xp (número > 0).");
      if (typeof item.minutes !== "number" || item.minutes <= 0) errors.push("mission precisa de minutes (número > 0).");
    }
    return errors;
  }

  // ✅ Export: draft | full | append
  function adminBuildExport(mode) {
    const draft = Array.isArray(State.adminDraft) ? State.adminDraft : [];

    if (mode === "draft") {
      return { label: "rascunho (array)", text: JSON.stringify(draft, null, 2) };
    }

    if (mode === "full") {
      // Conteúdo atual + rascunho (apenas adiciona; não apaga)
      const base = Array.isArray(Store.content) ? Store.content.slice() : [];
      const baseIds = new Set(base.map((x) => x.id));
      const merged = base.slice();

      for (const it of draft) {
        if (!it || !it.id) continue;
        let nid = it.id;
        if (baseIds.has(nid)) {
          let i = 2;
          while (baseIds.has(nid + "_v" + i)) i++;
          nid = nid + "_v" + i;
        }
        baseIds.add(nid);
        merged.push({ ...it, id: nid });
      }

      return { label: "arquivo completo", text: JSON.stringify(merged, null, 2) };
    }

    // mode === "append"
    // ✅ Gera um trecho para colar ANTES do ] final do JSON existente
    // Exemplo: ,\n  {...},\n  {...}\n
    if (!draft.length) {
      return {
        label: "apêndice",
        text:
          ",\n  {\n" +
          '    "id": "exemplo_id_unico",\n' +
          '    "type": "lesson",\n' +
          '    "title": "Exemplo de item",\n' +
          '    "level": "Iniciante",\n' +
          '    "tags": ["exemplo"],\n' +
          '    "text": "Conteúdo aqui."\n' +
          "  }\n"
      };
    }

    const pretty = draft.map((it) => JSON.stringify(it, null, 2));
    const joined = pretty
      .map((block) => "  " + block.replace(/\n/g, "\n  "))
      .join(",\n\n");

    return {
      label: "apêndice (colar no final)",
      text: ",\n\n" + joined + "\n"
    };
  }

  function adminMountExport() {
    const area = $("#adExportArea");
    const chip = $("#adExportModeChip");
    if (!area || !chip) return;

    const built = adminBuildExport(adminExportMode);
    chip.textContent = "Modo: " + built.label;
    area.value = built.text;
  }

  function adminAddFromForm() {
    const type = $("#adType")?.value;
    const level = $("#adLevel")?.value;
    const title = ($("#adTitle")?.value || "").trim();
    const subtitle = ($("#adSubtitle")?.value || "").trim();
    const cover = ($("#adCover")?.value || "").trim();
    const tagsRaw = ($("#adTags")?.value || "").trim();
    const text = ($("#adText")?.value || "").trim();

    const tags = tagsRaw
      ? tagsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : [];

    const item = {
      id: uidFrom(title),
      type,
      title,
      subtitle,
      cover,
      level,
      tags,
      text
    };

    if (!subtitle) delete item.subtitle;
    if (!cover) delete item.cover;
    if (!text) delete item.text;

    if (type === "track") {
      const picker = $("#adLessonPicker");
      const selected = picker ? Array.from(picker.selectedOptions).map((o) => o.value) : [];
      item.lessonIds = selected;
      if (!item.text) {
        item.text =
          "# Sobre este módulo\n" +
          "Explique o objetivo do módulo e o que o aluno deve dominar ao final.\n\n" +
          "## Como estudar\n" +
          "- Faça as lições na ordem\n" +
          "- Use metrônomo\n" +
          "- Anote dúvidas e volte aqui depois";
      }
    }

    if (type === "mission") {
      const xp = Number($("#adMissionXP")?.value || APP.XP.MISSION_DEFAULT);
      const minutes = Number($("#adMissionMin")?.value || 7);
      item.xp = clamp(xp, 1, 500);
      item.minutes = clamp(minutes, 1, 180);
      if (!item.text) item.text = "Descreva o passo a passo da missão, com foco em consistência.";
    }

    const errs = adminValidateItem(item);
    if (errs.length) {
      toast(`<strong>Erro:</strong> ${escapeHTML(errs.join(" "))}`);
      return;
    }

    State.adminDraft = Array.isArray(State.adminDraft) ? State.adminDraft : [];
    State.adminDraft.unshift(item);
    State.saveAll();
    toast(`<strong>Adicionado:</strong> ${escapeHTML(item.title)} ✅`);
    render();
  }

  function adminClearForm() {
    ["adTitle", "adSubtitle", "adCover", "adTags", "adText"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.value = "";
    });
    const picker = $("#adLessonPicker");
    if (picker) Array.from(picker.options).forEach((o) => (o.selected = false));

    const xp = $("#adMissionXP");
    if (xp) xp.value = APP.XP.MISSION_DEFAULT;
    const mn = $("#adMissionMin");
    if (mn) mn.value = 7;

    toast("Formulário limpo.");
  }

  function adminRemove(idx) {
    const d = Array.isArray(State.adminDraft) ? State.adminDraft : [];
    if (idx < 0 || idx >= d.length) return;
    const title = d[idx]?.title || "item";
    d.splice(idx, 1);
    State.adminDraft = d;
    State.saveAll();
    toast(`<strong>Removido:</strong> ${escapeHTML(title)}`);
    render();
  }

  function adminDup(idx) {
    const d = Array.isArray(State.adminDraft) ? State.adminDraft : [];
    const it = d[idx];
    if (!it) return;
    const copy = { ...it, id: uidFrom((it.title || "item") + " copy") };
    d.splice(idx + 1, 0, copy);
    State.adminDraft = d;
    State.saveAll();
    toast("Item duplicado.");
    render();
  }

  function adminCopyExport() {
    const area = $("#adExportArea");
    if (!area) return;
    area.select();
    area.setSelectionRange(0, area.value.length);
    try {
      document.execCommand("copy");
      toast("<strong>Copiado!</strong> Agora cole no GitHub.");
    } catch {
      toast("Não foi possível copiar automaticamente. Selecione e copie manualmente.");
    }
  }

  function adminSaveAsLocalContent() {
    // salva o modo FULL como conteúdo local para testar
    const built = adminBuildExport("full");
    const parsed = safeJSONParse(built.text);
    if (!parsed.ok || !Array.isArray(parsed.value)) {
      toast("<strong>Erro:</strong> export inválido.");
      return;
    }
    lsSet(APP.LS.CONTENT_CACHE, parsed.value);
    toast("<strong>Conteúdo local salvo.</strong> Recarregando…");
    setTimeout(() => location.reload(), 350);
  }

  function adminClearLocalContent() {
    localStorage.removeItem(APP.LS.CONTENT_CACHE);
    toast("Conteúdo local removido. Recarregando…");
    setTimeout(() => location.reload(), 350);
  }

  function normalizeImportText(raw) {
    // Aceita:
    // - array: [ {...}, {...} ]
    // - objeto: { ... }
    // - apêndice: , { ... }, { ... }
    // - lista de objetos sem colchetes: { ... }, { ... }
    let s = (raw || "").trim();
    if (!s) return { ok: false, reason: "vazio" };

    // Se for array, pronto
    if (s.startsWith("[")) return { ok: true, jsonText: s };

    // Se for objeto único
    if (s.startsWith("{")) return { ok: true, jsonText: "[" + s + "]" };

    // Se começar com vírgula (apêndice), remove a vírgula inicial e envolve em []
    if (s.startsWith(",")) {
      s = s.replace(/^\s*,\s*/, "");
      return { ok: true, jsonText: "[" + s + "]" };
    }

    // Caso geral: tenta envolver em []
    return { ok: true, jsonText: "[" + s + "]" };
  }

  function adminImportMerge() {
    const area = $("#adImportArea");
    const report = $("#adImportReport");
    if (!area) return;

    const raw = (area.value || "").trim();
    if (!raw) {
      if (report) report.textContent = "Cole um JSON antes de importar.";
      toast("<strong>Erro:</strong> JSON vazio.");
      return;
    }

    const norm = normalizeImportText(raw);
    if (!norm.ok) {
      if (report) report.textContent = "Erro: JSON vazio.";
      toast("<strong>Erro:</strong> JSON vazio.");
      return;
    }

    const parsed = safeJSONParse(norm.jsonText);
    if (!parsed.ok) {
      const msg = parsed.error?.message || "JSON inválido";
      if (report) report.textContent = "Erro: " + msg;
      toast(`<strong>JSON inválido:</strong> ${escapeHTML(msg)}`);
      return;
    }

    const arr = parsed.value;
    if (!Array.isArray(arr)) {
      if (report) report.textContent = "Erro: o JSON precisa ser um array.";
      toast("<strong>Erro:</strong> O JSON precisa ser um array.");
      return;
    }

    const base = Array.isArray(Store.content) ? Store.content.slice() : [];
    const ids = new Set(base.map((x) => x.id));
    let inserted = 0;
    let renamed = 0;
    let ignored = 0;
    let invalid = 0;

    const out = base.slice();

    for (const it0 of arr) {
      if (!it0 || typeof it0 !== "object") {
        ignored++;
        continue;
      }
      const it = { ...it0 };
      if (!it.id || typeof it.id !== "string") it.id = uidFrom(it.title || "item");

      // mínimos
      if (!it.type || !it.title || !it.level) {
        invalid++;
        continue;
      }

      // se duplicar, renomeia automaticamente
      let nid = it.id;
      if (ids.has(nid)) {
        let i = 2;
        while (ids.has(nid + "_v" + i)) i++;
        nid = nid + "_v" + i;
        it.id = nid;
        renamed++;
      }

      const errs = adminValidateItem(it);
      if (errs.length) {
        invalid++;
        continue;
      }

      ids.add(nid);
      out.push(it); // ✅ sempre adiciona no final
      inserted++;
    }

    // ✅ salva como conteúdo local para teste imediato
    lsSet(APP.LS.CONTENT_CACHE, out);

    const summary = `Importação concluída: inseridos=${inserted}, renomeados=${renamed}, inválidos=${invalid}, ignorados=${ignored}.`;
    if (report) report.textContent = summary;
    toast(`<strong>OK!</strong> ${escapeHTML(summary)} (conteúdo local aplicado)`);

    setTimeout(() => location.reload(), 450);
  }

  function adminClearImport() {
    const area = $("#adImportArea");
    const report = $("#adImportReport");
    if (area) area.value = "";
    if (report) report.textContent = "Área limpa.";
    toast("Import limpo.");
  }

  // ---------- Render ----------
  function render() {
    const { path, query } = parseRoute();
    setActiveTab(path);

    const view = $("#view");
    if (!view) return;

    let html = "";

    if (path === "#/home") html = homeView();
    else if (path === "#/path") html = pathView();
    else if (path === "#/track") html = trackView(query.id);
    else if (path === "#/lesson") html = lessonView(query.id);
    else if (path === "#/missions") html = missionsView();
    else if (path === "#/library") html = libraryView();
    else if (path === "#/article") html = articleView(query.id);
    else if (path === "#/profile") html = profileView();
    else if (path === "#/admin") html = adminView();
    else html = homeView();

    view.innerHTML = html;

    if (path === "#/admin") adminMount();

    const libSearch = $("#libSearch");
    if (libSearch) {
      libSearch.addEventListener("input", (e) => {
        lsSet(APP.LS.LIB_SEARCH, e.target.value || "");
        render();
      });
    }
  }

  // ---------- Actions ----------
  function bindActions() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-action]");
      if (!a) return;

      const action = a.getAttribute("data-action");
      const id = a.getAttribute("data-id");
      const idx = a.getAttribute("data-idx");
      const tab = a.getAttribute("data-tab");
      const mode = a.getAttribute("data-mode");

      if (action === "go-back") {
        e.preventDefault();
        if (history.length > 1) history.back();
        else navigate("#/home");
        return;
      }

      if (action === "do-mission") {
        e.preventDefault();
        const m = Store.get(id);
        const xpAdd = m && m.xp ? m.xp : APP.XP.MISSION_DEFAULT;
        const res = markMissionDone(id, xpAdd);
        if (res.ok) {
          toast(`<strong>+${xpAdd} XP</strong> Missão concluída ✅`);
          render();
        } else {
          toast("Você já concluiu esta missão hoje.");
        }
        return;
      }

      if (action === "do-lesson") {
        e.preventDefault();
        const xpAdd = APP.XP.LESSON_STUDY;
        const res = markLessonStudied(id, xpAdd);
        if (res.ok) {
          toast(`<strong>+${xpAdd} XP</strong> Lição registrada ✅`);
          render();
        } else {
          toast("Você já marcou esta lição hoje.");
        }
        return;
      }

      if (action === "save-profile") {
        e.preventDefault();
        const name = ($("#profileName")?.value || "Aluno(a)").trim();
        const goal = $("#profileGoal")?.value || "Misto";
        State.profile = { name: name || "Aluno(a)", goal };
        State.saveAll();
        toast("<strong>Salvo!</strong> Perfil atualizado.");
        render();
        return;
      }

      if (action === "reset-local") {
        e.preventDefault();
        const ok = confirm("Resetar dados locais? Isso apaga XP, histórico e rascunho deste dispositivo.");
        if (!ok) return;
        localStorage.removeItem(APP.LS.PROFILE);
        localStorage.removeItem(APP.LS.XP);
        localStorage.removeItem(APP.LS.DONE_MISSIONS);
        localStorage.removeItem(APP.LS.DONE_LESSONS);
        localStorage.removeItem(APP.LS.ADMIN_DRAFT);
        localStorage.removeItem(APP.LS.CONTENT_CACHE);
        localStorage.removeItem(APP.LS.LIB_SEARCH);
        toast("Reset concluído. Recarregando…");
        setTimeout(() => location.reload(), 450);
        return;
      }

      if (action === "admin-tab") {
        e.preventDefault();
        adminActiveTab = tab || "create";
        render();
        return;
      }

      if (action === "admin-add") {
        e.preventDefault();
        adminAddFromForm();
        return;
      }

      if (action === "admin-clear-form") {
        e.preventDefault();
        adminClearForm();
        return;
      }

      if (action === "admin-remove") {
        e.preventDefault();
        adminRemove(Number(idx));
        return;
      }

      if (action === "admin-dup") {
        e.preventDefault();
        adminDup(Number(idx));
        return;
      }

      if (action === "admin-export-mode") {
        e.preventDefault();
        adminExportMode = (mode === "full" || mode === "append") ? mode : "draft";
        adminMount();
        toast("Modo de exportação alterado.");
        return;
      }

      if (action === "admin-copy-export") {
        e.preventDefault();
        adminCopyExport();
        return;
      }

      if (action === "admin-save-as-local") {
        e.preventDefault();
        adminSaveAsLocalContent();
        return;
      }

      if (action === "admin-import-merge") {
        e.preventDefault();
        adminImportMerge();
        return;
      }

      if (action === "admin-clear-import") {
        e.preventDefault();
        adminClearImport();
        return;
      }

      if (action === "admin-clear-local-content") {
        e.preventDefault();
        const ok = confirm("Remover conteúdo local salvo? O app voltará a usar content.json do GitHub.");
        if (!ok) return;
        adminClearLocalContent();
        return;
      }
    });

    document.addEventListener("change", (e) => {
      if (e.target && e.target.id === "adType") {
        const v = e.target.value;
        const trackBox = $("#adTrackBox");
        const missionBox = $("#adMissionBox");
        if (trackBox) trackBox.style.display = v === "track" ? "block" : "none";
        if (missionBox) missionBox.style.display = v === "mission" ? "block" : "none";
      }
    });
  }

  // ---------- Install Prompt ----------
  function setupInstallPrompt() {
    let deferredPrompt = null;
    const btn = $("#btnInstall");

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (btn) btn.hidden = false;
    });

    if (btn) {
      btn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } catch {}
        deferredPrompt = null;
        btn.hidden = true;
      });
    }
  }

  // ---------- Service Worker ----------
  async function setupSW() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            toast("<strong>Atualização disponível.</strong> Reabra o app para aplicar.");
          }
        });
      });
    } catch {}
  }

  // ---------- Boot ----------
  async function boot() {
    linkifyAll();
    bindActions();
    setupInstallPrompt();
    await setupSW();

    const load = await loadContent();
    if (!load.ok) toast("<strong>Aviso:</strong> content.json falhou — usando fallback.");

    window.addEventListener("hashchange", render);
    if (!location.hash) location.hash = "#/home";
    render();
  }

  boot();
})();
