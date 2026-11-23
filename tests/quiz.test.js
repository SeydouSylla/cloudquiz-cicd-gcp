// Tests de l'API du quiz : thèmes, questions et correction des réponses.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('../src/db/memory-repo');
const { questions } = require('../src/questions');

const app = createApp({ repo: createMemoryRepo() });

test('GET /api/topics liste les thèmes avec leur nombre de questions', async () => {
  const res = await request(app).get('/api/topics');
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 3);
  for (const topic of res.body) {
    assert.ok(topic.id && topic.name);
    assert.ok(topic.count > 0);
  }
});

test('GET /api/questions ne révèle jamais la bonne réponse', async () => {
  const res = await request(app).get('/api/questions?topic=docker');
  assert.equal(res.status, 200);
  assert.ok(res.body.length > 0);
  for (const q of res.body) {
    assert.equal(q.answer, undefined);
    assert.equal(q.explanation, undefined);
    assert.equal(q.options.length, 4);
  }
});

test('GET /api/questions sans thème renvoie 400', async () => {
  const res = await request(app).get('/api/questions');
  assert.equal(res.status, 400);
});

test('GET /api/questions avec un thème inconnu renvoie 404', async () => {
  const res = await request(app).get('/api/questions?topic=cobol');
  assert.equal(res.status, 404);
});

test('POST /api/answers reconnaît une bonne réponse', async () => {
  const q = questions[0];
  const res = await request(app).post('/api/answers').send({ id: q.id, choice: q.answer });
  assert.equal(res.status, 200);
  assert.equal(res.body.correct, true);
  assert.ok(res.body.explanation);
});

test('POST /api/answers reconnaît une mauvaise réponse et donne la bonne', async () => {
  const q = questions[0];
  const wrong = (q.answer + 1) % q.options.length;
  const res = await request(app).post('/api/answers').send({ id: q.id, choice: wrong });
  assert.equal(res.status, 200);
  assert.equal(res.body.correct, false);
  assert.equal(res.body.answer, q.answer);
});

test('POST /api/answers refuse une requête invalide (400)', async () => {
  const res = await request(app).post('/api/answers').send({ id: 'docker-1', choice: 'A' });
  assert.equal(res.status, 400);
});

test('POST /api/answers refuse un choix hors des propositions (400)', async () => {
  const res = await request(app).post('/api/answers').send({ id: 'docker-1', choice: 9 });
  assert.equal(res.status, 400);
});

test('POST /api/answers avec une question inconnue renvoie 404', async () => {
  const res = await request(app).post('/api/answers').send({ id: 'inconnue-1', choice: 0 });
  assert.equal(res.status, 404);
});

test('chaque question de la banque est bien formée', () => {
  const ids = new Set();
  for (const q of questions) {
    assert.ok(!ids.has(q.id), `identifiant en double : ${q.id}`);
    ids.add(q.id);
    assert.equal(q.options.length, 4, `${q.id} doit avoir 4 propositions`);
    assert.ok(q.answer >= 0 && q.answer < 4, `${q.id} : index de réponse invalide`);
    assert.ok(q.explanation, `${q.id} : explication manquante`);
  }
});
