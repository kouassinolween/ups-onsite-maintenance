import { useState, type ReactNode } from 'react';
import { expectedHash, hashPassword, isRemembered, remember, sameHash } from '../lib/gate';

/** Affiche l'écran de mot de passe tant que l'accès n'est pas validé ; sans empreinte configurée, laisse passer. */
export function Gate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => !expectedHash || isRemembered());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (ok) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      if (sameHash(await hashPassword(value), expectedHash)) {
        remember();
        setOk(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="gate">
      <form className="box" onSubmit={submit}>
        <h1>Entretien UPS</h1>
        <p className="muted">Accès réservé. Saisir le mot de passe fourni par votre responsable.</p>
        <label htmlFor="gate-pw">Mot de passe</label>
        <input
          id="gate-pw" type="password" autoComplete="current-password" autoFocus
          value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={error}
        />
        {error && <p role="alert" className="gate-err">Mot de passe incorrect.</p>}
        <button type="submit" className="gate-btn" disabled={busy || !value}>{busy ? 'Vérification…' : 'Entrer'}</button>
      </form>
    </main>
  );
}
