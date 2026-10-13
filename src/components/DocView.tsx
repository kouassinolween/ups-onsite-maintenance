import { useEffect, useState } from 'react';
import {
  DOC_FAMILIES, DOC_TABS, loadDoc93t, loadPmDoc, loadPmProcedures, resolveRef,
  type Doc93T, type ProceduresDoc, type DocFamily, type DocRoute, type DocTab, type Procedure,
} from '../lib/doc93t';
import { GenericDoc } from './GenericDoc';

function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag className="doc-list">{items.map((t, i) => <li key={i}>{t}</li>)}</Tag>;
}

function Source({ children }: { children: string }) {
  return <p className="muted">Source : service manual, {children}</p>;
}

function ProcedureCard({ p, all }: { p: Procedure; all: Procedure[] }) {
  return (
    <details className="box proc">
      <summary>
        <strong>{p.label}</strong>
        {p.variant && <span className="badge b-src">{p.variant}</span>}
        {p.access && <span className="muted"> — accès : {p.access}</span>}
      </summary>
      {p.prerequisites && p.prerequisites.length > 0 && (
        <p><strong>Avant : </strong>{p.prerequisites.map((r) => resolveRef(all, r).label).join(' ; ')}</p>
      )}
      {p.warnings && p.warnings.length > 0 && (
        <div className="box warn">{p.warnings.map((w, i) => <p key={i}><strong>Attention : </strong>{w}</p>)}</div>
      )}
      {p.switches && <p className="muted">Interrupteurs concernés : {p.switches.join(', ')}</p>}
      <List items={p.steps} ordered />
      {p.disassembly_steps && <><p><strong>Démontage :</strong></p><List items={p.disassembly_steps} ordered /></>}
      {p.replacement_steps && <><p><strong>Repose :</strong></p><List items={p.replacement_steps} ordered /></>}
      {p.switches_note && <p className="muted">{p.switches_note}</p>}
      {p.torque_refs && p.torque_refs.length > 0 && (
        <p><strong>Couples : </strong>{p.torque_refs.join(' ; ')}</p>
      )}
      {p.parts_hint && p.parts_hint.length > 0 && (
        <p><strong>Pièces : </strong>{p.parts_hint.map((x, i) => <code key={i} className="ref">{x}</code>)}</p>
      )}
      {p.notes && <List items={p.notes} />}
      {p.after && p.after.length > 0 && (
        <p><strong>Ensuite : </strong>{p.after.map((r) => resolveRef(all, r).label).join(' ; ')}</p>
      )}
      <Source>{p.source}</Source>
    </details>
  );
}

export function ProceduresView({ doc }: { doc: Doc93T['procedures'] }) {
  return (
    <>
      <section className="box warn">
        <h3>Avant toute intervention</h3>
        <List items={doc.safety.before_any_work} />
        <Source>{doc.safety.source}</Source>
      </section>

      <h2 className="doc-h">Procédures</h2>
      {doc.procedures.map((p) => <ProcedureCard key={p.id} p={p} all={doc.procedures} />)}

      <details className="box">
        <summary><strong>Couples de serrage</strong></summary>
        <table className="kv grid">
          <thead><tr><th>Composant</th><th>Nm</th><th>lb-in</th>{doc.torque_values.some((t) => t.kgf_cm != null) && <th>kgf-cm</th>}</tr></thead>
          <tbody>
            {doc.torque_values.map((t) => (
              <tr key={t.component}><td>{t.component}</td><td>{t.nm}</td><td>{t.lb_in}</td>{t.kgf_cm != null && <td>{t.kgf_cm}</td>}</tr>
            ))}
          </tbody>
        </table>
        <p className="muted">{doc.torque_note}</p>
        <Source>{doc.torque_source}</Source>
      </details>

      {doc.access && doc.access.length > 0 && <details className="box">
        <summary><strong>Accès aux composants</strong></summary>
        <table className="kv grid">
          <thead><tr><th>Composant</th><th>Panneau</th></tr></thead>
          <tbody>
            {doc.access.map((a) => <tr key={a.component}><td>{a.component}</td><td>{a.panels.join(', ')}</td></tr>)}
          </tbody>
        </table>
        {doc.access_source && <Source>{doc.access_source}</Source>}
      </details>}

      <details className="box">
        <summary><strong>Outils</strong></summary>
        <table className="kv grid">
          <tbody>
            {doc.tools.map((t) => <tr key={t.tool}><td>{t.tool}</td><td>{t.sizes ?? '-'}</td></tr>)}
          </tbody>
        </table>
      </details>
    </>
  );
}

