/* ============================================================
   VCHS Studying — app.js
   All application logic. Vanilla ES6+ / No frameworks.
   ============================================================ */
'use strict';

/* ── State Object ─────────────────────────────────────────── */
const state = {
  currentClass:  null,    // Currently selected class object
  quizMode:      null,    // 'timed' | 'methodical'
  quizQuestions: [],      // Shuffled question array for current session
  quizIndex:     0,       // Current question index
  quizScore:     0,       // Points accumulated
  quizAnswered:  0,       // Number of questions answered (submitted)
  timerInterval: null,    // setInterval handle
  timeLeft:      900,     // Seconds remaining (15 min)
  user:          null,    // Supabase user object (null if logged out)
  supabase:      null,    // Supabase client instance
  selectedChoice: null,   // Index of currently selected choice button
};

/* ── Utility Functions ────────────────────────────────────── */

/**
 * Fisher-Yates in-place shuffle.
 * @param {Array} array
 * @returns {Array} the same array, shuffled
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format an ISO date string to 'MMM D, YYYY'.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return '—';
  }
}

/**
 * Calculate score in points.
 * @param {number} correctCount
 * @returns {number}
 */
function calcPoints(correctCount) {
  return correctCount * 10;
}

/** Show a transient toast notification. */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/* ── Supabase Initialisation ──────────────────────────────── */

function initAuth() {
  // Guard: supabase SDK may not be loaded if offline
  if (typeof window.supabase === 'undefined' || typeof window.SUPABASE_URL === 'undefined') {
    console.warn('Supabase SDK or credentials not available — running in offline mode.');
    updateAuthUI();
    return;
  }

  try {
    state.supabase = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    // Restore session from local storage
    state.supabase.auth.getSession().then(({ data }) => {
      state.user = data?.session?.user ?? null;
      updateAuthUI();
    });

    // Listen for auth state changes
    state.supabase.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user ?? null;
      updateAuthUI();
    });
  } catch (err) {
    console.warn('Supabase init failed:', err);
    updateAuthUI();
  }
}

/* ── Auth UI ──────────────────────────────────────────────── */

function updateAuthUI() {
  const btn       = document.getElementById('auth-btn');
  const usernameEl = document.getElementById('nav-username');

  if (state.user) {
    const uname = state.user.user_metadata?.username || 'User';
    usernameEl.textContent = escapeHtml(uname);
    btn.textContent = 'Sign Out';
    btn.setAttribute('aria-label', 'Sign out');
  } else {
    usernameEl.textContent = '';
    btn.textContent = 'Sign In';
    btn.setAttribute('aria-label', 'Sign in or register');
  }
}

/** Open the auth overlay on the given tab. */
function openAuthModal(tab = 'login') {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.remove('hidden');
  switchAuthTab(tab);
  // Focus first input
  setTimeout(() => {
    const firstInput = overlay.querySelector('.auth-form:not(.hidden) input');
    if (firstInput) firstInput.focus();
  }, 50);
}

function closeAuthModal() {
  document.getElementById('auth-overlay').classList.add('hidden');
  clearAuthErrors();
}

function clearAuthErrors() {
  document.getElementById('login-error').classList.remove('visible');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').classList.remove('visible');
  document.getElementById('register-error').textContent = '';
}

