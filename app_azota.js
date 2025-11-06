// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

const els = {
  btnRestart: $('#btnRestart'),
  btnRestart2: $('#btnRestart2'),
  questionNav: $('#questionNav'),
  
  progressText: $('#progressText'),
  progressBar: $('#progressBar'),
  scoreText: $('#scoreText'),
  rightBadge: $('#rightBadge'),
  wrongBadge: $('#wrongBadge'),

  card: $('#card'),
  questionText: $('#questionText'),
  choices: $('#choices'),
  hintWrap: $('#hintWrap'),
  btnHint: $('#btnHint'),
  hintText: $('#hintText'),
  explainWrap: $('#explainWrap'),
  explainText: $('#explainText'),
  btnPrev: $('#btnPrev'),
  btnNext: $('#btnNext'),
  btnReveal: $('#btnReveal'),

  summary: $('#summary'),
  summaryText: $('#summaryText'),
  btnReviewWrong: $('#btnReviewWrong'),
};

let data = [];              // All questions (no shuffle)
let index = 0;              // Current question index
let score = 0;
let answered = [];          // {picked, correctIndex, isCorrect}
let viewed = [];            // Track which questions have been viewed
let key = 'quiz_state_azota';

// ===== Load / Save state =====
function saveState() {
  const state = { index, score, answered, viewed, length: data.length };
  localStorage.setItem(key, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ===== Sidebar Navigation =====
function renderSidebar() {
  els.questionNav.innerHTML = '';
  data.forEach((q, i) => {
    const btn = document.createElement('div');
    btn.className = 'question-nav-item';
    btn.textContent = i + 1;
    
    // Add status classes
    if (i === index) {
      btn.classList.add('active');
    }
    if (answered[i]) {
      // Check if answer is correct or wrong
      if (answered[i].isCorrect) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
      }
    } else if (viewed[i]) {
      btn.classList.add('viewed');
    }
    
    btn.addEventListener('click', () => goToQuestion(i));
    els.questionNav.appendChild(btn);
  });
}

function goToQuestion(i) {
  if (i >= 0 && i < data.length) {
    index = i;
    markAsViewed(i);
    renderQuestion();
    saveState();
    renderSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function markAsViewed(i) {
  if (!viewed[i] && !answered[i]) {
    viewed[i] = true;
  }
}

// ===== Counters & Progress =====
function updateCounters() {
  const right = answered.filter(a => a && a.isCorrect).length;
  const wrong = answered.filter(a => a && a.isCorrect === false).length;
  els.rightBadge.textContent = `Đúng: ${right}`;
  els.wrongBadge.textContent = `Sai: ${wrong}`;
}

function setProgress() {
  els.progressText.textContent = `Câu ${index + 1} / ${data.length}`;
  const answeredCount = answered.filter(a => a).length;
  const w = Math.round((answeredCount / data.length) * 100);
  els.progressBar.style.width = `${w}%`;
  els.scoreText.textContent = `Điểm: ${fmt(score)}`;
  updateCounters();
}

// ===== Rendering =====
function renderQuestion() {
  const q = data[index];
  els.card.classList.add('fade-in');
  setTimeout(() => els.card.classList.remove('fade-in'), 200);

  // Mark as viewed
  markAsViewed(index);

  // Display question
  const displayNo = index + 1;
  els.questionText.textContent = `(${displayNo}) ${q.question || '(Không có nội dung câu hỏi)'}`;

  // hint
  if (q.hint && String(q.hint).trim()) {
    els.hintWrap.classList.remove('hidden');
    els.hintText.classList.add('hidden');
    els.hintText.textContent = String(q.hint).trim();
  } else {
    els.hintWrap.classList.add('hidden');
    els.hintText.classList.add('hidden');
  }

  // choices
  els.choices.innerHTML = '';
  const chosen = answered[index]?.picked ?? null;
  const options = q.answerOptions || q.answeroption || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  
  options.forEach((opt, i) => {
    const isPicked = chosen === i;
    const base = 'choice rounded-xl border-2 px-5 py-4 text-sm sm:text-base transition-all cursor-pointer';
    let cls = 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md';
    let badge = '';
    
    if (answered[index]) {
      if (i === correctIdx) {
        cls = 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md';
        badge = '<span class="inline-block ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">Đúng</span>';
      }
      if (isPicked && chosen !== correctIdx) {
        cls = 'border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 shadow-md';
        badge = '<span class="inline-block ml-2 px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded">Sai</span>';
      }
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${base} ${cls} text-left`;
    btn.innerHTML = `<div class="flex items-start gap-3"><span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex-shrink-0">${String.fromCharCode(65 + i)}</span><span class="font-medium text-slate-800 flex-1">${opt.text}${badge}</span></div>`;
    btn.addEventListener('click', () => onPick(i));
    els.choices.appendChild(btn);
  });

  // explain
  if (answered[index]) {
    showExplain(q, answered[index].picked);
  } else {
    els.explainWrap.classList.add('hidden');
    els.explainText.textContent = '';
  }

  // reveal button visibility
  els.btnReveal.classList.toggle('hidden', !!answered[index]);

  // nav buttons
  els.btnPrev.disabled = (index === 0);
  els.btnNext.textContent = (index === data.length - 1) ? 'Kết thúc' : 'Tiếp tục →';

  setProgress();
  renderSidebar();
}

function showExplain(q, pickedIdx) {
  const options = q.answerOptions || q.answeroption || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  
  const picked = options[pickedIdx];
  const correct = options[correctIdx];

  const isCorrect = pickedIdx === correctIdx;
  
  // Get rationale text
  const rationaleText = isCorrect ? correct.rationale : (picked?.rationale || correct.rationale);
  const hasRationale = picked?.rationale || correct?.rationale;
  const rationaleId = `rationale-${index}`;
  
  const html = hasRationale
    ? `<div class="mt-3">
        <button onclick="toggleRationale('${rationaleId}')" class="w-full text-center py-2.5 px-4 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm transition-colors border-2 border-blue-300 hover:border-blue-400">
          Xem giải thích chi tiết
        </button>
        <div id="${rationaleId}" class="hidden mt-3 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 shadow-sm">
          <div class="font-semibold text-blue-900 mb-2 text-sm">Giải thích chi tiết</div>
          <div class="text-slate-700 leading-relaxed">${rationaleText}</div>
        </div>
      </div>`
    : '';

  els.explainText.innerHTML = html;
  els.explainWrap.classList.remove('hidden');
}

// Toggle rationale visibility
window.toggleRationale = function(id) {
  const element = document.getElementById(id);
  const button = element.previousElementSibling;
  
  if (element.classList.contains('hidden')) {
    // Show explanation
    element.classList.remove('hidden');
    button.textContent = 'Ẩn giải thích';
    button.classList.remove('bg-blue-100', 'hover:bg-blue-200');
    button.classList.add('bg-slate-100', 'hover:bg-slate-200');
  } else {
    // Hide explanation
    element.classList.add('hidden');
    button.textContent = 'Xem giải thích chi tiết';
    button.classList.remove('bg-slate-100', 'hover:bg-slate-200');
    button.classList.add('bg-blue-100', 'hover:bg-blue-200');
  }
}

// ===== Handlers =====
function onPick(i) {
  const q = data[index];
  const options = q.answerOptions || q.answeroption || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  
  if (!answered[index]) {
    const isCorrect = i === correctIdx;
    answered[index] = { picked: i, correctIndex: correctIdx, isCorrect };
    if (isCorrect) score++;
    saveState();
  }
  
  renderQuestion();
}

function next() {
  if (index < data.length - 1) {
    index++;
    markAsViewed(index);
    renderQuestion();
    saveState();
  } else {
    els.summary.classList.remove('hidden');
    const right = answered.filter(a => a && a.isCorrect).length;
    const answered_count = answered.filter(a => a).length;
    els.summaryText.textContent = `Bạn đã làm ${answered_count}/${data.length} câu và trả lời đúng ${right}/${answered_count} câu (${Math.round(right*100/answered_count || 0)}%).`;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
}

function prev() {
  if (index > 0) {
    index--;
    markAsViewed(index);
    renderQuestion();
    saveState();
  }
}

function restart() {
  index = 0;
  score = 0;
  answered = [];
  viewed = [];
  els.summary.classList.add('hidden');
  renderQuestion();
  saveState();
}

function reviewWrong() {
  // Find all wrong answers
  const wrongIndices = [];
  answered.forEach((ans, i) => {
    if (ans && !ans.isCorrect) {
      wrongIndices.push(i);
    }
  });
  
  if (wrongIndices.length > 0) {
    // Go to first wrong answer
    index = wrongIndices[0];
    markAsViewed(index);
    els.summary.classList.add('hidden');
    renderQuestion();
    saveState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function revealAnswer() {
  if (answered[index]) return;
  
  const q = data[index];
  const options = q.answerOptions || q.answeroption || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  answered[index] = { picked: correctIdx, correctIndex: correctIdx, isCorrect: true };
  score++;
  saveState();
  renderQuestion();
}

// ===== Data loading =====
async function loadFromUrl(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được JSON');
  const json = await res.json();
  // Support both 'questions' and 'question' keys
  return json.questions || json.question || [];
}

function attachEvents() {
  els.btnNext.addEventListener('click', next);
  els.btnPrev.addEventListener('click', prev);
  els.btnRestart.addEventListener('click', restart);
  els.btnRestart2.addEventListener('click', restart);
  els.btnReviewWrong.addEventListener('click', reviewWrong);
  els.btnHint.addEventListener('click', () => els.hintText.classList.toggle('hidden'));
  els.btnReveal.addEventListener('click', revealAnswer);
}

(async function init() {
  attachEvents();
  
  try {
    // Load data without shuffling
    data = await loadFromUrl('c.json');
    if (!data.length) throw new Error('Không có câu hỏi trong JSON');

    // Load saved state if exists
    const state = loadState();
    if (state && state.length === data.length) {
      index = Math.min(state.index ?? 0, data.length - 1);
      score = state.score ?? 0;
      answered = Array.isArray(state.answered) ? state.answered : [];
      viewed = Array.isArray(state.viewed) ? state.viewed : [];
    }

    // Initial render
    markAsViewed(index);
    renderQuestion();
  } catch (err) {
    els.questionText.textContent = 'Không tải được dữ liệu. Hãy kiểm tra file c.json.';
    console.error(err);
  }
})();
