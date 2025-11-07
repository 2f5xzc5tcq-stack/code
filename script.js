// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

// ===== Online Users Module =====
const OnlineUsers = {
  database: null,
  userRef: null,
  onlineRef: null,
  userId: null,
  
  init() {
    try {
      this.database = firebase.database();
      this.userId = this.generateUserId();
      this.onlineRef = this.database.ref('online');
      this.userRef = this.database.ref(`online/${this.userId}`);
      
      this.setupPresence();
      this.listenToOnlineCount();
    } catch (error) {
      console.error('Firebase init error:', error);
      $('#onlineCount').textContent = '??';
    }
  },
  
  generateUserId() {
    let userId = localStorage.getItem('quiz_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('quiz_user_id', userId);
    }
    return userId;
  },
  
  setupPresence() {
    const connectedRef = this.database.ref('.info/connected');
    
    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        this.userRef.onDisconnect().remove();
        
        this.userRef.set({
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          userId: this.userId
        });
      }
    });
    
    window.addEventListener('beforeunload', () => {
      this.userRef.remove();
    });
  },
  
  listenToOnlineCount() {
    this.onlineRef.on('value', (snapshot) => {
      const count = snapshot.numChildren();
      const countEl = $('#onlineCount');
      if (countEl) {
        countEl.textContent = count;
        
        countEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
          countEl.style.transform = 'scale(1)';
        }, 200);
      }
    });
  }
};

// ===== Analytics Module =====
const Analytics = {
  // Track custom events
  track(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    }
    console.log('📊 Analytics:', eventName, params);
  },
  
  // Track page view
  pageView(pageName) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href
      });
    }
  },
  
  // Track quiz events
  startQuiz(subject, totalQuestions) {
    this.track('quiz_start', {
      subject: subject,
      total_questions: totalQuestions,
      timestamp: new Date().toISOString()
    });
  },
  
  answerQuestion(subject, questionNum, isCorrect, timeSpent) {
    this.track('answer_question', {
      subject: subject,
      question_number: questionNum,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent
    });
  },
  
  completeQuiz(subject, stats) {
    this.track('quiz_complete', {
      subject: subject,
      total_questions: stats.total,
      answered: stats.answered,
      correct: stats.correct,
      accuracy: stats.accuracy,
      time_spent: stats.timeSpent
    });
  },
  
  useHint(subject, questionNum) {
    this.track('use_hint', {
      subject: subject,
      question_number: questionNum
    });
  },
  
  addBookmark(subject, questionNum) {
    this.track('add_bookmark', {
      subject: subject,
      question_number: questionNum
    });
  },
  
  switchSubject(fromSubject, toSubject) {
    this.track('switch_subject', {
      from: fromSubject,
      to: toSubject
    });
  },
  
  toggleDarkMode(isEnabled) {
    this.track('toggle_dark_mode', {
      enabled: isEnabled
    });
  }
};

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
  
  darkModeToggle: $('#darkModeToggle'),
  openMobileMenu: $('#openMobileMenu'),
  closeMobileMenu: $('#closeMobileMenu'),
  mobileMenu: $('#mobileMenu'),
  mobileOverlay: $('#mobileOverlay'),
  btnBookmarks: $('#btnBookmarks'),
  btnHistory: $('#btnHistory'),
  disclaimerModal: $('#disclaimerModal'),
  disclaimerButton: $('#disclaimerButton'),
  historyModal: $('#historyModal'),
  closeHistoryModal: $('#closeHistoryModal'),
  historyContent: $('#historyContent'),
  bookmarksModal: $('#bookmarksModal'),
  closeBookmarksModal: $('#closeBookmarksModal'),
  bookmarksContent: $('#bookmarksContent'),
};

let data = [];
let originalData = [];
let index = 0;
let score = 0;
let answered = [];
let viewed = [];
let currentFile = localStorage.getItem('quiz_current_subject') || 'c.json';
let key = 'quiz_state_azota';
let bookmarks = [];
let startTime = null;
let timerInterval = null;
let isDarkMode = false;
let questionOrder = [];
let answerOrderMap = {};

