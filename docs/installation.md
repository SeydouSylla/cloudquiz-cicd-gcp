# Installation et lancement en local

## Prérequis

- Node.js 22 (`node -v`)
- Docker Desktop (pour l'image et Docker Compose)
- Git

## 1. Lancer l'application sans base de données

Sans la variable `DATABASE_URL`, les scores sont gardés en mémoire (ils disparaissent au redémarrage).

```bash
npm install
npm test          # tous les tests doivent passer
npm start         # puis ouvrir http://localhost:8080
```

`npm run dev` relance le serveur automatiquement à chaque modification du code.

## 2. Construire et lancer l'image Docker

```bash
docker build --build-arg COMMIT_SHA=local -t cloudquiz:local .
docker run --rm -p 8080:8080 cloudquiz:local
curl http://localhost:8080/health      # {"status":"ok","db":"memory"}
curl http://localhost:8080/version     # nom, version, commit, révision
```

## 3. Lancer l'application avec PostgreSQL (Docker Compose)

```bash
docker compose up --build
```

- L'application est sur http://localhost:8080, la base PostgreSQL tourne dans le conteneur `db`.
- Le bandeau en bas de page doit afficher « base connectée ».
- Les scores sont conservés dans le volume `db-data`, même après `docker compose down`.
- Pour tout effacer, base comprise : `docker compose down -v`.
- Pour regarder la table : `docker compose exec db psql -U cloudquiz -c "SELECT * FROM scores;"`

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port d'écoute (fourni par Cloud Run) | `8080` |
| `DATABASE_URL` | Connexion PostgreSQL ; absente = scores en mémoire | — |
| `COMMIT_SHA` | Commit affiché dans le bandeau (fourni par Cloud Build) | `local` |
| `BUILD_TIME` | Date du build affichée dans le bandeau | heure de démarrage |
| `K_REVISION` | Révision Cloud Run (fournie automatiquement par Cloud Run) | `local` |

## Routes de l'API

| Route | Rôle |
|---|---|
| `GET /health` | État du serveur et de la base (`up`, `down` ou `memory`) |
| `GET /version` | Version, commit, révision, date du build |
| `GET /api/topics` | Liste des thèmes |
| `GET /api/questions?topic=docker` | Questions d'un thème, sans les réponses |
| `POST /api/answers` | Corrige une réponse : `{ "id": "docker-1", "choice": 0 }` |
| `POST /api/scores` | Enregistre un score : `{ "pseudo", "topic", "mode", "score", "total", "durationSec" }` |
| `GET /api/leaderboard` | Les 10 meilleurs scores |

## Choix techniques

- **Pas de framework front-end** : HTML, CSS, JavaScript et Bootstrap chargé depuis un CDN, donc aucune étape de compilation qui pourrait casser le pipeline.
- **Dépôt de scores injecté** dans l'application (`createApp({ repo })`) : PostgreSQL en production, mémoire dans les tests. Les tests ne touchent jamais la vraie base.
- **L'application démarre même si la base est injoignable** : le quiz fonctionne, seule la sauvegarde des scores renvoie une erreur 503. Le test de fumée du pipeline (`/health`) reste vert.
