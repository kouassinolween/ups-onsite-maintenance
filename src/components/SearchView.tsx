import { useDeferredValue, useMemo, useState } from 'react';
import { CATALOGS, KIND_LABEL, LEGACY_CSB_OFFSET, legacyCsbVerified, search, type SearchFilters } from '../lib/catalog';
import type { CatalogData, CatalogEvent } from '../lib/types';

const MAX_RENDER = 120;

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function EventCard({ e, onOpen }: { e: CatalogEvent; onOpen: () => void }) {
  return (
    <button type="button" className="card" onClick={onOpen}>
      <div className="l1">
        <span className="id">{e.source} {e.displayId ?? e.id}</span>
        <span className="nm">{e.name}</span>
        <Badge cls={`b-${e.kind}`}>{KIND_LABEL[e.kind ?? ''] ?? '?'}</Badge>
        {e.imported === 'auto' && <Badge cls="b-auto">à relire</Badge>}
      </div>
      <div className="fr">{e.descFr}</div>
    </button>
  );
}

export function SearchView({ data, onOpen }: { data: CatalogData; onOpen: (key: string, code: string | null) => void }) {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ catalog: 'modular', source: '', kind: '', target: '' });
  const deferred = useDeferredValue(q);

  const { direct, results, legacy } = useMemo(() => search(data.events, deferred, filters), [data.events, deferred, filters]);
  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <section aria-label="Recherche d'alarmes">
      <label className="visually-hidden" htmlFor="q">Rechercher</label>
      <input
        id="q"
        type="search"
        value={q}
        onChange={(ev) => setQ(ev.target.value)}
        placeholder="Nom, mot du texte, ou « UPM 53 » / « MCU 204 1001 »"
        autoComplete="off"
        enterKeyHint="search"
      />

      <div className="filters" role="group" aria-label="Filtres">
        <select aria-label="Famille" value={filters.catalog} onChange={(e) => set('catalog', e.target.value as SearchFilters['catalog'])}>
          {CATALOGS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select aria-label="Source" value={filters.source} onChange={(e) => set('source', e.target.value as SearchFilters['source'])}>
          <option value="">Toutes sources</option>
          <option value="UPM">UPM</option><option value="MCU">MCU</option><option value="CSB">CSB</option><option value="UPS">UPS (9E)</option>
        </select>
        <select aria-label="Type" value={filters.kind} onChange={(e) => set('kind', e.target.value as SearchFilters['kind'])}>
          <option value="">Tous types</option>
          <option value="alarm">Alarmes</option><option value="sticky_alarm">Alarmes mémorisées</option>
          <option value="notice">Avis</option><option value="sticky_notice">Avis mémorisés</option>
          <option value="status">Statuts</option><option value="command">Commandes</option>
        </select>
        <select aria-label="Cible" value={filters.target} onChange={(e) => set('target', e.target.value as SearchFilters['target'])}>
          <option value="">Utilisateur et service</option>
          <option value="service">Service</option><option value="user">Utilisateur</option>
        </select>
      </div>

      <p className="muted" aria-live="polite">
        {results.length > 0 &&
          `${results.length} résultat${results.length > 1 ? 's' : ''}` +
            (results.length > MAX_RENDER ? ` (les ${MAX_RENDER} premiers sont affichés ; affinez la recherche)` : '')}
      </p>
      <ul className="results">
        {results.length === 0 && legacy.length === 0 && <li className="empty">{q ? 'Aucun événement ne correspond.' : 'Saisissez une recherche.'}</li>}
        {results.slice(0, MAX_RENDER).map((e) => (
          <li key={e.key}>
            <EventCard e={e} onOpen={() => onOpen(e.key, direct?.code ?? null)} />
          </li>
        ))}
      </ul>
      {legacy.length > 0 && direct && (
        <>
          <p className="muted" aria-live="polite">
            Si le numéro vient d'un firmware CSB antérieur à 1.24 (numérotation à partir de 320), CSB {direct.id} correspond
            à CSB {legacy[0].id} (décalage de {LEGACY_CSB_OFFSET}{legacyCsbVerified(legacy[0].id)
              ? ' ; ordre confirmé sur le firmware CSB 1.0.3'
              : ' ; événement absent du firmware CSB 1.0.3, correspondance non vérifiée'}).
          </p>
          <ul className="results">
            {legacy.map((e) => (
              <li key={e.key}><EventCard e={e} onOpen={() => onOpen(e.key, direct.code)} /></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
