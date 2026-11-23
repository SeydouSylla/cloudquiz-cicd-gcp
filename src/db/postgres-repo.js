// Dépôt des scores dans PostgreSQL (Cloud SQL en production, Docker Compose en local).
// On utilise directement le pilote « pg » avec des requêtes SQL paramétrées ($1, $2...) :
// les valeurs ne sont jamais concaténées dans la requête, ce qui empêche les injections SQL.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

function createPostgresRepo(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 5, // Cloud Run lance au plus 2 instances : 5 connexions chacune suffisent largement
    connectionTimeoutMillis: 3000, // on n'attend pas indéfiniment une base injoignable
  });

  // Sans ce gestionnaire, une connexion coupée par la base ferait planter tout le serveur
  pool.on('error', (err) => {
    console.error('Connexion PostgreSQL perdue :', err.message);
  });

  let ready = false;

  // Crée la table si besoin. Appelée au démarrage, puis de nouveau si la base
  // n'était pas joignable au démarrage (par exemple instance Cloud SQL arrêtée).
  async function ensureReady() {
    if (!ready) {
      await pool.query(SCHEMA);
      ready = true;
    }
  }

  return {
    init: ensureReady,

    async status() {
      try {
        await pool.query('SELECT 1');
        return 'up';
      } catch (err) {
        return 'down';
      }
    },

    async addScore({ pseudo, topic, mode, score, total, durationSec, appVersion }) {
      await ensureReady();
      const result = await pool.query(
        `INSERT INTO scores (pseudo, topic, mode, score, total, duration_sec, app_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [pseudo, topic, mode, score, total, durationSec, appVersion],
      );
      return { id: result.rows[0].id };
    },

    async topScores(mode, limit) {
      await ensureReady();
      // Classement : meilleur pourcentage de bonnes réponses, puis le plus rapide
      const result = await pool.query(
        `SELECT pseudo, topic, score, total,
                duration_sec AS "durationSec", created_at AS "createdAt"
           FROM scores
          WHERE mode = $1
          ORDER BY score::float / total DESC, duration_sec ASC NULLS LAST, id ASC
          LIMIT $2`,
        [mode, limit],
      );
      return result.rows;
    },

    async close() {
      await pool.end();
    },
  };
}

module.exports = { createPostgresRepo };
