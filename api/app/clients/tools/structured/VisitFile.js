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
        '[patch] Chemin dot-notation vers le champ à modifier (ex: "logement.surface_habitable"). Laisser vide ("") pour fusionner un objet complet à la racine — préférer cette forme pour mettre à jour plusieurs sections en un seul appel.',
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

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)
        && tv !== null && typeof tv === 'object' && !Array.isArray(tv)) {
      deepMerge(tv, sv);
    } else {
      target[key] = sv;
    }
  }
}

function deepSet(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const cur = node[parts[i]];
    if (cur == null) {
      node[parts[i]] = {};
    } else if (typeof cur === 'string') {
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
    this.description = `Gère le fichier JSON de la visite technique EnergyCo.

RÈGLES : répondre à l'utilisateur D'ABORD, puis appeler ce tool UNE SEULE FOIS à la fin. Quand ce tool retourne ok:true → STOP immédiat, ne plus rien générer. Ne jamais afficher le contenu du patch dans la réponse au technicien. Ne jamais appeler plusieurs fois dans le même tour.
PATCH : utiliser action=patch, path="" (vide), value=objet avec toutes les sections à mettre à jour en un seul appel. Ne jamais faire plusieurs patches séparés. 'read' uniquement si l'utilisateur le demande explicitement.

SCHÉMA JSON DE RÉFÉRENCE :
{
  "adresse": "",
  "date": "YYYY-MM-DDTHH:MM:SS",
  "technicien": "",
  "mission": "audit_energetique|DPE|conseil",
  "statut": "en_cours|terminée",
  "generalites": {
    "type_batiment": "maison individuelle|appartement|immeuble|local_commercial",
    "annee_construction": null,
    "surface_reference": null,
    "nb_niveaux": null,
    "hauteur_sous_plafond": null,
    "altitude": null,
    "nb_logements": null,
    "nb_occupants": null
  },
  "enveloppe": {
    "murs": [{ "materiau": "brique|beton|parpaing|pierre|ossature_bois|indetermine", "isolation": { "type": "ITE|ITI|absente|indetermine", "epaisseur_cm": null, "materiau_isolant": null }, "etat": "bon|moyen|mauvais|indetermine", "fiabilite": "haute|moyenne|faible" }],
    "planchers_bas": [{ "type": "cave|vide_sanitaire|terre_plein|dalle_beton|indetermine", "isolation": { "type": "sous_face|insufflee|absente|indetermine", "epaisseur_cm": null }, "etat": "bon|moyen|mauvais|indetermine" }],
    "toitures": [{ "type": "combles_perdus|combles_amenages|rampants|toit_terrasse|indetermine", "isolation": { "type": "soufflage|rouleaux|absente|indetermine", "epaisseur_cm": null, "materiau_isolant": null }, "etat": "bon|moyen|mauvais|indetermine" }],
    "menuiseries": [{ "type_vitrage": "simple|double|triple", "materiau_cadre": "PVC|bois|aluminium|mixte|indetermine", "presence_entree_air": null, "volets": null, "nb": null, "orientation": null, "surface_totale": null, "etat": "bon|moyen|mauvais|indetermine" }],
    "ponts_thermiques": []
  },
  "installation": {
    "chauffage": [{ "type_generateur": "", "marque": null, "modele": null, "puissance_kw": null, "annee_installation": null, "fluide": null, "cop": null, "type_emetteur": "", "mode_chauffage": "central|electrique_direct|autre", "energie": "", "etat": "bon|moyen|mauvais|indetermine", "fiabilite": "haute|moyenne|faible" }],
    "ecs": [{ "type_production": "", "marque": null, "modele": null, "volume_l": null, "puissance_kw": null, "annee_installation": null, "installation": "individuelle|collective", "etat": "bon|moyen|mauvais|indetermine", "fiabilite": "haute|moyenne|faible" }],
    "ventilation": { "type": "VMC_simple_flux|VMC_double_flux|VMI|naturelle|absente|indetermine", "hygro": "A|B|non|indetermine", "marque": null, "modele": null, "annee_installation": null, "etat": "bon|moyen|mauvais|indetermine" },
    "climatisation": null,
    "regulation": null,
    "emetteurs": null
  },
  "sources": { "bdnb": null, "dpe": null, "ademe": null, "documents_transmis": [] },
  "photos": [{ "id": "photo_001", "type": "facade_exterieure|interieur_piece|equipement_technique|plan_architectural|pathologie_closeup|document_etiquette|mixte|illisible", "sujet": "", "constat": "", "analyse_vt": "", "points_attention": [], "champs_patches": [], "fiabilite": "haute|moyenne|faible" }],
  "observations": [], "donnees_manquantes": []
}`;
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
        return JSON.stringify({ ok: true, filename: safe, saved: true });
      }

      if (action === 'patch') {
        if (value === undefined) {
          return JSON.stringify({ error: 'value est requis pour patch' });
        }
        let current = {};
        if (fs.existsSync(filepath)) {
          current = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        }
        if (!fieldPath || fieldPath === '') {
          const merged = tryParseJson(value);
          if (!merged || typeof merged !== 'object' || Array.isArray(merged)) {
            return JSON.stringify({ error: 'Pour un patch racine (path vide), value doit être un objet' });
          }
          deepMerge(current, merged);
        } else {
          deepSet(current, fieldPath, value);
        }
        fs.writeFileSync(filepath, JSON.stringify(current, null, 2), 'utf-8');
        return JSON.stringify({ ok: true, filename: safe, updated: fieldPath || 'root' });
      }

      return JSON.stringify({ error: `Action inconnue: ${action}` });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  }
}

module.exports = VisitFile;
