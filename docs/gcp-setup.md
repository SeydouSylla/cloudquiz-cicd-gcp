# Infrastructure GCP de CloudQuiz

Documentation de la partie infrastructure. Aucun secret n'est écrit dans ce document ni dans le dépôt : ni mot de passe, ni valeur du secret `database-url`, ni clé JSON.

## 1. Paramètres du projet

| Ressource | Valeur |
|---|---|
| Projet GCP (nom) | `cloudquiz-cicd` |
| Projet GCP (ID) | `cloudquiz-cicd-2617` |
| Numéro du projet | `484900293891` |
| Ressource parente | Aucune organisation |
| Région (partout) | `europe-west1` |
| Facturation | Compte de facturation des établissements d'enseignement (crédits Google Cloud) |
| Dépôt Artifact Registry | `cloudquiz` (format Docker) |
| Service Cloud Run | `cloudquiz` |
| Compte de service du pipeline | `cloudbuild-deployer` |
| Compte de service de l'application | `cloudquiz-run` |
| Instance Cloud SQL | `cloudquiz-db` (PostgreSQL 16, édition Enterprise) |
| Base / utilisateur | `cloudquiz` / `cloudquiz_app` |
| Secret | `database-url` |
| Branche Git | `infra/gcp-setup` |

### Budget et alertes

- Budget : `cloudquiz-budget-5usd`, **5 USD par mois**, limité au projet `cloudquiz-cicd`.
- Choix de l'équipe : 5 USD au lieu des 10 USD prévus, pour être alertés plus tôt et respecter le quota collectif des différents groupes.
- Seuils d'alerte : **50 %, 90 % et 100 %**, déclenchés sur les coûts réels.
- Remises et crédits promotionnels **exclus** du calcul : le budget suit la consommation réelle, même quand elle est couverte par les crédits.
- Type « alertes uniquement » : un budget Google Cloud prévient par e-mail mais **ne bloque pas** les dépenses. Le plafond de dépenses n'a pas été activé, car il mettrait les services en pause pendant une démonstration.
- Vérification : `gcloud billing projects describe cloudquiz-cicd-2617` affiche `billingEnabled: true`.