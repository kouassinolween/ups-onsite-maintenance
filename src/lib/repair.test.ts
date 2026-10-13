import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { suggestRepairs, type RepairData } from './repair';
import { parseDocRoute } from './doc93t';
import type { CatalogId } from './types';

const read = (p: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../../packs', p), 'utf8'));
const data = read('repair/suggestions.json') as RepairData;
const ids = (name: string, kind: Parameters<typeof suggestRepairs>[2], cat: CatalogId = 'ups93t') =>
  suggestRepairs(data, name, kind, cat).categories.map((c) => c.id);

describe('suggestRepairs', () => {
  it('associe les alarmes courantes à la bonne piste', () => {
    expect(ids('Fan Failed', 'alarm')).toContain('fan');
    expect(ids('Fuse Failed', 'sticky_alarm')).toContain('fuse');
    expect(ids('Battery Test Failed', 'alarm')).toContain('battery');
    expect(ids('Batteries Disconnected', 'alarm')).toContain('battery');
    expect(ids('Bypass AC Under Voltage', 'notice')).toContain('bypass');
    expect(ids('Input AC Under Voltage', 'notice')).toContain('input');
    expect(ids('Inverter Over Temperature', 'notice')).toContain('temperature');
    expect(ids('DC Link Over Voltage', 'alarm')).toContain('dc_link');
    expect(ids('PreCharge Failed', 'sticky_alarm')).toContain('dc_link');
    expect(ids('Parallel Can Bus Failed', 'alarm')).toContain('parallel');
    expect(ids('Configuration Error', 'alarm')).toContain('config');
    expect(ids('Backfeed Relay Failed', 'alarm')).toContain('switchgear');
    expect(ids('Output Overload', 'alarm')).toContain('overload');
  });

  it("ne propose aucune réparation pour un simple état ou une commande", () => {
    const s = suggestRepairs(data, 'Ups On Battery', 'status', 'ups93t');
    expect(s.informational).toBe(true);
    expect(s.categories).toHaveLength(0);
    expect(suggestRepairs(data, 'Ups On Command', 'command', 'ups93t').informational).toBe(true);
    // un statut qui décrit un défaut reste traité comme défaut
    expect(suggestRepairs(data, 'I2C Bus Failed', 'status', 'ups93t').informational).toBe(false);
  });

  it("ne confond pas « progress » avec ESS", () => {
    expect(ids('Battery Test In Progress', 'status')).not.toContain('transfers');
  });

  it('les liens suggérés pointent des écrans existants', () => {
    for (const c of data.categories) {
      for (const [family, links] of Object.entries(c.links ?? {})) {
        for (const l of links) {
          const href = `#/v/${l.family ?? family}/${l.tab}`;
          expect(parseDocRoute(href), `${c.id} ${href}`).not.toBeNull();
        }
      }
    }
  });

  it('couvre la majorité des alarmes et avis des catalogues', () => {
    const files: [string, CatalogId][] = [
      ['93pm/alarms.json', 'modular'], ['93t/alarms.json', 'ups93t'], ['93e/alarms.json', 'ups93e'],
      ['93e/alarms.large.json', 'ups93e_large'], ['9e/alarms.json', 'ups9e'],
    ];
    let faults = 0; let covered = 0;
    for (const [f, cat] of files) {
      for (const e of read(f).events as { name: string; kind: string | null }[]) {
        if (!['alarm', 'sticky_alarm', 'notice', 'sticky_notice'].includes(e.kind ?? '')) continue;
        faults++;
        if (suggestRepairs(data, e.name, e.kind as never, cat).categories.length > 0) covered++;
      }
    }
    expect(faults).toBeGreaterThan(300);
    expect(covered / faults).toBeGreaterThan(0.5);
  });
});
