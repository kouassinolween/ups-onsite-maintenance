import { CATALOGS, loadAll, search, parseDirect, kitsContaining, KIND_LABEL, TARGET_LABEL, SOURCE_LABEL } from './catalog.js';
import { decode, defaultBase, needsCode, listBits, combine, formatCode, parseCode } from './decoder.js';

const $ = (sel) => document.querySelector(sel);
const MAX_RENDER = 120;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

const state = { data: null, filters: { catalog: 'modular', source: '', kind: '', target: '' }, q: '' };

/* ---------- liste ---------- */
function badge(cls, text) { return h('span', { class: `badge ${cls}` }, text); }

function renderList() {
  const { direct, results } = search(state.data.events, state.q, state.filters);
  const ul = $('#results');
  ul.replaceChildren();
  $('#count').textContent = results.length === 0 ? '' : `${results.length} résultat${results.length > 1 ? 's' : ''}` +
    (results.length > MAX_RENDER ? ` (les ${MAX_RENDER} premiers sont affichés ; affinez la recherche)` : '');

  if (results.length === 0) {
    ul.append(h('li', { class: 'empty' }, state.q ? 'Aucun événement ne correspond.' : 'Saisissez une recherche.'));
    return;
  }
  for (const e of results.slice(0, MAX_RENDER)) {
    const btn = h('button', { class: 'card', type: 'button', onclick: () => open(e.key, direct?.code ?? null) },
      h('div', { class: 'l1' },
        h('span', { class: 'id' }, `${e.source} ${e.id}`),
        h('span', { class: 'nm' }, e.name),
        badge(`b-${e.kind}`, KIND_LABEL[e.kind] ?? e.kind ?? '?'),
        e.imported === 'auto' ? badge('b-auto', 'à relire') : null,
      ),
      h('div', { class: 'fr' }, e.descFr));
    ul.append(h('li', {}, btn));
  }
}

/* ---------- détail ---------- */
function open(key, presetCode = null) {
  const e = state.data.events.find((x) => x.key === key);
  if (!e) return;
  location.hash = `#/${encodeURIComponent(key)}${presetCode ? '/' + encodeURIComponent(presetCode) : ''}`;
  renderDetail(e, presetCode);
}

function close() {
  location.hash = '';
  $('#detail-view').hidden = true;
  $('#list-view').hidden = false;
  window.scrollTo(0, 0);
}

