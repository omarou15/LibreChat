export type Vitrage = 'simple' | 'double' | 'triple' | 'ite' | 'autre';
export type Materiau = 'pvc' | 'bois' | 'aluminium' | 'mixte' | 'autre';
export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';

export const VITRAGE_OPTIONS: { value: Vitrage; label: string }[] = [
  { value: 'simple', label: 'Simple vitrage' },
  { value: 'double', label: 'Double vitrage' },
  { value: 'triple', label: 'Triple vitrage' },
  { value: 'ite', label: 'Double vitrage basse-émissivité' },
  { value: 'autre', label: 'Autre' },
];

export const MATERIAU_OPTIONS: { value: Materiau; label: string }[] = [
  { value: 'pvc', label: 'PVC' },
  { value: 'bois', label: 'Bois' },
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'mixte', label: 'Mixte (bois-alu)' },
  { value: 'autre', label: 'Autre' },
];

export const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export interface WindowTypology {
  id: string;
  orientation: Orientation;
  vitrage: Vitrage;
  materiau: Materiau;
  largeur: string;
  hauteur: string;
  quantite: string;
}

export function parseSurfaceM2(largeur: string, hauteur: string, quantite: string): number | null {
  const l = parseFloat(largeur.replace(',', '.'));
  const h = parseFloat(hauteur.replace(',', '.'));
  const q = parseInt(quantite, 10);
  if (isNaN(l) || isNaN(h) || isNaN(q) || l <= 0 || h <= 0 || q <= 0) return null;
  return Math.round(l * h * q * 100) / 100;
}

export function isSurfaceInputAllowed(val: string): boolean {
  return /^\d{0,4}([.,]\d{0,2})?$/.test(val);
}

export function formatM2(m2: number): string {
  return `${m2.toFixed(2).replace('.', ',')} m²`;
}

export interface WindowTotals {
  byOrientation: Record<Orientation, number>;
  grandTotal: number;
}

export function computeTotals(rows: WindowTypology[]): WindowTotals {
  const byOrientation = Object.fromEntries(
    ORIENTATIONS.map((o) => [o, 0]),
  ) as Record<Orientation, number>;

  let grandTotal = 0;
  for (const row of rows) {
    const s = parseSurfaceM2(row.largeur, row.hauteur, row.quantite);
    if (s != null) {
      byOrientation[row.orientation] = (byOrientation[row.orientation] ?? 0) + s;
      grandTotal += s;
    }
  }
  return { byOrientation, grandTotal };
}

const VITRAGE_LABEL: Record<Vitrage, string> = Object.fromEntries(
  VITRAGE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<Vitrage, string>;

const MATERIAU_LABEL: Record<Materiau, string> = Object.fromEntries(
  MATERIAU_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<Materiau, string>;

export function formatWindowsSurveyAsMessage(rows: WindowTypology[]): string {
  if (rows.length === 0) return '';
  const { byOrientation, grandTotal } = computeTotals(rows);

  const detailLines = rows.map((r, i) => {
    const s = parseSurfaceM2(r.largeur, r.hauteur, r.quantite);
    const surfStr = s != null ? formatM2(s) : '—';
    return `${i + 1}. ${r.orientation} — ${r.quantite}× ${r.largeur.replace('.', ',')}×${r.hauteur.replace('.', ',')} m — ${VITRAGE_LABEL[r.vitrage]} / ${MATERIAU_LABEL[r.materiau]} → ${surfStr}`;
  });

  const orientLines = ORIENTATIONS.filter((o) => (byOrientation[o] ?? 0) > 0).map(
    (o) => `  - ${o} : ${formatM2(byOrientation[o])}`,
  );

  return [
    '### Inventaire des fenêtres',
    '',
    ...detailLines,
    '',
    '**Récapitulatif par orientation :**',
    ...orientLines,
    '',
    `**Surface vitrée totale : ${formatM2(grandTotal)}**`,
  ].join('\n');
}
