// Définition de l'application Express (routes de l'API + pages web).
// On ne démarre PAS le serveur ici : server.js s'en charge.
// Comme ça, les tests peuvent créer l'application sans ouvrir de port réseau.
const path = require('path');
const express = require('express');
const { getVersionInfo } = require('./version');

/**
 * Crée l'application.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by'); // inutile d'annoncer qu'on utilise Express
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ---------- Supervision ----------

  // Utilisé par le test de fumée du pipeline : doit répondre 200 dès que le serveur tourne
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Version, commit et révision : affichés dans le bandeau de déploiement
  app.get('/version', (req, res) => {
    res.json(getVersionInfo());
  });

  // ---------- Erreurs ----------

  // Toute autre route /api inconnue renvoie du JSON plutôt qu'une page HTML
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  // Gestionnaire d'erreurs générique (par exemple JSON mal formé dans la requête)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  });

  return app;
}

module.exports = { createApp };
