#!/usr/bin/env bash
# Suppression des ressources GCP de CloudQuiz, À LANCER UNIQUEMENT APRÈS L'INSPECTION DU PROFESSEUR.
#
# Utilisation, dans Cloud Shell :
#   bash scripts/cleanup-gcp.sh <ID_DU_PROJET>

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Utilisation : bash scripts/cleanup-gcp.sh <ID_DU_PROJET>"
  exit 1
fi
PROJECT_ID="$1"
REGION="europe-west1"

read -r -p "Supprimer TOUTES les ressources CloudQuiz du projet $PROJECT_ID ? Tape OUI pour confirmer : " ANSWER
[ "$ANSWER" = "OUI" ] || { echo "Annulé."; exit 0; }

gcloud config set project "$PROJECT_ID"

echo "== Déclencheurs Cloud Build"
for T in $(gcloud builds triggers list --region="$REGION" --format='value(name)' 2>/dev/null); do
  gcloud builds triggers delete "$T" --region="$REGION" --quiet || true
done

echo "== Service Cloud Run"
gcloud run services delete cloudquiz --region="$REGION" --quiet || true

echo "== Instance Cloud SQL (la protection contre la suppression est d'abord retirée)"
gcloud sql instances patch cloudquiz-db --no-deletion-protection --quiet || true
gcloud sql instances delete cloudquiz-db --quiet || true

echo "== Secret"
gcloud secrets delete database-url --quiet || true

echo "== Dépôt d'images"
gcloud artifacts repositories delete cloudquiz --location="$REGION" --quiet || true

echo
echo "Ressources supprimées. Pour arrêter complètement la facturation du projet :"
echo "  gcloud projects delete $PROJECT_ID"
