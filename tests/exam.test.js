// Tests du mode examen (version 2.0.0).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('../src/db/memory-repo');

const examScore = { pseudo: 'alice_92', topic: 'all', mode: 'examen', score: 7, total: 10, durationSec: 180 };

test('GET /api/topics contient les 5 thèmes de la version 2.0.0', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const res = await request(app).get('/api/topics');
  assert.deepEqual(res.body.map((t) => t.id), ['docker', 'kvm', 'kubernetes', 'kickstart', 'gcp']);
});

test('GET /api/exam renvoie 10 questions différentes, sans les réponses, et la durée', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const res = await request(app).get('/api/exam');
  assert.equal(res.status, 200);
  assert.equal(res.body.durationSec, 300);
  assert.equal(res.body.questions.length, 10);
  assert.equal(new Set(res.body.questions.map((q) => q.id)).size, 10);
  for (const q of res.body.questions) {
    assert.equal(q.answer, undefined);
    assert.equal(q.explanation, undefined);
    assert.ok(q.topic);
  }
});

test('un score d\'examen est enregistré dans le classement des examens uniquement', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const saved = await request(app).post('/api/scores').send(examScore);
  assert.equal(saved.status, 201);

  const exams = await request(app).get('/api/leaderboard?mode=examen');
  assert.equal(exams.body.length, 1);
  assert.equal(exams.body[0].topic, 'all');

  const libre = await request(app).get('/api/leaderboard?mode=libre');
  assert.equal(libre.body.length, 0);
});

test('un examen doit utiliser le thème "all" et compter 10 questions', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const r1 = await request(app).post('/api/scores').send({ ...examScore, topic: 'docker' });
  const r2 = await request(app).post('/api/scores').send({ ...examScore, total: 8, score: 5 });
  assert.equal(r1.status, 400);
  assert.equal(r2.status, 400);
});

test('le thème "all" est refusé en mode libre', async () => {
  const app = createApp({ repo: createMemoryRepo() });
  const res = await request(app).post('/api/scores').send({ ...examScore, mode: 'libre', total: 8, score: 5 });
  assert.equal(res.status, 400);
});
