import { useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAuthContext } from '~/hooks';
import { useVisitFile } from '~/hooks/useVisitFile';

export default function VisitDownloadButton({ conversationId }: { conversationId?: string }) {
  const filename = useVisitFile(conversationId);
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!filename || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/visits/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error(`[VisitDownload] HTTP ${response.status} for ${filename}`);
        return;
      }
      const blob = await response.blob();
      console.log(`[VisitDownload] ${filename}.json — ${blob.size} bytes`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[VisitDownload] Erreur :', err);
    } finally {
      setLoading(false);
    }
  }, [filename, token, loading]);

  if (!filename) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-green-600 hover:bg-green-500/10 dark:text-green-400 transition-colors disabled:opacity-50"
      title={`Télécharger le rapport JSON : ${filename}`}
    >
      {loading
        ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        : <Download className="h-4 w-4 shrink-0" />
      }
      <span className="hidden sm:inline">Rapport</span>
    </button>
  );
}
