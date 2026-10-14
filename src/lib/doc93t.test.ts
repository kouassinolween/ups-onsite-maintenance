import { describe, expect, it } from 'vitest';
import { docHash, parseDocRoute, resolveRef, type Procedure } from './doc93t';

describe('parseDocRoute', () => {
  it('reconnaît les onglets de documentation, avec ou sans famille', () => {
    expect(parseDocRoute('#/v/procedures')).toEqual({ family: '93t', tab: 'procedures' });
    expect(parseDocRoute('#/v/93t/modes')).toEqual({ family: '93t', tab: 'modes' });
    expect(parseDocRoute('#/v/93pm/parallel')).toEqual({ family: '93pm', tab: 'parallel' });
    expect(parseDocRoute('#/v/93ps/context')).toEqual({ family: '93ps', tab: 'context' });
    expect(parseDocRoute('#/v/batteries/troubleshooting')).toEqual({ family: 'batteries', tab: 'troubleshooting' });
  });
  it("laisse passer les routes d'événements et les inconnues", () => {
    expect(parseDocRoute('#/ups93t%7CUPM%7C53')).toBeNull();
    expect(parseDocRoute('#/v/autre')).toBeNull();
    expect(parseDocRoute('#/v/9e/modes')).toBeNull();
    expect(parseDocRoute('#/v/93ps/modes')).toBeNull();
    expect(parseDocRoute('#/v/93t/context')).toBeNull();
    expect(parseDocRoute('#/v/93t/troubleshooting')).toBeNull();
    expect(parseDocRoute('')).toBeNull();
  });
});

describe('docHash', () => {
  it('est réversible avec parseDocRoute', () => {
    const r = { family: '93pm', tab: 'modes' } as const;
    expect(parseDocRoute(docHash(r))).toEqual(r);
  });
});

describe('resolveRef', () => {
  const procs = [{ id: 'secure_load', label: 'Sécuriser la charge' }] as Procedure[];
  it('résout un identifiant de procédure, sinon renvoie le texte', () => {
    expect(resolveRef(procs, 'secure_load')).toEqual({ label: 'Sécuriser la charge', isProcedure: true });
    expect(resolveRef(procs, 'Configurer le CTO')).toEqual({ label: 'Configurer le CTO', isProcedure: false });
  });
});