function ModesView({ doc }: { doc: Doc93T['modes'] }) {
  const group = (cat: 'normal' | 'other', title: string) => (
    <>
      <h2 className="doc-h">{title}</h2>
      {doc.operating_modes.filter((m) => m.category === cat).map((m) => (
        <details className="box proc" key={m.id}>
          <summary><strong>{m.label}</strong>{m.indicators?.status_bar && <span className="badge b-status">{m.indicators.status_bar}</span>}</summary>
          <p>{m.summary}</p>
          {m.indicators && (m.indicators.status_bar || m.indicators.lamps) && (
            <p className="muted">
              Barre d'état : {m.indicators.status_bar ?? '-'} ; voyants : {m.indicators.lamps ?? '-'}
            </p>
          )}
          {m.relays && <p><strong>Relais : </strong>{m.relays}</p>}
          {m.typical_use && <p><strong>Usage : </strong>{m.typical_use}</p>}
          {m.safety && m.safety.length > 0 && (
            <div className="box warn">{m.safety.map((s, i) => <p key={i}><strong>Attention : </strong>{s}</p>)}</div>
          )}
          {m.notes && <List items={m.notes} />}
          {m.related_procedure && <p className="muted">{m.related_procedure}</p>}
          {m.events && m.events.length > 0 && (
            <p><strong>Événements : </strong>{m.events.map((e) => <code key={e} className="ref">{e}</code>)}</p>
          )}
          <Source>{m.source}</Source>
        </details>
      ))}
    </>
  );
  return (
    <>
      {group('normal', 'Modes normaux')}
      {group('other', 'Autres modes')}

      <h2 className="doc-h">Démarrage</h2>
      {doc.startup.map((s) => (
        <details className="box proc" key={s.id}>
          <summary><strong>{s.label}</strong></summary>
          {s.warnings && <div className="box warn">{s.warnings.map((w, i) => <p key={i}><strong>Attention : </strong>{w}</p>)}</div>}
          <List items={s.steps} ordered />
          {s.notes && <List items={s.notes} />}
          <Source>{s.source}</Source>
        </details>
      ))}

      <details className="box">
        <summary><strong>Composants de l'UPS</strong></summary>
        {doc.components.map((c) => (
          <div key={c.section}><h3>{c.section}</h3><List items={c.items} /></div>
        ))}
      </details>
    </>
  );
}

function ParallelView({ doc }: { doc: Doc93T['parallel'] }) {
  return (
    <>
      <section className="box">
        <h3>{doc.topology.label} : jusqu'à {doc.topology.max_units} unités</h3>
        <p className="muted">Redondance : {doc.topology.redundancy}</p>
        <List items={doc.topology.rules} />
        <Source>{doc.topology.source}</Source>
      </section>

      <details className="box proc" open>
        <summary><strong>{doc.setup.label}</strong></summary>
        <p>{doc.setup.intro}</p>
        <p><strong>Vérifier avant :</strong></p>
        <List items={doc.setup.checks_before} />
        <p><strong>Configurer :</strong></p>
        <List items={doc.setup.steps} ordered />
        <p className="muted">{doc.setup.example}</p>
        <table className="kv grid">
          <thead><tr><th>EEPROM</th><th>Signification</th></tr></thead>
          <tbody>{doc.setup.eeprom.map((e) => <tr key={e.id}><td><code>{e.id}</code></td><td>{e.meaning}</td></tr>)}</tbody>
        </table>
        <Source>{doc.setup.source}</Source>
      </details>

      <h2 className="doc-h">Dépannage</h2>
      {doc.troubleshooting.map((t) => (
        <section className="box" key={t.event}>
          <h3>{t.alarm} <code className="ref">{t.event}</code></h3>
          <List items={t.checks} />
          <Source>{t.source}</Source>
        </section>
      ))}

      <details className="box proc">
        <summary><strong>Synchronisation</strong></summary>
        <p><strong>Sources :</strong></p>
        <List items={doc.sync.sources} />
        <List items={doc.sync.rules} />
        <p><strong>Scénarios de démarrage :</strong></p>
        <List items={doc.sync.startup_scenarios} />
        <Source>{doc.sync.source}</Source>
      </details>

      <h2 className="doc-h">Fonctionnement</h2>
      {doc.behaviours.map((b) => (
        <details className="box proc" key={b.id}>
          <summary><strong>{b.label}</strong></summary>
          <p>{b.text}</p>
          {b.specification && (
            <table className="kv grid">
              <thead><tr><th>Mode</th><th>CAN</th><th>Partage interne</th><th>Partage externe</th></tr></thead>
              <tbody>
                {b.specification.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.mode}</td><td>{r.can ? 'oui' : 'non'}</td>
                    <td>{r.internal_share} {b.specification!.unit}</td><td>{r.external_share} {b.specification!.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {b.related_events && <p><strong>Événements : </strong>{b.related_events.map((e) => <code key={e} className="ref">{e}</code>)}</p>}
          <Source>{b.source}</Source>
        </details>
      ))}

      <h2 className="doc-h">Transferts</h2>
      {doc.transfers.map((t) => (
        <section className="box" key={t.id}>
          <h3>{t.label}</h3>
          <p>{t.text}</p>
          <Source>{t.source}</Source>
        </section>
      ))}
    </>
  );
}

export function DocNav({
  tab, family, onSelect,
}: { tab: DocTab | null; family: DocFamily; onSelect: (t: DocTab | null, family: DocFamily) => void }) {
  return (
    <nav className="tabs" aria-label="Sections">
      <button type="button" aria-current={tab === null ? 'page' : undefined} onClick={() => onSelect(null, family)}>Alarmes</button>
      {DOC_TABS.map((t) => (
        <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => onSelect(t.id, family)}>
          {t.label}
        </button>
      ))}
      <select
        className="fam"
        aria-label="Famille de la documentation"
        value={family}
        onChange={(e) => onSelect(tab, e.target.value as DocFamily)}
      >
        {DOC_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
    </nav>
  );
}

function Doc93TView({ tab }: { tab: DocTab }) {
  const [doc, setDoc] = useState<Doc93T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doc) return;
    loadDoc93t().then(setDoc).catch((e: Error) => setError(e.message));
  }, [doc]);

  if (error) return <p className="empty">Impossible de charger la documentation 93T : {error}</p>;
  if (!doc) return <p className="empty">Chargement de la documentation 93T…</p>;

  return (
    <section aria-label={`Documentation 93T : ${tab}`}>
      <p className="muted">
        Eaton 93T 15-80 kW, service manual HPO-1046599 rev 001 (non final). Brouillon à valider par un technicien certifié.
      </p>
      {tab === 'procedures' && <ProceduresView doc={doc.procedures} />}
      {tab === 'modes' && <ModesView doc={doc.modes} />}
      {tab === 'parallel' && <ParallelView doc={doc.parallel} />}
    </section>
  );
}

