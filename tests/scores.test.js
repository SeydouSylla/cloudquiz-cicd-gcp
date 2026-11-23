// Tests des scores et du classement.
// On utilise le dépôt en mémoire : les tests ne touchent jamais la vraie base,
// donc le pipeline ne peut pas échouer à cause de Cloud SQL.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('../src/db/memory-repo');

const validScore = { pseudo: 'alice_92', topic: 'docker', mode: 'libre', score: 6, total: 8, durationSec: 95 };

test('un score valide est enregistré puis apparaît dans le classement', async () => {
  const app = createApp({ repo: createMemoryRepo() });

  const saved = await request(app).post('/api/scores').send(validScore);
  assert.equal(saved.status, 201);
  assert.equal(saved.body.saved, true);

  const board = await request(app).get('/api/leaderboard');
  assert.equal(board.status, 200);
  assert.equal(board.body.length, 1);
  assert.equal(board.body[0].pseudo, 'alice_92');
  assert.equal(board.body[0].score, 6);
});

test('le classement est trié du meilleur au moins bon score', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  await request(app).post('/api/scores').send({ ...validScore, pseudo: 'bob', score: 4 });
  await request(app).post('/api/scores').send({ ...validScore, pseudo: 'chloe', score: 8 });
  await request(app).post('/api/scores').send({ ...validScore, pseudo: 'david', score: 6 });

  const board = await request(app).get('/api/leaderboard');
  assert.deepEqual(board.body.map((r) => r.pseudo), ['chloe', 'david', 'bob']);
});

test('un pseudo invalide est refusé (400)', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  for (const pseudo of ['a', '<script>', 'nom avec espaces', 'x'.repeat(21)]) {
    const res = await request(app).post('/api/scores').send({ ...validScore, pseudo });
    assert.equal(res.status, 400, `le pseudo "${pseudo}" aurait dû être refusé`);
  }
});

test('un score supérieur au total est refusé (400)', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const res = await request(app).post('/api/scores').send({ ...validScore, score: 9, total: 8 });
  assert.equal(res.status, 400);
});

test('un thème ou un mode inconnu est refusé (400)', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const r1 = await request(app).post('/api/scores').send({ ...validScore, topic: 'cobol' });
  const r2 = await request(app).post('/api/scores').send({ ...validScore, mode: 'triche' });
  assert.equal(r1.status, 400);
  assert.equal(r2.status, 400);
});

test('si la base est en panne, l\'API répond 503 sans planter', async () => {
  const brokenRepo = {
    status: async () => 'down',
    addScore: async () => { throw new Error('connexion refusée'); },
    topScores: async () => { throw new Error('connexion refusée'); },
  };
  const app = createApp({ repo: brokenRepo });

  const saved = await request(app).post('/api/scores').send(validScore);
  assert.equal(saved.status, 503);

  const board = await request(app).get('/api/leaderboard');
  assert.equal(board.status, 503);
});

test('un JSON mal formé renvoie 400', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const res = await request(app)
    .post('/api/scores')
    .set('Content-Type', 'application/json')
    .send('{pas du json');
  assert.equal(res.status, 400);
});