function renderDecoder(e, presetCode) {
  const ec = e.errorCode;
  const wrap = h('section', { class: 'box decoder', 'aria-label': 'Décodage du code d\'erreur' });
  wrap.append(h('h3', {}, 'Code d\'erreur'));

  if (!needsCode(ec)) {
    wrap.append(h('p', { class: 'muted' }, 'Cet événement n\'a pas de code d\'erreur.'));
    return wrap;
  }
  if (ec.note) wrap.append(h('p', { class: 'muted' }, ec.note));

  let base = defaultBase(ec);
  const input = h('input', { type: 'text', inputmode: 'text', id: 'code', autocomplete: 'off', placeholder: base === 'hex' ? 'ex. 0x0808' : 'ex. 12', value: presetCode ?? '' });
  const outcome = h('div', { 'aria-live': 'polite' });

  const baseBtns = ['dec', 'hex'].map((b) => h('button', {
    type: 'button', 'aria-pressed': String(b === base),
    onclick: () => { base = b; syncBase(); update(); },
  }, b === 'dec' ? 'Décimal' : 'Hexadécimal'));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Base de saisie' }, baseBtns);
  function syncBase() { baseBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(['dec', 'hex'][i] === base))); }

  const bitList = ec.type === 'bitfield' ? listBits(ec) : [];
  const checks = bitList.map((b) => h('input', { type: 'checkbox', 'data-mask': b.mask, onchange: fromChecks }));

  function fromChecks() {
    const value = combine(checks.filter((c) => c.checked).map((c) => Number(c.dataset.mask)));
    input.value = value === 0 ? '' : formatCode(value, base === 'hex');
    update(true);
  }
  function syncChecks(value) {
    checks.forEach((c) => { c.checked = (value & Number(c.dataset.mask)) !== 0; });
  }

  function update(fromBits = false) {
    outcome.replaceChildren();
    const r = decode(ec, input.value, base);
    if (r.status === 'empty') { outcome.append(h('p', { class: 'muted' }, 'Saisissez le code lu sur le HMI.')); if (!fromBits) syncChecks(0); return; }
    if (r.status === 'invalid') {
      outcome.append(h('div', { class: 'result bad' }, 'Code non reconnu : saisissez un nombre (ex. 12) ou une valeur hexadécimale préfixée (ex. 0x0C).'));
      return;
    }
    if (ec.type === 'bitfield' && !fromBits) syncChecks(r.parsed.value);
    if (r.status === 'unmatched') {
      outcome.append(h('div', { class: 'result bad' },
        `Valeur ${r.parsed.text} absente du catalogue pour cet événement.`,
        r.unknown ? ` Bits non décrits : ${r.unknown}.` : '',
        ' Vérifiez la base de saisie (décimal / hexadécimal) et la lecture du HMI.'));
      return;
    }
    const lines = r.matches.map((m) => h('li', {}, h('code', {}, m.key), ' : ', m.label));
    outcome.append(h('div', { class: 'result ok' },
      r.zero ? 'Aucun bit actif (code 0).' : `Interprétation de ${r.parsed.text} :`,
      lines.length ? h('ul', {}, lines) : null,
      r.unknown ? h('p', { class: 'muted' }, `Bits supplémentaires non décrits dans le manuel : ${r.unknown}`) : null));
  }
  input.addEventListener('input', () => update(false));

  wrap.append(h('div', { class: 'row' }, h('label', { for: 'code' }, 'Code lu :'), input, seg));
  wrap.append(outcome);

  // légende : toutes les valeurs possibles
  if (ec.type === 'bitfield') {
    wrap.append(h('p', { class: 'muted' }, 'Ou cochez les bits actifs pour obtenir le code :'));
    wrap.append(h('ul', { class: 'bits' }, bitList.map((b, i) =>
      h('li', {}, h('label', {}, checks[i], h('code', {}, b.key), h('span', {}, b.label))))));
    const specials = Object.entries(ec.bits).filter(([k]) => !bitList.some((b) => b.key === k));
    if (specials.length) wrap.append(h('p', { class: 'muted' }, 'Valeurs spéciales : ' + specials.map(([k, v]) => `${k} = ${v}`).join(' ; ')));
  } else if (ec.type === 'enum') {
    wrap.append(h('details', {}, h('summary', {}, 'Toutes les valeurs possibles'),
      h('ul', { class: 'bits' }, Object.entries(ec.values).map(([k, v]) => h('li', {}, h('code', {}, k), ' : ', v)))));
  } else if (ec.type === 'phases') {
    wrap.append(h('p', { class: 'muted' }, 'Chiffres = phases concernées : 1 = phase 1, 2 = phase 2, 3 = phase 3 ; 12 = phases 1 et 2 ; 123 = les trois.'));
  }
  update(false);
  return wrap;
}

function renderHints(e) {
  const keys = [`${e.source}:${e.id}`, ...e.groupIds.map((i) => `${e.source}:${i}`)];
  const hintKey = keys.find((k) => state.data.hints[k]);
  if (!hintKey || e.catalog !== 'modular') return null;
  const hint = state.data.hints[hintKey];
  const box = h('section', { class: 'box warn' },
    h('h3', {}, 'Pièces candidates (à confirmer par mesure)'));
  for (const ref of hint.candidate_parts ?? []) {
    const p = state.data.parts[ref];
    const inKits = kitsContaining(state.data.kits, ref).map((k) => `${k.model} kit ${k.variant}`);
    box.append(h('div', { class: 'part' }, h('code', {}, ref), p?.label ?? '',
      inKits.length ? h('span', { class: 'muted' }, `(dans : ${inKits.join(', ')})`) : null));
  }
  if (!hint.candidate_parts?.length) box.append(h('p', { class: 'muted' }, 'Aucune référence confirmée.'));
  if (hint.behaviour_note) box.append(h('p', {}, hint.behaviour_note));
  if (hint.verify_first?.length) box.append(h('p', {}, h('strong', {}, 'À vérifier d\'abord : '), hint.verify_first.join(' ; ')));
  if (hint.procedure_ref?.length) box.append(h('p', { class: 'muted' }, 'Procédures (service manual) : ' + hint.procedure_ref.join(' ; ')));
  box.append(h('p', { class: 'muted' }, 'Candidats de diagnostic : aucun document ne donne de table alarme → pièce. Ne jamais remplacer une pièce sur la seule foi d\'une alarme.'));
  return box;
}

