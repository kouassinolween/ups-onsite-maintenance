import { CATALOGS, KIND_LABEL, SOURCE_LABEL, TARGET_LABEL, kitsContaining } from '../lib/catalog';
import type { CatalogData, CatalogEvent } from '../lib/types';
import { DecoderPanel } from './DecoderPanel';

function Hints({ event, data }: { event: CatalogEvent; data: CatalogData }) {
  if (event.catalog !== 'modular') return null;
  const hintKey = [event.id, ...event.groupIds].map((i) => `${event.source}:${i}`).find((k) => data.hints[k]);
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

export function DetailView({
  event: e, data, presetCode, onBack,
}: { event: CatalogEvent; data: CatalogData; presetCode: string | null; onBack: () => void }) {
  const family = CATALOGS.find((c) => c.id === e.catalog)?.label ?? e.catalog;
  const group = e.groupIds.length > 1 ? `(groupe : ${e.groupIds.join(', ')})` : '';
  return (
    <article className="detail">
      <button className="back" type="button" onClick={onBack}>← Retour aux résultats</button>
      <h2>{e.source} {e.id} — {e.name}</h2>
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

      <DecoderPanel key={`${e.key}|${presetCode ?? ''}`} errorCode={e.errorCode} presetCode={presetCode} />
      <Hints event={e} data={data} />

      <section className="box">
        <h3>Références</h3>
        <table className="kv">
          <tbody>
            <tr><th>Source</th><td>{SOURCE_LABEL[e.source] ?? e.source}</td></tr>
            <tr><th>Numéro d'événement</th><td>{e.id} {group}</td></tr>
            {e.page != null && <tr><th>Manuel d'alarmes</th><td>Rev 003, p. {e.page}</td></tr>}
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
