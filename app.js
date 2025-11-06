// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const els = {
  btnRestart: $('#btnRestart'),
  btnRestart2: $('#btnRestart2'),
  btnShuffle: $('#btnShuffle'),
  toggleExam: $('#toggleExam'),
  // fileInput removed — loading external JSON disabled

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

let original = [];
let data = [];
let index = 0;
let score = 0;
let answered = [];   // {picked, correctIndex, isCorrect}
let examMode = false;
let key = 'quiz_state_v2';

// ===== Load / Save state =====
function saveState() {
  const state = { index, score, answered, examMode, length: data.length };
  localStorage.setItem(key, JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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
  const w = Math.round(((index) / data.length) * 100);
  els.progressBar.style.width = `${w}%`;
  els.scoreText.textContent = `Điểm: ${fmt(score)}`;
  updateCounters();
}

// ===== Rendering =====
function renderQuestion() {
  const q = data[index];
  els.card.classList.add('fade-in');
  setTimeout(() => els.card.classList.remove('fade-in'), 200);

  // Show the UI position (index + 1) as the visible question number.
  // If the original JSON has a different `questionNumber`, show it as "gốc N" for reference.
  const displayNo = (index + 1);
  const origNo = q.questionNumber;
  const qNoText = (origNo && origNo !== displayNo) ? `(${displayNo} • gốc ${origNo})` : `(${displayNo})`;
  els.questionText.textContent = `${q.question || '(Không có nội dung câu hỏi)'}`;

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
}

function showExplain(q, pickedIdx) {
  const options = q.answerOptions || q.answeroption || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  if (examMode) {
    els.explainWrap.classList.add('hidden');
    return;
  }
  const picked = options[pickedIdx];
  const correct = options[correctIdx];

  const isCorrect = pickedIdx === correctIdx;
  const statusBadge = isCorrect 
    ? '<span class="inline-block px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold rounded-lg shadow-sm">Chính xác</span>'
    : '<span class="inline-block px-3 py-1 bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-bold rounded-lg shadow-sm">Chưa đúng</span>';
  
  const html = `
    <div class="mb-4">${statusBadge}</div>
    <div class="space-y-3">
      <div class="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
        <span class="font-semibold text-slate-600 text-sm">Bạn đã chọn:</span>
        <div class="mt-1 text-slate-800"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs mr-2">${String.fromCharCode(65 + pickedIdx)}</span>${picked?.text ?? ''}</div>
      </div>
      <div class="p-3 rounded-lg bg-emerald-50 border-2 border-emerald-200 shadow-sm">
        <span class="font-semibold text-emerald-700 text-sm">Đáp án đúng:</span>
        <div class="mt-1 text-slate-800"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs mr-2">${String.fromCharCode(65 + correctIdx)}</span>${correct?.text ?? ''}</div>
      </div>
    </div>
    ${ (picked?.rationale || correct?.rationale)
        ? `<div class="mt-4 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 shadow-sm">
            <div class="font-semibold text-blue-900 mb-2 text-sm">Giải thích chi tiết</div>
            <div class="text-slate-700 leading-relaxed">${isCorrect ? correct.rationale : (picked?.rationale || correct.rationale)}</div>
          </div>`
        : '' }
  `.trim();

  els.explainText.innerHTML = html;
  els.explainWrap.classList.remove('hidden');
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
    renderQuestion();
    saveState();
  } else {
    els.summary.classList.remove('hidden');
    const right = answered.filter(a => a && a.isCorrect).length;
    els.summaryText.textContent = `Bạn trả lời đúng ${right}/${data.length} câu (${Math.round(right*100/data.length)}%).`;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
}

function prev() {
  if (index > 0) {
    index--;
    renderQuestion();
    saveState();
  }
}

function restart(full = true) {
  index = 0;
  score = 0;
  answered = [];
  if (full) data = shuffle(original);
  els.summary.classList.add('hidden');
  renderQuestion();
  saveState();
}

function reviewWrong() {
  const wrongQs = data
    .map((q, i) => ({ q, i }))
    .filter((_, i) => answered[i] && !answered[i].isCorrect);
  data = wrongQs.map(x => x.q);
  original = data.slice();
  index = 0; score = 0; answered = [];
  els.summary.classList.add('hidden');
  renderQuestion();
  saveState();
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
  els.btnRestart.addEventListener('click', () => restart(true));
  els.btnRestart2.addEventListener('click', () => restart(true));
  els.btnShuffle.addEventListener('click', () => restart(true));
  els.btnReviewWrong.addEventListener('click', reviewWrong);
  els.btnHint.addEventListener('click', () => els.hintText.classList.toggle('hidden'));
  els.btnReveal.addEventListener('click', revealAnswer);
  els.toggleExam.addEventListener('change', () => {
    examMode = els.toggleExam.checked;
    saveState();
    renderQuestion();
  });
}

(async function init() {
  attachEvents();
  try {
    const state = loadState();
    original = await loadFromUrl('c.json');
    if (!original.length) throw new Error('Không có câu hỏi trong JSON');
    data = shuffle(original);

    if (state && state.length === data.length) {
      index = Math.min(state.index ?? 0, data.length - 1);
      score = state.score ?? 0;
      answered = Array.isArray(state.answered) ? state.answered : [];
      examMode = !!state.examMode;
      els.toggleExam.checked = examMode;
    }

    renderQuestion();
  } catch (err) {
    els.questionText.textContent = 'Không tải được dữ liệu. Hãy kiểm tra file c.json.';
  }
})();
