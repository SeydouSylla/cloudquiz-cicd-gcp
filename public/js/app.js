// Logique de l'interface CloudQuiz (JavaScript sans framework).
// L'interface parle uniquement à notre API : elle ne connaît jamais les bonnes réponses à l'avance.

const PSEUDO_REGEX = /^[A-Za-z0-9_-]{2,20}$/;
const LETTERS = ['A', 'B', 'C', 'D'];

// État du quiz en cours
const state = {
  topics: [],
  topic: null,
  mode: 'libre',       // 'libre' (un thème) ou 'examen' (version 2.0.0)
  questions: [],
  index: 0,
  score: 0,
  startedAt: 0,
  deadline: 0,         // fin du chrono en mode examen
  timerId: null,
  boardMode: 'libre',  // classement affiché
};

const EXAM_TOPIC = { id: 'all', name: 'Examen (tous thèmes)' };

// Raccourci pour récupérer un élément par son id
const $ = (id) => document.getElementById(id);

// Petit utilitaire pour appeler l'API et récupérer du JSON
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`);
  }
  return data;
}

// Le pseudo est mémorisé dans le navigateur pour ne pas le retaper à chaque fois
function savePseudo(value) {
  try { localStorage.setItem('cloudquiz-pseudo', value); } catch (e) { /* stockage indisponible */ }
}
function loadPseudo() {
  try { return localStorage.getItem('cloudquiz-pseudo') || ''; } catch (e) { return ''; }
}

// ---------- Navigation entre les vues ----------

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('d-none'));
  $(`view-${name}`).classList.remove('d-none');
  document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === name);
  });
  if (name === 'leaderboard') loadLeaderboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-view]');
  if (target) {
    event.preventDefault();
    showView(target.dataset.view);
  }
});

// ---------- Bandeau de déploiement ----------

async function loadDeployInfo() {
  try {
    const info = await api('/version');
    $('navVersion').textContent = `v${info.version}`;
    $('depVersion').textContent = info.version;
    $('depCommit').textContent = info.commit;
    $('depRevision').textContent = info.revision;
    $('depTime').textContent = new Date(info.buildTime).toLocaleString('fr-FR');
  } catch (err) {
    $('depVersion').textContent = 'inconnue';
  }

  try {
    const health = await api('/health');
    const labels = { up: 'connectée', down: 'injoignable', memory: 'en mémoire' };
    $('dbState').textContent = labels[health.db] || health.db;
    $('dbDot').className = `dot ${health.db}`;
  } catch (err) {
    $('dbState').textContent = 'inconnue';
  }
}

// ---------- Accueil : thèmes ----------

async function loadTopics() {
  const container = $('topics');
  try {
    state.topics = await api('/api/topics');
  } catch (err) {
    container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Impossible de charger les thèmes.</div></div>';
    return;
  }

  container.innerHTML = '';
  state.topics.forEach((topic) => {
    const col = document.createElement('div');
    col.className = 'col-md-6';
    col.innerHTML = `
      <button type="button" class="card topic-card shadow-sm h-100 p-0">
        <div class="card-body p-4">
          <div class="d-flex align-items-center gap-3 mb-2">
            <span class="topic-icon"><i class="bi bi-${topic.icon}"></i></span>
            <div>
              <h3 class="h5 fw-semibold mb-0"></h3>
              <span class="small text-muted">${topic.count} questions</span>
            </div>
          </div>
          <p class="text-muted small mb-0"></p>
        </div>
      </button>`;
    // textContent plutôt qu'innerHTML pour les textes : pas d'injection de HTML possible
    col.querySelector('h3').textContent = topic.name;
    col.querySelector('p').textContent = topic.description;
    col.querySelector('button').addEventListener('click', () => startQuiz(topic));
    container.appendChild(col);
  });
}

function checkPseudo() {
  const input = $('pseudo');
  const value = input.value.trim();
  const valid = PSEUDO_REGEX.test(value);
  input.classList.toggle('is-invalid', !valid);
  if (valid) savePseudo(value);
  return valid ? value : null;
}

// ---------- Quiz ----------

async function startQuiz(topic) {
  if (!checkPseudo()) {
    $('pseudo').focus();
    return;
  }
  try {
    state.questions = await api(`/api/questions?topic=${encodeURIComponent(topic.id)}`);
  } catch (err) {
    alert(`Impossible de charger les questions : ${err.message}`);
    return;
  }
  state.mode = 'libre';
  state.topic = topic;
  beginQuiz();
}

// Mode examen : 10 questions de tous les thèmes, avec un chrono
async function startExam() {
  if (!checkPseudo()) {
    $('pseudo').focus();
    return;
  }
  let exam;
  try {
    exam = await api('/api/exam');
  } catch (err) {
    alert(`Impossible de charger l'examen : ${err.message}`);
    return;
  }
  state.questions = exam.questions;
  state.mode = 'examen';
  state.topic = EXAM_TOPIC;
  beginQuiz();
  startTimer(exam.durationSec);
}

