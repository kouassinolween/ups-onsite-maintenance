import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandEvents, kitsContaining, parseDirect, search, type RawEvent } from './catalog';

describe('parseDirect', () => {
  it('reconnaît les saisies directes', () => {
    expect(parseDirect('UPM 53')).toEqual({ source: 'UPM', id: 53, code: null });
    expect(parseDirect('mcu:204 1001')).toEqual({ source: 'MCU', id: 204, code: '1001' });
    expect(parseDirect('csb 414 0xFF')).toEqual({ source: 'CSB', id: 414, code: '0xFF' });
    expect(parseDirect('fan failed')).toBeNull();
  });
});

const raw: RawEvent[] = [
  { source: 'UPM', ids: [48], name: 'Fan Failed', kind: 'alarm', target: 'user', desc_fr: 'Rotor bloqué sur un ventilateur.' },
  { source: 'MCU', ids: [288], name: 'STS Fan Failed', kind: 'alarm', target: 'user', desc_fr: 'Défaut de ventilateur du STS.' },
  { source: 'UPM', ids: [27, 28], name: 'Phase A/B/C Overload', kind: 'alarm', target: 'user', desc_fr: 'Surcharge.' },
  { source: 'CSB', ids: [473], name: 'Capacitor / Fan Replacement Due', kind: 'notice', target: 'service', desc_fr: 'À remplacer.' },
];
const modular = expandEvents('modular', raw);
const mono = expandEvents('monoblock', [{ source: 'UPM', ids: [47], name: 'Fan Failed', kind: 'alarm' }]);
const all = [...modular, ...mono];

describe('expandEvents', () => {
  it('déplie les groupes d\'identifiants en une entrée par numéro', () => {
    expect(modular.filter((e) => e.name === 'Phase A/B/C Overload').map((e) => e.id)).toEqual([27, 28]);
    expect(modular.find((e) => e.id === 28)?.groupIds).toEqual([27, 28]);
  });
});

describe('search', () => {
  it('trouve par mot français grâce aux synonymes et classe alarmes avant avis', () => {
    const r = search(all, 'ventilateur', { catalog: 'modular' }).results.map((e) => e.key);
    expect(r).toEqual(['modular|UPM|48', 'modular|MCU|288', 'modular|CSB|473']);
  });
  it('ignore les accents', () => {
    expect(search(all, 'defaut ventilateur', { catalog: 'modular' }).results.length).toBeGreaterThan(0);
  });
  it('trouve par identifiant et par saisie directe', () => {
    expect(search(all, '288', { catalog: 'modular' }).results.map((e) => e.id)).toEqual([288]);
    expect(search(all, 'MCU 288', { catalog: 'modular' }).results.map((e) => e.id)).toEqual([288]);
  });
  it('filtre par famille et par cible', () => {
    expect(search(all, 'fan', { catalog: 'monoblock' }).results.map((e) => e.id)).toEqual([47]);
    expect(search(all, 'fan', { catalog: 'modular', target: 'service' }).results.map((e) => e.id)).toEqual([473]);
  });
});

describe('kitsContaining', () => {
  it('liste les kits qui contiennent une référence', () => {
    const kits = [
      { kit: 'K1', model: 'M', variant: 'A', items: [['118-20292', 5]] as [string, number][] },
      { kit: 'K2', model: 'M', variant: 'B', items: [['X', 1]] as [string, number][] },
    ];
    expect(kitsContaining(kits, '118-20292').map((k) => k.kit)).toEqual(['K1']);
  });
});

