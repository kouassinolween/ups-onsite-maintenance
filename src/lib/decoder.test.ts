import { describe, expect, it } from 'vitest';
import { combine, decode, defaultBase, enumKeyMatches, formatCode, listBits, parseCode } from './decoder';
import type { ErrorCode } from './types';

const keys = (r: ReturnType<typeof decode>) => r.matches.map((m) => m.key);

describe('parseCode', () => {
  it('lit décimal, hexadécimal préfixé et hexadécimal nu en base hex', () => {
    expect(parseCode('12')).toMatchObject({ ok: true, value: 12 });
    expect(parseCode('0x0C')).toMatchObject({ ok: true, value: 12 });
    expect(parseCode('0C', 'hex')).toMatchObject({ ok: true, value: 12 });
  });
  it('refuse les formats invalides et les saisies vides', () => {
    expect(parseCode('12z')).toMatchObject({ ok: false, reason: 'format' });
    expect(parseCode('  ')).toMatchObject({ ok: false, reason: 'empty' });
  });
});

describe('champs de bits', () => {
  const cfg: ErrorCode = {
    type: 'bitfield',
    bits: { '0x08': 'ups dupliquée', '0x10': 'downgrade', '0x800': 'batterie', '0x4000': 'cellules' },
  };
  it('base par défaut hexadécimale si les clés sont en 0x', () => {
    expect(defaultBase(cfg)).toBe('hex');
  });
  it('décode 0x808 quelle que soit la façon de le saisir', () => {
    expect(keys(decode(cfg, '0x808'))).toEqual(['0x08', '0x800']);
    expect(keys(decode(cfg, '808', 'hex'))).toEqual(['0x08', '0x800']);
    expect(keys(decode(cfg, '2056', 'dec'))).toEqual(['0x08', '0x800']);
  });
  it('signale un bit non décrit', () => {
    expect(decode(cfg, '0x20').status).toBe('unmatched');
    expect(decode(cfg, '0x28').unknown).toBe('0x20');
  });
  it('code 0 = aucun bit actif', () => {
    expect(decode(cfg, '0').zero).toBe(true);
  });
  it('bits décimaux (Service Battery)', () => {
    const sb: ErrorCode = { type: 'bitfield', bits: { '1': 'a', '2': 'b', '4': 'c', '8': 'd', '16': 'e', '32': 'f' } };
    expect(keys(decode(sb, '12'))).toEqual(['4', '8']);
    expect(defaultBase(sb)).toBe('dec');
  });
  it('valeur spéciale 0xffff (CSB 414)', () => {
    const comm: ErrorCode = { type: 'bitfield', bits: { '0x01': 'MCU', '0x02': 'UPM 1', '0x04': 'UPM 2', '0xffff': 'aucune donnée CAN' } };
    expect(keys(decode(comm, '0xffff'))).toEqual(['0xffff']);
    expect(keys(decode(comm, '0x06'))).toEqual(['0x02', '0x04']);
  });
  it('listBits trie par masque et combine reconstitue le code', () => {
    expect(listBits(cfg).map((b) => b.mask)).toEqual([8, 16, 2048, 16384]);
    expect(combine([8, 2048])).toBe(2056);
    expect(formatCode(2056, true)).toBe('0x0808');
    expect(formatCode(12, false)).toBe('12');
  });
});

describe('énumérations', () => {
  it('valeur exacte et valeur absente', () => {
    const freq: ErrorCode = { type: 'enum', values: { '1': 'sous', '2': 'sur' } };
    expect(keys(decode(freq, '2'))).toEqual(['2']);
    expect(decode(freq, '5').status).toBe('unmatched');
  });
  it('jokers décimaux : 1xxx / 2xxx (MCU 204)', () => {
    const bf: ErrorCode = { type: 'enum', values: { '1xxx': 'ouvert', '2xxx': 'fermé', '3xxx': 'alterné' } };
    expect(keys(decode(bf, '1001'))).toEqual(['1xxx']);
    expect(keys(decode(bf, '2012'))).toEqual(['2xxx']);
    expect(decode(bf, '12').status).toBe('unmatched');
  });
  it('x1 / x2 et valeurs exactes (UPM 54 Precharge Failed)', () => {
    const pre: ErrorCode = { type: 'enum', values: { x1: 'a', x2: 'b', x3: 'c', '24': 'd', '25': 'e' } };
    expect(keys(decode(pre, '11'))).toEqual(['x1']);
    expect(keys(decode(pre, '22'))).toEqual(['x2']);
    expect(keys(decode(pre, '24'))).toEqual(['24']);
  });
  it('jokers hexadécimaux : 0x001x (UPM 44)', () => {
    const sw: ErrorCode = { type: 'enum', values: { '0x001x': 'ID', '0x0020': 'PLD', '0x003x': 'rév' } };
    expect(keys(decode(sw, '0x0013'))).toEqual(['0x001x']);
    expect(keys(decode(sw, '0x0020'))).toEqual(['0x0020']);
    expect(keys(decode(sw, '0x0035'))).toEqual(['0x003x']);
    expect(enumKeyMatches('0x00xx', { value: 0x0105 })).toBe(false);
  });
});

describe('phases et sans code', () => {
  const ph: ErrorCode = { type: 'phases' };
  it('12 = phases 1 et 2 ; 123 = les trois', () => {
    expect(decode(ph, '12').matches).toHaveLength(2);
    expect(decode(ph, '123').matches).toHaveLength(3);
  });
  it('refuse les phases inexistantes ou dupliquées', () => {
    expect(decode(ph, '14').status).toBe('unmatched');
    expect(decode(ph, '11').status).toBe('unmatched');
  });
  it('type none', () => {
    expect(decode({ type: 'none' }, '').status).toBe('none');
  });
});
