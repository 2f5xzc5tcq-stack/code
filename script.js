// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

// ===== Subjects Config Loader =====
let subjectsConfig = null;

async function loadSubjectsConfig() {
  try {
    const res = await fetch('subjects-config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load subjects config');
    subjectsConfig = await res.json();
    return subjectsConfig;
  } catch (error) {
    console.error('Failed to load subjects config:', error);
    return null;
  }
}

function renderSubjectCards() {
  if (!subjectsConfig) return;
  
  const iconMap = {
    'book': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />',
    'flask': '<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c.251.023.501.05.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 16a9.065 9.065 0 0 1-6.23-.693L5 15.3m14.8 0 .94.235a2.25 2.25 0 0 1-.659 4.428l-.396-.099A13.505 13.505 0 0 1 12 21c-2.761 0-5.348-.827-7.491-2.247l-.396.099a2.25 2.25 0 0 1-.659-4.428l.94-.235" />',
    'sparkles': '<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />',
    'lightning': '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />'
  };
  
  const colorGradients = {
    'blue': { start: '#3b82f6', end: '#2563eb' },
    'green': { start: '#10b981', end: '#059669' },
    'purple': { start: '#8b5cf6', end: '#7c3aed' },
    'red': { start: '#ef4444', end: '#dc2626' },
    'orange': { start: '#f97316', end: '#ea580c' }
  };
  
  const enabledSubjects = subjectsConfig.subjects.filter(s => s.enabled);
  const cardsContainer = document.querySelector('#subjectCards');
  
  if (!cardsContainer) return;
  
  // Sort: unlocked first, then locked
  const sortedSubjects = enabledSubjects.sort((a, b) => {
    const aLocked = a.locked === true ? 1 : 0;
    const bLocked = b.locked === true ? 1 : 0;
    return aLocked - bLocked;
  });
  
  cardsContainer.innerHTML = sortedSubjects.map(subject => {
    const colors = colorGradients[subject.color] || colorGradients['blue'];
    const isLocked = subject.locked === true;
    
    // Check if there's existing progress for this subject
    const savedState = getSavedStateForSubject(subject.file);
    const hasProgress = savedState && savedState.index > 0;
    
    let progressHTML = '';
    if (hasProgress && !isLocked) {
      const progress = Math.round((savedState.index / savedState.length) * 100);
      const timeElapsed = getTimeElapsed(savedState.startTime);
      
      progressHTML = `
        <div class="mt-3 pt-3 border-t border-slate-200" style="border-color: rgba(0,0,0,0.1);">
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="text-slate-600 font-medium">Đang làm dở</span>
            <span class="font-bold" style="color: ${colors.start};">${progress}%</span>
          </div>
          <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width: ${progress}%; background: linear-gradient(90deg, ${colors.start}, ${colors.end});"></div>
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>${timeElapsed}</span>
            <span class="mx-1">•</span>
            <span>Câu ${savedState.index + 1}/${savedState.length}</span>
          </div>
        </div>
      `;
    }
    
    // Note/locked badge
    let badgeHTML = '';
    if (isLocked && subject.note) {
      badgeHTML = `
        <div class="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span>${subject.note}</span>
        </div>
      `;
    }
    
    const buttonText = isLocked ? 'Đã khóa' : (hasProgress ? 'Tiếp tục' : 'Bắt đầu');
    const buttonDisabled = isLocked ? 'disabled' : '';
    const lockedClass = isLocked ? 'subject-card-locked' : '';
    
    return `
      <div class="subject-card ${lockedClass}" 
           data-file="${subject.file}"
           data-title="${subject.title}"
           data-desc="${subject.description}"
           data-has-progress="${hasProgress}"
           data-locked="${isLocked}"
           style="--subject-color-start: ${colors.start}; --subject-color-end: ${colors.end};">
        ${badgeHTML}
        <div class="subject-card-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            ${iconMap[subject.icon] || iconMap['book']}
          </svg>
        </div>
        <div class="subject-card-title">${subject.name}</div>
        <div class="subject-card-desc">${subject.description}</div>
        ${progressHTML}
        <button class="subject-card-button" ${buttonDisabled}><span>${buttonText}</span></button>
      </div>
    `;
  }).join('');
}

// Event delegation for subject cards - only set up once
let subjectCardListenerAttached = false;