const PM_INTRO: Record<DocTab, string> = {
  procedures: 'Procédures de remplacement du 93PM (unités 480 V et 400 V) et check-list de maintenance préventive (squelette) : la procédure préventive officielle est un document séparé, non présent dans le dossier.',
  modes: 'Modes de fonctionnement du 93PM (service manual P-164000219 Rev B02, manuel d\'alarmes rev 003) et gestion avancée de batterie.',
  parallel: 'Parallèle du 93PM : topologies, câblage, mise en service, synchronisation, ajout et retrait d\'unité.',
  options: 'Options du 93PM : cartes de connectivité MiniSlot, armoires et accessoires (service manual P-164000219 Rev B02, chapitre 5).',
};

function Doc93PMView({ tab }: { tab: DocTab }) {
  const [docs, setDocs] = useState<{ tab: DocTab; items: Awaited<ReturnType<typeof loadPmDoc>>; procedures: ProceduresDoc | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([loadPmDoc(tab), tab === 'procedures' ? loadPmProcedures() : Promise.resolve(null)])
      .then(([items, procedures]) => { if (alive) setDocs({ tab, items, procedures }); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [tab]);

  if (error) return <p className="empty">Impossible de charger la documentation 93PM : {error}</p>;
  if (!docs || docs.tab !== tab) return <p className="empty">Chargement de la documentation 93PM…</p>;

  return (
    <section aria-label={`Documentation 93PM : ${tab}`}>
      <p className="muted">{PM_INTRO[tab]} Brouillon à valider par un technicien certifié.</p>
      {docs.procedures && (
        <>
          <p className="muted">
            Service manual Eaton 93PM 50-200 kW P-164000219 Rev B02 (février 2014), chapitres 8 (480 V) et 9 (400 V).
          </p>
          <ProceduresView doc={docs.procedures} />
        </>
      )}
      {docs.items.map((d, i) => <GenericDoc key={i} data={d.data} title={d.title} />)}
    </section>
  );
}

function OptionsView({ family }: { family: DocFamily }) {
  const [items, setItems] = useState<{ family: DocFamily; docs: Awaited<ReturnType<typeof loadPmDoc>> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = family === '93pm' ? '93PM' : '93T';

  useEffect(() => {
    let alive = true;
    setError(null);
    loadPmDoc('options', family)
      .then((docs) => { if (alive) setItems({ family, docs }); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [family]);

  if (error) return <p className="empty">Impossible de charger les options {name} : {error}</p>;
  if (!items || items.family !== family) return <p className="empty">Chargement des options {name}…</p>;
  return (
    <section aria-label={`Options ${name}`}>
      <p className="muted">
        {family === '93pm'
          ? PM_INTRO.options
          : 'Options du 93T : cartes MiniSlot et logiciels IPP / IPM (service manual HPO-1046599, chapitre 8).'}{' '}
        Brouillon à valider par un technicien certifié.
      </p>
      {items.docs.map((d, i) => <GenericDoc key={i} data={d.data} title={d.title} />)}
    </section>
  );
}

export function DocView({ route }: { route: DocRoute }) {
  if (route.tab === 'options') return <OptionsView family={route.family} />;
  return route.family === '93pm' ? <Doc93PMView tab={route.tab} /> : <Doc93TView tab={route.tab} />;
}
