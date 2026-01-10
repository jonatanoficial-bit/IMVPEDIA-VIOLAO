/* =========================================================
   IMVpedia Violão — App.js (VERSÃO CORRIGIDA GITHUB PAGES)
   Caminhos RELATIVOS para funcionar em subpasta
   ========================================================= */

'use strict';

/* ===================== UTILITIES ===================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const uid = () => 'id_' + Math.random().toString(36).slice(2, 11);

/* ===================== STATE ===================== */

let CONTENT = [];
let ROUTE = 'home';

const USER = store.get('imv_user', {
  name: 'Aluno(a)',
  goal: 'Misto',
  xp: 30,
  level: 1,
  lessonsDone: 1,
  missionsToday: 1,
  date: new Date().toISOString().slice(0, 10)
});

/* ===================== CONTENT LOAD ===================== */

async function loadContent() {
  try {
    // 🚨 CAMINHO RELATIVO — FUNCIONA NO GITHUB PAGES
    const res = await fetch('./packs/base/imports/content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    CONTENT = await res.json();
    console.log('Conteúdo carregado:', CONTENT.length, 'itens');
    return true;
  } catch (err) {
    console.warn('Fallback ativado:', err.message);
    CONTENT = [];
    return false;
  }
}

/* ===================== ROUTER ===================== */

function getRoute() {
  return location.hash.replace('#/', '') || 'home';
}

function navigate(route) {
  location.hash = '#/' + route;
}

/* ===================== RENDER ===================== */

function render() {
  ROUTE = getRoute();
  $('#app').innerHTML = '';

  switch (ROUTE.split('?')[0]) {
    case 'home': renderHome(); break;
    case 'path': renderPath(); break;
    case 'missions': renderMissions(); break;
    case 'library': renderLibrary(); break;
    case 'profile': renderProfile(); break;
    default: renderHome();
  }
}

/* ===================== HOME ===================== */

function renderHome() {
  $('#app').innerHTML = `
    <section class="card hero">
      <h1>Sua jornada no Violão</h1>
      <p>Popular, Erudito ou Misto — constância + técnica.</p>

      <div class="stats">
        <div>Nível ${USER.level}<small>${USER.xp} XP</small></div>
        <div>25%<small>Progresso</small></div>
        <div>${USER.missionsToday}<small>Missões hoje</small></div>
      </div>

      <div class="actions">
        <button onclick="navigate('path')">Continuar Trilha</button>
        <button onclick="navigate('missions')">Abrir Missões</button>
        <button onclick="navigate('library')">Biblioteca</button>
      </div>
    </section>

    ${CONTENT.length === 0 ? `
      <div class="fallback">
        ⚠️ O app entrou em modo fallback porque o arquivo content.json não carregou.
        <br>Abra o Admin para importar/mesclar conteúdo.
      </div>
    ` : ''}
  `;
}

/* ===================== PATH ===================== */

function renderPath() {
  const tracks = CONTENT.filter(i => i.type === 'track');

  $('#app').innerHTML = `
    <h1>Trilha</h1>
    ${tracks.length === 0 ? `
      <div class="card">Conteúdo não carregou (modo fallback)</div>
    ` : tracks.map(t => `
      <div class="card">
        <h3>${t.title}</h3>
        <p>${t.subtitle}</p>
        <div class="tags">${t.tags.map(tag => `<span>${tag}</span>`).join('')}</div>
        <small>${t.lessonIds.length} lições</small>
      </div>
    `).join('')}
  `;
}

/* ===================== MISSIONS ===================== */

function renderMissions() {
  const missions = CONTENT.filter(i => i.type === 'mission');

  $('#app').innerHTML = `
    <h1>Missões</h1>
    ${missions.map(m => `
      <div class="card">
        <h3>${m.title}</h3>
        <p>${m.text}</p>
        <small>+${m.xp} XP • ${m.minutes} min</small>
      </div>
    `).join('')}
  `;
}

/* ===================== LIBRARY ===================== */

function renderLibrary() {
  const libs = CONTENT.filter(i => i.type === 'library');

  $('#app').innerHTML = `
    <h1>Biblioteca</h1>
    ${libs.map(a => `
      <div class="card">
        <h3>${a.title}</h3>
        <p>${a.subtitle}</p>
      </div>
    `).join('')}
  `;
}

/* ===================== PROFILE ===================== */

function renderProfile() {
  $('#app').innerHTML = `
    <h1>Perfil</h1>
    <div class="card">
      <label>Nome</label>
      <input value="${USER.name}">
      <label>Objetivo</label>
      <select>
        <option ${USER.goal === 'Popular' ? 'selected' : ''}>Popular</option>
        <option ${USER.goal === 'Erudito' ? 'selected' : ''}>Erudito</option>
        <option ${USER.goal === 'Misto' ? 'selected' : ''}>Misto</option>
      </select>
    </div>
  `;
}

/* ===================== BOOT ===================== */

async function boot() {
  await loadContent();
  render();
}

window.addEventListener('hashchange', render);
window.addEventListener('load', boot);
