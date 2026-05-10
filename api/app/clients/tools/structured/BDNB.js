const { Tool } = require('@librechat/agents/langchain/tools');

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';
const BDNB_BASE = 'https://api.bdnb.io/v1/bdnb/donnees';

const BDNB_MAX_MATCH_DISTANCE_M = 150;
const BDNB_FALLBACK_DISTANCE_M = 500;
const BDNB_COMMUNE_PAGE_SIZE = 2000;

const COMPLET_FIELDS = [
  'batiment_groupe_id',
  'libelle_adr_principale_ban',
  'code_commune_insee',
  'annee_construction',
  'nb_log',
  'nb_niveau',
  's_geom_groupe',
  'surface_emprise_sol',
  'classe_bilan_dpe',
  'nb_classe_bilan_dpe_a', 'nb_classe_bilan_dpe_b', 'nb_classe_bilan_dpe_c',
  'nb_classe_bilan_dpe_d', 'nb_classe_bilan_dpe_e', 'nb_classe_bilan_dpe_f', 'nb_classe_bilan_dpe_g',
  'mat_mur_txt',
  'mat_toit_txt',
  'usage_principal_bdnb_open',
  'hauteur_mean',
  'type_installation_chauffage',
  'type_energie_chauffage',
  'type_generateur_chauffage',
  'type_installation_ecs',
  'type_generateur_ecs',
  'type_ventilation',
  'type_isolation_mur_exterieur',
  'type_isolation_plancher_bas',
  'type_isolation_plancher_haut',
  'type_vitrage',
  'type_materiaux_menuiserie',
  'u_mur_exterieur',
  'conso_5_usages_ep_m2',
  'emission_ges_5_usages_m2',
  'l_parcelle_id',
  'l_denomination_proprietaire',
  'alea_argile',
].join(',');

const STOPWORDS = new Set([
  'rue', 'avenue', 'boulevard', 'bd', 'av', 'place', 'impasse', 'allée',
  'allee', 'chemin', 'route', 'voie', 'passage', 'cours', 'square',
  'le', 'la', 'les', 'de', 'du', 'des', 'd', 'et', 'a', 'en', 'sur', 'sous',
]);

const bdnbSchema = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      minLength: 5,
      description: "Adresse complète du bâtiment (ex: '35 rue de la Paix 75001 Paris')",
    },
  },
  required: ['address'],
};

function extractStreetKeyword(street) {
  const words = street
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s\-']+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  return words[0] ?? null;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

async function geocodeBAN(address) {
  const url = `${BAN_URL}?q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BAN geocoding error ${res.status}`);

  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) return null;

  return {
    label: feature.properties.label,
    score: feature.properties.score,
    citycode: feature.properties.citycode ?? null,
    ban_id: feature.properties.id ?? null,
    street: feature.properties.street ?? feature.properties.name ?? null,
    housenumber: feature.properties.housenumber ?? null,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
  };
}

async function bdnbFetch(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json();
  return Array.isArray(json) ? json : null;
}

/** Step 2: batch-fetch WGS84 coords from batiment_groupe base table */
async function fetchGeomBatch(ids, banCoords) {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  params.set('batiment_groupe_id', `in.(${ids.join(',')})`);
  params.set('select', 'batiment_groupe_id,geom_groupe_pos_wgs84,s_geom_groupe');
  params.set('limit', String(ids.length));

  const data = await bdnbFetch(`${BDNB_BASE}/batiment_groupe?${params.toString()}`);
  if (!data) return ids.map((id) => ({ id, distance_m: null }));

  return data.map((row) => {
    const wgs = row.geom_groupe_pos_wgs84;
    const coords = wgs?.coordinates;
    const distance =
      Array.isArray(coords) && coords.length === 2
        ? haversineMeters(banCoords, { lng: coords[0], lat: coords[1] })
        : null;
    return {
      id: row.batiment_groupe_id,
      distance_m: distance,
    };
  }).sort((a, b) => {
    if (a.distance_m == null) return 1;
    if (b.distance_m == null) return -1;
    return a.distance_m - b.distance_m;
  });
}

async function fetchDpeRepresentatif(batimentGroupeId) {
  const params = new URLSearchParams();
  params.set('batiment_groupe_id', `eq.${batimentGroupeId}`);
  params.set('limit', '1');
  const data = await bdnbFetch(`${BDNB_BASE}/batiment_groupe_dpe_representatif_logement?${params.toString()}`);
  return data?.[0] ?? null;
}

