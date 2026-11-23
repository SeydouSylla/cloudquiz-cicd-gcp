// Dépôt des scores EN MÉMOIRE.
// Utilisé quand il n'y a pas de base de données (DATABASE_URL absente) et dans les tests.
// Attention : les scores sont perdus à chaque redémarrage du serveur.

function createMemoryRepo() {
  const scores = [];
  let nextId = 1;

  return {
    async init() {
      // Rien à préparer en mémoire
    },

    async status() {
      return 'memory';
    },

    async addScore(score) {
      const row = { id: nextId++, ...score, createdAt: new Date().toISOString() };
      scores.push(row);
      return { id: row.id };
    },

    async topScores(mode, limit) {
      return scores
        .filter((s) => s.mode === mode)
        // Même ordre qu'en SQL : meilleur pourcentage, puis le plus rapide, puis le plus ancien
        .sort((a, b) =>
          b.score / b.total - a.score / a.total
          || (a.durationSec ?? Infinity) - (b.durationSec ?? Infinity)
          || a.id - b.id)
        .slice(0, limit)
        .map(({ pseudo, topic, score, total, durationSec, createdAt }) => (
          { pseudo, topic, score, total, durationSec, createdAt }
        ));
    },

    async close() {},
  };
}

module.exports = { createMemoryRepo };
