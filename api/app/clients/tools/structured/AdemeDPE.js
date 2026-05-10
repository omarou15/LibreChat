const { Tool } = require('@librechat/agents/langchain/tools');

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';
const ADEME_BASE = 'https://data.ademe.fr/data-fair/api/v1/datasets';

// Dataset IDs verified in production
const DATASETS = {
  logement: 'meg-83tjwtg8dyz4vv7h1dqe',
  tertiaire: 'dpe-tertiaire',
};

const LOGEMENT_FIELDS = [
  'numero_dpe',
  'date_etablissement_dpe',
  'etiquette_dpe',
  'etiquette_ges',
  'surface_habitable_logement',
  'annee_construction',
  'type_batiment',
  'adresse_ban',
  'code_insee_ban',
  'type_energie_principale_chauffage',
  'type_installation_chauffage_n1',
  'type_energie_principale_ecs',
  'type_installation_ecs_n1',
  'type_ventilation',
  'qualite_isolation_murs',
  'qualite_isolation_plancher_bas',
  'qualite_isolation_menuiseries',
  'isolation_toiture',
  'qualite_isolation_enveloppe',
  'conso_5_usages_par_m2_ep',
].join(',');

// Tertiaire has different field names — minimal safe set
const TERTIAIRE_FIELDS = [
  'numero_dpe',
  'date_etablissement_dpe',
  'type_batiment',
  'surface_utile',
].join(',');

const ademeSchema = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      minLength: 5,
      description: "Adresse complète du bâtiment (ex: '35 rue de la Paix 75001 Paris')",
    },
    type: {
      type: 'string',
      enum: ['logement', 'tertiaire'],
      description: "Type : 'logement' (défaut) pour résidentiel, 'tertiaire' pour bureaux/commerces/médical",
    },
  },
  required: ['address'],
};

async function geocodeBAN(address) {
  const url = new URL(BAN_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`BAN geocoding error ${res.status}`);

  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) return null;

  return {
    label: feature.properties.label,
    score: feature.properties.score,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    citycode: feature.properties.citycode,
  };
}

function formatLogement(r) {
  return {
    numero_dpe: r.numero_dpe,
    date: r.date_etablissement_dpe,
    classe_energie: r.etiquette_dpe,
    classe_ges: r.etiquette_ges,
    surface_m2: r.surface_habitable_logement,
    annee_construction: r.annee_construction,
    type_batiment: r.type_batiment,
    adresse: r.adresse_ban,
    chauffage: {
      energie: r.type_energie_principale_chauffage,
      installation: r.type_installation_chauffage_n1,
    },
    ecs: {
      energie: r.type_energie_principale_ecs,
      installation: r.type_installation_ecs_n1,
    },
    ventilation: r.type_ventilation,
    isolation: {
      murs: r.qualite_isolation_murs,
      plancher_bas: r.qualite_isolation_plancher_bas,
      menuiseries: r.qualite_isolation_menuiseries,
      toiture: r.isolation_toiture,
      enveloppe_globale: r.qualite_isolation_enveloppe,
    },
    conso_ep_par_m2: r.conso_5_usages_par_m2_ep,
  };
}

class AdemeDPE extends Tool {
  static lc_name() {
    return 'AdemeDPE';
  }

  constructor(fields = {}) {
    super(fields);
    this.override = fields.override ?? false;
    this.name = 'ademe_dpe';
    this.description =
      "Recherche les Diagnostics de Performance Énergétique (DPE) ADEME pour une adresse. Utilise la géolocalisation BAN (rayon 50m) puis fallback texte. Retourne l'étiquette énergie/GES, surface, année construction, systèmes CVC et isolation. Utiliser pour pré-remplir les données d'un bâtiment lors d'une visite technique.";
    this.schema = ademeSchema;
  }

  static get jsonSchema() {
    return ademeSchema;
  }

  async _call({ address, type = 'logement' }) {
    const ban = await geocodeBAN(address);

    if (!ban || ban.score < 0.5) {
      return JSON.stringify({
        source: 'ADEME',
        error: "Adresse non reconnue — vérifier l'adresse",
        address,
        ban_score: ban?.score ?? 0,
      });
    }

    const dataset = DATASETS[type] ?? DATASETS.logement;
    const isLogement = type !== 'tertiaire';
    const fields = isLogement ? LOGEMENT_FIELDS : TERTIAIRE_FIELDS;
    const baseUrl = `${ADEME_BASE}/${dataset}/lines`;

    // Step 1: geo_distance (50m radius, precise)
    const geoUrl = new URL(baseUrl);
    geoUrl.searchParams.set('geo_distance', `${ban.lng},${ban.lat},50`);
    geoUrl.searchParams.set('size', '20');
    geoUrl.searchParams.set('select', fields);

    let mode = 'geo';
    let results = [];

    const geoRes = await fetch(geoUrl.toString());
    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      results = geoJson.results ?? [];
    }

    // Step 2: text fallback on canonical BAN address
    if (results.length === 0) {
      mode = 'text';
      const textUrl = new URL(baseUrl);
      textUrl.searchParams.set('q', ban.label);
      textUrl.searchParams.set('size', '5');
      textUrl.searchParams.set('select', fields);

      const textRes = await fetch(textUrl.toString());
      if (textRes.ok) {
        const textJson = await textRes.json();
        results = textJson.results ?? [];
      }
    }

    const formatted = isLogement ? results.map(formatLogement) : results;

    return JSON.stringify({
      source: 'ADEME DPE',
      address,
      ban_match: ban.label,
      ban_score: ban.score,
      mode,
      count: formatted.length,
      needs_user_choice: formatted.length > 1,
      results: formatted,
    });
  }
}

module.exports = AdemeDPE;
