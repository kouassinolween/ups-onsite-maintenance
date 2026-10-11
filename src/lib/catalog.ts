// Chargement des packs et recherche dans le catalogue d'événements.
import type { CatalogData, CatalogEvent, CatalogId, EventKind, Kit, Part, PartHint, Source } from './types';

export interface CatalogDef { id: CatalogId; label: string; pack: string; file: string }

/** Catalogues disponibles. Ajouter un pack = ajouter une ligne. */
export const CATALOGS: CatalogDef[] = [
  { id: 'modular', label: '93PM / 93PS modulaire', pack: '93pm', file: 'alarms.json' },
  { id: 'monoblock', label: '91PS / 93PS monobloc 8-10 kVA', pack: '93ps', file: 'alarms.monoblock.json' },
];

export const KIND_LABEL: Record<string, string> = {
  alarm: 'Alarme', sticky_alarm: 'Alarme mémorisée', notice: 'Avis', sticky_notice: 'Avis mémorisé',
  status: 'Statut', command: 'Commande',
};
export const TARGET_LABEL: Record<string, string> = { user: 'Utilisateur', service: 'Service' };
export const SOURCE_LABEL: Record<string, string> = {
  UPM: 'UPM (module de puissance)', MCU: 'MCU (contrôle / STS)', CSB: 'CSB (commande / HMI)',
};

export const strip = (s: unknown): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- brut JSON -> modèle ---------- */
export interface RawEvent {
  source: Source; ids: number[]; name: string; kind?: EventKind | null; level?: number | null;
  target?: 'user' | 'service' | null; page?: number | null; error_code?: CatalogEvent['errorCode'];
  desc_fr?: string | null; desc_en?: string | null; defaults?: Record<string, string> | null;
  timing?: string | null; import?: 'auto' | 'curated'; manual_note?: string | null;
}

export function expandEvents(catalog: CatalogId, raw: RawEvent[]): CatalogEvent[] {
  const out: CatalogEvent[] = [];
  for (const e of raw) {
    for (const id of e.ids) {
      out.push({
        key: `${catalog}|${e.source}|${id}`,
        catalog, source: e.source, id, groupIds: e.ids,
        name: e.name, kind: e.kind ?? null, level: e.level ?? null, target: e.target ?? null,
        page: e.page ?? null, errorCode: e.error_code ?? { type: 'none' },
        descFr: e.desc_fr ?? '', descEn: e.desc_en ?? '',
        defaults: e.defaults ?? null, timing: e.timing ?? null,
        imported: e.import ?? 'curated', manualNote: e.manual_note ?? null,
        nameNorm: strip(e.name), frNorm: strip(e.desc_fr), enNorm: strip(e.desc_en),
      });
    }
  }
  return out;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}packs/${path}`);
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadAll(): Promise<CatalogData> {
  const events: CatalogEvent[] = [];
  for (const c of CATALOGS) {
    const doc = await getJson<{ events: RawEvent[] }>(`${c.pack}/${c.file}`);
    events.push(...expandEvents(c.id, doc.events));
  }
  let hints: Record<string, PartHint> = {};
  const parts: Record<string, Part> = {};
  let kits: Kit[] = [];
  try {
    const p = await getJson<{ alarm_to_part_hints?: Record<string, PartHint>; parts: Part[]; kits?: Kit[] }>('93pm/parts.json');
    hints = p.alarm_to_part_hints ?? {};
    for (const x of p.parts) parts[x.ref] = x;
    kits = p.kits ?? [];
  } catch (err) {
    console.warn('parts.json indisponible', err);
  }
  return { events, hints, parts, kits };
}

/* ---------- recherche ---------- */
export interface DirectQuery { source: Source; id: number; code: string | null }

/** Reconnaît "UPM 53", "mcu:204 1001", "csb 414 0xFF". */
export function parseDirect(q: string): DirectQuery | null {
  const m = /^\s*(upm|mcu|csb)\s*[:#]?\s*(\d{1,3})(?:\s+(?:code\s*)?(0x[0-9a-f]+|\d+))?\s*$/i.exec(q);
  if (!m) return null;
  return { source: m[1].toUpperCase() as Source, id: Number(m[2]), code: m[3] ?? null };
}

// Termes d'usage du terrain -> vocabulaire anglais du HMI (comparaison sans accents).
const SYNONYMS: Record<string, string[]> = {
  ventilateur: ['fan'], ventilateurs: ['fan'], batterie: ['battery', 'batteries'], batteries: ['battery', 'batteries'],
  surcharge: ['overload'], tension: ['voltage'], temperature: ['temperature', 'temp'], surtemperature: ['over temperature'],
  redresseur: ['rectifier'], onduleur: ['inverter'], chargeur: ['charger'], fusible: ['fuse'], fusibles: ['fuse'],
  defaut: ['fail', 'failed', 'fault', 'failure'], panne: ['fail', 'failed', 'fault', 'failure'], echec: ['failed', 'failure'],
  parallele: ['parallel'], disjoncteur: ['breaker'], courant: ['current'], frequence: ['frequency'],
  arret: ['shutdown', 'off'], demarrage: ['startup', 'start'], reseau: ['utility', 'input', 'mains'],
  sortie: ['output'], entree: ['input'], communication: ['communicating', 'communications', 'comm'],
  liaison: ['can', 'communications'], horloge: ['clock'],
};
const RANK_SOURCE: Record<string, number> = { UPM: 0, MCU: 1, CSB: 2 };
const RANK_KIND: Record<string, number> = { alarm: 0, sticky_alarm: 0, notice: 1, sticky_notice: 1, status: 2, command: 3 };

export interface SearchFilters {
  catalog?: CatalogId | '';
  source?: Source | '';
  kind?: EventKind | '';
  target?: 'user' | 'service' | '';
}

/** Chaque mot (ou synonyme) doit être trouvé ; nom > explication FR > texte anglais ; alarmes d'abord. */
export function search(events: CatalogEvent[], query: string, filters: SearchFilters = {}) {
  const direct = parseDirect(query);
  const tokens = strip(query).split(/\s+/).filter(Boolean);
  const scored: { e: CatalogEvent; score: number }[] = [];
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
        for (const v of [t, ...(SYNONYMS[t] ?? [])]) {
          if (e.nameNorm.startsWith(v)) best = Math.max(best, 40);
          else if (e.nameNorm.includes(v)) best = Math.max(best, 30);
          else if (e.frNorm.includes(v)) best = Math.max(best, 12);
          else if (e.enNorm.includes(v)) best = Math.max(best, 4);
        }
        if (best === 0) { ok = false; break; }
        score += best;
      }
      if (!ok) continue;
    } else {
      score = 1;
    }
    scored.push({ e, score });
  }
  scored.sort((a, b) =>
    b.score - a.score ||
    (RANK_KIND[a.e.kind ?? ''] ?? 9) - (RANK_KIND[b.e.kind ?? ''] ?? 9) ||
    (RANK_SOURCE[a.e.source] ?? 9) - (RANK_SOURCE[b.e.source] ?? 9) ||
    a.e.id - b.e.id);
  return { direct, results: scored.map((x) => x.e) };
}

export function kitsContaining(kits: Kit[], ref: string): Kit[] {
  return kits.filter((k) => k.items.some((it) => it[0] === ref));
}
