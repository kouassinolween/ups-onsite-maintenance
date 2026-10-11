// Décodage des codes d'erreur des événements Eaton 93PM / 93PS.
// Module pur (aucun accès DOM).
//
//   none     : pas de code
//   enum     : valeur parmi `values` (clés exactes ou jokers : x1, 1xxx, 0x001x)
//   bitfield : somme de bits décrits dans `bits`
//   phases   : chiffres 1, 2, 3 = phases concernées (12 = phases 1 et 2, 123 = les trois)

import type { DecodeResult, ErrorCode, ParseResult, Parsed } from './types';

export type Base = 'dec' | 'hex';

const HEX_RE = /^0x[0-9a-f]+$/i;
const DEC_RE = /^\d+$/;
const BARE_HEX_RE = /^[0-9a-f]+$/i;

/** Lit la saisie. `base` ne sert que sans préfixe 0x. */
export function parseCode(raw: unknown, base: Base = 'dec'): ParseResult {
  const s = String(raw ?? '').trim();
  if (s === '') return { ok: false, reason: 'empty' };
  if (HEX_RE.test(s)) return { ok: true, value: parseInt(s, 16), text: s, hex: true };
  if (base === 'hex' && BARE_HEX_RE.test(s)) return { ok: true, value: parseInt(s, 16), text: s, hex: true };
  if (DEC_RE.test(s)) return { ok: true, value: parseInt(s, 10), text: s, hex: false };
  return { ok: false, reason: 'format' };
}

/** Base par défaut : hexadécimale si le catalogue exprime ses clés en 0x…. */
export function defaultBase(errorCode: ErrorCode | undefined): Base {
  const keys = Object.keys(errorCode?.values ?? errorCode?.bits ?? {});
  return keys.some((k) => /^0x/i.test(k)) ? 'hex' : 'dec';
}

export function needsCode(errorCode: ErrorCode | undefined): boolean {
  const t = errorCode?.type;
  return t === 'enum' || t === 'bitfield' || t === 'phases';
}

function maskOfBitKey(key: string): number | null {
  const k = key.trim();
  if (HEX_RE.test(k)) return parseInt(k, 16);
  if (DEC_RE.test(k)) return parseInt(k, 10);
  return null;
}

const isSingleBit = (m: number) => m > 0 && (m & (m - 1)) === 0;

/** Test d'une clé d'énumération (avec jokers x) contre la valeur lue. */
export function enumKeyMatches(key: string, parsed: Pick<Parsed, 'value'>): boolean {
  const k = key.trim();
  if (/^(none|addr)$/i.test(k)) return false;
  if (/^0x[0-9a-fx]+$/i.test(k)) {
    const pat = k.slice(2).toLowerCase();
    const hex = parsed.value.toString(16).padStart(pat.length, '0');
    if (hex.length !== pat.length) return false;
    return new RegExp('^' + pat.replace(/x/g, '[0-9a-f]') + '$').test(hex);
  }
  if (/^[0-9x]+$/i.test(k)) {
    if (!/x/i.test(k)) return Number(k) === parsed.value;
    return new RegExp('^' + k.replace(/x/gi, '\\d') + '$').test(String(parsed.value));
  }
  return false;
}

const PHASE_NAMES: Record<string, string> = { '1': 'Phase 1 (A)', '2': 'Phase 2 (B)', '3': 'Phase 3 (C)' };

export function decodePhases(parsed: Pick<Parsed, 'value'>): string[] | null {
  const digits = String(parsed.value).split('');
  const seen = new Set<string>();
  for (const d of digits) {
    if (!PHASE_NAMES[d] || seen.has(d)) return null;
    seen.add(d);
  }
  return digits.map((d) => PHASE_NAMES[d]);
}

export function decode(errorCode: ErrorCode | undefined, raw: unknown, base?: Base): DecodeResult {
  const type = errorCode?.type ?? 'none';
  if (!errorCode || type === 'none') return { status: 'none', matches: [] };

  const parsed = parseCode(raw, base ?? defaultBase(errorCode));
  if (!parsed.ok) return { status: parsed.reason === 'empty' ? 'empty' : 'invalid', matches: [] };
  const note = errorCode.note;

  if (type === 'phases') {
    const ph = decodePhases(parsed);
    if (!ph) return { status: 'unmatched', matches: [], parsed, note };
    return { status: 'ok', parsed, matches: ph.map((p) => ({ key: p, label: p })), note };
  }

  if (type === 'bitfield') {
    const entries = Object.entries(errorCode.bits ?? {})
      .map(([key, label]) => ({ key, label, mask: maskOfBitKey(key) }))
      .filter((e): e is { key: string; label: string; mask: number } => e.mask !== null);
    // valeurs "spéciales" non mono-bit (ex. 0xffff = aucune donnée CAN reçue)
    const special = entries.find((e) => !isSingleBit(e.mask) && e.mask === parsed.value);
    if (special) return { status: 'ok', parsed, matches: [{ key: special.key, label: special.label }], note };
    const singles = entries.filter((e) => isSingleBit(e.mask));
    const matches = singles.filter((e) => (parsed.value & e.mask) !== 0).map((e) => ({ key: e.key, label: e.label }));
    let known = 0;
    for (const e of singles) known |= e.mask;
    const rest = parsed.value & ~known;
    const unknown = rest !== 0 ? '0x' + (rest >>> 0).toString(16).toUpperCase() : undefined;
    if (parsed.value === 0) return { status: 'ok', parsed, matches: [], note, zero: true };
    if (matches.length === 0 && unknown) return { status: 'unmatched', parsed, matches, unknown, note };
    return { status: 'ok', parsed, matches, unknown, note };
  }

  const matches = Object.entries(errorCode.values ?? {})
    .filter(([key]) => enumKeyMatches(key, parsed))
    .map(([key, label]) => ({ key, label }));
  if (matches.length === 0) return { status: 'unmatched', parsed, matches, note };
  return { status: 'ok', parsed, matches, note };
}

export interface BitInfo { key: string; label: string; mask: number }

/** Bits mono-bit connus, triés par masque. */
export function listBits(errorCode: ErrorCode | undefined): BitInfo[] {
  return Object.entries(errorCode?.bits ?? {})
    .map(([key, label]) => ({ key, label, mask: maskOfBitKey(key) }))
    .filter((e): e is BitInfo => e.mask !== null && isSingleBit(e.mask))
    .sort((a, b) => a.mask - b.mask);
}

export function combine(masks: number[]): number {
  return masks.reduce((acc, m) => acc | m, 0) >>> 0;
}

export function formatCode(value: number, hex: boolean): string {
  return hex ? '0x' + value.toString(16).toUpperCase().padStart(4, '0') : String(value);
}