function beginQuiz() {
  stopTimer();
  state.index = 0;
  state.score = 0;
  state.startedAt = Date.now();
  $('quizTopic').textContent = state.topic.name;
  $('quizTimer').classList.add('d-none');
  showView('quiz');
  showQuestion();
}

// ---------- Chrono du mode examen ----------

function startTimer(durationSec) {
  state.deadline = Date.now() + durationSec * 1000;
  $('quizTimer').classList.remove('d-none', 'is-urgent');
  updateTimer();
  state.timerId = setInterval(updateTimer, 250);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function updateTimer() {
  const left = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  $('timerValue').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('quizTimer').classList.toggle('is-urgent', left <= 30);
  if (left === 0) {
    finishQuiz(true); // temps écoulé : les questions restantes comptent comme fausses
  }
}

function showQuestion() {
  const q = state.questions[state.index];
  const total = state.questions.length;

  $('quizCounter').textContent = `Question ${state.index + 1} / ${total}`;
  $('quizProgress').style.width = `${(state.index / total) * 100}%`;
  $('questionText').textContent = q.question;
  if (state.mode === 'examen') {
    $('quizTopic').textContent = `Examen · ${topicName(q.topic)}`;
  }
  $('feedback').className = 'alert mt-4 mb-0 d-none';
  $('nextBtn').classList.add('d-none');

  const options = $('options');
  options.innerHTML = '';
  q.options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn btn';
    btn.innerHTML = `<span class="option-letter">${LETTERS[i]}</span><span class="option-text"></span>`;
    btn.querySelector('.option-text').textContent = text;
    btn.addEventListener('click', () => answer(i));
    options.appendChild(btn);
  });
}

async function answer(choice) {
  const q = state.questions[state.index];
  const buttons = $('options').querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });

  let result;
  try {
    // C'est le serveur qui corrige la réponse
    result = await api('/api/answers', {
      method: 'POST',
      body: JSON.stringify({ id: q.id, choice }),
    });
  } catch (err) {
    buttons.forEach((b) => { b.disabled = false; });
    alert(`Erreur de correction : ${err.message}`);
    return;
  }

  if (result.correct) state.score += 1;
  buttons[result.answer].classList.add('is-correct');
  if (!result.correct) buttons[choice].classList.add('is-wrong');

  const feedback = $('feedback');
  feedback.className = `alert mt-4 mb-0 ${result.correct ? 'alert-success' : 'alert-danger'}`;
  feedback.innerHTML = `<strong>${result.correct ? 'Bonne réponse !' : 'Mauvaise réponse.'}</strong> <span></span>`;
  feedback.querySelector('span').textContent = result.explanation;

  const isLast = state.index === state.questions.length - 1;
  $('nextBtn').innerHTML = isLast
    ? 'Voir mon score<i class="bi bi-flag ms-2"></i>'
    : 'Question suivante<i class="bi bi-arrow-right ms-2"></i>';
  $('nextBtn').classList.remove('d-none');
  $('nextBtn').focus();
}

$('nextBtn').addEventListener('click', () => {
  if (state.index < state.questions.length - 1) {
    state.index += 1;
    showQuestion();
  } else {
    finishQuiz();
  }
});

$('quitBtn').addEventListener('click', () => {
  stopTimer();
  showView('home');
});
$('replayBtn').addEventListener('click', () => (state.mode === 'examen' ? startExam() : startQuiz(state.topic)));
$('examBtn').addEventListener('click', startExam);

// ---------- Résultat et enregistrement du score ----------

