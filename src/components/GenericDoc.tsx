// Rendu générique des fichiers JSON de documentation d'un pack (93PM : modes, ABM, parallèle, check-lists).
// Les structures varient d'un fichier à l'autre ; ce composant les affiche sans schéma fixe.

const LABELS: Record<string, string> = {
  // modes.json
  operating_modes: 'Modes de fonctionnement', high_efficiency_modes: 'Modes haut rendement',
  machine_states: 'États machine', bypass_availability: 'Disponibilité du bypass',
  site_wiring_fault: 'Défaut de câblage du site', fan_behavior: 'Ventilateurs', access_levels: "Niveaux d'accès",
  system_level: 'Niveau système', upm_level: 'Niveau UPM', unavailable_conditions: 'Causes d\'indisponibilité',
  activation: 'Activation', deactivation: 'Désactivation', consequences: 'Conséquences', limit: 'Limite',
  upm_fans: 'Ventilateurs UPM', mcu_fans: 'Ventilateurs MCU', speed: 'Vitesse', failure_detection: 'Détection de défaut',
  upm_fault_effect: 'Effet d\'un défaut UPM', mcu_fault_effect: 'Effet d\'un défaut MCU', levels: 'Niveaux',
  thresholds: 'Seuils',
  // parallel.json
  topologies: 'Topologies', identification: 'Identification des UPS', wiring: 'Câblage',
  commissioning_procedure: 'Mise en service du parallèle', system_commands_shared_by_all_mcu: 'Commandes système communes',
  system_commands_source: 'Source des commandes', building_inputs: 'Entrées bâtiment', synchronization: 'Synchronisation',
  pull_chain: 'Pull chain', synchronized_transfer: 'Transfert synchronisé', overload: 'Surcharge',
  service_mode: 'Mode service', add_remove_unit: 'Ajouter / retirer une unité', eeprom_parameters: 'Paramètres EEPROM',
  harness_retrofit: 'Mise à niveau du harnais parallèle', test_wiring_reference: 'Schéma de test',
  documents_not_for_93pm: 'Documents non applicables au 93PM', diagnosis_entry_points: 'Points d\'entrée de diagnostic',
  per_ups: 'Par UPS', how_set: 'Comment', related_alarms: 'Alarmes associées', steps: 'Étapes', verification: 'Vérification',
  max_upm: 'UPM max', max_ups: 'UPS max', redundancy: 'Redondance', load_share_error_pct: 'Erreur de partage (%)',
  mixed_ratings_allowed: 'Puissances mixtes', mixed_ratings_condition: 'Condition', alarm_hint: 'Événement',
  master_selection_order: 'Choix du maître', mcu_sync_priority: 'Priorité de synchro MCU', upm_sync_priority: 'Priorité de synchro UPM',
  can_failure_behavior: 'Défaut CAN', related_events: 'Événements liés', bypass_startup: 'Démarrage vers bypass',
  inverter_startup: 'Démarrage vers onduleur', scopes: 'Périmètres', base_conditions: 'Conditions de base',
  behavior: 'Comportement', why_it_matters: 'Pourquoi', scope_note: 'Périmètre', if_major_alarm: 'Si alarme majeure',
  add_units: 'Ajouter des unités', remove_units: 'Retirer des unités', parameters: 'Paramètres', caution: 'Précaution',
  applies_to: 'Concerne', status_note: 'Statut', connectors: 'Connecteurs', consistency_note: 'Cohérence',
  symptom: 'Symptôme', check_first: 'Vérifier d\'abord', condition: 'Condition', sync_to: 'Synchroniser sur',
  // abm.json
  purpose: 'Objectif', cycle: 'Cycle', terms: 'Termes', states: 'États ABM', charging_inhibited_by: 'Charge interdite par',
  reference_parameters_example: 'Paramètres de référence (exemple)', temperature_compensation: 'Compensation en température',
  automatic_abm_disable: 'Désactivation automatique de l\'ABM', diagnostics: 'Diagnostics',
  field_checklist_hints: 'Aide-mémoire terrain', length: 'Durée', phases: 'Phases', charger: 'Chargeur',
  enter: 'Entrée', exit_to_charge: 'Vers Charge', to_float: 'Vers Float', to_rest: 'Vers Rest', to_reset: 'Vers Reset',
  to_discharging: 'Vers Décharge', alarms: 'Alarmes', commands: 'Commandes',
  // communs
  summary: 'Résumé', safety: 'Sécurité', typical_use: 'Usage typique', events: 'Événements', event: 'Événement',
  source: 'Source', note: 'Remarque', meaning: 'Signification', type: 'Type', value: 'Valeur', unit: 'Unité',
  configurable: 'Configurable', title: 'Titre', checklists: 'Check-lists', sections: 'Sections', items: 'Points',
  list: 'Liste', label: 'Libellé', text: 'Texte', validated: 'Validée', bit: 'Bit',
  // alarm-context.json
  event_catalog_status: "Statut du catalogue d'événements",
  expected_at_first_power_up: "Alarmes attendues à la première mise sous tension",
  blocking_initialization: "Alarmes bloquant l'initialisation",
  rectifier_start_inhibit: "Alarmes interdisant le démarrage du redresseur",
  rectifier_to_battery_conditions: "Passage du redresseur à l'état batterie",
  precharge_failures: "Échecs de précharge",
  output_voltage_abnormal: "Tension de sortie anormale",
  battery_alarms: "Alarmes batterie",
  finding: "Constat",
  common_source: "Source commune",
  consistency_check: "Contrôle de cohérence",
  what_to_do: "Conduite à tenir",
  page_range: "Pages concernées",
  same_as: "Identique à",
  intro: "Introduction",
  checks_performed: "Contrôles effectués",
  number: "Numéro",
  name: "Nom",
  catalog: "Catalogue",
  effects: "Effets",
  clearing: "Effacement",
  triggers: "Déclencheurs",
  turn_on_pct: "Seuil d'activation (%)",
  turn_off_pct: "Seuil de désactivation (%)",
  shutdown_time: "Temps avant arrêt",
  turn_on: "Seuil",
  alarm: "Alarme",
  behaviour: "Comportement",
  parallel_overload: "Surcharge du système parallèle",
  parameter: "Paramètre",
  // pièces et paramètres 93E / 9E
  boards_by_model: "Cartes par modèle",
  correspondence_744_710: "Correspondance 744 / 710",
  parts_15_80_kva: "Pièces 15-80 kVA",
  parts_300_400_kva: "Pièces 300-400 kVA",
  assemblies_300_400_kva: "Ensembles 300-400 kVA (vues éclatées)",
  rating_columns: "Colonnes de puissance",
  qty_20: "20 kVA",
  qty_30: "30 kVA",
  qty_40: "40 kVA",
  qty_60: "60 kVA",
  qty_80: "80 kVA",
  package_part: "Référence emballage",
  qty_per_unit: "Quantité / unité",
  eaton_pn: "Réf. Eaton",
  ba2_pn: "Réf. BA2",
  designation: "Désignation",
  board: "Carte",
  function: "Fonction",
  model: "Modèle",
  boards: "Cartes",
  components: "Composants",
  callout: "Repère",
  description: "Description",
  service_tool_settings: "Réglages par l'outil de service",
  display_modes: "Modes affichés",
  buzzer: "Avertisseur sonore",
  fuse_checks: "Fusibles à contrôler",
  component_checks: "Contrôles de composants",
  typical_voltages: "Tensions types",
  calibration_channels: "Canaux de calibrage",
  channel: "Canal",
  eeprom_application_settings: "Configuration EEPROM par application",
  applications: "Applications",
  settings: "Réglages",
  eep: "EEPROM",
  default: "Défaut",
  suggested: "Valeur suggérée",
  firmware: "Firmware",
  preventive_maintenance_300_400: "Maintenance préventive 300-400 kVA",
  reference_values: "Valeurs de référence",
  schedule: "Échéancier",
  years: "Années",
  component: "Composant",
  item: "Élément",
  typical: "Valeur type",
  test_point: "Point de test",
  expected: "Attendu",
  priority: "Priorité",
  beep: "Signal",
  circuit: "Circuit",
  warning: "Attention",
  blocks: "Blocs",
  block: "Bloc",
  checks: "Contrôles",
  tool_note: "Outil",
  modes: "Modes",
  code: "Code",
  rows: "Lignes",
  parts: "Pièces",
  fuses: "Fusibles",
  // guide EEPROM
  principles: "Principes",
  rules: "Règles",
  tools: "Outils",
  ranges: "Gammes",
  use: "Utilisation",
  address_ranges: "Plages d'adresses",
  ranges_15_200: "Plages 15-200 kVA",
  ranges_300_400: "Plages 300-400 kVA",
  start: "Début",
  end: "Fin",
  base: "Base",
  area: "Zone",
  procedures: "Procédures",
  suggested_values_93t: "Valeurs suggérées 93T",
  power_conditioner: "Power Conditioner",
  parallel_shared_parameters_93t: "Paramètres communs en parallèle (93T)",
  suggested_values_93e: "Valeurs suggérées 93E",
  calibration_load_share: "Calibrage du partage de charge",
  formula: "Formule",
  other_ranges: "Autres gammes",
  pitfalls: "Pièges fréquents",
  application: "Application",
  reference: "Référence",
  data_types: "Types de données",
  suggested_value: "Valeur suggérée",
  // options.json
  connectivity: 'Connectivité', slots: 'Baies', cards: 'Cartes', catalog_number: 'Référence catalogue',
  enovia_pn: 'Référence Enovia', cabinets: 'Armoires', variants: 'Variantes', features: 'Caractéristiques',
  warnings: 'Avertissements', arrangements: 'Arrangements', transformer: 'Transformateur', schematic: 'Schéma',
  accessories: 'Accessoires', installation_manuals: "Manuels d'installation",
  manuals: 'Manuels', part_number: 'Référence', software: 'Logiciels',
  // access.json
  gives: 'Donne accès à', menu_path: "Chemin d'accès", screens: 'Écrans', password_policy: 'Mot de passe',
  usage_by_task: 'Niveau requis par tâche', task: 'Tâche', good_practice: 'Bonnes pratiques',
  // troubleshooting.json
  event_types: "Types d'événements", levels_note: 'Niveaux non définis', characteristics: 'Caractéristiques par type',
  display_rules: "Règles d'affichage", timings: 'Temporisations', logging: 'Journalisation', logging_note: 'Remarque',
  numbering: 'Numérotation', source_of_event_tables: 'Origine des tableaux', definition: 'Définition',
  target: 'Cible', example: 'Exemple', event_type: "Type d'événement", header: 'Bandeau',
  alarm_led: 'Voyant alarme', horn: 'Avertisseur', mode: 'Mode', level: 'Niveau',
  upm: 'UPM', mcu: 'MCU', csb: 'CSB', error_code: "Code d'erreur", scan: 'Scan',
};

