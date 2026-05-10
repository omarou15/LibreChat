export type RoomKind =
  | 'sejour'
  | 'salon'
  | 'cuisine'
  | 'chambre'
  | 'bureau'
  | 'salle_de_bain'
  | 'wc'
  | 'couloir'
  | 'entree'
  | 'dressing'
  | 'veranda'
  | 'mezzanine'
  | 'loggia'
  | 'balcon'
  | 'terrasse'
  | 'cave'
  | 'garage'
  | 'cellier'
  | 'buanderie'
  | 'combles'
  | 'chaufferie'
  | 'local_technique'
  | 'autre';

export interface RoomGroup {
  label: string;
  kinds: { value: RoomKind; label: string }[];
}

export const ROOM_GROUPS: RoomGroup[] = [
  {
    label: 'Pièces habitables',
    kinds: [
      { value: 'sejour', label: 'Séjour / Salle à manger' },
      { value: 'salon', label: 'Salon' },
      { value: 'cuisine', label: 'Cuisine' },
      { value: 'chambre', label: 'Chambre' },
      { value: 'bureau', label: 'Bureau' },
      { value: 'salle_de_bain', label: 'Salle de bain' },
      { value: 'wc', label: 'WC' },
      { value: 'couloir', label: 'Couloir / Dégagement' },
      { value: 'entree', label: 'Entrée / Hall' },
      { value: 'dressing', label: 'Dressing' },
      { value: 'veranda', label: 'Véranda' },
      { value: 'mezzanine', label: 'Mezzanine' },
      { value: 'loggia', label: 'Loggia' },
      { value: 'balcon', label: 'Balcon' },
      { value: 'terrasse', label: 'Terrasse' },
    ],
  },
  {
    label: 'Pièces techniques / annexes',
    kinds: [
      { value: 'cave', label: 'Cave' },
      { value: 'garage', label: 'Garage' },
      { value: 'cellier', label: 'Cellier' },
      { value: 'buanderie', label: 'Buanderie' },
      { value: 'combles', label: 'Combles' },
      { value: 'chaufferie', label: 'Chaufferie / Local chaudière' },
      { value: 'local_technique', label: 'Local technique' },
      { value: 'autre', label: 'Autre' },
    ],
  },
];

export const ROOM_KIND_LABEL: Record<RoomKind, string> = Object.fromEntries(
  ROOM_GROUPS.flatMap((g) => g.kinds.map(({ value, label }) => [value, label])),
) as Record<RoomKind, string>;

export interface RoomEntry {
  id: string;
  kind: RoomKind;
  surface: number;
}

export function formatSurface(m2: number): string {
  return `${m2.toFixed(1).replace('.', ',')} m²`;
}

export function formatRoomEntriesAsMessage(entries: RoomEntry[]): string {
  if (entries.length === 0) return '';
  const total = entries.reduce((acc, e) => acc + e.surface, 0);
  const lines = [
    '### Mesures des pièces',
    '',
    ...entries.map((e, i) => `${i + 1}. ${ROOM_KIND_LABEL[e.kind]} — ${formatSurface(e.surface)}`),
    '',
    `**Total : ${formatSurface(total)}**`,
  ];
  return lines.join('\n');
}
