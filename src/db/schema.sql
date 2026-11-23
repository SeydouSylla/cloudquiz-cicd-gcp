-- Schéma de la base CloudQuiz.
-- Exécuté au démarrage de l'application : IF NOT EXISTS évite toute erreur
-- si la table existe déjà (redémarrage, nouvelle révision Cloud Run...).

CREATE TABLE IF NOT EXISTS scores (
  id           SERIAL PRIMARY KEY,
  pseudo       VARCHAR(20)  NOT NULL,
  topic        VARCHAR(30)  NOT NULL,
  mode         VARCHAR(10)  NOT NULL DEFAULT 'libre',
  score        INTEGER      NOT NULL CHECK (score >= 0),
  total        INTEGER      NOT NULL CHECK (total > 0 AND score <= total),
  duration_sec INTEGER,
  app_version  VARCHAR(20)  NOT NULL,        -- version de l'application qui a enregistré le score
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Accélère la lecture du classement par mode
CREATE INDEX IF NOT EXISTS scores_mode_idx ON scores (mode, created_at);