function saveState() {
  const state = { 
    index, 
    score, 
    answered, 
    viewed, 
    length: data.length,
    startTime: startTime ? startTime.getTime() : null,
    questionOrder,
    answerOrderMap
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
    Analytics.addBookmark(currentFile, index + 1);
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

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function shuffleQuestions() {
  questionOrder = shuffleArray([...Array(originalData.length).keys()]);
  data = questionOrder.map(i => originalData[i]);
  
  answerOrderMap = {};
  data.forEach((q, qIdx) => {
    const options = q.answerOptions || q.answeroption || q.answer_options || [];
    if (options.length > 0) {
      answerOrderMap[qIdx] = shuffleArray([...Array(options.length).keys()]);
    }
  });
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  els.darkModeToggle.classList.toggle('active', isDarkMode);
  localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
  
  Analytics.toggleDarkMode(isDarkMode);
}

function loadDarkMode() {
  const saved = localStorage.getItem('darkMode');
  isDarkMode = saved === null ? true : saved === 'true';
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  els.darkModeToggle.classList.toggle('active', isDarkMode);
}

function checkDisclaimer() {
  const disclaimerData = localStorage.getItem('quiz_disclaimer');
  
  if (!disclaimerData) {
    showDisclaimer();
    return;
  }
  
  try {
    const data = JSON.parse(disclaimerData);
    const now = new Date().getTime();
    const diff = now - data.timestamp;
    const hours12 = 12 * 60 * 60 * 1000;
    
    if (diff >= hours12) {
      showDisclaimer();
    } else {
      hideDisclaimer();
    }
  } catch (e) {
    showDisclaimer();
  }
}

function showDisclaimer() {
  if (els.disclaimerModal) {
    els.disclaimerModal.style.display = 'flex';
  }
}

function hideDisclaimer() {
  if (els.disclaimerModal) {
    els.disclaimerModal.style.display = 'none';
  }
  const data = {
    timestamp: new Date().getTime(),
    accepted: true
  };
  localStorage.setItem('quiz_disclaimer', JSON.stringify(data));
}

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

function renderSidebar() {
  els.questionNav.innerHTML = '';
  data.forEach((q, i) => {
    const btn = document.createElement('div');
    btn.className = 'question-nav-item';
    btn.textContent = i + 1;
    
    if (i === index) {
      btn.classList.add('active');
    }
    if (answered[i]) {
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

function renderQuestion() {
  const q = data[index];
  els.card.classList.add('fade-in');
  setTimeout(() => els.card.classList.remove('fade-in'), 200);

  markAsViewed(index);
  updateBookmarkButton();

  const displayNo = index + 1;
  els.questionText.textContent = `${q.question || '(Không có nội dung câu hỏi)'}`;

  if (q.hint && String(q.hint).trim()) {
    els.hintWrap.classList.remove('hidden');
    els.hintText.classList.add('hidden');
    els.hintText.textContent = String(q.hint).trim();
  } else {
    els.hintWrap.classList.add('hidden');
    els.hintText.classList.add('hidden');
  }

  els.choices.innerHTML = '';
  const chosen = answered[index]?.picked ?? null;
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  
  const shuffledOrder = answerOrderMap[index] || [...Array(options.length).keys()];
  const shuffledOptions = shuffledOrder.map(i => ({ ...options[i], originalIndex: i }));
  
  shuffledOptions.forEach((opt, displayIdx) => {
    const originalIdx = opt.originalIndex;
    const isPicked = chosen === originalIdx;
    const base = 'choice rounded-xl border-2 px-5 py-4 text-sm sm:text-base transition-all cursor-pointer';
    let cls = 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md';
    let badge = '';
    
    if (answered[index]) {
      if (originalIdx === correctIdx) {
        cls = 'border-emerald-400 bg-gradient-to-r from-emerald-100 to-green-100 shadow-md';
        badge = '<span class="inline-block ml-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">Đúng</span>';
      }
      if (isPicked && chosen !== correctIdx) {
        cls = 'border-rose-400 bg-gradient-to-r from-rose-100 to-red-100 shadow-md';
        badge = '<span class="inline-block ml-2 px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded">Sai</span>';
      }
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${base} ${cls} text-left`;
    btn.innerHTML = `<div class="flex items-start gap-3"><span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-sm flex-shrink-0">${String.fromCharCode(65 + displayIdx)}</span><span class="font-medium text-slate-900 flex-1">${opt.text}${badge}</span></div>`;
    btn.addEventListener('click', () => onPick(originalIdx));
    els.choices.appendChild(btn);
  });

  if (answered[index]) {
    showExplain(q, answered[index].picked);
  } else {
    els.explainWrap.classList.add('hidden');
    els.explainText.textContent = '';
  }

  els.btnReveal.classList.toggle('hidden', !!answered[index]);

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
  
  const rationaleText = isCorrect ? correct.rationale : (picked?.rationale || correct.rationale);
  const hasRationale = picked?.rationale || correct?.rationale;
  const rationaleId = `rationale-${index}`;
  
  const html = hasRationale
    ? `<div class="mt-3">
        <button onclick="toggleRationale('${rationaleId}')" class="w-full text-center py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg">
          Xem giải thích chi tiết
        </button>
        <div id="${rationaleId}" class="hidden mt-3 p-4 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border-l-4 border-blue-400 shadow-lg">
          <div class="font-semibold text-blue-300 mb-2 text-sm">💡 Giải thích chi tiết</div>
          <div class="text-slate-200 leading-relaxed">${rationaleText}</div>
        </div>
      </div>`
    : '';

  els.explainText.innerHTML = html;
  els.explainWrap.classList.remove('hidden');
}

window.toggleRationale = function(id) {
  const element = document.getElementById(id);
  const button = element.previousElementSibling;
  
  if (element.classList.contains('hidden')) {
    element.classList.remove('hidden');
    button.textContent = 'Ẩn giải thích';
    button.classList.remove('bg-blue-100', 'hover:bg-blue-200');
    button.classList.add('bg-slate-100', 'hover:bg-slate-200');
  } else {
    element.classList.add('hidden');
    button.textContent = 'Xem giải thích chi tiết';
    button.classList.remove('bg-slate-100', 'hover:bg-slate-200');
    button.classList.add('bg-blue-100', 'hover:bg-blue-200');
  }
}

function onPick(i) {
  const q = data[index];
  const options = q.answerOptions || q.answeroption || q.answer_options || [];
  const correctIdx = options.findIndex(o => o.isCorrect);
  
  if (!answered[index]) {
    const isCorrect = i === correctIdx;
    answered[index] = { picked: i, correctIndex: correctIdx, isCorrect };
    if (isCorrect) score++;
    
    const timeSpent = getElapsedTime();
    Analytics.answerQuestion(currentFile, index + 1, isCorrect, timeSpent);
    
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
    
    $('#statCorrect').textContent = right;
    $('#statWrong').textContent = wrong;
    $('#statUnanswered').textContent = unanswered;
    $('#statTime').textContent = formatTime(elapsed);
    $('#statAvgTime').textContent = answered_count > 0 ? Math.round(elapsed / answered_count) + 's' : '0s';
    $('#chartPercentage').textContent = Math.round(right*100/answered_count || 0) + '%';
    
    drawPieChart(right, wrong, unanswered);
    saveHistory();
    
    Analytics.completeQuiz(currentFile, {
      total: data.length,
      answered: answered_count,
      correct: right,
      accuracy: Math.round(right*100/answered_count || 0),
      timeSpent: elapsed
    });
    
    els.summary.classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
}

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
  
  let currentAngle = -90;
  
  if (correct > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, correctPercent * 360, '#10b981');
    svg.appendChild(slice);
    currentAngle += correctPercent * 360;
  }
  
  if (wrong > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, wrongPercent * 360, '#f43f5e');
    svg.appendChild(slice);
    currentAngle += wrongPercent * 360;
  }
  
  if (unanswered > 0) {
    const slice = createSlice(centerX, centerY, radius, currentAngle, unansweredPercent * 360, '#cbd5e1');
    svg.appendChild(slice);
  }
  
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
  
  shuffleQuestions();
  
  renderQuestion();
  saveState();
  startTimer();
}

function reviewWrong() {
  const wrongIndices = [];
  answered.forEach((ans, i) => {
    if (ans && !ans.isCorrect) {
      wrongIndices.push(i);
    }
  });
  
  if (wrongIndices.length > 0) {
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

async function switchSubject(fileName, title, desc) {
  const previousSubject = currentFile;
  currentFile = fileName;
  
  // Lưu môn học hiện tại vào localStorage
  localStorage.setItem('quiz_current_subject', currentFile);
  
  Analytics.switchSubject(previousSubject, currentFile);
  
  try {
    originalData = await loadFromUrl(currentFile);
    if (!originalData.length) throw new Error('Không có câu hỏi trong JSON');
    
    index = 0;
    score = 0;
    answered = [];
    viewed = [];
    startTime = new Date();
    els.summary.classList.add('hidden');
    
    bookmarks = loadBookmarks();
    
    const state = loadState();
    if (state && state.length === originalData.length && state.questionOrder && state.questionOrder.length === originalData.length) {
      questionOrder = state.questionOrder;
      data = questionOrder.map(i => originalData[i]);
      answerOrderMap = state.answerOrderMap || {};
      
      if (Object.keys(answerOrderMap).length === 0) {
        data.forEach((q, qIdx) => {
          const options = q.answerOptions || q.answeroption || q.answer_options || [];
          if (options.length > 0) {
            answerOrderMap[qIdx] = shuffleArray([...Array(options.length).keys()]);
          }
        });
      }
      
      index = Math.min(state.index ?? 0, data.length - 1);
      score = state.score ?? 0;
      answered = Array.isArray(state.answered) ? state.answered : [];
      viewed = Array.isArray(state.viewed) ? state.viewed : [];
      if (state.startTime) {
        startTime = new Date(state.startTime);
      }
    } else {
      shuffleQuestions();
    }
    
    markAsViewed(index);
    renderQuestion();
    startTimer();
    
    if (els.subjectTitle && title) {
      els.subjectTitle.textContent = title;
    }
    if (els.subjectDesc && desc) {
      els.subjectDesc.textContent = desc;
    }
    if (els.currentFile) {
      els.currentFile.textContent = currentFile;
    }
    
    document.querySelectorAll('.subject-nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-file="${currentFile}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    els.mobileMenu.classList.remove('open');
    els.mobileOverlay.classList.remove('open');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    els.questionText.textContent = `Không tải được dữ liệu từ ${currentFile}. Hãy kiểm tra file.`;
    console.error(err);
  }
}

async function loadFromUrl(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được JSON');
  const json = await res.json();
  return json.questions || json.question || [];
}

function attachEvents() {
  els.btnNext.addEventListener('click', next);
  els.btnPrev.addEventListener('click', prev);
  els.btnRestart.addEventListener('click', restart);
  els.btnRestart2.addEventListener('click', restart);
  els.btnReviewWrong.addEventListener('click', reviewWrong);
  els.btnHint.addEventListener('click', () => {
    els.hintText.classList.toggle('hidden');
    if (!els.hintText.classList.contains('hidden')) {
      Analytics.useHint(currentFile, index + 1);
    }
  });
  els.btnReveal.addEventListener('click', revealAnswer);
  els.btnBookmark.addEventListener('click', toggleBookmark);
  
  els.disclaimerButton.addEventListener('click', hideDisclaimer);
  
  els.darkModeToggle.addEventListener('click', toggleDarkMode);
  els.btnBookmarks.addEventListener('click', showBookmarksModal);
  els.btnHistory.addEventListener('click', showHistoryModal);
  
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
  checkDisclaimer();
  OnlineUsers.init();
  
  try {
    originalData = await loadFromUrl(currentFile);
    if (!originalData.length) throw new Error('Không có câu hỏi trong JSON');

    bookmarks = loadBookmarks();

    const state = loadState();
    if (state && state.length === originalData.length && state.questionOrder && state.questionOrder.length === originalData.length) {
      questionOrder = state.questionOrder;
      data = questionOrder.map(i => originalData[i]);
      answerOrderMap = state.answerOrderMap || {};
      
      if (Object.keys(answerOrderMap).length === 0) {
        data.forEach((q, qIdx) => {
          const options = q.answerOptions || q.answeroption || q.answer_options || [];
          if (options.length > 0) {
            answerOrderMap[qIdx] = shuffleArray([...Array(options.length).keys()]);
          }
        });
      }
      
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
      shuffleQuestions();
      startTime = new Date();
      Analytics.startQuiz(currentFile, originalData.length);
    }

    markAsViewed(index);
    renderQuestion();
    startTimer();
    
    // Update UI với thông tin subject hiện tại
    if (els.currentFile) {
      els.currentFile.textContent = currentFile;
    }
    
    // Tìm và update title/desc từ button tương ứng
    const activeBtn = document.querySelector(`[data-file="${currentFile}"]`);
    if (activeBtn) {
      const title = activeBtn.dataset.title;
      const desc = activeBtn.dataset.desc;
      
      if (els.subjectTitle && title) {
        els.subjectTitle.textContent = title;
      }
      if (els.subjectDesc && desc) {
        els.subjectDesc.textContent = desc;
      }
      
      // Set active state cho button
      document.querySelectorAll('.subject-nav-item').forEach(btn => {
        btn.classList.remove('active');
      });
      activeBtn.classList.add('active');
    }
  } catch (err) {
    els.questionText.textContent = `Không tải được dữ liệu. Hãy kiểm tra file ${currentFile}.`;
    console.error(err);
  }
})();
