import { CATALOGS, KIND_LABEL, SOURCE_LABEL, TARGET_LABEL, kitsContaining } from '../lib/catalog';
import type { CatalogData, CatalogEvent } from '../lib/types';
import { DecoderPanel } from './DecoderPanel';
import { suggestRepairs } from '../lib/repair';

function Hints({ event, data }: { event: CatalogEvent; data: CatalogData }) {
  if (event.catalog === 'monoblock') return null;
  const prefix = event.catalog === 'modular' ? '' : `${event.catalog}|`;
  const hintKey = [event.id, ...event.groupIds].map((i) => `${prefix}${event.source}:${i}`).find((k) => data.hints[k]);
  if (!hintKey) return null;
  const hint = data.hints[hintKey];
  const parts = hint.candidate_parts ?? [];
  return (
    <section className="box warn">
      <h3>Pièces candidates (à confirmer par mesure)</h3>
      {parts.map((ref) => {
        const inKits = kitsContaining(data.kits, ref).map((k) => `${k.model} kit ${k.variant}`);
        return (
          <div className="part" key={ref}>
            <code>{ref}</code> {data.parts[ref]?.label ?? ''}
            {data.parts[ref]?.alt_ref && <span className="muted"> (réf. {data.parts[ref]?.alt_ref})</span>}
            {data.parts[ref]?.qty && (
              <span className="muted"> — par UPS : {Object.entries(data.parts[ref]!.qty!).filter(([, n]) => n != null).map(([r, n]) => `${r} ×${n}`).join(', ')}</span>
            )}
            {inKits.length > 0 && <span className="muted">(dans : {inKits.join(', ')})</span>}
          </div>
        );
      })}
      {parts.length === 0 && <p className="muted">Aucune référence confirmée.</p>}
      {hint.behaviour_note && <p>{hint.behaviour_note}</p>}
      {hint.verify_first && hint.verify_first.length > 0 && (
        <p><strong>À vérifier d'abord : </strong>{hint.verify_first.join(' ; ')}</p>
      )}
      {hint.procedure_ref && hint.procedure_ref.length > 0 && (
        <p className="muted">Procédures (service manual) : {hint.procedure_ref.join(' ; ')}</p>
      )}
      <p className="muted">
        Candidats de diagnostic : aucun document ne donne de table alarme → pièce. Ne jamais remplacer une pièce sur la
        seule foi d'une alarme.
      </p>
    </section>
  );
}

function RepairSuggestions({ event, data }: { event: CatalogEvent; data: CatalogData }) {
  if (!data.repair) return null;
  const r = suggestRepairs(data.repair, event.name, event.kind, event.catalog);
  const solution = data.userAlarms[event.key];

  if (r.informational) {
    return (
      <section className="box">
        <h3>Suggestions de réparation</h3>
        <p><strong>{data.repair.informational.label} : </strong>{data.repair.informational.text}</p>
      </section>
    );
  }
  return (
    <section className="box repair">
      <h3>Suggestions de réparation</h3>
      <p className="muted">{data.repair.disclaimer}</p>
      {solution && (
        <div className="repair-cat">
          <h4>Solution indiquée par le constructeur</h4>
          <p>{solution.solutionFr}</p>
        </div>
      )}
      {r.categories.length === 0 && (
        <div className="repair-cat">
          <h4>{data.repair.general_process.label}</h4>
          <ol className="doc-list">{data.repair.general_process.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      {r.categories.map((c) => (
        <div className="repair-cat" key={c.id}>
          <h4>{c.label}</h4>
          <ol className="doc-list">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {r.links[c.id] && (
            <p className="repair-links">
              <strong>Voir aussi : </strong>
              {r.links[c.id].map((l) => <a key={l.href + l.label} href={l.href}>{l.label}</a>)}
            </p>
          )}
          {c.source && <p className="muted">Sources : {c.source}</p>}
        </div>
      ))}
      <details>
        <summary>Consignes de sécurité avant intervention</summary>
        <ul className="doc-list">{data.repair.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </details>
    </section>
  );
}

export function DetailView({
  event: e, data, presetCode, onBack,
}: { event: CatalogEvent; data: CatalogData; presetCode: string | null; onBack: () => void }) {
  const def = CATALOGS.find((c) => c.id === e.catalog);
  const family = def?.label ?? e.catalog;
  const group = e.groupIds.length > 1 ? `(groupe : ${e.groupIds.join(', ')})` : '';
  return (
    <article className="detail">
      <button className="back" type="button" onClick={onBack}>← Retour aux résultats</button>
      <h2>{e.source} {e.displayId ?? e.id} — {e.name}</h2>
      <div className="meta">
        <span className={`badge b-${e.kind}`}>{KIND_LABEL[e.kind ?? ''] ?? '?'}</span>
        {e.level != null && <span className="badge b-src">Niveau {e.level}</span>}
        {e.target && <span className="badge b-src">{TARGET_LABEL[e.target]}</span>}
        <span className="badge b-src">{family}</span>
        {e.imported === 'auto' && <span className="badge b-auto">extraction automatique, à relire</span>}
      </div>

      <section className="box">
        <h3>Explication</h3>
        <p>{e.descFr || 'Traduction non disponible.'}</p>
        {e.manualNote && <p className="muted">Remarque sur le manuel : {e.manualNote}</p>}
      </section>

      <RepairSuggestions event={e} data={data} />

      {data.userAlarms[e.key] && (
        <section className="box">
          <h3>Alarme utilisateur : cause et solution</h3>
          <p><strong>Cause probable : </strong>{data.userAlarms[e.key].causeFr}</p>
          <p><strong>Solution : </strong>{data.userAlarms[e.key].solutionFr}</p>
          <p className="muted">Tableau « UPS alarms and faults » du service manual 93T, p. {data.userAlarms[e.key].page}.</p>
        </section>
      )}

      <DecoderPanel key={`${e.key}|${presetCode ?? ''}`} errorCode={e.errorCode} presetCode={presetCode} />
      <Hints event={e} data={data} />

      <section className="box">
        <h3>Références</h3>
        <table className="kv">
          <tbody>
            <tr><th>Source</th><td>{SOURCE_LABEL[e.source] ?? e.source}</td></tr>
            <tr><th>{e.displayId ? 'Code affiché' : "Numéro d'événement"}</th><td>{e.displayId ?? e.id} {group}</td></tr>
            {e.page != null && <tr><th>Manuel</th><td>{def?.manual ?? 'Manuel Eaton'}, p. {e.page}</td></tr>}
            {e.defaults && (
              <tr><th>Valeurs par défaut</th><td>{Object.entries(e.defaults).map(([k, v]) => `${k} : ${v}`).join(' ; ')}</td></tr>
            )}
            {e.timing && <tr><th>Scan / activation / désactivation / journal</th><td>{e.timing}</td></tr>}
          </tbody>
        </table>
      </section>

      {e.descEn && (
        <details className="box">
          <summary>Texte du manuel (anglais)</summary>
          <p className="en">{e.descEn}</p>
        </details>
      )}
    </article>
  );
}
