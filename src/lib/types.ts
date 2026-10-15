import type { RepairData } from './repair';

export type ErrorCodeType = 'none' | 'enum' | 'bitfield' | 'phases';

export interface ErrorCode {
  type: ErrorCodeType;
  values?: Record<string, string>;
  bits?: Record<string, string>;
  note?: string;
}

export type EventKind = 'alarm' | 'sticky_alarm' | 'notice' | 'sticky_notice' | 'status' | 'command';
export type Source = 'UPM' | 'MCU' | 'CSB' | 'UPS';
export type CatalogId = 'modular' | 'monoblock' | 'ups93t' | 'ups93e' | 'ups93e_large' | 'ups9e';

/** Une ligne du catalogue, un identifiant par objet (les groupes sont dépliés). */
export interface CatalogEvent {
  key: string;
  catalog: CatalogId;
  source: Source;
  id: number;
  groupIds: number[];
  /** Identifiant affiché quand il diffère du numéro (ex. code 9E « A60D »). */
  displayId: string | null;
  name: string;
  kind: EventKind | null;
  level: number | null;
  target: 'user' | 'service' | null;
  page: number | null;
  errorCode: ErrorCode;
  descFr: string;
  descEn: string;
  defaults: Record<string, string> | null;
  timing: string | null;
  imported: 'auto' | 'curated';
  manualNote: string | null;
  /** Anciens libellés (firmware 2015, spécification Panda Premier REV 171), cherchables. */
  aliases: string[];
  nameNorm: string;
  aliasNorm: string;
  frNorm: string;
  enNorm: string;
}

export interface PartHint {
  candidate_parts?: string[];
  procedure_ref?: string[];
  behaviour_note?: string;
  verify_first?: string[];
  confidence?: string;
}

export interface Part {
  ref: string; label: string; category?: string; generation?: string;
  alt_ref?: string; qty?: Record<string, number | null>;
}

/** Alarme utilisateur : cause probable et solution du tableau « UPS alarms and faults ». */
export interface UserAlarm {
  causeFr: string; solutionFr: string; causeEn: string; solutionEn: string; tableName: string; page: number;
}
export interface Kit { kit: string; model: string; variant: string; items: [string, number][] }

export interface CatalogData {
  events: CatalogEvent[];
  hints: Record<string, PartHint>;
  parts: Record<string, Part>;
  kits: Kit[];
  /** Clé : même clé que l'événement (famille|source|id). */
  userAlarms: Record<string, UserAlarm>;
  /** Pistes de réparation (packs/repair). */
  repair: RepairData | null;
}

export interface DecodeMatch { key: string; label: string }
export interface Parsed { ok: true; value: number; text: string; hex: boolean }
export type ParseResult = Parsed | { ok: false; reason: 'empty' | 'format' };

export interface DecodeResult {
  status: 'none' | 'empty' | 'invalid' | 'ok' | 'unmatched';
  matches: DecodeMatch[];
  parsed?: Parsed;
  unknown?: string;
  note?: string;
  zero?: boolean;
}
