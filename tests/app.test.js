// Tests des routes de supervision (/health, /version) et de la page d'accueil.
// On utilise le module de test intégré à Node (node:test) et supertest,
// qui envoie des requêtes à l'application sans ouvrir de port réseau.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

test('GET /health répond 200 avec status ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('GET /version renvoie le nom, la version, le commit et la révision', async () => {
  const res = await request(app).get('/version');
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'cloudquiz');
  assert.match(res.body.version, /^\d+\.\d+\.\d+$/);
  assert.ok(res.body.commit);
  assert.ok(res.body.revision);
  assert.ok(res.body.buildTime);
});

test('la page d\'accueil est servie', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.text, /CloudQuiz/);
});

test('une route /api inconnue renvoie 404 en JSON', async () => {
  const res = await request(app).get('/api/nexiste-pas');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'Route inconnue');
});
