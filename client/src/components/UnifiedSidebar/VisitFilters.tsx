import React from 'react';
import { cn } from '~/utils';

export const VISIT_MISSIONS = [
  'Audit énergétique',
  'DPE',
  'PPPT',
  'DTG',
  'Note de dimensionnement',
  'Autre',
] as const;

export type VisitMission = (typeof VISIT_MISSIONS)[number];

export function parseVisitMission(title: string): VisitMission | null {
  const first = title.split(' — ')[0] as VisitMission;
  return (VISIT_MISSIONS as readonly string[]).includes(first) ? first : null;
}

type Props = {
  active: VisitMission | null;
  available: ReadonlySet<VisitMission>;
  onChange: (mission: VisitMission | null) => void;
};

export default function VisitFilters({ active, available, onChange }: Props) {
  if (available.size === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 px-3 pb-1 pt-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
          active === null
            ? 'bg-green-600 text-white'
            : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover',
        )}
      >
        Tous
      </button>
      {VISIT_MISSIONS.filter((m) => available.has(m)).map((mission) => (
        <button
          key={mission}
          type="button"
          onClick={() => onChange(active === mission ? null : mission)}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            active === mission
              ? 'bg-green-600 text-white'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover',
          )}
        >
          {mission}
        </button>
      ))}
    </div>
  );
}
