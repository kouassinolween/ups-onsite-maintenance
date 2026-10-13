// Documentation structurée du pack 93T : procédures, modes de fonctionnement, parallèle.
// Les fichiers sont servis sous packs/93t/ (voir vite.config.ts).

export interface Tool { tool: string; sizes: string | null }
export interface Torque { component: string; nm: number; lb_in: number; kgf_cm?: number }
export interface Access { component: string; panels: string[] }

export interface Procedure {
  id: string;
  label: string;
  access?: string;
  prerequisites?: string[];
  switches?: string[];
  switches_note?: string;
  /** Variante matérielle concernée (ex. « 480 V », « 400 V (EMEA) »). */
  variant?: string;
  steps: string[];
  /** Étapes de remise en place quand elles diffèrent de « dans l'ordre inverse ». */
  replacement_steps?: string[];
  disassembly_steps?: string[];
  warnings?: string[];
  notes?: string[];
  torque_refs?: string[];
  parts_hint?: string[];
  /** Identifiants de procédures ou textes libres. */
  after?: string[];
  source: string;
}

export interface ProceduresDoc {
  tools: Tool[];
  torque_values: Torque[];
  torque_note: string;
  torque_source: string;
  access?: Access[];
  access_source?: string;
  safety: { before_any_work: string[]; source: string };
  procedures: Procedure[];
}

export interface OperatingMode {
  id: string;
  label: string;
  category: 'normal' | 'other';
  summary: string;
  indicators?: { status_bar: string | null; lamps: string | null };
  relays?: string;
  safety?: string[];
  typical_use?: string;
  notes?: string[];
  events?: string[];
  related_procedure?: string;
  source: string;
}
export interface StartupProcedure {
  id: string; label: string; steps: string[]; warnings?: string[]; notes?: string[]; source: string;
}
export interface ModesDoc {
  components: { section: string; items: string[] }[];
  operating_modes: OperatingMode[];
  startup: StartupProcedure[];
}

export interface ParallelDoc {
  topology: { label: string; max_units: number; redundancy: string; rules: string[]; source: string };
  sync: { sources: string[]; rules: string[]; startup_scenarios: string[]; source: string };
  behaviours: {
    id: string; label: string; text: string; source: string; related_events?: string[];
    specification?: { unit: string; rows: { mode: string; can: boolean; internal_share: number; external_share: number }[] };
  }[];
  transfers: { id: string; label: string; text: string; source: string }[];
  setup: {
    label: string; intro: string; checks_before: string[]; steps: string[]; example: string;
    eeprom: { id: number; meaning: string }[]; source: string;
  };
  troubleshooting: { alarm: string; event: string; checks: string[]; source: string }[];
}

export interface Doc93T { procedures: ProceduresDoc; modes: ModesDoc; parallel: ParallelDoc }

export type DocTab = 'procedures' | 'modes' | 'parallel' | 'options';
export const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: 'procedures', label: 'Procédures' },
  { id: 'modes', label: 'Modes' },
  { id: 'parallel', label: 'Parallèle' },
  { id: 'options', label: 'Options' },
];

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}packs/93t/${name}`);
  if (!res.ok) throw new Error(`93t/${name} : HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadDoc93t(): Promise<Doc93T> {
  const [procedures, modes, parallel] = await Promise.all([
    getJson<ProceduresDoc>('procedures.json'),
    getJson<ModesDoc>('modes.json'),
    getJson<ParallelDoc>('parallel.json'),
  ]);
  return { procedures, modes, parallel };
}

export type DocFamily = '93t' | '93pm';
export const DOC_FAMILIES: { id: DocFamily; label: string }[] = [
  { id: '93t', label: '93T' },
  { id: '93pm', label: '93PM' },
];
export interface DocRoute { family: DocFamily; tab: DocTab }

/**
 * Route des écrans de documentation : #/v/<famille>/<onglet>. L'ancienne forme #/v/<onglet>
 * désigne le 93T. Retourne null pour toute autre route.
 */
export function parseDocRoute(hash: string): DocRoute | null {
  const m = /^#\/v\/(?:(93t|93pm)\/)?(procedures|modes|parallel|options)$/.exec(hash);
  return m ? { family: (m[1] as DocFamily | undefined) ?? '93t', tab: m[2] as DocTab } : null;
}

export const docHash = (r: DocRoute): string => `#/v/${r.family}/${r.tab}`;

/** Fichiers JSON du pack 93PM affichés dans chaque onglet (rendu générique). */
export const PM_FILES: Record<DocTab, { file: string; title?: string }[]> = {
  procedures: [
    { file: 'troubleshooting.json', title: 'Événements : types, niveaux et journalisation' },
    { file: 'checklists.draft.json', title: 'Check-lists de maintenance (brouillon)' },
  ],
  modes: [
    { file: 'modes.json' },
    { file: 'access.json', title: "Niveaux d'accès et menus du HMI" },
    { file: 'abm.json', title: 'Gestion avancée de batterie (ABM)' },
  ],
  parallel: [{ file: 'parallel.json' }],
  options: [{ file: 'options.json' }],
};

export const loadPmProcedures = (): Promise<ProceduresDoc> =>
  fetch(`${import.meta.env.BASE_URL}packs/93pm/procedures.json`).then((res) => {
    if (!res.ok) throw new Error(`93pm/procedures.json : HTTP ${res.status}`);
    return res.json() as Promise<ProceduresDoc>;
  });

export async function loadPmDoc(
  tab: DocTab,
  family: DocFamily = '93pm',
): Promise<{ title?: string; data: Record<string, unknown> }[]> {
  return Promise.all(PM_FILES[tab].map(async ({ file, title }) => {
    const res = await fetch(`${import.meta.env.BASE_URL}packs/${family}/${file}`);
    if (!res.ok) throw new Error(`${family}/${file} : HTTP ${res.status}`);
    return { title, data: (await res.json()) as Record<string, unknown> };
  }));
}

/** Résout un renvoi « après » : identifiant de procédure connu -> son libellé, sinon texte libre. */
export function resolveRef(procedures: Procedure[], ref: string): { label: string; isProcedure: boolean } {
  const p = procedures.find((x) => x.id === ref);
  return p ? { label: p.label, isProcedure: true } : { label: ref, isProcedure: false };
}
