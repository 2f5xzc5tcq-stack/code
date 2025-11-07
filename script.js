// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

const els = {
  btnRestart: $('#btnRestart'),
  btnRestart2: $('#btnRestart2'),
  questionNav: $('#questionNav'),
  currentFile: $('#currentFile'),
  subjectTitle: $('#subjectTitle'),
  subjectDesc: $('#subjectDesc'),
  
  progressText: $('#progressText'),
  progressBar: $('#progressBar'),
  scoreText: $('#scoreText'),
  rightBadge: $('#rightBadge'),
  wrongBadge: $('#wrongBadge'),
  timeValue: $('#timeValue'),

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
  btnBookmark: $('#btnBookmark'),

  summary: $('#summary'),
  summaryText: $('#summaryText'),
  btnReviewWrong: $('#btnReviewWrong'),
  
  // New elements
  darkModeToggle: $('#darkModeToggle'),
  openMobileMenu: $('#openMobileMenu'),
  closeMobileMenu: $('#closeMobileMenu'),
  mobileMenu: $('#mobileMenu'),
  mobileOverlay: $('#mobileOverlay'),
  btnBookmarks: $('#btnBookmarks'),
  btnHistory: $('#btnHistory'),
  historyModal: $('#historyModal'),
  closeHistoryModal: $('#closeHistoryModal'),
  historyContent: $('#historyContent'),
  bookmarksModal: $('#bookmarksModal'),
  closeBookmarksModal: $('#closeBookmarksModal'),
  bookmarksContent: $('#bookmarksContent'),
};

let data = [];              // All questions (no shuffle)
let index = 0;              // Current question index
let score = 0;
let answered = [];          // {picked, correctIndex, isCorrect}
let viewed = [];            // Track which questions have been viewed
let currentFile = 'c.json'; // Current data file
let key = 'quiz_state_azota';
let bookmarks = [];         // Bookmarked questions
let startTime = null;       // Quiz start time
let timerInterval = null;   // Timer interval
let isDarkMode = false;     // Dark mode state