function setupSubjectCardListeners() {
  if (subjectCardListenerAttached) {
    console.log('Subject card listeners already attached, skipping');
    return;
  }
  
  const container = document.getElementById('subjectCards');
  if (!container) return;
  
  console.log('Setting up subject card event delegation');
  
  container.addEventListener('click', (e) => {
    // Find the button that was clicked
    const button = e.target.closest('.subject-card-button');
    if (!button) return;
    
    // Check if button is disabled
    if (button.disabled) return;
    
    // Find the parent card
    const card = e.target.closest('.subject-card');
    if (!card) return;
    
    // Check if card is locked
    const isLocked = card.dataset.locked === 'true';
    if (isLocked) return;
    
    console.log('Subject card button clicked!');
    e.preventDefault();
    e.stopPropagation();
    
    const file = card.dataset.file;
    const title = card.dataset.title;
    const desc = card.dataset.desc;
    const hasProgress = card.dataset.hasProgress === 'true';
    
    console.log('Subject card clicked:', { file, title, hasProgress });
    
    // Close change subject modal if it's open
    hideChangeSubjectModal();
    
    // Always start quiz directly - it will restore progress if exists
    startQuiz(file, title, desc);
  });
  
  subjectCardListenerAttached = true;
}

function getSavedStateForSubject(filename) {
  try {
    // Use the same key pattern as saveState/loadState
    const stateKey = `quiz_state_azota_${filename}`;
    const saved = localStorage.getItem(stateKey);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    // Only consider it as progress if they've started (index > 0) and haven't finished
    if (state.index > 0 && state.index < state.length) {
      return state;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getTimeElapsed(startTimeStr) {
  if (!startTimeStr) return 'Chưa có thời gian';
  
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const diffMs = now - startTime;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Vừa mới';
  if (diffMins < 60) return `${diffMins} phút trước`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function showResumeConfirmation(file, title, desc) {
  // SIMPLIFIED: Just start the quiz directly
  // startQuiz -> switchSubject -> loadState will handle restoring progress automatically
  console.log('Starting quiz directly (no resume modal):', file);
  startQuiz(file, title, desc);
}

function hideResumeModal() {
  document.getElementById('resumeQuizModal').classList.remove('open');
}

function showSubjectSelection() {
  document.getElementById('disclaimerInfo').style.display = 'none';
  document.getElementById('subjectSelection').style.display = 'block';
  renderSubjectCards();
}

function startQuiz(file, title, desc) {
  console.log('startQuiz called:', file, title, 'currentFile:', currentFile);
  // Hide modal, show quiz
  document.getElementById('disclaimerModal').style.display = 'none';
  document.getElementById('quizContainer').style.display = 'block';
  
  // Load subject - always switch to load the quiz
  switchSubject(file, title, desc);
}

function showChangeSubjectModal() {
  document.getElementById('changeSubjectModal').classList.add('open');
}

function hideChangeSubjectModal() {
  document.getElementById('changeSubjectModal').classList.remove('open');
}

function goBackToSubjectSelection() {
  hideChangeSubjectModal();
  document.getElementById('quizContainer').style.display = 'none';
  document.getElementById('disclaimerModal').style.display = 'flex';
  document.getElementById('disclaimerInfo').style.display = 'none';
  document.getElementById('subjectSelection').style.display = 'block';
  renderSubjectCards();
}

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

// Disclaimer functions removed - now using new flow

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
    
    // Mobile menu removed in UI redesign
    // els.mobileMenu.classList.remove('open');
    // els.mobileOverlay.classList.remove('open');
    
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
  
  // New disclaimer flow
  els.disclaimerButton.addEventListener('click', () => {
    localStorage.setItem('quiz_disclaimer_accepted', Date.now().toString());
    showSubjectSelection();
  });
  
  // Change subject button
  const btnChangeSubject = document.getElementById('btnChangeSubject');
  if (btnChangeSubject) {
    btnChangeSubject.addEventListener('click', showChangeSubjectModal);
  }
  
  // Change subject modal buttons
  const cancelChangeSubject = document.getElementById('cancelChangeSubject');
  const confirmChangeSubject = document.getElementById('confirmChangeSubject');
  
  if (cancelChangeSubject) {
    cancelChangeSubject.addEventListener('click', hideChangeSubjectModal);
  }
  
  if (confirmChangeSubject) {
    confirmChangeSubject.addEventListener('click', goBackToSubjectSelection);
  }
  
  // Close modal on backdrop click
  const changeSubjectModal = document.getElementById('changeSubjectModal');
  if (changeSubjectModal) {
    changeSubjectModal.addEventListener('click', (e) => {
      if (e.target === changeSubjectModal) {
        hideChangeSubjectModal();
      }
    });
  }
  
  // Resume quiz modal buttons
  const continueQuizBtn = document.getElementById('continueQuizBtn');
  const restartQuizBtn = document.getElementById('restartQuizBtn');
  const resumeQuizModal = document.getElementById('resumeQuizModal');
  
  console.log('Setting up resume modal buttons:', {
    continueQuizBtn,
    restartQuizBtn,
    resumeQuizModal
  });
  
  if (continueQuizBtn) {
    console.log('Attaching click listener to continue button');
    continueQuizBtn.addEventListener('click', (e) => {
      console.log('Continue button clicked', e);
      e.preventDefault();
      e.stopPropagation();
      
      const modal = document.getElementById('resumeQuizModal');
      const file = modal.dataset.file;
      const title = modal.dataset.title;
      const desc = modal.dataset.desc;
      console.log('Continue with:', { file, title, desc });
      hideResumeModal();
      startQuiz(file, title, desc); // Will load saved state
    });
  } else {
    console.error('Continue button not found!');
  }
  
  if (restartQuizBtn) {
    console.log('Attaching click listener to restart button');
    restartQuizBtn.addEventListener('click', (e) => {
      console.log('Restart button clicked', e);
      e.preventDefault();
      e.stopPropagation();
      
      const modal = document.getElementById('resumeQuizModal');
      const file = modal.dataset.file;
      const title = modal.dataset.title;
      const desc = modal.dataset.desc;
      
      // Clear saved state - use same key pattern as saveState
      const stateKey = `quiz_state_azota_${file}`;
      localStorage.removeItem(stateKey);
      console.log('Cleared state:', stateKey);
      
      hideResumeModal();
      startQuiz(file, title, desc); // Will start fresh
    });
  } else {
    console.error('Restart button not found!');
  }
  
  if (resumeQuizModal) {
    console.log('Attaching backdrop click listener to resume modal');
    resumeQuizModal.addEventListener('click', (e) => {
      console.log('Resume modal clicked', e.target);
      if (e.target === resumeQuizModal) {
        hideResumeModal();
      }
    });
  }
  
  els.darkModeToggle.addEventListener('click', toggleDarkMode);
  els.btnBookmarks.addEventListener('click', showBookmarksModal);
  els.btnHistory.addEventListener('click', showHistoryModal);
  
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

function updateActiveTab() {
  // No longer needed since we removed sidebar
  // Keep function for compatibility
}

(async function init() {
  // Load subjects config first
  await loadSubjectsConfig();
  if (!subjectsConfig) {
    alert('Không thể load cấu hình môn học. Vui lòng kiểm tra file subjects-config.json');
    return;
  }
  
  // Standard initialization
  attachEvents();
  loadDarkMode();
  OnlineUsers.init();
  
  // Set up subject card listeners once
  setupSubjectCardListeners();
  
  // Check disclaimer
  const disclaimerTimestamp = localStorage.getItem('quiz_disclaimer_accepted');
  if (!disclaimerTimestamp || Date.now() - parseInt(disclaimerTimestamp) > 7 * 24 * 60 * 60 * 1000) {
    // Show disclaimer info
    $('#disclaimerModal').style.display = 'flex';
    $('#disclaimerInfo').style.display = 'block';
    $('#subjectSelection').style.display = 'none';
  } else {
    // Always show subject selection (simplified - no auto-load)
    $('#disclaimerModal').style.display = 'flex';
    $('#disclaimerInfo').style.display = 'none';
    $('#subjectSelection').style.display = 'block';
    renderSubjectCards();
  }
  
  // Restore last subject or default to first enabled
  const enabledSubjects = subjectsConfig.subjects.filter(s => s.enabled);
  const savedFile = localStorage.getItem('quiz_current_subject');
  const savedSubject = savedFile ? enabledSubjects.find(s => s.file === savedFile) : null;
  
  if (savedSubject) {
    currentFile = savedFile;
  } else if (enabledSubjects.length > 0) {
    currentFile = enabledSubjects[0].file;
    localStorage.setItem('quiz_current_subject', currentFile);
  } else {
    alert('Không có môn học nào được kích hoạt!');
    return;
  }
  
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
    
    // Update UI with active subject info
    const activeSubject = enabledSubjects.find(s => s.file === currentFile);
    if (activeSubject) {
      if (els.subjectTitle) {
        els.subjectTitle.textContent = activeSubject.title;
      }
      if (els.subjectDesc) {
        els.subjectDesc.textContent = activeSubject.description;
      }
      if (els.currentFile) {
        els.currentFile.textContent = currentFile;
      }
    }
    
    // Highlight active button
    updateActiveTab();
  } catch (err) {
    els.questionText.textContent = `Không tải được dữ liệu. Hãy kiểm tra file ${currentFile}.`;
    console.error(err);
  }
})();
