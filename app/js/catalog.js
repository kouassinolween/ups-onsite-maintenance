// Chargement des packs et recherche dans le catalogue d'événements.
// Les packs sont servis tels quels (JSON) depuis ../packs ; voir tools/serve.ps1.

const PACK_ROOT = new URL('../../packs/', import.meta.url);

/** Description des catalogues disponibles. Ajouter un pack = ajouter une ligne. */
export const CATALOGS = [
  { id: 'modular',   label: '93PM / 93PS modulaire', pack: '93pm', file: 'alarms.json',            family: 'modular' },
  { id: 'monoblock', label: '91PS / 93PS monobloc 8-10 kVA', pack: '93ps', file: 'alarms.monoblock.json', family: 'monoblock' },
];

async function getJson(path) {
  const res = await fetch(new URL(path, PACK_ROOT));
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
  return res.json();
}

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function loadAll() {
  const events = [];
  const packs = {};
  for (const c of CATALOGS) {
    const doc = await getJson(`${c.pack}/${c.file}`);
    packs[c.id] = { status: doc._status ?? '', source: doc._source ?? '' };
    for (const e of doc.events) {
      for (const id of e.ids) {
        events.push({
          key: `${c.id}|${e.source}|${id}`,
          catalog: c.id,
          source: e.source,
          id,
          groupIds: e.ids,
          name: e.name,
          kind: e.kind,
          level: e.level,
          target: e.target,
          page: e.page,
          errorCode: e.error_code ?? { type: 'none' },
          descFr: e.desc_fr ?? '',
          descEn: e.desc_en ?? '',
          defaults: e.defaults ?? null,
          timing: e.timing ?? null,
          imported: e.import ?? 'curated',
          manualNote: e.manual_note ?? null,
          nameNorm: strip(e.name),
          frNorm: strip(e.desc_fr),
          enNorm: strip(e.desc_en),
          haystack: strip([e.name, e.desc_fr, e.desc_en, e.source, id].join(' ')),
        });
      }
    }
  }
  // indices alarme -> pièce (pack 93PM) : on garde uniquement ce qui sert à l'affichage
  let hints = {}, parts = {}, kits = [];
  try {
    const p = await getJson('93pm/parts.json');
    hints = p.alarm_to_part_hints ?? {};
    for (const x of p.parts) parts[x.ref] = x;
    kits = p.kits ?? [];
  } catch (err) { console.warn('parts.json indisponible', err); }
  return { events, packs, hints, parts, kits };
}

/** Reconnaît une saisie directe du type "UPM 53", "mcu:204 1001", "csb 414 0x3". */
export function parseDirect(q) {
  const m = /^\s*(upm|mcu|csb)\s*[:#]?\s*(\d{1,3})(?:\s+(?:code\s*)?(0x[0-9a-f]+|\d+))?\s*$/i.exec(q);
  if (!m) return null;
  return { source: m[1].toUpperCase(), id: Number(m[2]), code: m[3] ?? null };
}

// Termes d'usage du terrain -> vocabulaire anglais du HMI (comparaison sans accents).
const SYNONYMS = {
  ventilateur: ['fan'], ventilateurs: ['fan'], batterie: ['battery', 'batteries'], batteries: ['battery', 'batteries'],
  surcharge: ['overload'], tension: ['voltage'], temperature: ['temperature', 'temp'], surtemperature: ['over temperature'],
  redresseur: ['rectifier'], onduleur: ['inverter'], chargeur: ['charger'], fusible: ['fuse'], fusibles: ['fuse'],
  defaut: ['fail', 'failed', 'fault', 'failure'], panne: ['fail', 'failed', 'fault', 'failure'], echec: ['failed', 'failure'],
  parallele: ['parallel'], disjoncteur: ['breaker'], courant: ['current'], frequence: ['frequency'],
  precharge: ['precharge'], arret: ['shutdown', 'off'], demarrage: ['startup', 'start'], reseau: ['utility', 'input', 'mains'],
  sortie: ['output'], entree: ['input'], communication: ['communicating', 'communications', 'comm'], liaison: ['can', 'communications'],
  maintenance: ['maintenance', 'service'], horloge: ['clock'], mot: ['word'],
};
const RANK_SOURCE = { UPM: 0, MCU: 1, CSB: 2 };
const RANK_KIND = { alarm: 0, sticky_alarm: 0, notice: 1, sticky_notice: 1, status: 2, command: 3 };

function tokenVariants(t) {
  return [t, ...(SYNONYMS[t] ?? [])];
}

/**
 * Recherche : chaque mot saisi doit être trouvé (lui ou un synonyme), accents ignorés.
 * Pondération : nom > explication française > texte anglais ; alarmes avant statuts.
 * filters : { catalog, source, kind, target }
 */
export function search(events, query, filters = {}) {
  const direct = parseDirect(query);
  const tokens = strip(query).split(/\s+/).filter(Boolean);
  const out = [];
  for (const e of events) {
    if (filters.catalog && e.catalog !== filters.catalog) continue;
    if (filters.source && e.source !== filters.source) continue;
    if (filters.kind && e.kind !== filters.kind) continue;
    if (filters.target && e.target !== filters.target) continue;
    let score = 0;
    if (direct) {
      if (e.source === direct.source && e.id === direct.id) score = 1000; else continue;
    } else if (tokens.length) {
      let ok = true;
      for (const t of tokens) {
        if (/^\d+$/.test(t) && String(e.id) === t) { score += 100; continue; }
        let best = 0;
        for (const v of tokenVariants(t)) {
          if (e.nameNorm.startsWith(v)) best = Math.max(best, 40);
          else if (e.nameNorm.includes(v)) best = Math.max(best, 30);
          else if (e.frNorm && e.frNorm.includes(v)) best = Math.max(best, 12);
          else if ((e.enNorm ?? e.haystack).includes(v)) best = Math.max(best, 4);
        }
        if (best === 0) { ok = false; break; }
        score += best;
      }
      if (!ok) continue;
    } else {
      score = 1;
    }
    out.push({ e, score });
  }
  out.sort((a, b) =>
    b.score - a.score ||
    (RANK_KIND[a.e.kind] ?? 9) - (RANK_KIND[b.e.kind] ?? 9) ||
    (RANK_SOURCE[a.e.source] ?? 9) - (RANK_SOURCE[b.e.source] ?? 9) ||
    a.e.id - b.e.id);
  return { direct, results: out.map((x) => x.e) };
}
/** Kits contenant une pièce donnée (pour "où trouver cette référence ?"). */
export function kitsContaining(kits, ref) {
  return kits.filter((k) => k.items.some((it) => it[0] === ref));
}

export const KIND_LABEL = {
  alarm: 'Alarme', sticky_alarm: 'Alarme mémorisée', notice: 'Avis', sticky_notice: 'Avis mémorisé',
  status: 'Statut', command: 'Commande',
};
export const TARGET_LABEL = { user: 'Utilisateur', service: 'Service' };
export const SOURCE_LABEL = { UPM: 'UPM (module de puissance)', MCU: 'MCU (contrôle / STS)', CSB: 'CSB (commande / HMI)' };

