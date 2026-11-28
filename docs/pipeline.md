# Pipeline CI/CD (Cloud Build)

À chaque push sur la branche `main` (c'est-à-dire à chaque fusion d'une pull request), Cloud Build teste, construit, publie et déploie CloudQuiz **sans aucune commande manuelle**.

```
Fusion d'une PR dans main
        │
        ▼
Déclencheur Cloud Build « deploy-main »
        │
        ▼
install ─► test ─► build ─► push ─► deploy ─► smoke-test
                    │        │        │
                    │        ▼        ▼
                    │  Artifact     Cloud Run
                    │  Registry     (nouvelle révision, 100 % du trafic)
                    ▼
              image étiquetée par le commit (:SHORT_SHA)
```

Le fichier qui décrit le pipeline est [`cloudbuild.yaml`](../cloudbuild.yaml), à la racine du dépôt.

## 1. Les étapes

| Étape | Image utilisée | Ce qu'elle fait | Si elle échoue |
|---|---|---|---|
| `install` | `node:22-alpine` | `npm ci` : installe exactement les versions de `package-lock.json` | Le pipeline s'arrête |
| `test` | `node:22-alpine` | `npm test` : 22 tests automatisés (routes, quiz, scores, base en panne) | **Rien n'est déployé** : la version en ligne ne change pas |
| `build` | `gcr.io/cloud-builders/docker` | Construit l'image à partir du `Dockerfile`, avec le commit et la date du build | Le pipeline s'arrête |
| `push` | `gcr.io/cloud-builders/docker` | Publie l'image dans Artifact Registry | Le pipeline s'arrête |
| `deploy` | `cloud-sdk:slim` | `gcloud run deploy` : crée une nouvelle **révision** Cloud Run qui reçoit 100 % du trafic | L'ancienne révision continue de servir |
| `smoke-test` | `cloud-sdk:slim` | Appelle `/health` et vérifie que `/version` renvoie **le commit qui vient d'être déployé** (5 essais) | Le build est marqué en échec : l'équipe est prévenue |

Chaque étape tourne dans son propre conteneur. Elles partagent le dossier `/workspace` (le code cloné depuis GitHub) : le `node_modules` créé par `install` sert à `test`.

## 2. Une image par commit

L'image est étiquetée avec le commit court (`$SHORT_SHA`, par exemple `e0956f7`) :

```
europe-west1-docker.pkg.dev/cloudquiz-cicd-2617/cloudquiz/cloudquiz:e0956f7
```

- Chaque version déployée est **traçable** jusqu'à son commit GitHub.
- Pas d'étiquette `latest` ambiguë.
- Le même commit apparaît partout : GitHub, historique Cloud Build, Artifact Registry, révision Cloud Run et **bandeau de l'application** (le commit est passé à l'image par `--build-arg COMMIT_SHA`).
- La règle de nettoyage d'Artifact Registry (voir [gcp-setup.md](gcp-setup.md)) ne garde que les 10 images les plus récentes.

## 3. Le déploiement

| Option de `gcloud run deploy` | Rôle |
|---|---|
| `--service-account=cloudquiz-run@…` | L'application tourne avec un compte qui n'a que 2 rôles (moindre privilège) |
| `--add-cloudsql-instances=…:cloudquiz-db` | Relie le service à l'instance Cloud SQL par le connecteur intégré (socket `/cloudsql/…`) |
| `--set-secrets=DATABASE_URL=database-url:latest` | Donne l'URL de la base à l'application, lue dans Secret Manager : **aucun mot de passe dans le code ni dans le pipeline** |
| `--allow-unauthenticated` | Application publique, accessible en HTTPS |
| `--min-instances=0` | Aucune instance (donc aucun coût) quand personne n'utilise l'application |
| `--max-instances=2` | Coût plafonné en cas de pic de trafic |

L'application démarre même si la base est injoignable (par exemple instance Cloud SQL arrêtée hors travail) : le quiz fonctionne, seule la sauvegarde des scores est indisponible. Le déploiement et le test de fumée ne dépendent donc jamais de la base.

## 4. Le déclencheur

| Paramètre | Valeur |
|---|---|
| Nom | `deploy-main` |
| Région | `europe-west1` |
| Dépôt | `SeydouSylla/cloudquiz-cicd-gcp` (connexion GitHub de 2ᵉ génération) |
| Événement | Push sur une branche, motif `^main$` |
| Configuration | `cloudbuild.yaml` |
| Compte de service | `cloudbuild-deployer` (4 rôles : Cloud Run Admin, Service Account User, Artifact Registry Writer, Logs Writer) |

Le travail se fait sur des branches et passe par des pull requests relues : `main` ne reçoit que du code relu, donc chaque déploiement correspond à une fusion validée.

## 5. Variables (substitutions)

| Variable | Fournie par | Valeur |
|---|---|---|
| `$PROJECT_ID` | Cloud Build | `cloudquiz-cicd-2617` |
| `$SHORT_SHA` | Cloud Build (déclencheur) | 7 premiers caractères du commit |
| `_REGION` | `cloudbuild.yaml` | `europe-west1` |
| `_REPO`, `_SERVICE` | `cloudbuild.yaml` | `cloudquiz` |
| `_RUN_SA` | `cloudbuild.yaml` | `cloudquiz-run` |
| `_SQL_INSTANCE`, `_DB_SECRET` | `cloudbuild.yaml` | `cloudquiz-db`, `database-url` |

Dans les scripts `bash` du fichier, une variable du shell s'écrit `$$URL` : le double `$` empêche Cloud Build de la remplacer avant l'exécution.

Options : `logging: CLOUD_LOGGING_ONLY` (obligatoire avec un compte de service choisi), `timeout: 900s` (un build bloqué est arrêté au bout de 15 minutes).

## 6. Lire les logs d'un build

- Console → **Cloud Build → Historique** (région `europe-west1`) : un build par fusion, vert ou rouge, avec le commit déclencheur.
- Cliquer sur un build affiche chaque étape et ses logs. Un build rouge indique l'étape qui a échoué.
- Sur GitHub, chaque commit de `main` porte une coche verte ou une croix rouge selon le résultat du build.
- En ligne de commande :

```bash
gcloud builds list --region=europe-west1 --limit=5
gcloud builds log <ID_DU_BUILD> --region=europe-west1
```

## 7. Vérifier un déploiement

```bash
curl https://cloudquiz-484900293891.europe-west1.run.app/version
gcloud run revisions list --service=cloudquiz --region=europe-west1
```

Le commit renvoyé par `/version` et affiché dans le bandeau de l'application doit être celui du dernier build vert.