/** Garde-fous sur les vraies données des packs. */
describe('packs réels', () => {
  const read = (p: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../../packs', p), 'utf8'));

  it('catalogue modulaire : 389 identifiants, aucun doublon (source, id)', () => {
    const events = expandEvents('modular', read('93pm/alarms.json').events);
    const keys = events.map((e) => `${e.source}:${e.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(events).toHaveLength(389);
  });
  it('catalogue monobloc : 223 identifiants, aucun doublon', () => {
    const events = expandEvents('monoblock', read('93ps/alarms.monoblock.json').events);
    const keys = events.map((e) => `${e.source}:${e.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(events).toHaveLength(223);
  });
  it('catalogue 93T : 164 identifiants (UPM 0-133, CSB 192-238), aucun doublon, pas de MCU', () => {
    const events = expandEvents('ups93t', read('93t/alarms.json').events);
    const keys = events.map((e) => `${e.source}:${e.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(events).toHaveLength(164);
    expect(events.some((e) => e.source === 'MCU')).toBe(false);
  });
  it('93T : alarmes utilisateur et pièces cohérentes avec le catalogue', () => {
    const ev = new Set(read('93t/alarms.json').events.flatMap((e: { source: string; ids: number[] }) => e.ids.map((i) => `${e.source}:${i}`)));
    const ua = read('93t/user-alarms.json').alarms as { source: string; id: number; cause_fr: string; solution_fr: string }[];
    expect(ua).toHaveLength(15);
    for (const a of ua) {
      expect(ev.has(`${a.source}:${a.id}`), `${a.source} ${a.id}`).toBe(true);
      expect(a.cause_fr && a.solution_fr).toBeTruthy();
    }
    const parts = read('93t/parts.json');
    const refs = new Set(parts.parts.map((p: { ref: string }) => p.ref));
    expect(refs.size).toBe(parts.parts.length);
    for (const [k, h] of Object.entries(parts.alarm_to_part_hints) as [string, { candidate_parts: string[] }][]) {
      expect(ev.has(k), k).toBe(true);
      for (const r of h.candidate_parts) expect(refs.has(r), r).toBe(true);
    }
  });
  it('93T : procédures, modes et parallèle - références croisées valides', () => {
    const parts = new Set(read('93t/parts.json').parts.flatMap((p: { ref: string; alt_ref?: string }) => [p.ref, p.alt_ref]));
    const ev = new Set(read('93t/alarms.json').events.flatMap((e: { source: string; ids: number[] }) => e.ids.map((i) => `${e.source}:${i}`)));
    const proc = read('93t/procedures.json');
    const ids = new Set(proc.procedures.map((p: { id: string }) => p.id));
    expect(ids.size).toBe(proc.procedures.length);
    expect(proc.torque_values).toHaveLength(7);
    for (const p of proc.procedures) {
      for (const r of p.prerequisites ?? []) expect(ids.has(r), `${p.id} -> ${r}`).toBe(true);
      for (const h of p.parts_hint ?? []) expect(parts.has(h.split(' ')[0]), h).toBe(true);
    }
    for (const m of read('93t/modes.json').operating_modes) {
      for (const e of m.events ?? []) expect(ev.has(e.split(' ')[0]), e).toBe(true);
    }
  });
  it('93PM : procédures de remplacement - structure et références croisées', () => {
    const proc = read('93pm/procedures.json');
    const ids = new Set(proc.procedures.map((p: { id: string }) => p.id));
    expect(ids.size).toBe(proc.procedures.length);
    expect(proc.procedures.length).toBeGreaterThanOrEqual(20);
    expect(proc.torque_values).toHaveLength(7);
    for (const p of proc.procedures) {
      expect(p.steps.length, p.id).toBeGreaterThan(0);
      expect(p.source, p.id).toBeTruthy();
      for (const r of p.prerequisites ?? []) expect(ids.has(r), `${p.id} -> ${r}`).toBe(true);
      for (const r of p.after ?? []) if (/^[a-z_0-9]+$/.test(r)) expect(ids.has(r), `${p.id} after ${r}`).toBe(true);
    }
  });
  it("93PM : niveaux d'accès sans aucun mot de passe par défaut", () => {
    const acc = read('93pm/access.json');
    expect(acc.levels).toHaveLength(3);
    for (const f of ['93pm/access.json', '93pm/procedures.json', '93pm/modes.json']) {
      expect(JSON.stringify(read(f)), f).not.toMatch(/\b(1111|0101|1212)\b/);
    }
  });
  it('chaque entrée a un nom et une explication française', () => {
    for (const f of ['93pm/alarms.json', '93ps/alarms.monoblock.json', '93t/alarms.json']) {
      for (const e of read(f).events) {
        expect(e.name, f).toBeTruthy();
        expect(e.desc_fr, `${f} ${e.source} ${e.ids}`).toBeTruthy();
      }
    }
  });
  it('93T : UPM 52 (fusibles) et UPM 98 (phases) se décodent', async () => {
    const { decode } = await import('./decoder');
    const ev = expandEvents('ups93t', read('93t/alarms.json').events);
    const fuse = ev.find((x) => x.source === 'UPM' && x.id === 52)!;
    expect(decode(fuse.errorCode, '0x0011').matches.map((m) => m.key)).toEqual(['0x0001', '0x0010']);
    const sw = ev.find((x) => x.source === 'UPM' && x.id === 98)!;
    expect(decode(sw.errorCode, '13').status).toBe('ok');
  });
  it('MCU 204 se décode : 1001 = anti-retour n\'a pas ouvert', async () => {
    const { decode } = await import('./decoder');
    const e = expandEvents('modular', read('93pm/alarms.json').events).find((x) => x.source === 'MCU' && x.id === 204)!;
    expect(decode(e.errorCode, '1001').matches.map((m) => m.key)).toEqual(['1xxx']);
  });
  it('UPM 53 se décode : 0x808', async () => {
    const { decode } = await import('./decoder');
    const e = expandEvents('modular', read('93pm/alarms.json').events).find((x) => x.source === 'UPM' && x.id === 53)!;
    expect(decode(e.errorCode, '0x808').matches.map((m) => m.key)).toEqual(['0x08', '0x800']);
  });
});
