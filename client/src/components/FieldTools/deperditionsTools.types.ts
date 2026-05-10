export type WallAdjacency =
  | 'exterieur'
  | 'local_non_chauffe'
  | 'terre'
  | 'voisin_non_chauffe'
  | 'autre';

export type FloorLowType = 'terre_plein' | 'vide_sanitaire' | 'sous_sol' | 'autre';
export type FloorHighType = 'combles_perdus' | 'combles_amenages' | 'toiture_terrasse' | 'autre';

export const WALL_ADJACENCY_OPTIONS: { value: WallAdjacency; label: string }[] = [
  { value: 'exterieur', label: 'Mur extérieur' },
  { value: 'local_non_chauffe', label: 'Local non chauffé' },
  { value: 'terre', label: 'Mur enterré / terre' },
  { value: 'voisin_non_chauffe', label: 'Voisin non chauffé' },
  { value: 'autre', label: 'Autre' },
];

export const FLOOR_LOW_OPTIONS: { value: FloorLowType; label: string }[] = [
  { value: 'terre_plein', label: 'Terre-plein' },
  { value: 'vide_sanitaire', label: 'Vide sanitaire' },
  { value: 'sous_sol', label: 'Sous-sol non chauffé' },
  { value: 'autre', label: 'Autre' },
];

export const FLOOR_HIGH_OPTIONS: { value: FloorHighType; label: string }[] = [
  { value: 'combles_perdus', label: 'Combles perdus' },
  { value: 'combles_amenages', label: 'Combles aménagés' },
  { value: 'toiture_terrasse', label: 'Toiture-terrasse' },
  { value: 'autre', label: 'Autre' },
];

export interface WallRow {
  id: string;
  adjacency: WallAdjacency;
  surface: string;
  orientation: string;
  note: string;
}

export interface FloorLowRow {
  id: string;
  type: FloorLowType;
  surface: string;
  note: string;
}

export interface FloorHighRow {
  id: string;
  type: FloorHighType;
  surface: string;
  note: string;
}

export interface DoorRow {
  id: string;
  surface: string;
  note: string;
}

export interface DeperditionsPayload {
  walls: WallRow[];
  floorsLow: FloorLowRow[];
  floorsHigh: FloorHighRow[];
  doors: DoorRow[];
}

export function parseSurface1Dec(val: string): number | null {
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) || n <= 0 ? null : Math.round(n * 10) / 10;
}

export function parseInteger(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export function formatSurface1Dec(m2: number): string {
  return `${m2.toFixed(1).replace('.', ',')} m²`;
}

export interface DeperditionsTotals {
  walls: number;
  floorsLow: number;
  floorsHigh: number;
  doors: number;
  grand: number;
}

export function computeDeperditionsTotals(p: DeperditionsPayload): DeperditionsTotals {
  const sum = (vals: string[]) =>
    vals.reduce((acc, v) => {
      const n = parseSurface1Dec(v);
      return acc + (n ?? 0);
    }, 0);

  const walls = sum(p.walls.map((r) => r.surface));
  const floorsLow = sum(p.floorsLow.map((r) => r.surface));
  const floorsHigh = sum(p.floorsHigh.map((r) => r.surface));
  const doors = sum(p.doors.map((r) => r.surface));
  return { walls, floorsLow, floorsHigh, doors, grand: walls + floorsLow + floorsHigh + doors };
}

const WALL_ADJ_LABEL = Object.fromEntries(
  WALL_ADJACENCY_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<WallAdjacency, string>;

const FLOOR_LOW_LABEL = Object.fromEntries(
  FLOOR_LOW_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<FloorLowType, string>;

const FLOOR_HIGH_LABEL = Object.fromEntries(
  FLOOR_HIGH_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<FloorHighType, string>;

export function formatDeperditionsAsMessage(p: DeperditionsPayload): string {
  const { walls, floorsLow, floorsHigh, doors, grand } = computeDeperditionsTotals(p);

  const wallLines = p.walls.map((r, i) => {
    const s = parseSurface1Dec(r.surface);
    return `  ${i + 1}. ${WALL_ADJ_LABEL[r.adjacency]}${r.orientation ? ` (${r.orientation})` : ''} — ${s != null ? formatSurface1Dec(s) : '—'}${r.note ? ` — ${r.note}` : ''}`;
  });

  const flLowLines = p.floorsLow.map((r, i) => {
    const s = parseSurface1Dec(r.surface);
    return `  ${i + 1}. ${FLOOR_LOW_LABEL[r.type]} — ${s != null ? formatSurface1Dec(s) : '—'}${r.note ? ` — ${r.note}` : ''}`;
  });

  const flHighLines = p.floorsHigh.map((r, i) => {
    const s = parseSurface1Dec(r.surface);
    return `  ${i + 1}. ${FLOOR_HIGH_LABEL[r.type]} — ${s != null ? formatSurface1Dec(s) : '—'}${r.note ? ` — ${r.note}` : ''}`;
  });

  const doorLines = p.doors.map((r, i) => {
    const s = parseSurface1Dec(r.surface);
    return `  ${i + 1}. Porte ${s != null ? formatSurface1Dec(s) : '—'}${r.note ? ` — ${r.note}` : ''}`;
  });

  const sections: string[] = ['### Surfaces déperditives', ''];

  if (p.walls.length > 0) {
    sections.push(`**Murs (${formatSurface1Dec(walls)}) :**`, ...wallLines, '');
  }
  if (p.floorsLow.length > 0) {
    sections.push(`**Planchers bas (${formatSurface1Dec(floorsLow)}) :**`, ...flLowLines, '');
  }
  if (p.floorsHigh.length > 0) {
    sections.push(`**Planchers hauts (${formatSurface1Dec(floorsHigh)}) :**`, ...flHighLines, '');
  }
  if (p.doors.length > 0) {
    sections.push(`**Portes (${formatSurface1Dec(doors)}) :**`, ...doorLines, '');
  }

  sections.push('**Récapitulatif :**');
  if (walls > 0) sections.push(`  - Murs : ${formatSurface1Dec(walls)}`);
  if (floorsLow > 0) sections.push(`  - Planchers bas : ${formatSurface1Dec(floorsLow)}`);
  if (floorsHigh > 0) sections.push(`  - Planchers hauts : ${formatSurface1Dec(floorsHigh)}`);
  if (doors > 0) sections.push(`  - Portes : ${formatSurface1Dec(doors)}`);
  sections.push(`  - **Total : ${formatSurface1Dec(grand)}**`);

  return sections.join('\n');
}
