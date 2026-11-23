// Définition de l'application Express (routes de l'API + pages web).
// On ne démarre PAS le serveur ici : server.js s'en charge.
// Comme ça, les tests peuvent créer l'application avec un faux dépôt de scores,
// sans ouvrir de port et sans base de données.

const path = require('path');
const express = require('express');
const { topics, questions, countByTopic } = require('./questions');
const { getVersionInfo } = require('./version');

/**
 * Crée l'application.
 * @param {object} options
 * @param {object} options.repo  dépôt des scores (PostgreSQL en production, mémoire en test)
 */
function createApp({ repo }) {
  const app = express();

  app.disable('x-powered-by'); // inutile d'annoncer qu'on utilise Express
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ---------- Supervision ----------

  // Utilisé par le test de fumée du pipeline : doit répondre 200 dès que le serveur tourne,
  // même si la base de données est indisponible (on indique juste son état).
  app.get('/health', async (req, res) => {
    let db;
    try {
      db = await repo.status();
    } catch (err) {
      db = 'down';
    }
    res.json({ status: 'ok', db });
  });

  // Version, commit et révision : affichés dans le bandeau de déploiement
  app.get('/version', (req, res) => {
    res.json(getVersionInfo());
  });

  // ---------- Quiz ----------

  app.get('/api/topics', (req, res) => {
    const list = topics.map((t) => ({ ...t, count: countByTopic(t.id) }));
    res.json(list);
  });

  app.get('/api/questions', (req, res) => {
    const { topic } = req.query;
    if (!topic) {
      return res.status(400).json({ error: 'Le paramètre topic est obligatoire' });
    }
    if (!topics.some((t) => t.id === topic)) {
      return res.status(404).json({ error: `Thème inconnu : ${topic}` });
    }
    // On renvoie les questions SANS la bonne réponse ni l'explication
    const list = questions
      .filter((q) => q.topic === topic)
      .map(({ id, question, options }) => ({ id, question, options }));
    res.json(list);
  });

  app.post('/api/answers', (req, res) => {
    const { id, choice } = req.body || {};
    if (typeof id !== 'string' || !Number.isInteger(choice)) {
      return res.status(400).json({ error: 'Il faut envoyer { id: string, choice: entier }' });
    }
    const q = questions.find((item) => item.id === id);
    if (!q) {
      return res.status(404).json({ error: `Question inconnue : ${id}` });
    }
    if (choice < 0 || choice >= q.options.length) {
      return res.status(400).json({ error: 'Choix hors des propositions' });
    }
    res.json({
      correct: choice === q.answer,
      answer: q.answer,
      explanation: q.explanation,
    });
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
