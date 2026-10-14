import { describe, expect, it } from 'vitest';
import { hashPassword, sameHash } from './gate';

describe('gate', () => {
  it('produit une empreinte stable de 64 caractères hexadécimaux', async () => {
    const a = await hashPassword('exemple');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPassword('exemple')).toBe(a);
    expect(await hashPassword('autre')).not.toBe(a);
  });
  it('compare les empreintes', () => {
    expect(sameHash('ab12', 'ab12')).toBe(true);
    expect(sameHash('ab12', 'ab13')).toBe(false);
    expect(sameHash('ab', 'abc')).toBe(false);
  });
});