async function fetchBuildingComplete(batimentGroupeId) {
  const params = new URLSearchParams();
  params.set('batiment_groupe_id', `eq.${batimentGroupeId}`);
  params.set('select', COMPLET_FIELDS);
  params.set('limit', '1');
  const data = await bdnbFetch(`${BDNB_BASE}/batiment_groupe_complet?${params.toString()}`);
  return data?.[0] ?? null;
}

function buildDigest(b, dpeRepr, distanceM) {
  if (!b) return null;
  const lines = [];
  lines.push(`## BDNB · ${b.batiment_groupe_id}`);
  if (b.libelle_adr_principale_ban) lines.push(`- Adresse: ${b.libelle_adr_principale_ban}`);
  if (distanceM != null) lines.push(`- Distance BAN→centroïde: ${Math.round(distanceM)}m`);

  const annee = b.annee_construction;
  const matStruct = b.mat_mur_txt;
  if (annee || matStruct) {
    lines.push(`- ${[annee ? `Construction ${annee}` : null, matStruct].filter(Boolean).join(', ')}`);
  }

  const dims = [
    b.nb_log != null ? `${b.nb_log} logements` : null,
    b.nb_niveau != null ? `${b.nb_niveau} niveaux` : null,
    b.hauteur_mean != null ? `${b.hauteur_mean}m haut` : null,
    (b.s_geom_groupe ?? b.surface_emprise_sol) != null ? `emprise ${b.s_geom_groupe ?? b.surface_emprise_sol}m²` : null,
  ].filter(Boolean);
  if (dims.length) lines.push(`- ${dims.join(' / ')}`);

  const dpeClass = b.classe_bilan_dpe ?? dpeRepr?.classe_bilan_dpe;
  const conso = b.conso_5_usages_ep_m2;
  const ges = b.emission_ges_5_usages_m2;
  if (dpeClass || conso || ges) {
    lines.push(`- Énergie: ${[dpeClass ? `DPE ${dpeClass}` : null, conso ? `${Math.round(conso)} kWh/m²·an` : null, ges ? `${ges} kgCO₂/m²·an` : null].filter(Boolean).join(', ')}`);
  }

  // DPE distribution
  const dist = ['a','b','c','d','e','f','g']
    .map((l) => { const n = b[`nb_classe_bilan_dpe_${l}`]; return n > 0 ? `${n}×${l.toUpperCase()}` : null; })
    .filter(Boolean);
  if (dist.length) lines.push(`- Distribution DPE: ${dist.join(', ')}`);

  if (b.type_energie_chauffage || b.type_installation_chauffage) {
    lines.push(`- Chauffage: ${[b.type_energie_chauffage, b.type_installation_chauffage, b.type_generateur_chauffage].filter(Boolean).join(', ')}`);
  }
  if (b.type_generateur_ecs || b.type_installation_ecs) {
    lines.push(`- ECS: ${[b.type_generateur_ecs, b.type_installation_ecs].filter(Boolean).join(', ')}`);
  }
  if (b.type_ventilation) lines.push(`- Ventilation: ${b.type_ventilation}`);
  if (b.type_isolation_mur_exterieur || b.u_mur_exterieur) {
    lines.push(`- Isolation mur: ${[b.type_isolation_mur_exterieur, b.u_mur_exterieur ? `U=${b.u_mur_exterieur}` : null].filter(Boolean).join(', ')}`);
  }
  if (b.type_vitrage || b.type_materiaux_menuiserie) {
    lines.push(`- Vitrage: ${[b.type_vitrage, b.type_materiaux_menuiserie].filter(Boolean).join(', ')}`);
  }

  const parcelles = Array.isArray(b.l_parcelle_id) ? b.l_parcelle_id.join(', ') : null;
  const proprios = Array.isArray(b.l_denomination_proprietaire) ? b.l_denomination_proprietaire.join(', ') : null;
  if (parcelles) lines.push(`- Parcelle(s): ${parcelles}`);
  if (proprios) lines.push(`- Propriétaire: ${proprios}`);
  if (b.alea_argile && b.alea_argile !== 'Faible') lines.push(`- ⚠ Aléa argile: ${b.alea_argile}`);

  return lines.join('\n');
}

class BDNBBatiment extends Tool {
  static lc_name() {
    return 'BDNBBatiment';
  }

  constructor(fields = {}) {
    super(fields);
    this.override = fields.override ?? false;
    this.name = 'bdnb_batiment';
    this.description =
      "Recherche les données du bâtiment dans la Base Nationale des Bâtiments (BDNB/CSTB) pour une adresse. Retourne un digest structuré : année construction, surface, nb logements, niveaux, matériaux, DPE estimé, systèmes CVC, propriétaire, parcelle. Utiliser pour pré-remplir les données d'un bâtiment lors d'une visite technique.";
    this.schema = bdnbSchema;
  }