const HEADING_KEYS = ['label', 'title', 'symptom', 'alarm'];
const HIDDEN_KEYS = new Set(['id', 'n']);

export const keyLabel = (k: string): string =>
  LABELS[k] ?? k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const isPrimitive = (v: unknown): v is string | number | boolean | null =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v);

const fmt = (v: string | number | boolean | null): string =>
  v === true ? 'oui' : v === false ? 'non' : v === null ? '-' : String(v);

function Value({ v }: { v: unknown }) {
  if (isPrimitive(v)) return <span>{fmt(v)}</span>;
  if (Array.isArray(v)) {
    if (v.every(isPrimitive)) {
      return <ul className="doc-list">{v.map((x, i) => <li key={i}>{fmt(x)}</li>)}</ul>;
    }
    if (v.length >= 2 && v.every((x) => x && typeof x === 'object' && !Array.isArray(x) &&
        Object.entries(x as Record<string, unknown>).every(([k, y]) => k.startsWith('_') || isPrimitive(y)))) {
      const cols: string[] = [];
      for (const x of v as Record<string, unknown>[]) {
        for (const k of Object.keys(x)) if (!k.startsWith('_') && !cols.includes(k)) cols.push(k);
      }
      if (cols.length >= 2 && cols.length <= 9) {
        return (
          <div className="doc-scroll">
            <table className="kv grid">
              <thead><tr>{cols.map((c) => <th key={c}>{keyLabel(c)}</th>)}</tr></thead>
              <tbody>
                {(v as Record<string, unknown>[]).map((x, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c}>{x[c] === undefined ? '' : fmt(x[c] as string | number | boolean | null)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
    return (
      <div className="doc-items">
        {v.map((x, i) => <div className="box sub" key={i}><Value v={x} /></div>)}
      </div>
    );
  }
  const o = v as Record<string, unknown>;
  const heading = HEADING_KEYS.map((k) => o[k]).find((x) => typeof x === 'string') as string | undefined;
  const headingKey = HEADING_KEYS.find((k) => typeof o[k] === 'string');
  const num = typeof o.n === 'number' ? `${o.n}. ` : '';
  const text = typeof o.text === 'string' ? o.text : null;
  const rest = Object.entries(o).filter(
    ([k]) => !k.startsWith('_') && !HIDDEN_KEYS.has(k) && k !== headingKey && k !== 'text',
  );
  return (
    <div>
      {heading && <strong>{heading}</strong>}
      {text && <p>{num}{text}</p>}
      {rest.length > 0 && (
        <dl className="doc-dl">
          {rest.map(([k, x]) => (
            <div key={k} className={isPrimitive(x) ? 'doc-row' : 'doc-row stack'}>
              <dt>{keyLabel(k)}</dt>
              <dd><Value v={x} /></dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Un fichier JSON : bandeau d'état, puis une section dépliable par clé de premier niveau. */
export function GenericDoc({ data, title }: { data: Record<string, unknown>; title?: string }) {
  const status = typeof data._status === 'string' ? data._status : null;
  const source = typeof data._source === 'string' ? data._source : null;
  const sections = Object.entries(data).filter(([k]) => !k.startsWith('_'));
  return (
    <section>
      {title && <h2 className="doc-h">{title}</h2>}
      {status && <div className="box warn"><p>{status}</p></div>}
      {source && <p className="muted">Sources : {source}</p>}
      {sections.map(([k, v]) => (
        <details className="box proc" key={k}>
          <summary><strong>{keyLabel(k)}</strong></summary>
          <Value v={v} />
        </details>
      ))}
    </section>
  );
}
