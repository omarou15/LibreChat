export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const DEFAULT_CHECKLIST: ChecklistSection[] = [
  {
    id: 'enveloppe',
    title: 'Enveloppe',
    items: [
      { id: 'murs_ext', label: 'Murs extérieurs inspectés', checked: false, note: '' },
      { id: 'toiture', label: 'Toiture / couverture vérifiée', checked: false, note: '' },
      { id: 'fenetres', label: 'Fenêtres et portes mesurées', checked: false, note: '' },
      { id: 'ponts_thermiques', label: 'Ponts thermiques identifiés', checked: false, note: '' },
      { id: 'etancheite', label: 'Étanchéité à l\'air vérifiée', checked: false, note: '' },
    ],
  },
  {
    id: 'chauffage',
    title: 'Chauffage & ECS',
    items: [
      { id: 'generateur', label: 'Générateur identifié (marque, modèle, année)', checked: false, note: '' },
      { id: 'distribution', label: 'Distribution (émetteurs, réseau)', checked: false, note: '' },
      { id: 'regulation', label: 'Régulation / programmation', checked: false, note: '' },
      { id: 'ecs', label: 'Production ECS vérifiée', checked: false, note: '' },
      { id: 'entretien', label: 'Dernier entretien (date / carnet)', checked: false, note: '' },
    ],
  },
  {
    id: 'ventilation',
    title: 'Ventilation',
    items: [
      { id: 'type_vmc', label: 'Type de VMC identifié', checked: false, note: '' },
      { id: 'bouches', label: 'Bouches d\'extraction vérifiées', checked: false, note: '' },
      { id: 'entrees_air', label: 'Entrées d\'air vérifiées', checked: false, note: '' },
    ],
  },
  {
    id: 'eclairage',
    title: 'Éclairage & usages',
    items: [
      { id: 'eclairage', label: 'Type d\'éclairage principal noté', checked: false, note: '' },
      { id: 'electromenager', label: 'Électroménager énergivore identifié', checked: false, note: '' },
    ],
  },
  {
    id: 'divers',
    title: 'Divers',
    items: [
      { id: 'photos', label: 'Photos prises', checked: false, note: '' },
      { id: 'dpe_existant', label: 'DPE existant récupéré', checked: false, note: '' },
      { id: 'factures', label: 'Factures énergétiques demandées', checked: false, note: '' },
      { id: 'occupants', label: 'Nombre d\'occupants noté', checked: false, note: '' },
    ],
  },
];

export function formatChecklistAsMessage(sections: ChecklistSection[]): string {
  const lines: string[] = ['### Checklist visite terrain', ''];

  for (const section of sections) {
    const checked = section.items.filter((i) => i.checked).length;
    lines.push(`**${section.title} (${checked}/${section.items.length})**`);
    for (const item of section.items) {
      const tick = item.checked ? '✅' : '☐';
      lines.push(`${tick} ${item.label}${item.note ? ` — *${item.note}*` : ''}`);
    }
    lines.push('');
  }

  const totalChecked = sections.flatMap((s) => s.items).filter((i) => i.checked).length;
  const totalItems = sections.flatMap((s) => s.items).length;
  lines.push(`**Progression : ${totalChecked}/${totalItems}**`);

  return lines.join('\n');
}
