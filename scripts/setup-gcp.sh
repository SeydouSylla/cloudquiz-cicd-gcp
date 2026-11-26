#!/usr/bin/env bash
# Mise en place de l'infrastructure GCP de CloudQuiz (étudiant 2).
#
# Utilisation, dans Cloud Shell :
#   bash scripts/setup-gcp.sh <ID_DU_PROJET> A    # bloc A : API, registre, comptes de service, service Cloud Run
#   bash scripts/setup-gcp.sh <ID_DU_PROJET> B    # bloc B : Cloud SQL PostgreSQL et secret database-url
#
# Le projet doit déjà exister et être relié au compte de facturation des crédits.
# Aucun mot de passe n'est écrit dans ce fichier : il est généré au moment de l'exécution.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Utilisation : bash scripts/setup-gcp.sh <ID_DU_PROJET> <A|B>"
  exit 1
fi
PROJECT_ID="$1"
BLOC="$2"
if [ "$BLOC" != "A" ] && [ "$BLOC" != "B" ]; then
  echo "Bloc inconnu : $BLOC (A ou B)"
  exit 1
fi

REGION="europe-west1"
REPO="cloudquiz"
SERVICE="cloudquiz"
SQL_INSTANCE="cloudquiz-db"
DB_NAME="cloudquiz"
DB_USER="cloudquiz_app"
SECRET="database-url"
DEPLOYER="cloudbuild-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
RUNNER="cloudquiz-run@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID"

# Ajoute un rôle à un compte de service sur le projet (sans erreur si déjà présent)
add_role() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$1" --role="$2" --condition=None --quiet > /dev/null
  echo "  rôle $2 -> $1"
}

bloc_a() {
  echo "== A1. Activation des API"
  gcloud services enable \
    run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
    sqladmin.googleapis.com secretmanager.googleapis.com iam.googleapis.com

  echo "== A2. Dépôt Docker Artifact Registry"
  if gcloud artifacts repositories describe "$REPO" --location="$REGION" > /dev/null 2>&1; then
    echo "  le dépôt $REPO existe déjà"
  else
    gcloud artifacts repositories create "$REPO" --repository-format=docker \
      --location="$REGION" --description="Images Docker de CloudQuiz"
  fi
  # Règle de nettoyage : garder les 10 images les plus récentes, supprimer les autres après 7 jours
  gcloud artifacts repositories set-cleanup-policies "$REPO" --location="$REGION" \
    --policy="$(dirname "$0")/cleanup-policy.json" --no-dry-run

  echo "== A3. Comptes de service"
  for SA in cloudbuild-deployer cloudquiz-run; do
    if gcloud iam service-accounts describe "${SA}@${PROJECT_ID}.iam.gserviceaccount.com" > /dev/null 2>&1; then
      echo "  le compte $SA existe déjà"
    else
      gcloud iam service-accounts create "$SA" --display-name="$SA"
    fi
  done

  echo "== A4. Rôles (principe du moindre privilège)"
  # Le pipeline : déployer sur Cloud Run, agir en tant que cloudquiz-run, publier les images, écrire les logs
  for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/logging.logWriter; do
    add_role "$DEPLOYER" "$ROLE"
  done
  # L'application : se connecter à Cloud SQL et lire le secret de connexion, rien d'autre
  for ROLE in roles/cloudsql.client roles/secretmanager.secretAccessor; do
    add_role "$RUNNER" "$ROLE"
  done

  echo "== A5. Premier déploiement Cloud Run (image de test de Google)"
  gcloud run deploy "$SERVICE" --image=us-docker.pkg.dev/cloudrun/container/hello \
    --region="$REGION" --service-account="$RUNNER" \
    --allow-unauthenticated --min-instances=0 --max-instances=2 --quiet

  echo
  echo "URL du service : $(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
  echo "Bloc A terminé."
}

bloc_b() {
  echo "== B1. Instance Cloud SQL PostgreSQL 16 (5 à 10 minutes)"
  if gcloud sql instances describe "$SQL_INSTANCE" > /dev/null 2>&1; then
    echo "  l'instance $SQL_INSTANCE existe déjà"
  else
    gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 \
      --edition=enterprise --tier=db-f1-micro --region="$REGION" \
      --availability-type=zonal --storage-size=10GB
  fi

  echo "== B2. Base de données"
  if gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" > /dev/null 2>&1; then
    echo "  la base $DB_NAME existe déjà"
  else
    gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
  fi

  echo "== B3. Utilisateur et secret database-url"
  if gcloud secrets describe "$SECRET" > /dev/null 2>&1; then
    echo "  le secret $SECRET existe déjà : rien n'est modifié"
    echo "  (pour changer le mot de passe, supprime d'abord le secret et l'utilisateur)"
  else
    # Mot de passe aléatoire en hexadécimal : pas de caractère spécial qui casserait l'URL
    DB_PASS="$(openssl rand -hex 24)"
    if gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
      gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS"
    else
      gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS"
    fi
    CONN="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
    printf 'postgres://%s:%s@/%s?host=/cloudsql/%s' "$DB_USER" "$DB_PASS" "$DB_NAME" "$CONN" \
      | gcloud secrets create "$SECRET" --replication-policy=automatic --data-file=-
    unset DB_PASS
  fi

  echo
  echo "Nom de connexion : $(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
  echo "Bloc B terminé."
}

if [ "$BLOC" = "A" ]; then
  bloc_a
else
  bloc_b
fi
