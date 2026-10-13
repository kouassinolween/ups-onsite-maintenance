// Pistes de réparation suggérées à partir du libellé de l'événement.
// Données : packs/repair/suggestions.json (synthèse des manuels de service, à confirmer par mesure).
import type { CatalogId, EventKind } from './types';
import { parseDocRoute } from './doc93t';

export interface RepairLink { label: string; tab: string; family?: string }
export interface RepairCategory {
  id: string;
  label: string;
  keywords: string[];
  exclude?: string[];
  steps: string[];
  links?: Record<string, RepairLink[]>;
  source?: string;
}
export interface RepairData {
  disclaimer: string;
  safety: string[];
  general_process: { label: string; steps: string[]; source?: string };
  informational: { label: string; text: string };
  categories: RepairCategory[];
}

export interface RepairSuggestion {
  informational: boolean;
  categories: RepairCategory[];
  /** Liens résolus, par catégorie. */
  links: Record<string, { label: string; href: string }[]>;
}

const FAMILY_OF: Record<CatalogId, string> = {
  modular: '93pm', monoblock: '93ps', ups93t: '93t', ups93e: '93e', ups93e_large: '93e', ups9e: '9e',
};

const FAULT_WORDS = /(fail|fault|error|abnormal|loss|lost|not available|trip|over|under|short|incompatible|imminent|disconnected|invalid|blocked|exceed)/;
const MAX_CATEGORIES = 3;

const wordStart = (kw: string) => new RegExp('(^|[^a-z0-9])' + kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** Catégories applicables à un événement, dans l'ordre des données. */
export function suggestRepairs(
  data: RepairData, name: string, kind: EventKind | null, catalog: CatalogId,
): RepairSuggestion {
  const n = name.toLowerCase();
  const informational = (kind === 'status' || kind === 'command') && !FAULT_WORDS.test(n);
  if (informational) return { informational: true, categories: [], links: {} };

  const family = FAMILY_OF[catalog];
  const categories = data.categories
    .filter((c) => c.keywords.some((k) => wordStart(k).test(n)) && !(c.exclude ?? []).some((x) => n.includes(x)))
    .slice(0, MAX_CATEGORIES);

  const links: RepairSuggestion['links'] = {};
  for (const c of categories) {
    const out: { label: string; href: string }[] = [];
    for (const l of c.links?.[family] ?? []) {
      const href = `#/v/${l.family ?? family}/${l.tab}`;
      if (parseDocRoute(href)) out.push({ label: l.label, href });
    }
    if (out.length) links[c.id] = out;
  }
  return { informational: false, categories, links };
}
