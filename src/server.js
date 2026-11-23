// Point d'entrée : choisit où stocker les scores, puis démarre le serveur HTTP.

const { createApp } = require('./app');
const { createMemoryRepo } = require('./db/memory-repo');
const { createPostgresRepo } = require('./db/postgres-repo');
const { getVersionInfo } = require('./version');

// Cloud Run fournit le port dans la variable PORT (8080 par défaut)
const PORT = process.env.PORT || 8080;

async function main() {
  let repo;

  if (process.env.DATABASE_URL) {
    repo = createPostgresRepo(process.env.DATABASE_URL);
    try {
      await repo.init();
      console.log('Base PostgreSQL prête');
    } catch (err) {
      // On démarre quand même : le quiz fonctionne sans base,
      // et le pipeline ne doit jamais échouer à cause de la base de données.
      console.error('Base PostgreSQL injoignable au démarrage :', err.message);
    }
  } else {
    repo = createMemoryRepo();
    console.log('Pas de DATABASE_URL : les scores sont gardés en mémoire');
  }

  const app = createApp({ repo });
  const server = app.listen(PORT, () => {
    const { version, commit } = getVersionInfo();
    console.log(`CloudQuiz ${version} (commit ${commit}) démarré sur le port ${PORT}`);
  });

  // Arrêt propre du serveur.
  // - SIGTERM : envoyé par Cloud Run (et docker stop) avant d'arrêter une instance
  // - SIGINT  : envoyé par Ctrl + C
  // Dans un conteneur, Node est le processus n°1 : sans ces gestionnaires,
  // il ignorerait ces signaux et Ctrl + C ne l'arrêterait pas.
  function shutdown(signal) {
    console.log(`${signal} reçu : arrêt du serveur`);
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
    server.closeIdleConnections(); // ferme les connexions inactives gardées par les navigateurs
    setTimeout(() => process.exit(0), 5000).unref(); // sécurité : on n'attend jamais plus de 5 s
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