function renderDetail(e, presetCode) {
  const view = $('#detail-view');
  view.replaceChildren();
  const family = CATALOGS.find((c) => c.id === e.catalog)?.label ?? e.catalog;
  const ids = e.groupIds.length > 1 ? `(groupe : ${e.groupIds.join(', ')})` : '';

  view.append(h('article', { class: 'detail' },
    h('button', { class: 'back', type: 'button', onclick: close }, '← Retour aux résultats'),
    h('h2', {}, `${e.source} ${e.id} — ${e.name}`),
    h('div', { class: 'meta' },
      badge(`b-${e.kind}`, KIND_LABEL[e.kind] ?? '?'),
      e.level != null ? badge('b-src', `Niveau ${e.level}`) : null,
      e.target ? badge('b-src', TARGET_LABEL[e.target]) : null,
      badge('b-src', family),
      e.imported === 'auto' ? badge('b-auto', 'extraction automatique, à relire') : null),
    h('section', { class: 'box' },
      h('h3', {}, 'Explication'),
      h('p', {}, e.descFr || 'Traduction non disponible.'),
      e.manualNote ? h('p', { class: 'muted' }, `Remarque sur le manuel : ${e.manualNote}`) : null),
    renderDecoder(e, presetCode),
    renderHints(e),
    h('section', { class: 'box' },
      h('h3', {}, 'Références'),
      h('table', { class: 'kv' },
        h('tr', {}, h('th', {}, 'Source'), h('td', {}, SOURCE_LABEL[e.source] ?? e.source)),
        h('tr', {}, h('th', {}, 'Numéro d\'événement'), h('td', {}, `${e.id} ${ids}`)),
        e.page ? h('tr', {}, h('th', {}, 'Manuel d\'alarmes'), h('td', {}, `Rev 003, p. ${e.page}`)) : null,
        e.defaults ? h('tr', {}, h('th', {}, 'Valeurs par défaut'), h('td', {}, Object.entries(e.defaults).map(([k, v]) => `${k} : ${v}`).join(' ; '))) : null,
        e.timing ? h('tr', {}, h('th', {}, 'Scan / activation / désactivation / journal'), h('td', {}, e.timing)) : null)),
    e.descEn ? h('details', { class: 'box' }, h('summary', {}, 'Texte du manuel (anglais)'), h('p', { class: 'en' }, e.descEn)) : null,
  ));
  $('#list-view').hidden = true;
  view.hidden = false;
  window.scrollTo(0, 0);
}

/* ---------- initialisation ---------- */
function readHash() {
  const m = /^#\/([^/]+)(?:\/(.+))?$/.exec(location.hash);
  if (!m) return null;
  return { key: decodeURIComponent(m[1]), code: m[2] ? decodeURIComponent(m[2]) : null };
}

function route() {
  const r = readHash();
  if (r) {
    const e = state.data.events.find((x) => x.key === r.key);
    if (e) { renderDetail(e, r.code); return; }
  }
  $('#detail-view').hidden = true;
  $('#list-view').hidden = false;
}

function bind() {
  const sel = $('#f-catalog');
  for (const c of CATALOGS) sel.append(h('option', { value: c.id }, c.label));
  sel.value = state.filters.catalog;
  sel.addEventListener('change', () => { state.filters.catalog = sel.value; renderList(); });
  for (const [id, key] of [['#f-source', 'source'], ['#f-kind', 'kind'], ['#f-target', 'target']]) {
    $(id).addEventListener('change', (ev) => { state.filters[key] = ev.target.value; renderList(); });
  }
  let t;
  $('#q').addEventListener('input', (ev) => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = ev.target.value;
      // "UPM 53" sans précision de famille : bascule sur modulaire (monobloc si absent)
      renderList();
    }, 80);
  });
  window.addEventListener('hashchange', route);
  const net = $('#net');
  const upd = () => { net.textContent = navigator.onLine ? 'en ligne' : 'hors ligne'; };
  window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
}

async function init() {
  try {
    state.data = await loadAll();
  } catch (err) {
    $('#results').append(h('li', { class: 'empty' }, `Impossible de charger le catalogue : ${err.message}`));
    return;
  }
  bind();
  renderList();
  route();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker non enregistré', err));
  }
}

init();
export { parseDirect, parseCode, SOURCE_LABEL }; // pour les tests manuels dans la console
