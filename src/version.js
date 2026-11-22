// Informations sur la version déployée.
// Elles sont affichées dans le bandeau de l'application et renvoyées par GET /version :
// c'est ce qui nous permet de VOIR qu'un push a bien été déployé par le pipeline.

const pkg = require('../package.json');

// Si BUILD_TIME n'est pas fourni (en local), on prend l'heure de démarrage du serveur
const startedAt = new Date().toISOString();

function getVersionInfo() {
  return {
    name: pkg.name,
    version: pkg.version,
    // COMMIT_SHA est passé par Cloud Build au moment du build de l'image
    commit: process.env.COMMIT_SHA || 'local',
    // K_REVISION est une variable fournie automatiquement par Cloud Run
    revision: process.env.K_REVISION || 'local',
    buildTime: process.env.BUILD_TIME || startedAt,
  };
}

module.exports = { getVersionInfo };
