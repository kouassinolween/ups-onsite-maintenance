import { useMemo, useState } from 'react';
import { combine, decode, defaultBase, formatCode, listBits, needsCode, type Base } from '../lib/decoder';
import type { ErrorCode } from '../lib/types';

export function DecoderPanel({ errorCode, presetCode }: { errorCode: ErrorCode; presetCode: string | null }) {
  const [base, setBase] = useState<Base>(() => defaultBase(errorCode));
  const [code, setCode] = useState(presetCode ?? '');
  const result = useMemo(() => decode(errorCode, code, base), [errorCode, code, base]);
  const bits = useMemo(() => (errorCode.type === 'bitfield' ? listBits(errorCode) : []), [errorCode]);

  if (!needsCode(errorCode)) {
    return (
      <section className="box decoder" aria-label="Code d'erreur">
        <h3>Code d'erreur</h3>
        <p className="muted">Cet événement n'a pas de code d'erreur.</p>
      </section>
    );
  }

  const activeMask = result.parsed ? result.parsed.value : 0;
  const toggle = (mask: number) => {
    const current = result.parsed ? result.parsed.value : 0;
    const masks = bits.filter((b) => (current & b.mask) !== 0).map((b) => b.mask);
    const next = masks.includes(mask) ? masks.filter((m) => m !== mask) : [...masks, mask];
    const value = combine(next);
    setCode(value === 0 ? '' : formatCode(value, base === 'hex'));
  };

  const specials = errorCode.bits
    ? Object.entries(errorCode.bits).filter(([k]) => !bits.some((b) => b.key === k))
    : [];

  return (
    <section className="box decoder" aria-label="Décodage du code d'erreur">
      <h3>Code d'erreur</h3>
      {errorCode.note && <p className="muted">{errorCode.note}</p>}

      <div className="row">
        <label htmlFor="code">Code lu :</label>
        <input
          id="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={code}
          placeholder={base === 'hex' ? 'ex. 0x0808' : 'ex. 12'}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="seg" role="group" aria-label="Base de saisie">
          <button type="button" aria-pressed={base === 'dec'} onClick={() => setBase('dec')}>Décimal</button>
          <button type="button" aria-pressed={base === 'hex'} onClick={() => setBase('hex')}>Hexadécimal</button>
        </div>
      </div>

      <div aria-live="polite">
        {result.status === 'empty' && <p className="muted">Saisissez le code lu sur le HMI.</p>}
        {result.status === 'invalid' && (
          <div className="result bad">
            Code non reconnu : saisissez un nombre (ex. 12) ou une valeur hexadécimale préfixée (ex. 0x0C).
          </div>
        )}
        {result.status === 'unmatched' && result.parsed && (
          <div className="result bad">
            Valeur {result.parsed.text} absente du catalogue pour cet événement.
            {result.unknown ? ` Bits non décrits : ${result.unknown}.` : ''} Vérifiez la base de saisie (décimal /
            hexadécimal) et la lecture du HMI.
          </div>
        )}
        {result.status === 'ok' && result.parsed && (
          <div className="result ok">
            {result.zero ? 'Aucun bit actif (code 0).' : `Interprétation de ${result.parsed.text} :`}
            {result.matches.length > 0 && (
              <ul>
                {result.matches.map((m) => (
                  <li key={m.key}><code>{m.key}</code> : {m.label}</li>
                ))}
              </ul>
            )}
            {result.unknown && <p className="muted">Bits supplémentaires non décrits dans le manuel : {result.unknown}</p>}
          </div>
        )}
      </div>

      {errorCode.type === 'bitfield' && (
        <>
          <p className="muted">Ou cochez les bits actifs pour obtenir le code :</p>
          <ul className="bits">
            {bits.map((b) => (
              <li key={b.key}>
                <label>
                  <input type="checkbox" checked={(activeMask & b.mask) !== 0} onChange={() => toggle(b.mask)} />
                  <code>{b.key}</code>
                  <span>{b.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {specials.length > 0 && (
            <p className="muted">Valeurs spéciales : {specials.map(([k, v]) => `${k} = ${v}`).join(' ; ')}</p>
          )}
        </>
      )}
      {errorCode.type === 'enum' && errorCode.values && (
        <details>
          <summary>Toutes les valeurs possibles</summary>
          <ul className="bits">
            {Object.entries(errorCode.values).map(([k, v]) => (
              <li key={k}><code>{k}</code> : {v}</li>
            ))}
          </ul>
        </details>
      )}
      {errorCode.type === 'phases' && (
        <p className="muted">
          Chiffres = phases concernées : 1 = phase 1, 2 = phase 2, 3 = phase 3 ; 12 = phases 1 et 2 ; 123 = les trois.
        </p>
      )}
    </section>
  );
}