  static get jsonSchema() {
    return bdnbSchema;
  }

  async _call({ address }) {
    const ban = await geocodeBAN(address);

    if (!ban || ban.score < 0.5) {
      return JSON.stringify({
        source: 'BDNB',
        error: "Adresse non reconnue (score BAN trop faible)",
        address,
        ban_score: ban?.score ?? 0,
      });
    }

    const banCoords = { lat: ban.lat, lng: ban.lng };
    let electedId = null;
    let distanceM = null;
    let strategy = null;

    // ---- Strategy A: citycode + street keyword → IDs → geom batch → haversine
    const keyword = ban.street ? extractStreetKeyword(ban.street) : null;

    if (ban.citycode && keyword) {
      const params = new URLSearchParams();
      params.set('code_commune_insee', `eq.${ban.citycode}`);
      params.set('libelle_adr_principale_ban', `ilike.*${keyword}*`);
      params.set('select', 'batiment_groupe_id,libelle_adr_principale_ban');

      const candidates = await bdnbFetch(`${BDNB_BASE}/batiment_groupe_complet?${params.toString()}`);

      if (candidates && candidates.length > 0) {
        // Prefer housenumber match (word-boundary regex)
        let preferred = candidates;
        if (ban.housenumber) {
          const hnRegex = new RegExp(`^${ban.housenumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const exact = candidates.filter((r) => hnRegex.test(String(r.libelle_adr_principale_ban ?? '')));
          if (exact.length > 0) preferred = exact;
        }

        const ids = preferred.map((r) => r.batiment_groupe_id).filter(Boolean);
        const sorted = await fetchGeomBatch(ids, banCoords);
        const best = sorted[0];

        if (best && (best.distance_m == null || best.distance_m <= BDNB_FALLBACK_DISTANCE_M)) {
          electedId = best.id;
          distanceM = best.distance_m;
          strategy = 'keyword';
        }
      }
    }

    // ---- Strategy B: commune-wide + haversine (fallback)
    if (!electedId && ban.citycode) {
      const params = new URLSearchParams();
      params.set('code_commune_insee', `eq.${ban.citycode}`);
      params.set('select', 'batiment_groupe_id,geom_groupe_pos_wgs84,s_geom_groupe');
      params.set('limit', String(BDNB_COMMUNE_PAGE_SIZE));

      const all = await bdnbFetch(`${BDNB_BASE}/batiment_groupe?${params.toString()}`);

      if (all && all.length > 0) {
        const withDist = all
          .map((row) => {
            const coords = row.geom_groupe_pos_wgs84?.coordinates;
            return {
              id: row.batiment_groupe_id,
              distance_m: Array.isArray(coords) && coords.length === 2
                ? haversineMeters(banCoords, { lng: coords[0], lat: coords[1] })
                : null,
            };
          })
          .filter((r) => r.id && r.distance_m != null)
          .sort((a, b) => a.distance_m - b.distance_m);

        const best = withDist[0];
        if (best && best.distance_m <= BDNB_FALLBACK_DISTANCE_M) {
          electedId = best.id;
          distanceM = best.distance_m;
          strategy = distanceM <= BDNB_MAX_MATCH_DISTANCE_M ? 'commune_haversine' : 'commune_fallback';
        }
      }
    }

    if (!electedId) {
      return JSON.stringify({
        source: 'BDNB',
        address,
        ban_match: ban.label,
        ban_score: ban.score,
        error: 'Bâtiment non trouvé dans BDNB — saisie manuelle requise',
      });
    }

    const [building, dpeRepr] = await Promise.all([
      fetchBuildingComplete(electedId),
      fetchDpeRepresentatif(electedId),
    ]);

    const digest = buildDigest(building, dpeRepr, distanceM);

    const lat = ban.lat;
    const lng = ban.lng;
    const satellite_links = {
      google_maps: `https://www.google.com/maps/@${lat},${lng},18z/data=!3m1!1e3`,
      geoportail: `https://www.geoportail.gouv.fr/carte?c=${lng},${lat}&z=20&l1=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`,
    };

    return JSON.stringify({
      source: 'BDNB',
      address,
      ban_match: ban.label,
      ban_score: ban.score,
      match_strategy: strategy,
      distance_m: distanceM != null ? Math.round(distanceM) : null,
      satellite_links,
      digest,
      raw_building: building,
      raw_dpe_representatif: dpeRepr,
    });
  }
}

module.exports = BDNBBatiment;
