import { useState } from 'react';
import { Mail, Trash2, UserPlus, Users as UsersIcon, Copy, Check } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useListAdminUsers, useInviteUserMutation, useDeleteAdminUserMutation } from '~/data-provider';

export default function Users() {
  const [email, setEmail] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const { showToast } = useToastContext();

  const { data, isLoading } = useListAdminUsers({ limit: 100 });
  const users = data?.users ?? [];

  const invite = useInviteUserMutation({
    onSuccess: (res) => {
      showToast({ message: `Invitation envoyée à ${email}` });
      setEmail('');
      if (res.inviteLink) {
        setCopiedLink(res.inviteLink);
        navigator.clipboard.writeText(res.inviteLink).catch(() => null);
        setTimeout(() => setCopiedLink(null), 5000);
      }
    },
    onError: (err) => showToast({ message: err?.message ?? "Erreur lors de l'envoi", severity: 'error' }),
  });

  const deleteUser = useDeleteAdminUserMutation({
    onSuccess: () => {
      showToast({ message: 'Utilisateur supprimé' });
      setConfirmDeleteId(null);
    },
    onError: (err) => showToast({ message: err?.message ?? 'Erreur lors de la suppression', severity: 'error' }),
  });

  const handleInvite = () => {
    if (!email.includes('@')) return;
    invite.mutate(email);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <UsersIcon className="h-5 w-5 text-text-primary" />
        <span className="text-base font-medium text-text-primary">Gestion des utilisateurs</span>
      </div>

      {/* Invite form */}
      <div className="rounded-xl border border-border-light bg-surface-secondary p-4">
        <p className="mb-3 text-sm font-medium text-text-primary">Inviter un collaborateur</p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="prenom.nom@energyco.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            className="flex-1 rounded-lg border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleInvite}
            disabled={!email.includes('@') || invite.isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {invite.isLoading ? 'Envoi…' : 'Inviter'}
          </button>
        </div>
        {copiedLink != null && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Lien copié : {copiedLink}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(copiedLink).catch(() => null)}
              className="shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-text-secondary">
          Un email d'invitation est envoyé. Le lien est valable 7 jours.
        </p>
      </div>

      {/* User list */}
      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">
          Utilisateurs ({data?.total ?? 0})
        </p>
        {isLoading ? (
          <p className="text-sm text-text-secondary">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun utilisateur</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {u.name || u.username || '—'}
                      {u.role === 'ADMIN' && (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-text-secondary">
                      <Mail className="h-3 w-3 shrink-0" />
                      {u.email}
                    </p>
                  </div>
                </div>

                {u.role !== 'ADMIN' && (
                  confirmDeleteId === u.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => deleteUser.mutate(u.id)}
                        disabled={deleteUser.isLoading}
                        className="rounded-lg bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-border-light px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(u.id)}
                      className="shrink-0 rounded-full p-1.5 text-text-secondary hover:bg-surface-hover hover:text-red-500"
                      aria-label={`Supprimer ${u.name || u.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
