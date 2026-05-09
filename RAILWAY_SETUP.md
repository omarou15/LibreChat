# Déploiement LibreChat sur Railway

## Architecture déployée

| Service | Image | Rôle |
|---------|-------|------|
| **librechat** | `ghcr.io/danny-avila/librechat-dev:latest` | Application principale (API + Frontend) |
| **mongo** | `mongo:8.0.20` | Base de données principale |
| **meilisearch** | `getmeili/meilisearch:v1.35.1` | Moteur de recherche full-text |

> La RAG API et PGVector sont optionnels — non inclus dans le déploiement initial.

---

## Étapes de déploiement

### 1. Déployer via le template Railway

Cliquez sur ce bouton ou visitez l'URL :

**https://railway.com/deploy/librechat**

Railway va créer automatiquement les 5 services (LibreChat, MongoDB, Meilisearch, PGVector, RAG API).

### 2. Variables d'environnement obligatoires

À définir dans **Railway Dashboard → Service LibreChat → Variables** :

#### Serveur
| Variable | Valeur |
|----------|--------|
| `HOST` | `0.0.0.0` |
| `PORT` | `3080` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `DOMAIN_CLIENT` | `https://VOTRE_URL.up.railway.app` |
| `DOMAIN_SERVER` | `https://VOTRE_URL.up.railway.app` |

#### Base de données (auto-câblé par Railway)
| Variable | Valeur |
|----------|--------|
| `MONGO_URI` | `mongodb://mongo:27017/LibreChat` |

#### Sécurité — générer avec `node -e "require('crypto').randomBytes(32).toString('hex')"`
| Variable | Format |
|----------|--------|
| `JWT_SECRET` | 64 chars hex |
| `JWT_REFRESH_SECRET` | 64 chars hex |
| `CREDS_KEY` | 64 chars hex |
| `CREDS_IV` | 32 chars hex |
| `MEILI_MASTER_KEY` | 64 chars hex |

#### Meilisearch (auto-câblé par Railway)
| Variable | Valeur |
|----------|--------|
| `MEILI_HOST` | `http://meilisearch:7700` |
| `MEILI_NO_ANALYTICS` | `true` |
| `SEARCH` | `true` |

#### Authentification
| Variable | Valeur |
|----------|--------|
| `ALLOW_EMAIL_LOGIN` | `true` |
| `ALLOW_REGISTRATION` | `true` |
| `ALLOW_UNVERIFIED_EMAIL_LOGIN` | `true` |

#### Clés API IA (les utilisateurs fournissent les leurs via l'interface)
| Variable | Valeur |
|----------|--------|
| `OPENAI_API_KEY` | `user_provided` |
| `ANTHROPIC_API_KEY` | `user_provided` |
| `GOOGLE_KEY` | `user_provided` |

---

## Notes importantes

- **`HOST=0.0.0.0`** est critique : sans ça, Railway ne peut pas router le trafic vers le conteneur
- **`TRUST_PROXY=1`** est requis car Railway utilise un reverse proxy
- **`DOMAIN_CLIENT` et `DOMAIN_SERVER`** doivent être mis à jour après le premier déploiement avec l'URL Railway réelle
- Les variables `JWT_SECRET`, `CREDS_KEY`, `CREDS_IV` ne doivent **jamais** être changées après le premier lancement (les sessions et données chiffrées deviendraient invalides)

---

## Fichiers modifiés dans ce fork

| Fichier | Description |
|---------|-------------|
| `railway.toml` | Configuration de build/deploy Railway (Dockerfile, healthcheck) |
| `RAILWAY_SETUP.md` | Ce fichier — documentation de déploiement |

**Aucun fichier applicatif LibreChat n'a été modifié.**
