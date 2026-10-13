import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadAll } from './lib/catalog';
import type { CatalogData } from './lib/types';
import { DetailView } from './components/DetailView';
import { SearchView } from './components/SearchView';
import { DocNav, DocView } from './components/DocView';
import { docHash, parseDocRoute, type DocFamily, type DocRoute, type DocTab } from './lib/doc93t';

/** Route : #/<clé événement>[/<code>]. La clé est de la forme famille|source|id. */
function readRoute(): { key: string; code: string | null } | null {
  const m = /^#\/([^/]+)(?:\/(.+))?$/.exec(window.location.hash);
  if (!m) return null;
  return { key: decodeURIComponent(m[1]), code: m[2] ? decodeURIComponent(m[2]) : null };
}

export function App() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState(readRoute);
  const [docRoute, setDocRoute] = useState<DocRoute | null>(() => parseDocRoute(window.location.hash));
  const [family, setFamily] = useState<DocFamily>(() => parseDocRoute(window.location.hash)?.family ?? '93t');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadAll().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const onHash = () => {
      const t = parseDocRoute(window.location.hash);
      setDocRoute(t);
      if (t) setFamily(t.family);
      setRoute(t ? null : readRoute());
    };
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const open = useCallback((key: string, code: string | null) => {
    window.location.hash = `#/${encodeURIComponent(key)}${code ? '/' + encodeURIComponent(code) : ''}`;
  }, []);
  const selectTab = useCallback((t: DocTab | null, fam: DocFamily) => {
    setFamily(fam);
    if (t) window.location.hash = docHash({ family: fam, tab: t });
    else {
      history.pushState('', document.title, window.location.pathname + window.location.search);
      setDocRoute(null);
      setRoute(null);
    }
    window.scrollTo(0, 0);
  }, []);
  const close = useCallback(() => {
    history.pushState('', document.title, window.location.pathname + window.location.search);
    setRoute(null);
    window.scrollTo(0, 0);
  }, []);

  const current = useMemo(
    () => (data && route ? data.events.find((e) => e.key === route.key) ?? null : null),
    [data, route],
  );

  return (
    <>
      <header className="top">
        <h1>
          Entretien UPS <span className="sub">Alarmes Eaton 93PM / 93PS / 93T</span>
        </h1>
        <span className="net" role="status">{online ? 'en ligne' : 'hors ligne'}</span>
      </header>
      <DocNav tab={docRoute?.tab ?? null} family={family} onSelect={selectTab} />
      <main>
        {docRoute && <DocView route={docRoute} />}
        {!docRoute && error && <p className="empty">Impossible de charger le catalogue : {error}</p>}
        {!docRoute && !error && !data && <p className="empty">Chargement du catalogue…</p>}
        {!docRoute && data && current && <DetailView event={current} data={data} presetCode={route?.code ?? null} onBack={close} />}
        {!docRoute && data && !current && <SearchView data={data} onOpen={open} />}
      </main>
      <footer className="foot">
        <p>
          Aide au diagnostic : ne remplace ni la documentation constructeur, ni la procédure de sécurité du site.
          Catalogues extraits du manuel d'alarmes Eaton rev 003 (93PM / 93PS) et du service manual 93T (non final) ; entrées « extraction automatique » à relire.
        </p>
      </footer>
    </>
  );
}