function showAuthError(formId, message) {
  const el = document.getElementById(formId + '-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

function switchAuthTab(tab) {
  const loginTab    = document.getElementById('auth-tab-login');
  const registerTab = document.getElementById('auth-tab-register');
  const loginForm   = document.getElementById('auth-form-login');
  const registerForm = document.getElementById('auth-form-register');
  const title       = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    loginTab.classList.add('active');
    loginTab.setAttribute('aria-selected', 'true');
    registerTab.classList.remove('active');
    registerTab.setAttribute('aria-selected', 'false');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    title.textContent = 'Welcome Back';
  } else {
    registerTab.classList.add('active');
    registerTab.setAttribute('aria-selected', 'true');
    loginTab.classList.remove('active');
    loginTab.setAttribute('aria-selected', 'false');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    title.textContent = 'Create Account';
  }
  clearAuthErrors();
}

/** Validate username: max 20 chars, only [a-zA-Z0-9_] */
function validateUsername(username) {
  if (!username || username.trim() === '') return 'Username is required.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
  return null;
}

/** Validate password: min 8 chars */
function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const unErr = validateUsername(username);
  if (unErr) { showAuthError('login', unErr); return; }
  const pwErr = validatePassword(password);
  if (pwErr) { showAuthError('login', pwErr); return; }

  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  if (!state.supabase) {
    showAuthError('login', 'Authentication is unavailable (offline mode).');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }

  try {
    const email = `${username}@vchs-study.local`;
    const { error } = await state.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    closeAuthModal();
    showToast(`Welcome back, ${escapeHtml(username)}!`, 'success');
  } catch (err) {
    showAuthError('login', err.message || 'Login failed. Check your credentials.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;

  const unErr = validateUsername(username);
  if (unErr) { showAuthError('register', unErr); return; }
  const pwErr = validatePassword(password);
  if (pwErr) { showAuthError('register', pwErr); return; }

  const btn = document.getElementById('register-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  if (!state.supabase) {
    showAuthError('register', 'Authentication is unavailable (offline mode).');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }

  try {
    const email = `${username}@vchs-study.local`;
    const { error } = await state.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw error;
    closeAuthModal();
    showToast(`Account created! Welcome, ${escapeHtml(username)}!`, 'success');
  } catch (err) {
    showAuthError('register', err.message || 'Registration failed. Username may already be taken.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleAuthBtnClick() {
  if (state.user) {
    // Sign out
    if (state.supabase) {
      try {
        await state.supabase.auth.signOut();
      } catch (_) { /* ignore */ }
    }
    state.user = null;
    updateAuthUI();
    showToast('Signed out.', 'info');
  } else {
    openAuthModal('login');
  }
}

/* ── View Navigation ──────────────────────────────────────── */

function showView(viewId) {
  ['home-view', 'class-view', 'leaderboard-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHome() {
  showView('home-view');
  stopTimer();
}

function showClassView(classId) {
  const cls = CLASSES.find(c => c.id === classId);
  if (!cls) return;

  state.currentClass = cls;

  // Populate header
  document.getElementById('class-view-icon').textContent  = escapeHtml(cls.icon);
  document.getElementById('class-view-title').textContent = escapeHtml(cls.name);
  document.getElementById('class-view-desc').textContent  = escapeHtml(cls.description);

  // Reset to quiz tab
  switchTab('quiz');

  // Populate quiz unit filter
  const quizUnitSelect = document.getElementById('quiz-unit-select');
  if (quizUnitSelect && cls.qbank) {
    quizUnitSelect.innerHTML = '<option value="all">All Units</option>';
    const units = [...new Set(cls.qbank.map(q => q.unit).filter(u => u != null && !isNaN(Number(u))))]
      .sort((a, b) => Number(a) - Number(b));
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = String(u);
      opt.textContent = `Unit ${u}`;
      quizUnitSelect.appendChild(opt);
    });
  }

  // Render all panels
  renderStudyGuides(cls);
  renderQBank(cls);
  resetQuizPanel();

  showView('class-view');
}

function showLeaderboard() {
  showView('leaderboard-view');
  loadLeaderboard().then(entries => renderLeaderboard(entries, 'lb-main-content'));
}

/* ── Tab System ───────────────────────────────────────────── */

function switchTab(tabName) {
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const panels   = ['panel-quiz', 'panel-guides', 'panel-qbank'];

  tabBtns.forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  panels.forEach(id => {
    const panel = document.getElementById(id);
    const isTarget = id === `panel-${tabName}`;
    panel.classList.toggle('hidden', !isTarget);
  });
}

/* ── Class Grid Rendering ─────────────────────────────────── */

function renderClassGrid(filter = '', subject = '') {
  const grid = document.getElementById('class-grid');
  if (!grid) return;

  const filtered = CLASSES.filter(cls => {
    const matchesFilter  = cls.name.toLowerCase().includes(filter.toLowerCase()) ||
                           cls.description.toLowerCase().includes(filter.toLowerCase());
    const matchesSubject = !subject || cls.unit === subject;
    return matchesFilter && matchesSubject;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results">No classes found matching your search.</div>';
    return;
  }

  grid.innerHTML = filtered.map(cls => {
    const badgeClass = getBadgeClass(cls.unit);
    return `
      <article
        class="class-card"
        role="listitem"
        tabindex="0"
        data-class-id="${escapeHtml(cls.id)}"
        aria-label="${escapeHtml(cls.name)} — ${escapeHtml(cls.unit)}"
      >
        <div class="class-card-icon" aria-hidden="true">${escapeHtml(cls.icon)}</div>
        <div class="class-card-title">${escapeHtml(cls.name)}</div>
        <p class="class-card-desc">${escapeHtml(cls.description)}</p>
        <span class="badge ${badgeClass}">${escapeHtml(cls.unit)}</span>
        <button
          class="btn btn-primary"
          aria-label="Study ${escapeHtml(cls.name)}"
          data-action="open-class"
          data-class-id="${escapeHtml(cls.id)}"
        >Study Now →</button>
      </article>
    `;
  }).join('');

  // Update stat
  document.getElementById('stat-classes').textContent = String(CLASSES.length);
  const totalQ = CLASSES.reduce((sum, c) => sum + (c.qbank ? c.qbank.length : 0), 0);
  document.getElementById('stat-questions').textContent = String(totalQ);
}

function getBadgeClass(unit) {
  const map = {
    Science: 'badge-science',
    Math: 'badge-math',
    English: 'badge-english',
    History: 'badge-history',
  };
  return map[unit] || 'badge-other';
}

/* ── Study Guides Rendering ───────────────────────────────── */

function renderStudyGuides(cls) {
  const container = document.getElementById('guide-list');
  if (!container || !cls.studyGuides) return;

  container.innerHTML = cls.studyGuides.map((guide, idx) => `
    <div class="guide-card" id="guide-card-${idx}" role="article">
      <div
        class="guide-card-header"
        role="button"
        tabindex="0"
        aria-expanded="false"
        aria-controls="guide-body-${idx}"
        data-guide-idx="${idx}"
      >
        <span class="guide-card-title">${escapeHtml(guide.title)}</span>
        <span class="guide-toggle-icon" aria-hidden="true">▼</span>
      </div>
      <div class="guide-card-body" id="guide-body-${idx}" aria-hidden="true">
        <ul class="guide-bullets">
          ${guide.content.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

function toggleGuideCard(idx) {
  const card   = document.getElementById(`guide-card-${idx}`);
  const header = card.querySelector('.guide-card-header');
  const body   = document.getElementById(`guide-body-${idx}`);
  const isOpen = card.classList.contains('open');

  card.classList.toggle('open', !isOpen);
  header.setAttribute('aria-expanded', String(!isOpen));
  body.setAttribute('aria-hidden', String(isOpen));
}

/* ── Question Bank Rendering ──────────────────────────────── */

function renderQBank(cls, unitFilter = 'all') {
  const container = document.getElementById('qbank-list');
  const countEl   = document.getElementById('qbank-count');
  const selectEl  = document.getElementById('qbank-unit-filter');
  if (!container || !cls.qbank) return;

  // Populate unit filter options (only on first call)
  if (selectEl && selectEl.options.length <= 1) {
    const units = [...new Set(cls.qbank.map(q => q.unit))].sort((a, b) => a - b);
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = String(u);
      opt.textContent = `Unit ${u}`;
      selectEl.appendChild(opt);
    });
  }

  const filtered = unitFilter === 'all'
    ? cls.qbank
    : cls.qbank.filter(q => String(q.unit) === unitFilter);

  if (countEl) countEl.textContent = `${filtered.length} question${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">No questions for this unit.</div>';
    return;
  }

  const LABELS = ['A', 'B', 'C', 'D'];
  container.innerHTML = filtered.map((q, i) => `
    <div class="qbank-item" role="article">
      <div class="qbank-item-header">
        <span class="qbank-num">${i + 1}.</span>
        <span class="qbank-q">${escapeHtml(q.q)}</span>
        <span class="qbank-unit-tag">Unit ${escapeHtml(String(q.unit))}</span>
      </div>
      <div class="qbank-choices">
        ${q.choices.map((c, ci) => `
          <span class="qbank-choice${ci === q.answer ? ' answer' : ''}">
            ${escapeHtml(LABELS[ci])}. ${escapeHtml(c)}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ── Quiz Engine ──────────────────────────────────────────── */

function resetQuizPanel() {
  stopTimer();
  state.quizMode      = null;
  state.quizQuestions = [];
  state.quizIndex     = 0;
  state.quizScore     = 0;
  state.quizAnswered  = 0;
  state.selectedChoice = null;

  document.getElementById('quiz-mode-selector').classList.remove('hidden');
  document.getElementById('quiz-area').classList.add('hidden');
  document.getElementById('quiz-results').classList.add('hidden');
}

function startQuiz(mode) {
  if (!state.currentClass) return;

  state.quizMode      = mode;
  state.quizIndex     = 0;
  state.quizScore     = 0;
  state.quizAnswered  = 0;
  state.selectedChoice = null;

  const quizUnitSelect = document.getElementById('quiz-unit-select');
  const selectedUnit   = quizUnitSelect ? quizUnitSelect.value : 'all';
  const allQuestions   = state.currentClass.quiz.slice();
  const filteredQuestions = selectedUnit === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.unit != null && String(q.unit) === selectedUnit);

  if (filteredQuestions.length === 0) {
    showToast('No questions available for the selected unit.', 'info');
    return;
  }

  state.quizQuestions = shuffle(filteredQuestions);
  state.timeLeft      = 900;

  document.getElementById('quiz-mode-selector').classList.add('hidden');
  document.getElementById('quiz-results').classList.add('hidden');
  document.getElementById('quiz-area').classList.remove('hidden');

  const timerEl = document.getElementById('quiz-timer');
  if (mode === 'timed') {
    timerEl.classList.remove('hidden');
    updateTimerDisplay();
    state.timerInterval = setInterval(tickTimer, 1000);
  } else {
    timerEl.classList.add('hidden');
  }

  renderQuestion();
}

function tickTimer() {
  state.timeLeft -= 1;
  updateTimerDisplay();

  if (state.timeLeft <= 60) {
    document.getElementById('quiz-timer').classList.add('urgent');
  }

  if (state.timeLeft <= 0) {
    endQuiz();
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(Math.max(state.timeLeft, 0) / 60);
  const secs = Math.max(state.timeLeft, 0) % 60;
  document.getElementById('quiz-timer').textContent =
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function renderQuestion() {
  const q = state.quizQuestions[state.quizIndex];
  if (!q) return;

  const total = state.quizQuestions.length;
  const idx   = state.quizIndex;

  // Progress bar
  const pct = Math.round((idx / total) * 100);
  const fillEl = document.getElementById('quiz-progress-fill');
  fillEl.style.width = `${pct}%`;
  const wrapEl = document.getElementById('quiz-progress-bar-wrap');
  wrapEl.setAttribute('aria-valuenow', String(pct));

  // Header
  document.getElementById('quiz-progress').textContent = `Question ${idx + 1} / ${total}`;
  document.getElementById('quiz-score-display').textContent = `Score: ${state.quizScore}`;

  // Question text
  document.getElementById('quiz-question').textContent = q.q;

  // Choices
  const choicesEl = document.getElementById('quiz-choices');
  const LABELS = ['A', 'B', 'C', 'D'];
  choicesEl.innerHTML = q.choices.map((choice, ci) => `
    <button
      class="choice-btn"
      role="radio"
      aria-checked="false"
      data-choice-idx="${ci}"
      aria-label="Choice ${LABELS[ci]}: ${escapeHtml(choice)}"
    >
      <span class="choice-label" aria-hidden="true">${LABELS[ci]}</span>
      <span>${escapeHtml(choice)}</span>
    </button>
  `).join('');

  // Feedback / buttons
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('quiz-submit-btn').classList.remove('hidden');
  document.getElementById('quiz-submit-btn').disabled = true;
  document.getElementById('quiz-next-btn').classList.add('hidden');
  document.getElementById('quiz-quit-btn').classList.remove('hidden');

  state.selectedChoice = null;
}

function selectChoice(choiceIdx) {
  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('selected', i === choiceIdx);
    btn.setAttribute('aria-checked', String(i === choiceIdx));
  });
  state.selectedChoice = choiceIdx;
  document.getElementById('quiz-submit-btn').disabled = false;
}

function quizSubmitAnswer() {
  if (state.selectedChoice === null) return;

  const q         = state.quizQuestions[state.quizIndex];
  const isCorrect = state.selectedChoice === q.answer;
  const buttons   = document.querySelectorAll('.choice-btn');

  // Mark buttons
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)               btn.classList.add('correct');
    if (i === state.selectedChoice && !isCorrect) btn.classList.add('incorrect');
  });

  // Score & count
  if (isCorrect) state.quizScore += 10;
  state.quizAnswered += 1;

  // Feedback
  const feedbackEl = document.getElementById('quiz-feedback');
  feedbackEl.textContent = isCorrect
    ? '✓ Correct!'
    : `✗ Incorrect. The correct answer is: ${escapeHtml(q.choices[q.answer])}`;
  feedbackEl.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  feedbackEl.classList.remove('hidden');

  // Update score display
  document.getElementById('quiz-score-display').textContent = `Score: ${state.quizScore}`;

  // Buttons
  document.getElementById('quiz-submit-btn').classList.add('hidden');

  const isLast = state.quizIndex >= state.quizQuestions.length - 1;
  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.textContent = isLast ? 'Finish Quiz →' : 'Next Question →';
  nextBtn.classList.remove('hidden');

  // In methodical mode, allow reviewing before moving on (no auto-advance)
}

function nextQuestion() {
  state.quizIndex += 1;
  if (state.quizIndex >= state.quizQuestions.length) {
    endQuiz();
  } else {
    renderQuestion();
  }
}

function endQuiz() {
  stopTimer();

  const total    = state.quizQuestions.length;
  const correct  = state.quizScore / 10;
  const pct      = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Results screen
  document.getElementById('quiz-area').classList.add('hidden');
  document.getElementById('quiz-results').classList.remove('hidden');

  let icon = '🎉';
  if (pct >= 90)      icon = '🏆';
  else if (pct >= 70) icon = '🎉';
  else if (pct >= 50) icon = '📚';
  else                icon = '💪';

  document.getElementById('results-icon').textContent    = icon;
  document.getElementById('results-pct').textContent     = `${pct}%`;
  document.getElementById('results-title').textContent   = pct >= 70 ? 'Great Job!' : 'Keep Practising!';
  document.getElementById('results-details').textContent =
    `You answered ${correct} of ${total} questions correctly. Score: ${state.quizScore} pts. Mode: ${state.quizMode}.`;

  // Save to leaderboard
  if (state.currentClass) {
    saveScore({
      classId:   state.currentClass.id,
      className: state.currentClass.name,
      pct,
      score:    state.quizScore,
      answered: state.quizAnswered,
      mode:     state.quizMode,
    });
  }
}

/* ── Leaderboard ──────────────────────────────────────────── */

/**
 * Rank tiers based on lifetime points.
 * Ordered from highest to lowest so the first match wins.
 */
const RANK_TIERS = [
  { min: 5000, name: 'Master',   emoji: '👑', cls: 'tier-master'   },
  { min: 2500, name: 'Expert',   emoji: '🔥', cls: 'tier-expert'   },
  { min: 1000, name: 'Advanced', emoji: '🎯', cls: 'tier-advanced' },
  { min: 500,  name: 'Scholar',  emoji: '📚', cls: 'tier-scholar'  },
  { min: 100,  name: 'Amateur',  emoji: '⚡', cls: 'tier-amateur'  },
  { min: 0,    name: 'Beginner', emoji: '🌱', cls: 'tier-beginner' },
];

/** Return the rank tier object for a given lifetime points total. */
function getUserRank(points) {
  return RANK_TIERS.find(r => points >= r.min) || RANK_TIERS[RANK_TIERS.length - 1];
}

/**
 * Aggregate raw leaderboard rows into one entry per user.
 * Returns an array sorted by lifetimeScore descending.
 */
function aggregateUserScores(rawEntries) {
  const userMap = new Map();
  for (const entry of rawEntries) {
    const uid = entry.user_id || entry.username || 'unknown';
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        user_id:      uid,
        username:     entry.username || 'Anonymous',
        lifetimeScore: 0,
        quizCount:    0,
        latest_at:    entry.created_at || '',
      });
    }
    const u = userMap.get(uid);
    u.lifetimeScore += entry.score || 0;
    u.quizCount     += 1;
    // Keep the most recently used username
    if ((entry.created_at || '') > u.latest_at) {
      u.username  = entry.username || u.username;
      u.latest_at = entry.created_at;
    }
  }
  return Array.from(userMap.values())
    .sort((a, b) => b.lifetimeScore - a.lifetimeScore);
}

