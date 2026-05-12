import React, { useState } from 'react';

const MISSIONS = [
  'Audit énergétique',
  'DPE',
  'PPPT',
  'DTG',
  'Note de dimensionnement',
  'Autre',
] as const;

const TYPOLOGIES = [
  'Maison individuelle',
  'Appartement',
  'Copropriété',
  'Tertiaire',
  'Monopropriété',
  'Industrie',
  'Autre',
] as const;

function nowDatetimeLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function buildTitle(mission: string, missionOther: string, typology: string, address: string, datetime: string): string {
  const label = mission === 'Autre' ? (missionOther.trim() || 'Autre') : mission;
  const dt = new Date(datetime);
  const date = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const addr = address.trim();
  return addr
    ? `${addr} — ${label} — ${date}`
    : `${label} — ${typology} — ${date}`;
}

type VisitData = {
  title: string;
  message: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: VisitData) => void;
};

export default function VisitSetupModal({ open, onClose, onSubmit }: Props) {
  const [mission, setMission] = useState<string>(MISSIONS[0]);
  const [missionOther, setMissionOther] = useState('');
  const [typology, setTypology] = useState<string>(TYPOLOGIES[0]);
  const [address, setAddress] = useState('');
  const [datetime, setDatetime] = useState(nowDatetimeLocal);

  if (!open) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missionLabel = mission === 'Autre' ? (missionOther.trim() || 'Autre') : mission;
    const title = buildTitle(mission, missionOther, typology, address, datetime);
    const dt = new Date(datetime);
    const dateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const message = [
      `Nouvelle visite`,
      `Mission : ${missionLabel}`,
      `Typologie : ${typology}`,
      address.trim() ? `Adresse : ${address.trim()}` : null,
      `Date : ${dateStr} ${timeStr}`,
    ].filter(Boolean).join('\n');
    onSubmit({ title, message });
  };

  const selectClass =
    'w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle visite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Nouvelle visite</h2>
          <button
            type="button"
            onClick={() => onSubmit({ title: '', message: '' })}
            className="text-xs text-text-secondary underline-offset-2 hover:underline"
          >
            Conversation libre
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Mission</label>
            <select value={mission} onChange={(e) => setMission(e.target.value)} className={selectClass}>
              {MISSIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {mission === 'Autre' && (
              <input
                type="text"
                placeholder="Préciser la mission…"
                value={missionOther}
                onChange={(e) => setMissionOther(e.target.value)}
                className={selectClass}
                autoFocus
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Typologie</label>
            <select value={typology} onChange={(e) => setTypology(e.target.value)} className={selectClass}>
              {TYPOLOGIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Adresse du projet</label>
            <input
              type="text"
              placeholder="Ex : 12 rue des Lilas, 75011 Paris"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={selectClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Date et heure</label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className={selectClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border-medium py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Créer la visite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
