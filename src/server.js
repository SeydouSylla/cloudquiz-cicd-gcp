// Point d'entrée : crée l'application et démarre le serveur HTTP.

const { createApp } = require('./app');
const { getVersionInfo } = require('./version');

// Cloud Run fournit le port dans la variable PORT (8080 par défaut)
const PORT = process.env.PORT || 8080;

const app = createApp();
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
  server.close(() => process.exit(0));
  server.closeIdleConnections(); // ferme les connexions inactives gardées par les navigateurs
  setTimeout(() => process.exit(0), 5000).unref(); // sécurité : on n'attend jamais plus de 5 s
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