/** Save a score row to Supabase. Silently skips if user is not logged in. */
async function saveScore({ classId, className, pct, score, answered, mode }) {
  if (!state.user || !state.supabase) return;

  const username = state.user.user_metadata?.username || 'Anonymous';

  const row = {
    user_id:    state.user.id,
    username:   username,
    class_id:   classId,
    class_name: className,
    pct,
    score,
    answered,
    mode,
  };

  try {
    const { error } = await state.supabase.from('leaderboard').insert(row);
    if (error) throw error;
    showToast('Score saved to leaderboard! 🏆', 'success');
    // Refresh the leaderboard preview
    loadLeaderboard().then(entries => renderLeaderboard(entries, 'lb-preview-content', 5));
  } catch (err) {
    console.warn('Failed to save score to Supabase:', err);
    // Fall back to localStorage
    saveScoreToLocalStorage(row);
  }
}

function saveScoreToLocalStorage(row) {
  try {
    const existing = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    existing.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem('leaderboard', JSON.stringify(existing.slice(0, 200)));
  } catch (_) { /* ignore */ }
}

/**
 * Load leaderboard entries from Supabase with a 5-second timeout.
 * Falls back to localStorage on timeout or error.
 * @param {string} [classId] - Optional class filter
 * @returns {Promise<Array>}
 */
