const { Tool } = require('@librechat/agents/langchain/tools');
const fs = require('fs');
const path = require('path');

const VISITS_DIR = path.join(__dirname, '..', '..', '..', '..', '..', 'data', 'visits');

const visitFileSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['write', 'read', 'patch'],
      description:
        "write = créer ou remplacer le JSON complet. read = lire l'état actuel. patch = mettre à jour un champ précis via dot-notation.",
    },
    filename: {
      type: 'string',
      minLength: 1,
      description:
        "Nom du fichier sans extension — utilise un nom descriptif incluant adresse et date (ex: visite-10-rue-victor-hugo-paris-2025-01-15).",
    },
    content: {
      type: 'object',
      description: '[write] Objet JSON complet à écrire dans le fichier.',
    },
    path: {
      type: 'string',
      description:
        '[patch] Chemin dot-notation vers le champ à modifier (ex: "logement.surface_habitable" ou "pieces").',
    },
    value: {
      description: '[patch] Valeur à définir — string, number, boolean, array ou object.',
    },
  },
  required: ['action', 'filename'],
};

function sanitizeFilename(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 120);
}

function ensureVisitsDir() {
  if (!fs.existsSync(VISITS_DIR)) {
    fs.mkdirSync(VISITS_DIR, { recursive: true });
  }
}

function tryParseJson(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

function deepSet(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const cur = node[parts[i]];
    if (cur == null) {
      node[parts[i]] = {};
    } else if (typeof cur === 'string') {
      // LLM may have stored a JSON-stringified object — recover it
      node[parts[i]] = tryParseJson(cur) ?? {};
      if (typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    }
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = tryParseJson(value);
}

class VisitFile extends Tool {
  static lc_name() {
    return 'visit_file';
  }

  static get jsonSchema() {
    return visitFileSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'visit_file';
    this.description =
      "Gère le fichier JSON de la visite technique en cours. Utilise 'write' pour initialiser ou réécrire le JSON complet, 'read' pour vérifier l'état actuel, 'patch' pour mettre à jour un champ précis. Appelle cet outil naturellement au fil de la conversation pour construire progressivement le rapport.";
    this.schema = visitFileSchema;
  }

  async _call(input) {
    const { action, filename, content, path: fieldPath, value } = input;

    const safe = sanitizeFilename(filename);
    if (!safe) {
      return JSON.stringify({ error: 'Nom de fichier invalide' });
    }

    const filepath = path.join(VISITS_DIR, `${safe}.json`);

    try {
      ensureVisitsDir();

      if (action === 'read') {
        if (!fs.existsSync(filepath)) {
          return JSON.stringify({ error: 'Fichier non trouvé — utilise write pour créer', filename: safe });
        }
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        return JSON.stringify({ ok: true, filename: safe, data });
      }

      if (action === 'write') {
        const resolved = tryParseJson(content);
        if (!resolved || typeof resolved !== 'object') {
          return JSON.stringify({ error: 'content requis pour write (objet JSON)' });
        }
        fs.writeFileSync(filepath, JSON.stringify(resolved, null, 2), 'utf-8');
        return JSON.stringify({ ok: true, filename: safe, path: filepath });
      }

      if (action === 'patch') {
        if (!fieldPath || value === undefined) {
          return JSON.stringify({ error: 'path et value sont requis pour patch' });
        }
        let current = {};
        if (fs.existsSync(filepath)) {
          current = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        }
        deepSet(current, fieldPath, value);
        fs.writeFileSync(filepath, JSON.stringify(current, null, 2), 'utf-8');
        return JSON.stringify({ ok: true, filename: safe, updated: fieldPath, current });
      }

      return JSON.stringify({ error: `Action inconnue: ${action}` });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  }
}

module.exports = VisitFile;