// ===== Load / Save state =====
function saveState() {
  const state = { 
    index, 
    score, 
    answered, 
    viewed, 
    length: data.length,
    startTime: startTime ? startTime.getTime() : null
  };
  const stateKey = `${key}_${currentFile}`;
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function loadState() {
  const stateKey = `${key}_${currentFile}`;
  const raw = localStorage.getItem(stateKey);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ===== Bookmarks =====
function saveBookmarks() {
  const bookmarkKey = `${key}_bookmarks_${currentFile}`;
  localStorage.setItem(bookmarkKey, JSON.stringify(bookmarks));
}

function loadBookmarks() {
  const bookmarkKey = `${key}_bookmarks_${currentFile}`;
  const raw = localStorage.getItem(bookmarkKey);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function toggleBookmark() {
  const idx = bookmarks.indexOf(index);
  if (idx > -1) {
    bookmarks.splice(idx, 1);
    els.btnBookmark.classList.remove('active');
  } else {
    bookmarks.push(index);
    els.btnBookmark.classList.add('active');
  }
  saveBookmarks();
}

function updateBookmarkButton() {
  if (bookmarks.includes(index)) {
    els.btnBookmark.classList.add('active');
    els.btnBookmark.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" fill="currentColor" />';
  } else {
    els.btnBookmark.classList.remove('active');
    els.btnBookmark.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />';
  }
}

// ===== Timer =====
function startTimer() {
  if (!startTime) {
    startTime = new Date();
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    els.timeValue.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getElapsedTime() {
  if (!startTime) return 0;
  return Math.floor((new Date() - startTime) / 1000);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// ===== Dark Mode =====
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  els.darkModeToggle.classList.toggle('active', isDarkMode);
  localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
}

function loadDarkMode() {
  const saved = localStorage.getItem('darkMode');
  // Default to dark mode if no preference saved
  isDarkMode = saved === null ? true : saved === 'true';
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  els.darkModeToggle.classList.toggle('active', isDarkMode);
}

// ===== History =====
function saveHistory() {
  const right = answered.filter(a => a && a.isCorrect).length;
  const answeredCount = answered.filter(a => a).length;
  const elapsed = getElapsedTime();
  
  const historyItem = {
    timestamp: new Date().getTime(),
    subject: currentFile,
    total: data.length,
    answered: answeredCount,
    correct: right,
    wrong: answeredCount - right,
    time: elapsed,
    percentage: Math.round((right / answeredCount) * 100) || 0
  };
  
  const historyKey = 'quiz_history';
  let history = [];
  try {
    const raw = localStorage.getItem(historyKey);
    if (raw) history = JSON.parse(raw);
  } catch {}
  
  history.unshift(historyItem);
  // Keep only last 50 records
  if (history.length > 50) history = history.slice(0, 50);
  
  localStorage.setItem(historyKey, JSON.stringify(history));
}

function loadHistory() {
  const historyKey = 'quiz_history';
  try {
    const raw = localStorage.getItem(historyKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function showHistoryModal() {
  const history = loadHistory();
  
  if (history.length === 0) {
    els.historyContent.innerHTML = '<p class="text-center text-slate-500 py-8">Chưa có lịch sử làm bài</p>';
  } else {
    els.historyContent.innerHTML = history.map(item => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('vi-VN');
      const timeStr = date.toLocaleTimeString('vi-VN');
      
      return `
        <div class="p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-800">${item.subject}</span>
            <span class="text-xs text-slate-500">${dateStr} ${timeStr}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div><span class="text-slate-600">Đúng:</span> <span class="font-semibold text-emerald-600">${item.correct}</span></div>
            <div><span class="text-slate-600">Sai:</span> <span class="font-semibold text-rose-600">${item.wrong}</span></div>
            <div><span class="text-slate-600">Độ chính xác:</span> <span class="font-semibold text-blue-600">${item.percentage}%</span></div>
            <div><span class="text-slate-600">Thời gian:</span> <span class="font-semibold text-purple-600">${formatTime(item.time)}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  els.historyModal.classList.add('open');
}

function showBookmarksModal() {
  if (bookmarks.length === 0) {
    els.bookmarksContent.innerHTML = '<p class="text-center text-slate-500 py-8">Chưa có câu hỏi được đánh dấu</p>';
  } else {
    els.bookmarksContent.innerHTML = bookmarks.map(i => {
      const q = data[i];
      return `
        <div class="p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onclick="goToBookmark(${i})">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="font-bold text-slate-800 mb-2">Câu ${i + 1}</div>
              <div class="text-sm text-slate-600">${q.question}</div>
            </div>
            <button onclick="removeBookmark(${i}, event)" class="ml-2 p-2 hover:bg-rose-50 rounded-lg text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  els.bookmarksModal.classList.add('open');
}

window.goToBookmark = function(i) {
  els.bookmarksModal.classList.remove('open');
  goToQuestion(i);
}

window.removeBookmark = function(i, event) {
  event.stopPropagation();
  const idx = bookmarks.indexOf(i);
  if (idx > -1) {
    bookmarks.splice(idx, 1);
    saveBookmarks();
    showBookmarksModal();
    updateBookmarkButton();
  }
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
  
  // Update bookmark button
  updateBookmarkButton();

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
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
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
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
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
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
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
    stopTimer();
    const right = answered.filter(a => a && a.isCorrect).length;
    const wrong = answered.filter(a => a && !a.isCorrect).length;
    const answered_count = answered.filter(a => a).length;
    const unanswered = data.length - answered_count;
    const elapsed = getElapsedTime();
    
    els.summaryText.textContent = `Bạn đã làm ${answered_count}/${data.length} câu và trả lời đúng ${right}/${answered_count} câu (${Math.round(right*100/answered_count || 0)}%).`;
    
    // Update stats
    $('#statCorrect').textContent = right;
    $('#statWrong').textContent = wrong;
    $('#statUnanswered').textContent = unanswered;
    $('#statTime').textContent = formatTime(elapsed);
    $('#statAvgTime').textContent = answered_count > 0 ? Math.round(elapsed / answered_count) + 's' : '0s';
    $('#chartPercentage').textContent = Math.round(right*100/answered_count || 0) + '%';
    
    // Draw pie chart
    drawPieChart(right, wrong, unanswered);
    
    // Save to history
    saveHistory();
    
    els.summary.classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
}

// ===== Pie Chart =====
function drawPieChart(correct, wrong, unanswered) {
  const total = correct + wrong + unanswered;
  if (total === 0) return;
  
  const svg = $('#pieChart');
  svg.innerHTML = '';
  
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  
  const correctPercent = correct / total;
  const wrongPercent = wrong / total;
  const unansweredPercent = unanswered / total;
  
  let currentAngle = -90; // Start from top
  
  // Draw correct slice
  if (correct > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, correctPercent * 360, '#10b981');
    svg.appendChild(slice);
    currentAngle += correctPercent * 360;
  }
  
  // Draw wrong slice
  if (wrong > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, wrongPercent * 360, '#f43f5e');
    svg.appendChild(slice);
    currentAngle += wrongPercent * 360;
  }
  
  // Draw unanswered slice
  if (unanswered > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, unansweredPercent * 360, '#cbd5e1');
    svg.appendChild(slice);
  }
  
  // Draw white circle in center
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', centerX);
  circle.setAttribute('cy', centerY);
  circle.setAttribute('r', radius * 0.6);
  circle.setAttribute('fill', 'white');
  svg.appendChild(circle);
}

function createSlice(cx, cy, r, startAngle, angle, color) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + angle) * Math.PI) / 180;
  
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  
  const largeArc = angle > 180 ? 1 : 0;
  
  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', color);
  
  return path;
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
  startTime = new Date();
  els.summary.classList.add('hidden');
  renderQuestion();
  saveState();
  startTimer();
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
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  answered[index] = { picked: correctIdx, correctIndex: correctIdx, isCorrect: true };
  score++;
  saveState();
  renderQuestion();
}

// ===== Subject switching =====
async function switchSubject(fileName, title, desc) {
  currentFile = fileName;
  
  try {
    // Load new data
    data = await loadFromUrl(currentFile);
    if (!data.length) throw new Error('Không có câu hỏi trong JSON');
    
    // Reset state
    index = 0;
    score = 0;
    answered = [];
    viewed = [];
    startTime = new Date();
    els.summary.classList.add('hidden');
    
    // Load bookmarks
    bookmarks = loadBookmarks();
    
    // Load saved state if exists
    const state = loadState();
    if (state && state.length === data.length) {
      index = Math.min(state.index ?? 0, data.length - 1);
      score = state.score ?? 0;
      answered = Array.isArray(state.answered) ? state.answered : [];
      viewed = Array.isArray(state.viewed) ? state.viewed : [];
      if (state.startTime) {
        startTime = new Date(state.startTime);
      }
    }
    
    // Update UI
    markAsViewed(index);
    renderQuestion();
    startTimer();
    
    // Update title and description
    if (els.subjectTitle && title) {
      els.subjectTitle.textContent = title;
    }
    if (els.subjectDesc && desc) {
      els.subjectDesc.textContent = desc;
    }
    if (els.currentFile) {
      els.currentFile.textContent = currentFile;
    }
    
    // Update active subject button
    document.querySelectorAll('.subject-nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-file="${currentFile}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    // Close mobile menu
    els.mobileMenu.classList.remove('open');
    els.mobileOverlay.classList.remove('open');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    els.questionText.textContent = `Không tải được dữ liệu từ ${currentFile}. Hãy kiểm tra file.`;
    console.error(err);
  }
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
  els.btnBookmark.addEventListener('click', toggleBookmark);
  
  // New buttons
  els.darkModeToggle.addEventListener('click', toggleDarkMode);
  els.btnBookmarks.addEventListener('click', showBookmarksModal);
  els.btnHistory.addEventListener('click', showHistoryModal);
  
  // Mobile menu
  els.openMobileMenu.addEventListener('click', () => {
    els.mobileMenu.classList.add('open');
    els.mobileOverlay.classList.add('open');
  });
  
  els.closeMobileMenu.addEventListener('click', () => {
    els.mobileMenu.classList.remove('open');
    els.mobileOverlay.classList.remove('open');
  });
  
  els.mobileOverlay.addEventListener('click', () => {
    els.mobileMenu.classList.remove('open');
    els.mobileOverlay.classList.remove('open');
  });
  
  // Modals
  els.closeHistoryModal.addEventListener('click', () => {
    els.historyModal.classList.remove('open');
  });
  
  els.closeBookmarksModal.addEventListener('click', () => {
    els.bookmarksModal.classList.remove('open');
  });
  
  els.historyModal.addEventListener('click', (e) => {
    if (e.target === els.historyModal) {
      els.historyModal.classList.remove('open');
    }
  });
  
  els.bookmarksModal.addEventListener('click', (e) => {
    if (e.target === els.bookmarksModal) {
      els.bookmarksModal.classList.remove('open');
    }
  });
  
  // Subject switcher
  document.querySelectorAll('.subject-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const file = btn.dataset.file;
      const title = btn.dataset.title;
      const desc = btn.dataset.desc;
      if (file && file !== currentFile) {
        switchSubject(file, title, desc);
      }
    });
  });
}

(async function init() {
  attachEvents();
  loadDarkMode();
  
  try {
    // Load data without shuffling
    data = await loadFromUrl(currentFile);
    if (!data.length) throw new Error('Không có câu hỏi trong JSON');

    // Load bookmarks
    bookmarks = loadBookmarks();

    // Load saved state if exists
    const state = loadState();
    if (state && state.length === data.length) {
      index = Math.min(state.index ?? 0, data.length - 1);
      score = state.score ?? 0;
      answered = Array.isArray(state.answered) ? state.answered : [];
      viewed = Array.isArray(state.viewed) ? state.viewed : [];
      if (state.startTime) {
        startTime = new Date(state.startTime);
      } else {
        startTime = new Date();
      }
    } else {
      startTime = new Date();
    }

    // Initial render
    markAsViewed(index);
    renderQuestion();
    startTimer();
    
    // Update file name in footer
    if (els.currentFile) {
      els.currentFile.textContent = currentFile;
    }
  } catch (err) {
    els.questionText.textContent = `Không tải được dữ liệu. Hãy kiểm tra file ${currentFile}.`;
    console.error(err);
  }
})();