async function loadLeaderboard(classId) {
  // Try Supabase with 5-second timeout
  if (state.supabase) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Leaderboard fetch timed out')), 5000)
    );

    try {
      let query = state.supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await Promise.race([query, timeoutPromise]);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase leaderboard unavailable, falling back to localStorage:', err.message);
    }
  }

  // Fallback: localStorage
  return getLocalLeaderboard(classId);
}

function getLocalLeaderboard(classId) {
  try {
    const entries = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    const filtered = classId ? entries.filter(e => e.class_id === classId) : entries;
    return filtered
      .sort((a, b) => b.score - a.score);
  } catch (_) {
    return [];
  }
}

/**
 * Render leaderboard entries into a container.
 * Raw entries are aggregated per-user before display.
 * When no limit is given (full leaderboard), a pinned "You" banner is shown
 * at the top and the current user's row is highlighted.
 * @param {Array}  entries   - Raw rows from Supabase / localStorage
 * @param {string} containerId
 * @param {number} [limit]   - Max number of users to show (omit for full)
 */
function renderLeaderboard(entries, containerId, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Aggregate raw quiz rows into one record per user
  const users     = aggregateUserScores(entries);
  const totalUsers = users.length;

  // Update home stat with total users count
  const statEl = document.getElementById('stat-total-users');
  if (statEl) statEl.textContent = String(totalUsers);

  // Identify the logged-in user in the aggregated list
  const currentUserId   = state.user?.id;
  const currentUserIdx  = currentUserId
    ? users.findIndex(u => u.user_id === currentUserId)
    : -1;
  const currentUserEntry = currentUserIdx >= 0 ? users[currentUserIdx] : null;
  const currentUserRank  = currentUserIdx + 1; // 1-based

  // Update subtitles with live user counts
  const isFullView = !limit;
  if (isFullView) {
    const sub = document.getElementById('lb-main-subtitle');
    if (sub) sub.textContent = `All ${totalUsers.toLocaleString()} user${totalUsers !== 1 ? 's' : ''} ranked by lifetime points`;
  } else {
    const sub = document.getElementById('lb-preview-subtitle');
    if (sub) sub.textContent = `Top ${limit} of ${totalUsers.toLocaleString()} total user${totalUsers !== 1 ? 's' : ''}`;
  }

  const rows = limit ? users.slice(0, limit) : users;

  if (rows.length === 0) {
    container.innerHTML = `<div class="leaderboard-empty">No scores yet. Be the first to take a quiz!</div>`;
    return;
  }

  const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

  // Build the pinned "You" banner for the full leaderboard view
  let pinnedHtml = '';
  if (isFullView && currentUserEntry) {
    const tier   = getUserRank(currentUserEntry.lifetimeScore);
    const topPct = totalUsers > 0
      ? ((currentUserRank / totalUsers) * 100).toFixed(1)
      : '100.0';
    pinnedHtml = `
      <div class="lb-you-banner">
        <div class="lb-you-rank">#${currentUserRank}</div>
        <div class="lb-you-info">
          <span class="lb-you-name">${escapeHtml(currentUserEntry.username)} <span class="you-tag">You</span></span>
          <span class="lb-you-sub">Top ${topPct}% · ${totalUsers.toLocaleString()} users total</span>
        </div>
        <div class="lb-you-stats">
          <span class="tier-badge ${tier.cls}">${tier.emoji} ${tier.name}</span>
          <span class="lb-you-pts">${currentUserEntry.lifetimeScore.toLocaleString()} pts</span>
          <span class="lb-you-quizzes">${currentUserEntry.quizCount} quiz${currentUserEntry.quizCount !== 1 ? 'zes' : ''}</span>
        </div>
      </div>
    `;
  } else if (!isFullView && currentUserEntry) {
    const tier   = getUserRank(currentUserEntry.lifetimeScore);
    const topPct = totalUsers > 0
      ? ((currentUserRank / totalUsers) * 100).toFixed(1)
      : '100.0';
    pinnedHtml = `
      <div class="lb-you-banner lb-you-banner-preview">
        <div class="lb-you-rank">#${currentUserRank}</div>
        <div class="lb-you-info">
          <span class="lb-you-name">${escapeHtml(currentUserEntry.username)} <span class="you-tag">You</span></span>
          <span class="lb-you-sub">Top ${topPct}% · ${totalUsers.toLocaleString()} users total</span>
        </div>
        <div class="lb-you-stats">
          <span class="tier-badge ${tier.cls}">${tier.emoji} ${tier.name}</span>
          <span class="lb-you-pts">${currentUserEntry.lifetimeScore.toLocaleString()} pts</span>
          <span class="lb-you-quizzes">${currentUserEntry.quizCount} quiz${currentUserEntry.quizCount !== 1 ? 'zes' : ''}</span>
        </div>
      </div>
    `;
  }

  const tableHtml = `
    ${pinnedHtml}
    <table class="leaderboard-table" aria-label="Leaderboard scores">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Username</th>
          <th scope="col">Tier</th>
          <th scope="col">Lifetime Points</th>
          <th scope="col">Quizzes</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((user, i) => {
          const pos    = i + 1;
          const isYou  = !!(currentUserId && user.user_id === currentUserId);
          const posClass = [pos <= 3 ? `rank-${pos}` : '', isYou ? 'lb-you-row' : ''].filter(Boolean).join(' ');
          const medal  = MEDALS[pos] || pos;
          const tier   = getUserRank(user.lifetimeScore);
          const nameHtml = isYou
            ? `${escapeHtml(user.username)} <span class="you-tag">You</span>`
            : escapeHtml(user.username);
          return `
            <tr class="${posClass}" aria-label="Position ${pos}: ${escapeHtml(user.username)}${isYou ? ' (You)' : ''}">
              <td class="rank-cell">${medal}</td>
              <td>${nameHtml}</td>
              <td><span class="tier-badge ${tier.cls}">${tier.emoji} ${tier.name}</span></td>
              <td>${user.lifetimeScore.toLocaleString()}</td>
              <td>${user.quizCount}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;
}