async function finishQuiz(timeUp = false) {
  if (state.mode === 'examen' && state.timerId === null && !timeUp) {
    return; // déjà terminé (par exemple par la fin du chrono)
  }
  stopTimer();
  const total = state.questions.length;
  const durationSec = Math.round((Date.now() - state.startedAt) / 1000);
  const percent = Math.round((state.score / total) * 100);
  state.boardMode = state.mode; // le classement s'ouvrira sur le bon mode

  $('quizProgress').style.width = '100%';
  $('scoreValue').textContent = `${state.score}/${total}`;
  $('scoreRing').style.setProperty('--pct', percent);
  $('resultTitle').textContent = percent >= 75 ? 'Excellent !' : percent >= 50 ? 'Pas mal !' : 'Continuez à réviser !';
  $('resultDetail').textContent = state.mode === 'examen'
    ? `${timeUp ? 'Temps écoulé ! ' : ''}${percent} % de bonnes réponses à l'examen, en ${durationSec} s.`
    : `${percent} % de bonnes réponses sur le thème ${state.topic.name}, en ${durationSec} s.`;
  $('replayBtn').innerHTML = state.mode === 'examen'
    ? '<i class="bi bi-arrow-repeat me-1"></i>Repasser l\'examen'
    : '<i class="bi bi-arrow-repeat me-1"></i>Rejouer ce thème';
  $('saveStatus').className = 'small mb-4 text-muted';
  $('saveStatus').textContent = 'Enregistrement du score…';
  showView('result');

  try {
    await api('/api/scores', {
      method: 'POST',
      body: JSON.stringify({
        pseudo: checkPseudo(),
        topic: state.topic.id,
        mode: state.mode,
        score: state.score,
        total,
        durationSec,
      }),
    });
    $('saveStatus').className = 'small mb-4 text-success';
    $('saveStatus').innerHTML = '<i class="bi bi-check-circle me-1"></i>Score enregistré dans le classement.';
  } catch (err) {
    $('saveStatus').className = 'small mb-4 text-danger';
    $('saveStatus').textContent = `Score non enregistré : ${err.message}`;
  }
}

// ---------- Classement ----------

function formatDuration(sec) {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

function topicName(id) {
  if (id === EXAM_TOPIC.id) return EXAM_TOPIC.name;
  const topic = state.topics.find((t) => t.id === id);
  return topic ? topic.name : id;
}

async function loadLeaderboard() {
  document.querySelectorAll('[data-board]').forEach((btn) => {
    const active = btn.dataset.board === state.boardMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const body = $('boardBody');
  body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chargement…</td></tr>';

  let rows;
  try {
    rows = await api(`/api/leaderboard?mode=${state.boardMode}`);
  } catch (err) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4"></td></tr>';
    body.querySelector('td').textContent = `Classement indisponible : ${err.message}`;
    return;
  }

  if (rows.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Aucun score pour l\'instant. Lancez un quiz !</td></tr>';
    return;
  }

  body.innerHTML = '';
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ps-4"><span class="rank-badge rank-${i + 1}">${i + 1}</span></td>
      <td class="fw-semibold"></td>
      <td></td>
      <td><span class="fw-semibold"></span> <span class="text-muted small"></span></td>
      <td class="d-none d-md-table-cell">${formatDuration(row.durationSec)}</td>
      <td class="d-none d-md-table-cell pe-4 text-muted small">${new Date(row.createdAt).toLocaleDateString('fr-FR')}</td>`;
    const cells = tr.querySelectorAll('td');
    // Le pseudo vient des utilisateurs : on l'insère avec textContent (protection XSS)
    cells[1].textContent = row.pseudo;
    cells[2].textContent = topicName(row.topic);
    cells[3].querySelector('.fw-semibold').textContent = `${row.score}/${row.total}`;
    cells[3].querySelector('.small').textContent = `(${Math.round((row.score / row.total) * 100)} %)`;
    body.appendChild(tr);
  });
}

$('refreshBoard').addEventListener('click', loadLeaderboard);
document.querySelectorAll('[data-board]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.boardMode = btn.dataset.board;
    loadLeaderboard();
  });
});

// ---------- Démarrage ----------

$('pseudo').value = loadPseudo();
$('pseudo').addEventListener('input', () => $('pseudo').classList.remove('is-invalid'));
loadDeployInfo();
loadTopics();