/* ── Event Listeners ──────────────────────────────────────── */

function attachEventListeners() {

  // Navbar
  document.getElementById('nav-brand').addEventListener('click', e => {
    e.preventDefault();
    showHome();
  });

  document.getElementById('nav-home').addEventListener('click', e => {
    e.preventDefault();
    showHome();
  });

  document.getElementById('nav-leaderboard').addEventListener('click', e => {
    e.preventDefault();
    showLeaderboard();
  });

  document.getElementById('auth-btn').addEventListener('click', handleAuthBtnClick);

  // Hero buttons
  document.getElementById('hero-start-btn').addEventListener('click', () => {
    document.getElementById('classes-section').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('hero-lb-btn').addEventListener('click', () => {
    showLeaderboard();
  });

  document.getElementById('view-full-lb-btn').addEventListener('click', () => {
    showLeaderboard();
  });

  // Class grid — delegate
  document.getElementById('class-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="open-class"]');
    if (btn) {
      showClassView(btn.dataset.classId);
      return;
    }
    const card = e.target.closest('.class-card[data-class-id]');
    if (card) showClassView(card.dataset.classId);
  });

  // Class grid — keyboard
  document.getElementById('class-grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.class-card[data-class-id]');
      if (card) {
        e.preventDefault();
        showClassView(card.dataset.classId);
      }
    }
  });

  // Search / subject filter
  document.getElementById('class-search').addEventListener('input', e => {
    renderClassGrid(e.target.value, document.getElementById('subject-filter').value);
  });

  document.getElementById('subject-filter').addEventListener('change', e => {
    renderClassGrid(document.getElementById('class-search').value, e.target.value);
  });

  // Back button in class view
  document.getElementById('back-btn').addEventListener('click', () => {
    stopTimer();
    showHome();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Quiz mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => startQuiz(card.dataset.mode));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startQuiz(card.dataset.mode);
      }
    });
  });

  // Quiz choices — delegate
  document.getElementById('quiz-choices').addEventListener('click', e => {
    const btn = e.target.closest('.choice-btn');
    if (btn && !btn.disabled) {
      selectChoice(parseInt(btn.dataset.choiceIdx, 10));
    }
  });

  // Quiz submit
  document.getElementById('quiz-submit-btn').addEventListener('click', quizSubmitAnswer);

  // Quiz next
  document.getElementById('quiz-next-btn').addEventListener('click', nextQuestion);

  // Quiz quit
  document.getElementById('quiz-quit-btn').addEventListener('click', () => {
    endQuiz();
  });

  // Results buttons
  document.getElementById('results-retry-btn').addEventListener('click', () => {
    resetQuizPanel();
  });

  document.getElementById('results-home-btn').addEventListener('click', () => {
    showHome();
  });

  // Study guide accordion — delegate
  document.getElementById('guide-list').addEventListener('click', e => {
    const header = e.target.closest('[data-guide-idx]');
    if (header) toggleGuideCard(parseInt(header.dataset.guideIdx, 10));
  });

  document.getElementById('guide-list').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const header = e.target.closest('[data-guide-idx]');
      if (header) {
        e.preventDefault();
        toggleGuideCard(parseInt(header.dataset.guideIdx, 10));
      }
    }
  });

  // Question bank unit filter
  document.getElementById('qbank-unit-filter').addEventListener('change', e => {
    if (state.currentClass) renderQBank(state.currentClass, e.target.value);
  });

  // Auth overlay click-outside
  document.getElementById('auth-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('auth-overlay')) closeAuthModal();
  });

  // Auth modal close button
  document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);

  // Auth tab switching
  document.getElementById('auth-tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('auth-tab-register').addEventListener('click', () => switchAuthTab('register'));

  // Auth forms
  document.getElementById('auth-form-login').addEventListener('submit', handleLogin);
  document.getElementById('auth-form-register').addEventListener('submit', handleRegister);

  // Leaderboard back button
  document.getElementById('lb-back-btn').addEventListener('click', showHome);

  // Escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAuthModal();
  });
}

/* ── Initialisation ───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  renderClassGrid();

  // Populate leaderboard preview on home
  loadLeaderboard().then(entries => {
    renderLeaderboard(entries, 'lb-preview-content', 5);
  });

  attachEventListeners();
});
