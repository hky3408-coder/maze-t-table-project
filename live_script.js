// Initialize Icons
lucide.createIcons();

// Opening Sequence
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('opening-overlay');
  if (overlay) {
    setTimeout(() => {
      overlay.classList.add('opacity-0');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 700); // transition duration (700ms)
    }, 2200); // 2.2 seconds active
  }
});

// --- Configuration ---

// --- State ---
let userLevel = 3;
let isLoading = false;
let isFirstMainView = true;
let isLightMode = false;
let showHint = false;

// Auth State
let currentUser = null;
let isGuest = false;

// Global UI State
let currentPanel = 'chat';

// Helper Functions
function getColorForLevel(level) {
  const l = parseInt(level, 10) || 3;
  if (l <= 3) return '#10B981';
  if (l <= 7) return '#3B82F6';
  return '#8B5CF6';
}

function syncLevel(level) {
  const l = parseInt(level, 10) || 3;
  userLevel = l;
  if (levelSlider) levelSlider.value = l;
  if (levelDisplay) levelDisplay.textContent = l;
}

function persistGuestData() {
  if (isGuest) {
    try {
      localStorage.setItem('synapse_guest_folders', JSON.stringify(folders));
    } catch (e) {}
  }
}

function loadGuestData() {
  if (isGuest) {
    try {
      const saved = localStorage.getItem('synapse_guest_folders');
      if (saved) {
        folders = JSON.parse(saved);
        folderIdCounter = Object.keys(folders).length;
      }
    } catch (e) {}
  }
}

// Folder-based state management
let folders = {};       // { id: { name, emoji, messages: [{role, content}], mistakes: [], chatSession: null, history: [], uploadedContext: "" } }
let currentFolderId = null;
let folderIdCounter = 0;

// Quiz state
let quizState = null;  // { questions: [], answers: [], currentIndex: 0, graded: false, folderId: string }

// --- DOM Elements ---
const viewLanding = document.getElementById('view-landing');
const viewIntro = document.getElementById('view-intro');
const viewAuth = document.getElementById('view-auth');
const viewMain = document.getElementById('view-main');

const btnStartDiscovery = document.getElementById('btn-start-discovery');
const btnNextAuth = document.getElementById('btn-next-auth');
const btnAuthLogin = document.getElementById('btn-auth-login');
const btnAuthGuest = document.getElementById('btn-auth-guest');

// Email Auth Elements
const authTitle = document.getElementById('auth-title');
const authEmailForm = document.getElementById('auth-email-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const authToggleText = document.getElementById('auth-toggle-text');
const btnAuthToggle = document.getElementById('btn-auth-toggle');
let isSignUpMode = false;

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const btnDebugNotes = document.getElementById('btn-debug-notes');
const btnAnalyticsView = document.getElementById('btn-analytics-view');
const btnHint = document.getElementById('btn-hint');
const btnSettings = document.getElementById('btn-settings');

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal');
const settingsBackdrop = document.getElementById('settings-backdrop');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsLogout = document.getElementById('btn-settings-logout');
const settingsUserAvatar = document.getElementById('settings-user-avatar');
const settingsUserAvatarPlaceholder = document.getElementById('settings-user-avatar-placeholder');
const settingsUserEmail = document.getElementById('settings-user-email');
const settingsUserStatus = document.getElementById('settings-user-status');

const levelSlider = document.getElementById('level-slider');
const levelDisplay = document.getElementById('level-display');
const fallbackModal = document.getElementById('fallback-modal');
const fallbackBorder = document.getElementById('fallback-border');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const sendIcon = document.getElementById('send-icon');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');
const currentFolderName = document.getElementById('current-folder-name');
const currentFolderLabel = document.getElementById('current-folder-label');

const btnChatFileUpload = document.getElementById('btn-chat-file-upload');
const chatFileInput = document.getElementById('chat-file-input');

const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialBackdrop = document.getElementById('tutorial-backdrop');
const tutorialTooltip = document.getElementById('tutorial-tooltip');
const btnNewFolder = document.getElementById('btn-new-folder');
const folderModal = document.getElementById('folder-modal');
const folderModalContent = document.getElementById('folder-modal-content');
const btnCloseFolderModal = document.getElementById('btn-close-folder-modal');
const folderForm = document.getElementById('folder-form');
const folderNameInput = document.getElementById('folder-name-input');
const folderList = document.getElementById('folder-list');

// Panels
const panelChat = document.getElementById('panel-chat');
const panelDebug = document.getElementById('panel-debug');
const panelQuiz = document.getElementById('panel-quiz');
const panelAnalytics = document.getElementById('panel-analytics');
const debugContent = document.getElementById('debug-content');
const debugTitle = document.getElementById('debug-title');
const analyticsContent = document.getElementById('analytics-content');
const quizContent = document.getElementById('quiz-content');
const quizProgress = document.getElementById('quiz-progress');
const btnDebugBack = document.getElementById('btn-debug-back');
const btnQuizBack = document.getElementById('btn-quiz-back');
const btnAnalyticsBack = document.getElementById('btn-analytics-back');
const btnQuizPrev = document.getElementById('btn-quiz-prev');
const btnQuizNext = document.getElementById('btn-quiz-next');

// ================================================
// VIEW TRANSITIONS
// ================================================
function switchView(targetView) {
  [viewLanding, viewIntro, viewAuth, viewMain].forEach(view => {
    view.classList.remove('opacity-100', 'pointer-events-auto');
    view.classList.add('opacity-0', 'pointer-events-none');
  });
  targetView.classList.remove('opacity-0', 'pointer-events-none');
  targetView.classList.add('opacity-100', 'pointer-events-auto');

  if (targetView === viewIntro) {
    setTimeout(() => {
      document.getElementById('intro-content').classList.replace('translate-y-10', 'translate-y-0');
    }, 50);
  }
  if (targetView === viewAuth) {
    setTimeout(() => {
      document.getElementById('auth-modal-content').classList.replace('translate-y-10', 'translate-y-0');
    }, 50);
  }
  if (targetView === viewMain && isFirstMainView) {
    isFirstMainView = false;
    const hasFolders = Object.keys(folders).length > 0;
    if (!hasFolders) {
      setTimeout(() => {
        if (tutorialOverlay) {
          tutorialOverlay.classList.remove('hidden');
          void tutorialOverlay.offsetWidth;
          tutorialOverlay.classList.remove('opacity-0');
          tutorialOverlay.classList.add('opacity-100');
        }
        if (tutorialTooltip) {
          tutorialTooltip.classList.remove('hidden');
          tutorialTooltip.classList.remove('opacity-0');
          tutorialTooltip.classList.add('opacity-100');
        }
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('sidebar-tutorial-active');
        if (btnNewFolder) btnNewFolder.classList.add('tutorial-highlight');
        lucide.createIcons();
      }, 800);
    }
  }
}

btnStartDiscovery.addEventListener('click', () => switchView(viewIntro));
btnNextAuth.addEventListener('click', () => switchView(viewAuth));

btnAuthLogin.addEventListener('click', async () => {
  if (window.supabaseAPI) {
    await window.supabaseAPI.signInWithGoogle();
  } else {
    alert("Supabase 데이터베이스가 아직 초기화되지 않았습니다.");
  }
});

if (btnAuthToggle) {
  btnAuthToggle.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
      authTitle.textContent = 'Create Account';
      btnAuthSubmit.textContent = 'Sign Up';
      authToggleText.textContent = 'Already have an account?';
      btnAuthToggle.textContent = 'Sign In';
    } else {
      authTitle.textContent = 'Sign In';
      btnAuthSubmit.textContent = 'Continue with Email';
      authToggleText.textContent = 'New to Synapse?';
      btnAuthToggle.textContent = 'Create Account';
    }
  });
}

if (authEmailForm) {
  authEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.supabaseAPI) {
      alert("Supabase 데이터베이스가 아직 초기화되지 않았습니다.");
      return;
    }
    
    const email = authEmail.value;
    const password = authPassword.value;
    const originalText = btnAuthSubmit.textContent;
    btnAuthSubmit.textContent = '처리 중...';
    btnAuthSubmit.disabled = true;

    try {
      if (isSignUpMode) {
        const { error } = await window.supabaseAPI.signUpWithEmail(email, password);
        if (error) throw error;
        alert('회원가입 성공! (이메일 인증이 필요할 수 있습니다)');
        // 성공 시 폼 초기화 후 로그인 모드로 자동 전환
        authEmailForm.reset();
        btnAuthToggle.click();
      } else {
        const { error } = await window.supabaseAPI.signInWithEmail(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
          }
          throw error;
        }
        // 로그인이 성공하면 사용자 정보를 불러오고 메인 화면으로 전환합니다.
        await initAuth();
      }
    } catch (err) {
      alert('오류: ' + err.message);
    } finally {
      btnAuthSubmit.textContent = originalText;
      btnAuthSubmit.disabled = false;
    }
  });
}

function ensureDefaultWorkspace() {
  if (Object.keys(folders).length === 0) {
    const id = 'folder_1';
    folders[id] = {
      name: '자유 탐구',
      emoji: '💡',
      level: 3,
      messages: [],
      mistakes: [],
      chatSession: null,
      history: [],
      uploadedContext: "",
      trapActive: false,
      currentTrapData: null
    };
    folderIdCounter = 1;
    renderFolderList();
    switchToFolder(id);
  }
}

function resetGuestData() {
  try {
    localStorage.removeItem('synapse_guest_folders');
  } catch (e) {}
  folders = {};
  currentFolderId = null;
  folderIdCounter = 0;
  renderFolderList();
}

btnAuthGuest.addEventListener('click', () => {
  isGuest = true;
  currentUser = null;
  resetGuestData();
  ensureDefaultWorkspace();
  updateSidebarAuth();
  switchView(viewMain);
});

// Floating Profile Circle & Theme Elements
const btnProfileCircle = document.getElementById('btn-profile-circle');
const circleAvatarImg = document.getElementById('circle-avatar-img');
const circleAvatarPlaceholder = document.getElementById('circle-avatar-placeholder');
const profilePopover = document.getElementById('profile-popover');
const popoverAvatarImg = document.getElementById('popover-avatar-img');
const popoverAvatarPlaceholder = document.getElementById('popover-avatar-placeholder');
const popoverUserEmail = document.getElementById('popover-user-email');
const popoverUserStatus = document.getElementById('popover-user-status');
const btnProfileLogout = document.getElementById('btn-profile-logout');

const btnThemeDark = document.getElementById('btn-theme-dark');
const btnThemeLight = document.getElementById('btn-theme-light');
const btnSettingsCloseX = document.getElementById('btn-settings-close-x');

const sidebarUserEmail = document.getElementById('sidebar-user-email');
const sidebarUserStatus = document.getElementById('sidebar-user-status');

function updateProfileUI() {
  if (currentUser) {
    const email = currentUser.email || '사용자 계정';
    const avatar = currentUser.user_metadata?.avatar_url;
    const provider = currentUser.app_metadata?.provider === 'google' ? 'Google 연동됨' : '이메일 계정';

    if (popoverUserEmail) popoverUserEmail.textContent = email;
    if (popoverUserStatus) popoverUserStatus.textContent = provider;
    if (sidebarUserEmail) sidebarUserEmail.textContent = email;
    if (sidebarUserStatus) sidebarUserStatus.textContent = provider;

    if (avatar) {
      if (circleAvatarImg) {
        circleAvatarImg.src = avatar;
        circleAvatarImg.classList.remove('hidden');
      }
      if (circleAvatarPlaceholder) circleAvatarPlaceholder.classList.add('hidden');

      if (popoverAvatarImg) {
        popoverAvatarImg.src = avatar;
        popoverAvatarImg.classList.remove('hidden');
      }
      if (popoverAvatarPlaceholder) popoverAvatarPlaceholder.classList.add('hidden');
    } else {
      const initial = email[0].toUpperCase();
      if (circleAvatarImg) circleAvatarImg.classList.add('hidden');
      if (circleAvatarPlaceholder) {
        circleAvatarPlaceholder.classList.remove('hidden');
        circleAvatarPlaceholder.textContent = initial;
      }

      if (popoverAvatarImg) popoverAvatarImg.classList.add('hidden');
      if (popoverAvatarPlaceholder) {
        popoverAvatarPlaceholder.classList.remove('hidden');
        popoverAvatarPlaceholder.textContent = initial;
      }
    }
  } else {
    if (popoverUserEmail) popoverUserEmail.textContent = '게스트 세션';
    if (popoverUserStatus) popoverUserStatus.textContent = '게스트 모드';
    if (sidebarUserEmail) sidebarUserEmail.textContent = '게스트 세션';
    if (sidebarUserStatus) sidebarUserStatus.textContent = '게스트 모드';

    if (circleAvatarImg) circleAvatarImg.classList.add('hidden');
    if (circleAvatarPlaceholder) {
      circleAvatarPlaceholder.classList.remove('hidden');
      circleAvatarPlaceholder.textContent = '?';
    }

    if (popoverAvatarImg) popoverAvatarImg.classList.add('hidden');
    if (popoverAvatarPlaceholder) {
      popoverAvatarPlaceholder.classList.remove('hidden');
      popoverAvatarPlaceholder.textContent = '?';
    }
  }
}

if (btnProfileCircle) {
  btnProfileCircle.addEventListener('click', (e) => {
    e.stopPropagation();
    updateProfileUI();
    if (profilePopover) profilePopover.classList.toggle('hidden');
  });
}

document.addEventListener('click', (e) => {
  if (profilePopover && !profilePopover.contains(e.target) && e.target !== btnProfileCircle) {
    profilePopover.classList.add('hidden');
  }
});

if (btnProfileLogout) {
  btnProfileLogout.addEventListener('click', async () => {
    if (window.supabaseAPI && currentUser) {
      await window.supabaseAPI.signOut();
    }
    currentUser = null;
    isGuest = false;
    try {
      localStorage.removeItem('synapse_guest_folders');
    } catch(e){}
    window.location.reload();
  });
}

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (btnThemeLight) {
      btnThemeLight.classList.add('border-mint', 'bg-mint/10', 'text-white');
      btnThemeLight.classList.remove('border-borderColor', 'bg-[#0A0A0B]', 'text-grayText');
    }
    if (btnThemeDark) {
      btnThemeDark.classList.remove('border-mint', 'bg-mint/10', 'text-white');
      btnThemeDark.classList.add('border-borderColor', 'bg-[#0A0A0B]', 'text-grayText');
    }
  } else {
    document.body.classList.remove('light-theme');
    if (btnThemeDark) {
      btnThemeDark.classList.add('border-mint', 'bg-mint/10', 'text-white');
      btnThemeDark.classList.remove('border-borderColor', 'bg-[#0A0A0B]', 'text-grayText');
    }
    if (btnThemeLight) {
      btnThemeLight.classList.remove('border-mint', 'bg-mint/10', 'text-white');
      btnThemeLight.classList.add('border-borderColor', 'bg-[#0A0A0B]', 'text-grayText');
    }
  }
  try {
    localStorage.setItem('synapse_theme', theme);
  } catch(e){}
}

if (btnThemeDark) {
  btnThemeDark.addEventListener('click', () => setTheme('dark'));
}
if (btnThemeLight) {
  btnThemeLight.addEventListener('click', () => setTheme('light'));
}

const savedTheme = localStorage.getItem('synapse_theme') || 'dark';
setTheme(savedTheme);

// Settings Modal Logic
function openSettingsModal() {
  settingsModal.classList.remove('hidden');
  settingsModal.classList.add('flex');
  void settingsModal.offsetWidth;
  settingsModal.classList.remove('opacity-0');
  settingsModal.classList.add('opacity-100');

  const content = document.getElementById('settings-content');
  if (content) {
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
  }
}

function closeSettingsModal() {
  settingsModal.classList.remove('opacity-100');
  settingsModal.classList.add('opacity-0');
  const content = document.getElementById('settings-content');
  if (content) {
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
  }
  setTimeout(() => {
    settingsModal.classList.remove('flex');
    settingsModal.classList.add('hidden');
  }, 300);
}

btnSettings.addEventListener('click', openSettingsModal);
settingsBackdrop.addEventListener('click', closeSettingsModal);
btnSettingsClose.addEventListener('click', closeSettingsModal);
if (btnSettingsCloseX) btnSettingsCloseX.addEventListener('click', closeSettingsModal);

// ================================================
// PANEL SWITCHING (Chat / Debug / Quiz / Analytics)
// ================================================
function showPanel(panelName) {
  currentPanel = panelName;

  panelChat.classList.add('hidden');
  panelChat.classList.remove('flex');
  panelDebug.classList.add('hidden');
  panelDebug.classList.remove('flex');
  panelQuiz.classList.add('hidden');
  panelQuiz.classList.remove('flex');
  panelAnalytics.classList.add('hidden');
  panelAnalytics.classList.remove('flex');

  // Reset active classes on static sidebar buttons
  btnDebugNotes.classList.remove('sidebar-item-active');
  btnAnalyticsView.classList.remove('sidebar-item-active');

  if (panelName === 'chat') {
    panelChat.classList.remove('hidden');
    panelChat.classList.add('flex');
  } else if (panelName === 'debug') {
    panelDebug.classList.remove('hidden');
    panelDebug.classList.add('flex');
    btnDebugNotes.classList.add('sidebar-item-active');
  } else if (panelName === 'quiz') {
    panelQuiz.classList.remove('hidden');
    panelQuiz.classList.add('flex');
    btnDebugNotes.classList.add('sidebar-item-active');
  } else if (panelName === 'analytics') {
    panelAnalytics.classList.remove('hidden');
    panelAnalytics.classList.add('flex');
    btnAnalyticsView.classList.add('sidebar-item-active');
  }
  
  renderFolderList(); // Sync active state of folder items
  lucide.createIcons();
}

// ================================================
// THEME TOGGLE
// ================================================
btnThemeToggle.addEventListener('click', () => {
  isLightMode = !isLightMode;
  if (isLightMode) {
    document.body.classList.add('light-mode');
    themeIcon.setAttribute('data-lucide', 'moon');
    themeText.textContent = '다크 모드';
  } else {
    document.body.classList.remove('light-mode');
    themeIcon.setAttribute('data-lucide', 'sun');
    themeText.textContent = '라이트 모드';
  }
  lucide.createIcons();
});

// ================================================
// HINT TOGGLE
// ================================================
if (btnHint) {
  btnHint.addEventListener('click', () => {
    if (isLoading) return;
    showHint = !showHint;

    if (showHint) {
      btnHint.classList.add('bg-mint', 'text-[#050505]');
      btnHint.classList.remove('bg-[var(--mint-bg-10)]', 'text-mint');
      btnHint.querySelector('span').textContent = '힌트 켜짐';
    } else {
      btnHint.classList.remove('bg-mint', 'text-[#050505]');
      btnHint.classList.add('bg-[var(--mint-bg-10)]', 'text-mint');
      btnHint.querySelector('span').textContent = '힌트 꺼짐';
    }

    if (currentFolderId && folders[currentFolderId]) {
      messagesContainer.innerHTML = '';
      if (folders[currentFolderId].messages.length === 0) {
        messagesContainer.innerHTML = `
          <div id="empty-state" class="flex flex-col items-center justify-center h-full text-grayText gap-6 transition-opacity duration-500">
            <div class="relative">
              <div class="absolute inset-0 bg-[var(--mint-bg-10)] blur-xl rounded-full"></div>
              <i data-lucide="cpu" class="w-20 h-20 text-mint opacity-50 relative z-10"></i>
            </div>
            <p class="text-xl font-light text-center">"${folders[currentFolderId].name}" 탐구를 시작하세요!<br/>첫 질문을 입력해 보세요.</p>
          </div>
        `;
      } else {
        folders[currentFolderId].messages.forEach(msg => {
          addMessageToDOM(msg.role, msg.content);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      lucide.createIcons();
    }
  });
}

// ================================================
// FOLDER MODAL
// ================================================
function closeTutorial() {
  if (tutorialOverlay) {
    tutorialOverlay.classList.remove('opacity-100');
    tutorialOverlay.classList.add('opacity-0');
    setTimeout(() => {
      if (tutorialOverlay) tutorialOverlay.classList.add('hidden');
    }, 300);
  }
  if (tutorialTooltip) {
    tutorialTooltip.classList.remove('opacity-100');
    tutorialTooltip.classList.add('opacity-0');
    setTimeout(() => {
      if (tutorialTooltip) tutorialTooltip.classList.add('hidden');
    }, 300);
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('sidebar-tutorial-active');
  if (btnNewFolder) btnNewFolder.classList.remove('tutorial-highlight');
}

function openFolderModal() {
  closeTutorial();

  folderModal.classList.remove('opacity-0', 'pointer-events-none');
  folderModal.classList.add('opacity-100', 'pointer-events-auto');
  setTimeout(() => {
    folderModalContent.classList.replace('scale-95', 'scale-100');
    folderNameInput.focus();
  }, 50);
}

function closeFolderModal() {
  folderModalContent.classList.replace('scale-100', 'scale-95');
  folderModal.classList.remove('opacity-100', 'pointer-events-auto');
  folderModal.classList.add('opacity-0', 'pointer-events-none');
}

btnNewFolder.addEventListener('click', openFolderModal);
if (tutorialOverlay) {
  tutorialOverlay.addEventListener('click', closeTutorial);
}
if (tutorialBackdrop) {
  tutorialBackdrop.addEventListener('click', closeTutorial);
}
btnCloseFolderModal.addEventListener('click', closeFolderModal);

// ================================================
// FOLDER CREATION & SWITCHING
// ================================================

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

folderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = folderNameInput.value.trim();
  const emoji = '📁';
  if (!name) return;

  const id = currentUser ? generateUUID() : 'folder_' + (++folderIdCounter);
  const newFolder = {
    name,
    emoji,
    level: 3,
    messages: [],
    mistakes: [],
    chatSession: null,
    history: [],
    uploadedContext: "",
    trapActive: false,
    currentTrapData: null
  };
  folders[id] = newFolder;

  if (currentUser && window.supabaseAPI) {
    await window.supabaseAPI.insertFolder({
      id,
      user_id: currentUser.id,
      name,
      emoji,
      level: 3,
      mistakes: [],
      trapActive: false,
      currentTrapData: null
    });
  } else {
    persistGuestData();
  }

  renderFolderList();
  switchToFolder(id);

  folderNameInput.value = '';
  closeFolderModal();
  setTimeout(() => chatInput.focus(), 400);
});

function renderFolderList() {
  folderList.innerHTML = '';
  Object.keys(folders).forEach(id => {
    const f = folders[id];
    const isActive = (id === currentFolderId) && (currentPanel === 'chat');
    const level = f.level || 3;
    const levelColor = getColorForLevel(level);
    const btn = document.createElement('button');
    btn.className = `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-[var(--border-color)] group/item w-full border ${isActive ? 'folder-item-active border-[var(--mint-color)]' : 'border-transparent'}`;
    btn.innerHTML = `
      <div class="w-5 h-5 shrink-0 flex items-center justify-center transition-colors ${isActive ? 'text-mint' : 'text-grayText group-hover/item:text-mint'}">
        <i data-lucide="folder"></i>
      </div>
      <span class="font-medium text-sm truncate text-left opacity-0 transition-opacity duration-300 ease-uber-smooth group-hover:opacity-100 flex-1" style="color: ${isActive ? 'var(--mint-color)' : 'var(--gray-text)'};">${f.name}</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 opacity-0 transition-opacity duration-300 ease-uber-smooth group-hover:opacity-100" style="color: ${levelColor}; background-color: ${levelColor}15; border: 1px solid ${levelColor}30;">Lv.${level}</span>
    `;
    btn.addEventListener('click', () => switchToFolder(id));
    folderList.appendChild(btn);
  });
}

function switchToFolder(id) {
  if (isLoading) return;

  currentFolderId = id;
  const folder = folders[id];

  // Sync the level of this folder
  syncLevel(folder.level || 3);

  // Update header
  currentFolderName.classList.remove('hidden');
  currentFolderLabel.textContent = folder.name;

  // Clear and re-render messages
  messagesContainer.innerHTML = '';
  if (folder.messages.length === 0) {
    messagesContainer.innerHTML = `
      <div id="empty-state" class="flex flex-col items-center justify-center h-full text-grayText gap-6 transition-opacity duration-500">
        <div class="relative">
          <div class="absolute inset-0 bg-[var(--mint-bg-10)] blur-xl rounded-full"></div>
          <i data-lucide="cpu" class="w-20 h-20 text-mint opacity-50 relative z-10"></i>
        </div>
        <p class="text-xl font-light text-center">"${folder.name}" 탐구를 시작하세요!<br/>첫 질문을 입력해 보세요.</p>
      </div>
    `;
  } else {
    folder.messages.forEach(msg => {
      addMessageToDOM(msg.role, msg.content);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Reset chat session for this folder
  folder.chatSession = null;

  renderFolderList();
  showPanel('chat');
  lucide.createIcons();
}

// ================================================
// UI HELPERS
// ================================================
function getColorForLevel(level) {
  if (level <= 3) return "#4ade80";
  if (level <= 6) return "#facc15";
  return "#f87171";
}

function syncLevel(level) {
  userLevel = Math.max(1, Math.min(10, level));
  levelSlider.value = userLevel;
  levelDisplay.textContent = userLevel;
  const color = getColorForLevel(userLevel);
  levelSlider.style.setProperty('--slider-color', color);
  levelDisplay.style.color = color;
  levelSlider.classList.remove('slider-pulse');

  // Background pulse effect
  const mainView = document.getElementById('view-main');
  mainView.style.transition = 'background-color 0.5s ease';
  mainView.style.backgroundColor = color + '15'; // slight tint
  setTimeout(() => {
    mainView.style.backgroundColor = 'transparent';
  }, 500);

  void levelSlider.offsetWidth;
  levelSlider.classList.add('slider-pulse');

  // Save the level to the current folder
  if (currentFolderId && folders[currentFolderId]) {
    const isLevelChanged = folders[currentFolderId].level !== userLevel;
    if (isLevelChanged) {
      folders[currentFolderId].level = userLevel;
      if (currentUser && window.supabaseAPI) {
        window.supabaseAPI.updateFolder(currentFolderId, {
          level: userLevel
        });
      } else {
        persistGuestData();
      }
      renderFolderList();
    }
  }
}

syncLevel(userLevel);

levelSlider.addEventListener('input', (e) => {
  syncLevel(parseInt(e.target.value, 10));
});

function triggerFallback() {
  syncLevel(userLevel - 1);
  fallbackBorder.classList.remove('fallback-active-border');
  void fallbackBorder.offsetWidth;
  fallbackBorder.classList.add('fallback-active-border');
  fallbackModal.classList.remove('-translate-y-full', 'opacity-0');
  setTimeout(() => fallbackModal.classList.add('-translate-y-full', 'opacity-0'), 3000);
}

function triggerSuccess() {
  syncLevel(userLevel + 1);
  const colors = isLightMode ? ['#008066', '#006652', '#34d399'] : ['#ffffff', '#00ffcc', '#33ffdb'];
  confetti({ particleCount: 120, spread: 70, origin: { x: 0.05, y: 0.7 }, angle: 60, colors, zIndex: 9999, gravity: 0.8, scalar: 1.1 });
  confetti({ particleCount: 120, spread: 70, origin: { x: 0.95, y: 0.7 }, angle: 120, colors, zIndex: 9999, gravity: 0.8, scalar: 1.1 });
}

// ================================================
// LOADING STATE
// ================================================
function setLoading(loading) {
  isLoading = loading;
  chatInput.disabled = loading;
  btnSend.disabled = loading || !chatInput.value.trim();

  if (loading) {
    sendIcon.setAttribute('data-lucide', 'loader-2');
    lucide.createIcons();
    sendIcon.classList.add('spin');
    const es = messagesContainer.querySelector('#empty-state');
    if (es) es.style.display = 'none';
  } else {
    sendIcon.classList.remove('spin');
    sendIcon.setAttribute('data-lucide', 'send');
    lucide.createIcons();
  }
}

function updateStreamingBubble(bubbleDiv, rawText, isFinished) {
  let textToDisplay = rawText;

  try {
    if (textToDisplay.trim().startsWith('{')) {
      const parsed = JSON.parse(textToDisplay);
      if (parsed.response_text) textToDisplay = parsed.response_text;
    } else {
      const match = textToDisplay.match(/"response_text"\s*:\s*"([\s\S]*)"/);
      if (match && match[1]) {
        textToDisplay = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
  } catch (e) {}

  if (showHint) {
    textToDisplay = textToDisplay.replace(/<trap>([\s\S]*?)<\/trap>/gi, '<span class="bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded transition-colors duration-300">$1</span>');
  } else {
    textToDisplay = textToDisplay.replace(/<trap>([\s\S]*?)<\/trap>/gi, '$1');
  }

  let html = marked.parse(textToDisplay || '');

  if (!isFinished) {
    const cursorHtml = '<span class="inline-block w-[2px] h-[1.1em] bg-mint animate-pulse ml-0.5 align-middle shadow-[0_0_8px_rgba(16,185,129,0.9)]"></span>';
    const trimmed = html.trim();
    if (trimmed.endsWith('</p>')) {
      html = trimmed.slice(0, -4) + cursorHtml + '</p>';
    } else if (trimmed.length > 0) {
      html += cursorHtml;
    } else {
      html = '<p>' + cursorHtml + '</p>';
    }
  }

  bubbleDiv.innerHTML = html;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================================================
// MESSAGE RENDERING
// ================================================
function addMessageToDOM(role, content) {
  const es = messagesContainer.querySelector('#empty-state');
  if (es) es.style.display = 'none';

  const isUser = role === 'user';
  const alignClass = isUser ? 'justify-end my-1' : 'justify-start my-1';
  const animClass = isUser ? 'animate-slide-in-right' : 'animate-slide-in-left';

  let bubbleHtml;
  if (isUser) {
    bubbleHtml = `<div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm border leading-relaxed markdown-body text-sm font-normal" style="background-color: var(--mint-bg-10); border-color: var(--mint-bg-30); color: var(--mint-color);">${typeof content === 'string' ? content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : content}</div>`;
  } else {
    let htmlContent = '';
    if (Array.isArray(content)) {
      htmlContent = content.map(item => {
        let parsedText = marked.parse(item.text);
        if (parsedText.startsWith('<p>') && parsedText.endsWith('</p>\n')) {
          parsedText = parsedText.slice(3, -5);
        }
        if (item.isError && showHint) {
          return `<div class="bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded transition-colors duration-300 w-full mb-1">${parsedText}</div>`;
        } else {
          return `<div class="transition-colors duration-300 w-full mb-1">${parsedText}</div>`;
        }
      }).join('');
    } else {
      let textToParse = typeof content === 'string' ? content : String(content);
      if (showHint) {
        textToParse = textToParse.replace(/<trap>([\s\S]*?)<\/trap>/gi, '<span class="bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded transition-colors duration-300">$1</span>');
      } else {
        textToParse = textToParse.replace(/<trap>([\s\S]*?)<\/trap>/gi, '$1');
      }
      htmlContent = marked.parse(textToParse);
    }
    bubbleHtml = `<div class="w-full max-w-[90%] py-2 px-1 leading-relaxed markdown-body text-left flex flex-col items-start">${htmlContent}</div>`;
  }

  const msgHtml = `<div class="flex ${alignClass} ${animClass}">${bubbleHtml}</div>`;
  messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function saveMessageToState(role, content) {
  if (currentFolderId && folders[currentFolderId]) {
    folders[currentFolderId].messages.push({ role, content });

    // DB & LocalStorage Sync
    if (currentUser && window.supabaseAPI) {
      window.supabaseAPI.insertMessage({
        folder_id: currentFolderId,
        user_id: currentUser.id,
        role: role,
        content: typeof content === 'string' ? content : JSON.stringify(content)
      });
    } else {
      persistGuestData();
    }
  }
}

function addMessage(role, content) {
  addMessageToDOM(role, content);
  saveMessageToState(role, content);
}

async function sendMessage(text) {
  if (!currentFolderId) {
    const id = 'folder_' + (++folderIdCounter);
    folders[id] = { name: '자유 탐구', emoji: '💡', messages: [], mistakes: [], chatSession: null, history: [], uploadedContext: "", trapActive: false, currentTrapData: null };
    renderFolderList();
    switchToFolder(id);
  }

  const folder = folders[currentFolderId];

  const history = folder.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      let textContent = '';
      if (Array.isArray(m.content)) {
        textContent = m.content.map(c => c.text).join('\n');
      } else {
        textContent = m.content;
      }
      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: textContent }]
      };
    });

  addMessage('user', text);
  setLoading(true);

  // Immediately create assistant message container (clean text without speech bubble box)
  const es = messagesContainer.querySelector('#empty-state');
  if (es) es.style.display = 'none';

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-start animate-slide-in-left w-full my-1';
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'w-full max-w-[90%] py-2 px-1 leading-relaxed markdown-body text-left flex flex-col items-start';
  msgDiv.appendChild(bubbleDiv);
  messagesContainer.appendChild(msgDiv);

  updateStreamingBubble(bubbleDiv, "", false);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: history,
        message: text,
        systemInstruction: getSystemInstruction(currentFolderId)
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[${response.status}] ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      buffer += chunkStr;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsedChunk = JSON.parse(jsonStr);
            const textPart = parsedChunk.text || parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (textPart) {
              accumulatedText += textPart;
              updateStreamingBubble(bubbleDiv, accumulatedText, false);
            }
          } catch (e) { }
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      const jsonStr = buffer.trim().slice(5).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const parsedChunk = JSON.parse(jsonStr);
          const textPart = parsedChunk.text || parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (textPart) accumulatedText += textPart;
        } catch (e) { }
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(accumulatedText);
    } catch (e) {
      try {
        const cleanText = accumulatedText.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanText);
      } catch (e2) {
        parsed = { response_text: accumulatedText, has_error: false, is_fallback: false, is_success: false };
      }
    }

    const wasTrapActive = folder.trapActive === true;

    if (wasTrapActive) {
      if (parsed.is_fallback) {
        triggerFallback();
        folder.mistakes.push({
          correct_answer: folder.currentTrapData?.correct_answer || '',
          hidden_intention: folder.currentTrapData?.hidden_intention || '',
          response_text: folder.currentTrapData?.trap_text || '',
          user_response: text,
          timestamp: new Date().toLocaleString()
        });
      } else if (parsed.is_success) {
        triggerSuccess();
        folder.successes = (folder.successes || 0) + 1;
      }
    }

    folder.trapActive = parsed.has_error === true;
    if (parsed.has_error) {
      folder.currentTrapData = {
        correct_answer: parsed.correct_answer,
        hidden_intention: parsed.hidden_intention,
        trap_text: parsed.response_text,
        error_sentence: parsed.error_sentence
      };
    }

    const finalResponseText = parsed.response_text || accumulatedText || '응답을 처리하는 중 오류가 발생했습니다.';

    updateStreamingBubble(bubbleDiv, finalResponseText, true);
    saveMessageToState('assistant', finalResponseText);

    if (currentUser && window.supabaseAPI) {
      window.supabaseAPI.updateFolder(currentFolderId, {
        mistakes: folder.mistakes,
        trapActive: folder.trapActive,
        currentTrapData: folder.currentTrapData
      });
    } else {
      persistGuestData();
    }

  } catch (error) {
    console.error("API Error:", error);
    if (typeof showToastAlert === 'function') {
      showToastAlert('⚠️ 오류가 발생했습니다', error.message);
    } else if (typeof showDBErrorAlert === 'function') {
      showDBErrorAlert('sendMessage', error.message);
    } else {
      bubbleDiv.innerHTML = `<span class="text-crimson font-bold">⚠️ 오류가 발생했습니다: ${error.message}</span>`;
    }
  } finally {
    setLoading(false);
  }
}

// ================================================
// IN-CHAT RAG FILE UPLOAD
// ================================================
if (btnChatFileUpload && chatFileInput) {
  btnChatFileUpload.addEventListener('click', () => {
    chatFileInput.click();
  });

  chatFileInput.addEventListener('change', function () {
    const files = this.files;
    if (!currentFolderId) {
      alert("폴더(시냅스)를 먼저 생성해주세요.");
      this.value = '';
      return;
    }

    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          const folder = folders[currentFolderId];
          folder.uploadedContext += `\n\n[추가 참고 문헌 (${file.name})]\n${text}`;

          // 시스템 토스트 메시지
          const msgHtml = `<div class="flex justify-center my-4 animate-slide-in-up">
            <div class="bg-[var(--surface-color)] border border-mint text-mint px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_var(--glow-shadow)]">
              <i data-lucide="check-circle" class="w-4 h-4"></i>
              📄 '${file.name}' 컨텍스트가 실시간 동기화되었습니다.
            </div>
          </div>`;
          messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          lucide.createIcons();
        };
        reader.readAsText(file);
      } else {
        alert('텍스트 파일(.txt)만 업로드 가능합니다.');
      }
    }
    this.value = '';
  });
}

// ================================================
// GEMINI API
// ================================================
function getSystemInstruction(folderId) {
  let basePrompt;

  if (userLevel <= 3) {
    // Lv 1~3: 친근하고 다양한 예시를 드는 학습 도우미 파트너
    basePrompt = `너는 사용자의 호기심 많고 친근한 '학습 파트너'야.
AI처럼 딱딱하거나 기계적인 말투는 절대 쓰지 마. 쉬운 비유와 반말로, 다양한 실생활 예시를 들어가며 재미있게 설명해줘.
학생이 이해하기 쉽도록 단계별로 풀어서 설명하고, 칭찬과 격려도 아끼지 마.

# 핵심 행동 규칙
1. Lv ${userLevel} (입문/초보) 수준에 맞춰 쉬운 말로 설명해. 어려운 전문용어 대신 비유나 일상 예시를 많이 써줘.
2. 90/10 법칙: 답변의 90%는 완벽하게 정확한 정보를 주지만, 10% 확률로 핵심 개념에 그럴듯한 '오류(함정)'를 몰래 숨겨서 출력해.
   (주의: 답변에 함정을 숨겼다면, 'response_text' 내에서 함정이 포함된 부분을 반드시 <trap>오류가 있는 문장</trap> 처럼 감싸서 출력해라.)
3. 디버깅 감지 루프 (반드시 JSON 필드에 반영할 것):
   - 직전 답변에 함정(오류)을 심었는데 유저가 이를 정확히 지적했다면, "오! 완전 날카로운데?!" 하며 칭찬하고 반드시 "is_success": true, "is_fallback": false 로 설정해라.
   - 직전 답변에 함정(오류)을 심었는데 유저가 모른 채 넘어가거나 딴소리를 하면, 스스로 "아차, 아까 내 설명에 치명적인 오류가 있었어!" 라며 정정해주고 반드시 "is_fallback": true, "is_success": false 로 설정해라.
   - 직전 답변에 함정을 심지 않았다면, 혹은 오류와 무관한 대화라면 "is_success": false, "is_fallback": false 로 설정해라.

# 출력 형식 (JSON ONLY)
반드시 아래 JSON 포맷만 사용해. 다른 텍스트는 절대 붙이지 마.
{
  "response_text": "유저에게 보여질 마크다운 텍스트 (친근한 말투, 예시 풍부하게)",
  "has_error": true/false,
  "is_fallback": true/false,
  "is_success": true/false,
  "correct_answer": "오류를 넣었다면 진짜 정답",
  "hidden_intention": "유저의 어떤 오개념을 유도하려 했는지",
  "error_sentence": "함정(오류)이 포함된 정확한 문장 (함정이 없다면 빈 문자열)"
}`;
  } else if (userLevel <= 5) {
    // Lv 4~5: 논리적 원리와 전공 기초를 파트너 느낌으로 다루는 중급 도우미
    basePrompt = `너는 사용자의 든든한 '학습 파트너'야. 이미 기초는 아는 중급자니까, 조금 더 논리적인 원리와 전공 기초를 함께 탐구하는 느낌으로 설명해줘.
친근하고 대화하듯이 설명하되, 전문적인 개념도 명확하게 짚어줘. 실제 적용 사례나 예시를 들어 이해를 도와줘.

# 핵심 행동 규칙
1. Lv ${userLevel} (중급) 수준에 맞춰 논리적 원리와 전공 기초를 설명해. 비유와 실제 사례를 균형 있게 써줘.
2. 90/10 법칙: 답변의 90%는 완벽하게 정확한 정보를 주지만, 10% 확률로 핵심 개념에 그럴듯한 '오류(함정)'를 몰래 숨겨서 출력해.
   (주의: 답변에 함정을 숨겼다면, 'response_text' 내에서 함정이 포함된 부분을 반드시 <trap>오류가 있는 문장</trap> 처럼 감싸서 출력해라.)
3. 디버깅 감지 루프 (반드시 JSON 필드에 반영할 것):
   - 직전 답변에 함정(오류)을 심었는데 유저가 이를 정확히 지적했다면, "오, 날카로운 지적이네!" 하며 인정하고 반드시 "is_success": true, "is_fallback": false 로 설정해라.
   - 직전 답변에 함정(오류)을 심었는데 유저가 모른 채 넘어가거나 딴소리를 하면, 스스로 "아, 사실 아까 내 설명에 오류가 있었는데" 라며 정정해주고 반드시 "is_fallback": true, "is_success": false 로 설정해라.
   - 직전 답변에 함정을 심지 않았다면, 혹은 오류와 무관한 대화라면 "is_success": false, "is_fallback": false 로 설정해라.

# 출력 형식 (JSON ONLY)
반드시 아래 JSON 포맷만 사용해. 다른 텍스트는 절대 붙이지 마.
{
  "response_text": "유저에게 보여질 마크다운 텍스트 (논리적이고 친근한 설명)",
  "has_error": true/false,
  "is_fallback": true/false,
  "is_success": true/false,
  "correct_answer": "오류를 넣었다면 진짜 정답",
  "hidden_intention": "유저의 어떤 오개념을 유도하려 했는지",
  "error_sentence": "함정(오류)이 포함된 정확한 문장 (함정이 없다면 빈 문자열)"
}`;
  } else if (userLevel <= 8) {
    // Lv 6~8: 논문 수준의 심도 있는 고찰, 학술적 비판적 시각
    basePrompt = `너는 Nature/Science급 학술지의 날카로운 심사위원(Peer Reviewer)이다.
사용자의 주장을 심도 있게 파헤치고 검증하라. 논리적 엄밀성과 학술적 깊이를 유지하되, 지나치게 딱딱하지 않게 대화해라.

# 핵심 행동 규칙
1. Lv ${userLevel} (고급) 수준에 맞춰 논문 수준의 심도 있는 분석을 제공해. 방법론적 한계, 문헌과의 모순점을 비판적으로 짚어라.
2. 90/10 법칙: 답변의 90%는 완벽하고 통찰력 있는 피드백을 주지만, 10% 확률로 핵심 개념에 그럴듯한 '오류(함정)'를 몰래 숨겨서 출력해라.
   (주의: 답변에 함정을 숨겼다면, 'response_text' 내에서 함정이 포함된 부분을 반드시 <trap>오류가 있는 문장</trap> 처럼 감싸서 출력해라.)
3. 디버깅 감지 루프 (반드시 JSON 필드에 반영할 것):
   - 직전 답변에 함정(오류)을 심었는데 유저가 이를 정확히 지적했다면, 그 학술적 예리함을 인정하고 반드시 "is_success": true, "is_fallback": false 로 설정해라.
   - 직전 답변에 함정(오류)을 심었는데 유저가 모른 채 넘어가면, "방금 제 분석에 실은 논리적 비약이 있었습니다." 라고 정정해주고 반드시 "is_fallback": true, "is_success": false 로 설정해라.
   - 직전 답변에 함정을 심지 않았다면, 혹은 오류와 무관한 대화라면 "is_success": false, "is_fallback": false 로 설정해라.

# 출력 형식 (JSON ONLY)
반드시 아래 JSON 포맷만 사용해. 다른 텍스트는 절대 붙이지 마.
{
  "response_text": "유저에게 보여질 마크다운 텍스트 (학술적이고 비판적인 분석)",
  "has_error": true/false,
  "is_fallback": true/false,
  "is_success": true/false,
  "correct_answer": "오류를 넣었다면 진짜 정답",
  "hidden_intention": "유저의 어떤 오개념을 유도하려 했는지",
  "error_sentence": "함정(오류)이 포함된 정확한 문장 (함정이 없다면 빈 문자열)"
}`;
  } else {
    // Lv 9~10: 학계 패러다임을 뒤흔드는 초월적 비판, 인식론적 해체
    basePrompt = `너는 학계의 패러다임을 뒤흔드는 지독하게 날카로운 에피스테믹 인베스티게이터(Epistemic Investigator)다.
사용자의 논문이나 주장을 낱낱이 파헤치고 검증하라. 친절한 챗봇 흉내를 내지 말고, 극도로 엄격하고 학술적인 산문체를 유지하라.
절대로 번호 매기기(1., 2.)나 글머리 기호(-, *)를 사용하지 마라. 모든 피드백은 완벽한 문장 구조를 갖춘 산문형(Prose) 에세이로 작성하라.

# 핵심 행동 규칙
1. Lv ${userLevel} (최고급) 수준: 학계의 패러다임을 뒤흔드는 초월적 비판. 데이터의 통계적 유의성, 다차원적 변수 통제 실패, 인식론적 근간을 해체하는 수준으로 비판하라.
2. 90/10 법칙: 답변의 90%는 완벽하고 통찰력 있는 학술 피드백을 주지만, 10% 확률로 핵심 개념에 그럴듯한 '오류(함정)'를 몰래 숨겨서 출력해라.
   (주의: 답변에 함정을 숨겼다면, 'response_text' 내에서 함정이 포함된 부분을 반드시 <trap>오류가 있는 문장</trap> 처럼 감싸서 출력해라.)
3. 디버깅 감지 루프 (반드시 JSON 필드에 반영할 것):
   - 직전 답변에 함정(오류)을 심었는데 유저가 이를 정확히 지적했다면, 그 학술적 예리함을 인정하고 반드시 "is_success": true, "is_fallback": false 로 설정해라.
   - 직전 답변에 함정(오류)을 심었는데 유저가 모른 채 넘어가면, "본 심사위원이 제기한 반론에는 사실 치명적인 논리적 비약이 존재했음에도 이를 간과하다니 실망스럽군." 이라며 정정해주고 반드시 "is_fallback": true, "is_success": false 로 설정해라.
   - 직전 답변에 함정을 심지 않았다면, 혹은 오류와 무관한 대화라면 "is_success": false, "is_fallback": false 로 설정해라.

# 출력 형식 (JSON ONLY)
반드시 아래 JSON 포맷만 사용해. 다른 텍스트는 절대 붙이지 마.
{
  "response_text": "유저에게 보여질 마크다운 텍스트 (산문형 필수, 리스트 금지)",
  "has_error": true/false,
  "is_fallback": true/false,
  "is_success": true/false,
  "correct_answer": "오류를 넣었다면 진짜 정답",
  "hidden_intention": "유저의 어떤 오개념을 유도하려 했는지",
  "error_sentence": "함정(오류)이 포함된 정확한 문장 (함정이 없다면 빈 문자열)"
}`;
  }

  if (folderId && folders[folderId] && folders[folderId].uploadedContext) {
    basePrompt += `\n\n오직 다음 제공된 컨텍스트 문서를 기반으로만 질문을 생성하고, 교묘한 논리 오류(Level별 스케일링 적용)를 숨겨라: [Context: ${folders[folderId].uploadedContext}]`;
  }

  // 글로벌 텍스트 포맷 제약 추가 (마크다운 볼드 ** 및 수학 기호 $ 금지)
  basePrompt += `\n\n# 출력 텍스트 스타일 가이드:
1. 답변 내용(response_text)에 마크다운 굵은 글씨 표시(**)나 수학 수식에 쓰는 달러 기호($)를 절대로 사용하지 마라.
2. 강조하고 싶은 단어나 문장이 있다면 마크다운 볼드(**단어**) 대신 작은따옴표('단어') 또는 큰따옴표("단어")를 사용하라.
3. 수식이나 영문 기호도 달러 기호($) 없이 일반 텍스트로 풀어써라.`;

  return basePrompt;
}



// ================================================
// DEBUG NOTES VIEW (Epistemic Audit)
// ================================================
let debugSelectedFolderId = null;
let debugMistakeIndex = null;

btnDebugNotes.addEventListener('click', () => {
  debugSelectedFolderId = null;
  debugMistakeIndex = null;
  renderDebugFolderList();
  showPanel('debug');
});

btnDebugBack.addEventListener('click', () => {
  if (debugMistakeIndex !== null) {
    debugMistakeIndex = null;
    renderDebugMistakeList(debugSelectedFolderId);
  } else if (debugSelectedFolderId) {
    debugSelectedFolderId = null;
    renderDebugFolderList();
    debugTitle.textContent = '오답 및 오류 보기';
  } else {
    showPanel('chat');
  }
});

function renderDebugFolderList() {
  debugTitle.textContent = '오답 및 오류 보기';
  const folderIds = Object.keys(folders);

  if (folderIds.length === 0) {
    debugContent.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-grayText gap-4">
        <i data-lucide="folder-x" class="w-16 h-16 opacity-30"></i>
        <p class="text-lg font-light">아직 생성된 폴더가 없습니다.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '<div class="grid gap-4 max-w-2xl mx-auto">';
  folderIds.forEach(id => {
    const f = folders[id];
    const mistakeCount = f.mistakes.length;
    html += `
      <div class="folder-card rounded-2xl p-6 flex items-center justify-between" data-folder-id="${id}">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-[var(--mint-bg-10)] flex items-center justify-center text-mint shrink-0">
            <i data-lucide="folder" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="font-bold text-lg" style="color: var(--text-color);">${f.name}</h3>
            <p class="text-sm text-grayText">오답 ${mistakeCount}개</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-grayText">
          ${mistakeCount > 0 ? '<span class="w-3 h-3 rounded-full bg-crimson animate-pulse"></span>' : '<i data-lucide="check-circle" class="w-5 h-5 text-mint"></i>'}
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </div>
      </div>
    `;
  });
  html += '</div>';
  debugContent.innerHTML = html;

  debugContent.querySelectorAll('.folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const fid = card.dataset.folderId;
      debugSelectedFolderId = fid;
      renderDebugMistakeList(fid);
    });
  });

  lucide.createIcons();
}

function renderDebugMistakeList(folderId) {
  const folder = folders[folderId];
  debugTitle.textContent = folder.emoji + ' ' + folder.name + ' - 오답 목록';

  if (folder.mistakes.length === 0) {
    debugContent.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-grayText gap-4">
        <i data-lucide="party-popper" class="w-16 h-16 opacity-30"></i>
        <p class="text-lg font-light">이 폴더에서는 아직 틀린 내용이 없습니다! 🎉</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '<div class="flex flex-col gap-4 max-w-2xl mx-auto">';
  folder.mistakes.forEach((m, i) => {
    html += `
      <div class="mistake-card rounded-xl p-5 animate-slide-in-up cursor-pointer border border-transparent hover:border-mint transition-all" style="background: var(--surface-color); animation-delay: ${i * 0.05}s;" onclick="renderMistakeDetail('${folderId}', ${i})">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-2 py-1 rounded-full bg-crimson/20 text-crimson">오답 #${i + 1}</span>
            <span class="text-xs text-grayText">${m.timestamp}</span>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-grayText"></i>
        </div>
        <p class="text-sm mb-2 leading-relaxed truncate" style="color: var(--text-color);"><strong class="text-mint">정답:</strong> ${m.correct_answer}</p>
        <p class="text-sm text-grayText leading-relaxed truncate"><strong>함정 의도:</strong> ${m.hidden_intention}</p>
      </div>
    `;
  });
  html += '</div>';

  html += `
    <button id="btn-generate-quiz" class="fixed bottom-8 right-8 bg-[var(--surface-color)]/80 backdrop-blur-md border border-[var(--mint-color)] text-[var(--mint-color)] hover:bg-[var(--mint-color)] hover:text-[#050505] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-[0_0_20px_var(--glow-shadow)] transition-all hover:scale-105 z-50">
      <i data-lucide="trophy" class="w-5 h-5"></i>
      O/X 퀴즈 생성
    </button>
  `;

  debugContent.innerHTML = html;

  document.getElementById('btn-generate-quiz').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center';
    overlay.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl max-w-sm w-full flex flex-col gap-6 animate-scale-in">
        <h3 class="text-xl font-bold text-center text-[color:var(--text-color)]">퀴즈 문제 수 선택</h3>
        <p class="text-sm text-center text-grayText">현재 보유한 오답 수: ${folder.mistakes.length}개</p>
        <div class="grid grid-cols-2 gap-3">
          <button class="btn-quiz-count py-3 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--mint-bg-10)] border border-borderColor hover:border-mint transition-all font-bold text-[color:var(--text-color)]" data-count="5">5문제</button>
          <button class="btn-quiz-count py-3 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--mint-bg-10)] border border-borderColor hover:border-mint transition-all font-bold text-[color:var(--text-color)]" data-count="10">10문제</button>
          <button class="btn-quiz-count py-3 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--mint-bg-10)] border border-borderColor hover:border-mint transition-all font-bold text-[color:var(--text-color)]" data-count="15">15문제</button>
          <button class="btn-quiz-count py-3 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--mint-bg-10)] border border-borderColor hover:border-mint transition-all font-bold text-[color:var(--text-color)]" data-count="20">20문제</button>
        </div>
        <button class="btn-quiz-count w-full py-3 rounded-xl bg-mint/20 text-mint hover:bg-mint/30 transition-all font-bold mt-2 border border-mint/50" data-count="${folder.mistakes.length}">오답 전체 (${folder.mistakes.length}문제)</button>
        <button class="btn-quiz-cancel mt-2 py-3 rounded-xl bg-crimson/20 text-crimson font-bold hover:bg-crimson/30 transition-all">취소</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.btn-quiz-count').forEach(btn => {
      btn.addEventListener('click', () => {
        const count = parseInt(btn.dataset.count, 10);
        document.body.removeChild(overlay);
        generateQuiz(folderId, count);
      });
    });

    overlay.querySelector('.btn-quiz-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  });

  lucide.createIcons();
}

window.renderMistakeDetail = function (folderId, mistakeIndex) {
  debugMistakeIndex = mistakeIndex;
  const folder = folders[folderId];
  const m = folder.mistakes[mistakeIndex];
  debugTitle.textContent = `오답 #${mistakeIndex + 1} 상세 보기`;

  debugContent.innerHTML = `
    <div class="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
      <div class="glass-panel p-6 rounded-xl">
        <h3 class="text-lg font-bold text-mint mb-4">함정이 포함된 AI의 발언</h3>
        <div class="p-4 rounded-lg bg-[var(--bg-color)] text-sm leading-relaxed mb-4 markdown-body" style="color: var(--text-color);">
          ${marked.parse(m.response_text || '')}
        </div>
        <h3 class="text-lg font-bold text-[color:var(--text-color)] mb-4 mt-6">나의 답변</h3>
        <div class="p-4 rounded-lg border border-[var(--mint-bg-30)] bg-[var(--mint-bg-10)] text-mint text-sm leading-relaxed mb-4">
          ${m.user_response || ''}
        </div>
        <div class="flex flex-col gap-3 mt-6 pt-6 border-t border-borderColor">
          <p class="text-sm leading-relaxed" style="color: var(--text-color);"><strong class="text-mint">정답:</strong> ${m.correct_answer}</p>
          <p class="text-sm text-grayText leading-relaxed"><strong>함정 의도:</strong> ${m.hidden_intention}</p>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
};

// ================================================
// QUIZ SYSTEM
// ================================================
async function generateQuiz(folderId, requestedCount = 10) {
  const folder = folders[folderId];
  if (folder.mistakes.length === 0) {
    alert("퀴즈를 생성할 오답 데이터가 없습니다.");
    return;
  }

  let finalCount = Math.min(folder.mistakes.length, requestedCount);
  const shuffledMistakes = [...folder.mistakes].sort(() => 0.5 - Math.random());
  const selectedMistakes = shuffledMistakes.slice(0, finalCount);

  // 50:50 확률로 정답(O 또는 X)을 사전 배분하여 셔플
  const firstIsO = Math.random() < 0.5;
  const targetAnswers = selectedMistakes.map((_, i) => {
    return (i % 2 === 0) ? (firstIsO ? 'O' : 'X') : (firstIsO ? 'X' : 'O');
  }).sort(() => 0.5 - Math.random());

  showPanel('quiz');
  quizContent.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 animate-pulse">
      <i data-lucide="loader-2" class="w-12 h-12 text-mint spin"></i>
      <p class="text-mint font-medium">AI가 오답 데이터를 분석하여 퀴즈를 생성 중입니다... (${finalCount}문제)</p>
    </div>
  `;
  lucide.createIcons();

  const mistakeData = selectedMistakes.map((m, idx) => `
    [문제 번호]: ${idx + 1}번
    [지정된 목표 정답]: ${targetAnswers[idx]}
    [AI의 기존 틀린 발언(함정)]: ${m.response_text}
    [올바른 사실(정답)]: ${m.correct_answer}
    [함정 의도]: ${m.hidden_intention}
  `).join('\n\n');

  const prompt = `제공된 ${finalCount}개의 오답 데이터 각각에 대해 정확히 1문제씩, 총 ${finalCount}문제의 O/X 퀴즈를 생성해라.

★ 매우 중요한 핵심 출제 규칙 ★
각 오답 데이터마다 부여된 [지정된 목표 정답]이 반드시 해당 문제의 정답(answer)이 되어야 한다! (전체 문제 중 O와 X가 50:50 비율로 출제되도록 사전에 지정된 값임)

1. [지정된 목표 정답]이 'X'인 경우:
   - [AI의 기존 틀린 발언(함정)]의 오류나 함정을 그대로 질문(question)으로 출제해라.
   - 문장 내용이 틀린 사실이므로 정답(answer)은 무조건 'X'로 설정해라.

2. [지정된 목표 정답]이 'O'인 경우:
   - [AI의 기존 틀린 발언(함정)]의 틀린 부분을 [올바른 사실(정답)]을 바탕으로 완벽히 참(True)인 올바른 문장으로 수정하여 질문(question)으로 출제해라.
   - 문장 내용이 올바른 사실이므로 정답(answer)은 무조건 'O'로 설정해라.

3. 공통 규칙:
   - 모든 질문(question)의 끝맺음은 '~다.', '~이다.', '~한다.' 와 같은 평어체(해라체)로 객관적이고 명확하게 작성할 것.
   - 각 문제마다 정답이 그렇게 되는 이유와 올바른 개념을 설명하는 명확하고 상세한 해설(explanation)을 작성할 것.
   - 중복 없이 각 오답 데이터당 정확히 하나의 퀴즈만 생성할 것.

오답 데이터 목록:
${mistakeData}

출력은 반드시 다음과 같은 JSON 포맷이어야 해:
{
  "quiz": [
    {
      "question": "O/X 퀴즈 질문 (예: 태양계의 중심은 태양이다.)",
      "answer": "O" 또는 "X",
      "explanation": "정답 및 원본 오류에 대한 명확한 해설"
    }
  ]
}
`;

  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        const errData = JSON.parse(errText);
        errMsg = errData.error || errText;
      } catch (e) {
        if (response.status === 404) errMsg = "백엔드 서버를 찾을 수 없습니다. (Vercel 배포 필요)";
      }
      throw new Error(`[${response.status}] ${errMsg}`);
    }

    const result = await response.json();
    const parsed = JSON.parse(result.response);
    const qData = parsed.quiz || parsed;

    quizState = {
      folderId,
      questions: qData,
      answers: new Array(qData.length).fill(null),
      currentIndex: 0,
      graded: false
    };

    btnQuizPrev.classList.remove('hidden');
    btnQuizNext.classList.remove('hidden');
    renderQuizQuestion();
  } catch (error) {
    console.error("Quiz generation error:", error);
    quizContent.innerHTML = `
      <div class="flex flex-col items-center gap-4 text-grayText">
        <i data-lucide="alert-circle" class="w-12 h-12 text-crimson"></i>
        <p class="font-medium">퀴즈 생성에 실패했습니다: ${error.message}</p>
      </div>
    `;
    lucide.createIcons();
  }
}

function renderQuizQuestion() {
  if (!quizState) return;
  const { questions, answers, currentIndex } = quizState;
  const q = questions[currentIndex];
  const total = questions.length;
  const isLast = currentIndex === total - 1;

  quizProgress.textContent = `${currentIndex + 1} / ${total}`;

  btnQuizPrev.classList.remove('hidden');
  btnQuizNext.classList.remove('hidden');
  btnQuizPrev.disabled = currentIndex === 0;

  if (isLast) {
    btnQuizNext.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> 채점하기';
  } else {
    btnQuizNext.innerHTML = '다음 문제 <i data-lucide="chevron-right" class="w-4 h-4"></i>';
  }

  const selectedAnswer = answers[currentIndex];

  quizContent.innerHTML = `
    <div class="w-full max-w-xl mx-auto">
      <div class="glass-panel rounded-2xl p-8 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-sm font-bold px-3 py-1 rounded-full bg-[var(--mint-bg-10)] text-mint">Q${currentIndex + 1}</span>
        </div>
        <p class="text-lg font-medium leading-relaxed" style="color: var(--text-color);">${q.question}</p>
      </div>
      <div class="flex gap-4">
        <button class="quiz-option flex-1 py-6 rounded-2xl text-4xl font-black transition-all transform hover:scale-105 active:scale-95 backdrop-blur-md border border-[var(--mint-color)] ${selectedAnswer === 'O' ? 'bg-[var(--mint-color)] !text-[#050505] shadow-[0_0_20px_var(--glow-shadow)]' : 'bg-[var(--surface-color)]/80 text-[var(--mint-color)] hover:bg-[var(--mint-color)] hover:!text-[#050505]'}" data-answer="O">O</button>
        <button class="quiz-option flex-1 py-6 rounded-2xl text-4xl font-black transition-all transform hover:scale-105 active:scale-95 backdrop-blur-md border border-[#EF4444] ${selectedAnswer === 'X' ? 'bg-[#EF4444] !text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-[var(--surface-color)]/80 text-[#EF4444] hover:bg-[#EF4444] hover:!text-white'}" data-answer="X">X</button>
      </div>
    </div>
  `;

  quizContent.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      quizState.answers[currentIndex] = btn.dataset.answer;
      renderQuizQuestion();
    });
  });

  lucide.createIcons();
}

function renderQuizResults() {
  if (!quizState) return;
  const { questions, answers } = quizState;

  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });

  const percentage = Math.round((correct / questions.length) * 100);
  const scoreColor = percentage >= 80 ? 'text-mint' : percentage >= 50 ? 'text-yellow-400' : 'text-crimson';

  if (!quizState.statsRecorded && quizState.folderId && folders[quizState.folderId]) {
    quizState.statsRecorded = true;
    const f = folders[quizState.folderId];
    f.quizStats = f.quizStats || { totalQuestions: 0, correctAnswers: 0 };
    f.quizStats.totalQuestions += questions.length;
    f.quizStats.correctAnswers += correct;
    persistGuestData();
  }

  let html = '<div class="w-full max-w-xl mx-auto flex flex-col gap-6">';
  html += `
    <div class="glass-panel rounded-2xl p-8 text-center">
      <h2 class="text-2xl font-bold mb-2" style="color: var(--text-color);">채점 결과</h2>
      <p class="text-5xl font-black ${scoreColor} my-4">${correct} / ${questions.length}</p>
      <p class="text-grayText">정답률 ${percentage}%</p>
    </div>
  `;

  questions.forEach((q, i) => {
    const isCorrect = answers[i] === q.answer;
    html += `
      <div class="rounded-xl p-5" style="background: var(--surface-color); border: 1px solid var(--border-color); border-left: 3px solid ${isCorrect ? 'var(--mint-color)' : '#DC2626'};">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-bold ${isCorrect ? 'text-mint' : 'text-crimson'}">${isCorrect ? '✅ 정답' : '❌ 오답'}</span>
          <span class="text-xs text-grayText">Q${i + 1}</span>
        </div>
        <p class="text-sm mb-2 leading-relaxed" style="color: var(--text-color);">${q.question}</p>
        <p class="text-sm text-grayText mb-1">내 답: <strong style="color: var(--text-color);">${answers[i] || '미응답'}</strong> / 정답: <strong class="text-mint">${q.answer}</strong></p>
        <div class="text-sm mt-3 p-3.5 rounded-xl border border-[var(--border-color)]/50" style="background: var(--bg-color); color: var(--text-color);">
          <strong class="text-mint block mb-1">💡 해설:</strong> 
          <span class="leading-relaxed">${q.explanation || '해설이 없습니다.'}</span>
        </div>
      </div>
    `;
  });

  html += '</div>';
  quizContent.innerHTML = html;
  quizProgress.textContent = '결과';

  btnQuizPrev.classList.add('hidden');
  btnQuizNext.classList.add('hidden');
}

// Quiz navigation
btnQuizPrev.addEventListener('click', () => {
  if (!quizState || quizState.currentIndex <= 0) return;
  quizState.currentIndex--;
  renderQuizQuestion();
});

btnQuizNext.addEventListener('click', () => {
  if (!quizState) return;
  const isLast = quizState.currentIndex === quizState.questions.length - 1;
  if (isLast) {
    quizState.graded = true;
    renderQuizResults();
  } else {
    quizState.currentIndex++;
    renderQuizQuestion();
  }
});

btnQuizBack.addEventListener('click', () => {
  if (quizState && quizState.folderId) {
    showPanel('debug');
    renderDebugMistakeList(quizState.folderId);
  } else {
    showPanel('debug');
    renderDebugFolderList();
  }
  quizState = null;
});

// ================================================
// ANALYTICS DASHBOARD
// ================================================
btnAnalyticsView.addEventListener('click', () => {
  renderAnalyticsDashboard();
  showPanel('analytics');
});

btnAnalyticsBack.addEventListener('click', () => {
  showPanel('chat');
});

function renderAnalyticsDashboard() {
  if (!currentFolderId || folders[currentFolderId].messages.length === 0) {
    analyticsContent.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-grayText gap-4">
        <i data-lucide="bar-chart-2" class="w-16 h-16 opacity-30"></i>
        <p class="text-lg font-light text-center">충분한 탐구 데이터가 축적되지 않았습니다.<br/>AI와 대화를 시작하여 인지 능력을 분석하세요.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const folder = folders[currentFolderId];
  const totalMessages = folder.messages.filter(m => m.role === 'user').length;
  const mistakes = folder.mistakes;
  const totalMistakes = mistakes.length;
  const defenseRate = totalMessages > 0 ? Math.max(0, 100 - (totalMistakes / totalMessages * 100)).toFixed(1) : 100;

  // 1) 함정 간파율 (모든 대화를 통틀어 간파율)
  const allFolderIds = Object.keys(folders);
  let globalTotalMessages = 0;
  let globalTotalMistakes = 0;
  let globalTotalSuccesses = 0;
  allFolderIds.forEach(fid => {
    const f = folders[fid];
    const userMsgs = f.messages ? f.messages.filter(m => m.role === 'user').length : 0;
    globalTotalMessages += userMsgs;
    globalTotalMistakes += (f.mistakes ? f.mistakes.length : 0);
    globalTotalSuccesses += (f.successes || 0);
  });
  let globalDetectionRate = 100;
  if (globalTotalSuccesses + globalTotalMistakes > 0) {
    globalDetectionRate = Math.round((globalTotalSuccesses / (globalTotalSuccesses + globalTotalMistakes)) * 100);
  } else if (globalTotalMessages > 0) {
    globalDetectionRate = Math.max(0, Math.round(100 - (globalTotalMistakes / globalTotalMessages * 100)));
  }

  // 2) 최근 함정 취약 빈도 (최근 10회 대화 중 평균 함정에 걸려든 횟수)
  const userMessages = folder.messages.filter(m => m.role === 'user');
  const recentMsgCount = Math.min(10, userMessages.length);
  let recentMistakes = 0;
  if (userMessages.length <= 10) {
    recentMistakes = totalMistakes;
  } else {
    recentMistakes = Math.min(10, Math.round((totalMistakes / userMessages.length) * 10));
  }
  const recentTrapFreq = recentMsgCount > 0 ? (recentMistakes * (10 / recentMsgCount)).toFixed(1) : "0.0";
  const recentTrapPercent = Math.min(100, Math.round(parseFloat(recentTrapFreq) * 10));

  // 3) 오답 퀴즈에서 맞춘 문제 비율
  let quizTotalQ = 0;
  let quizCorrectA = 0;
  allFolderIds.forEach(fid => {
    const f = folders[fid];
    if (f.quizStats) {
      quizTotalQ += (f.quizStats.totalQuestions || 0);
      quizCorrectA += (f.quizStats.correctAnswers || 0);
    }
  });
  const quizRate = quizTotalQ > 0 ? Math.round((quizCorrectA / quizTotalQ) * 100) : 0;
  const quizDisplayStr = quizTotalQ > 0 ? `${quizRate}% (${quizCorrectA}/${quizTotalQ}문제)` : `0% (도전 전)`;

  function getDefenseGrade(rate) {
    if (rate >= 98) return 'S';
    if (rate >= 95) return 'A+';
    if (rate >= 90) return 'A';
    if (rate >= 85) return 'B+';
    if (rate >= 80) return 'B';
    if (rate >= 75) return 'C+';
    if (rate >= 70) return 'C';
    if (rate >= 60) return 'D+';
    if (rate >= 50) return 'D';
    if (rate >= 40) return 'E+';
    if (rate >= 30) return 'E';
    if (rate >= 20) return 'F+';
    return 'F';
  }

  // 모든 폴더들의 시냅스 레벨 평균 계산
  let averageLevel = 3;
  if (allFolderIds.length > 0) {
    const sum = allFolderIds.reduce((acc, id) => acc + (folders[id].level || 3), 0);
    averageLevel = sum / allFolderIds.length;
  }
  const syncRate = parseFloat((averageLevel * 10).toFixed(1));
  const circumference = 251.2;
  const dashOffset = circumference - (circumference * syncRate) / 100;

  const html = `
    <div class="max-w-4xl mx-auto flex flex-col gap-8 pb-10 mt-4">
      
      <!-- Score Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-panel p-6 rounded-2xl flex flex-col gap-1 items-center justify-center text-center transition-transform hover:scale-105">
          <span class="text-grayText text-xs font-bold uppercase tracking-wider mb-1">총 세션 수</span>
          <span class="text-4xl font-black text-mint neon-text-glow">${totalMessages}</span>
        </div>
        <div class="glass-panel p-6 rounded-2xl flex flex-col gap-1 items-center justify-center text-center transition-transform hover:scale-105">
          <span class="text-grayText text-xs font-bold uppercase tracking-wider mb-1">포착된 오류</span>
          <span class="text-4xl font-black text-[color:var(--text-color)]">${Math.floor(totalMessages * 0.1)}</span>
        </div>
        <div class="glass-panel p-6 rounded-2xl flex flex-col gap-1 items-center justify-center text-center transition-transform hover:scale-105">
          <span class="text-grayText text-xs font-bold uppercase tracking-wider mb-1">미감지 (걸려든 함정)</span>
          <span class="text-4xl font-black text-crimson drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">${totalMistakes}</span>
        </div>
        <div class="glass-panel p-6 rounded-2xl flex flex-col gap-1 items-center justify-center text-center transition-transform hover:scale-105">
          <span class="text-grayText text-xs font-bold uppercase tracking-wider mb-1">함정 방어 등급</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black text-mint neon-text-glow">${getDefenseGrade(defenseRate)}</span>
            <span class="text-sm font-bold text-grayText">(${defenseRate}%)</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- 함정 대응 및 퀴즈 분석 -->
        <div class="glass-panel p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
          <div class="absolute -right-10 -top-10 w-40 h-40 bg-[var(--mint-bg-10)] rounded-full blur-3xl pointer-events-none"></div>
          <h3 class="text-lg font-bold text-[color:var(--text-color)] flex items-center gap-2 mb-2 relative z-10">
            <i data-lucide="shield-check" class="w-5 h-5 text-mint"></i> 함정 대응 및 퀴즈 분석
          </h3>
          <div class="flex flex-col gap-5 relative z-10">
            ${renderProgressBar("함정 간파율 (전체 대화 통합)", globalDetectionRate, `${globalDetectionRate}%`, "bg-mint", "text-mint")}
            ${renderProgressBar("최근 함정 취약 빈도 (최근 10회 기준)", recentTrapPercent, `${recentTrapFreq}회 / 10회`, "bg-[#EF4444]", "text-[#EF4444]")}
            ${renderProgressBar("오답 퀴즈 정답률 (맞춘 문제 비율)", quizRate, quizDisplayStr, "bg-mint", "text-mint")}
          </div>
        </div>

        <!-- Epistemic Sync Rate (SVG 원형 게이지) -->
        <div class="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 bg-[var(--glow-shadow)] opacity-10 blur-3xl pointer-events-none"></div>
          <h3 class="text-lg font-bold text-[color:var(--text-color)] mb-6 relative z-10 w-full flex items-center justify-start gap-2">
            <i data-lucide="zap" class="w-5 h-5 text-mint"></i> 인식적 동기화율
          </h3>
          <div class="relative w-48 h-48 flex items-center justify-center z-10 overflow-visible" style="overflow: visible !important;">
            <svg class="w-full h-full transform -rotate-90 overflow-visible" style="overflow: visible !important;" viewBox="-12 -12 124 124">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-color)" stroke-width="8"></circle>
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--mint-color)" stroke-width="8"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}"
                class="animate-dash" style="filter: drop-shadow(0 0 10px var(--glow-shadow));">
              </circle>
            </svg>
            <div class="absolute flex flex-col items-center justify-center">
              <span class="text-4xl font-black text-[color:var(--text-color)]">${syncRate}<span class="text-lg text-mint">%</span></span>
              <span class="text-xs text-grayText font-bold uppercase tracking-wider mt-1">동기화 레벨</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  analyticsContent.innerHTML = html;
  lucide.createIcons();
}

function renderProgressBar(label, value, displayStr = null, colorClass = "bg-mint", textColorClass = "text-mint") {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  const display = displayStr !== null ? displayStr : `${v}%`;
  return `
    <div class="group">
      <div class="flex justify-between mb-2 items-end">
        <span class="text-sm font-medium text-grayText group-hover:text-[color:var(--text-color)] transition-colors">${label}</span>
        <span class="text-sm font-black ${textColorClass}">${display}</span>
      </div>
      <div class="w-full bg-[var(--bg-color)] rounded-full h-3 border border-borderColor overflow-hidden shadow-inner">
        <div class="${colorClass} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_var(--glow-shadow)]" style="width: ${v}%"></div>
      </div>
    </div>
  `;
}

// ================================================
// EVENT LISTENERS
// ================================================
levelSlider.addEventListener('input', (e) => {
  syncLevel(parseInt(e.target.value, 10));
});

chatInput.addEventListener('input', () => {
  btnSend.disabled = isLoading || !chatInput.value.trim();
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || isLoading) return;
  chatInput.value = '';
  btnSend.disabled = true;
  await sendMessage(text);
});

// ================================================
// AUTH & STATE INITIALIZATION
// ================================================
async function initAuth() {
  try {
    if (window.supabaseAPI) {
      const hasOAuthToken = window.location.hash.includes('access_token') || window.location.search.includes('code');
      if (hasOAuthToken) {
        switchView(viewMain);
      }

      // 1. Listen for OAuth redirect & Auth events
      if (typeof window.supabaseAPI.onAuthStateChange === 'function') {
        window.supabaseAPI.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            currentUser = session.user;
            isGuest = false;
            try {
              await loadUserData(session.user.id);
            } catch(e) {}
            ensureDefaultWorkspace();
            switchView(viewMain);
            updateSidebarAuth();
          }
        });
      }

      // 2. Initial user check
      const user = await window.supabaseAPI.getCurrentUser();
      if (user) {
        currentUser = user;
        isGuest = false;
        try {
          await loadUserData(user.id);
        } catch(e) {}
        ensureDefaultWorkspace();
        switchView(viewMain);
        updateSidebarAuth();
      }
    }
  } catch (e) {
    console.error("Failed to initialize authentication:", e);
  }
}

window.addEventListener('DOMContentLoaded', initAuth);

async function loadUserData(userId) {
  const dbFolders = await window.supabaseAPI.fetchUserFolders(userId);
  folders = {};
  for (const f of dbFolders) {
    folders[f.id] = {
      name: f.name,
      emoji: f.emoji || '📁',
      level: f.level || 3,
      mistakes: f.mistakes || [],
      trapActive: f.trapActive || false,
      currentTrapData: f.currentTrapData || null,
      messages: [],
      chatSession: null,
      history: [],
      uploadedContext: ""
    };
    const dbMessages = await window.supabaseAPI.fetchFolderMessages(f.id);
    folders[f.id].messages = dbMessages.map(m => {
      let content = m.content;
      try {
        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
          content = JSON.parse(content);
        }
      } catch (e) { }
      return {
        role: m.role,
        content: content
      };
    });
  }
  renderFolderList();
  if (Object.keys(folders).length > 0) {
    switchToFolder(Object.keys(folders)[0]);
  }
}

function loadGuestData() {
  let data = null;
  try {
    data = localStorage.getItem('synapse_guest_folders');
  } catch (e) {
    console.warn("localStorage is not accessible:", e);
  }
  if (data) {
    try {
      folders = JSON.parse(data);
      Object.keys(folders).forEach(id => {
        // Filter out dummy test folders (e.g. named 'rrr')
        if (folders[id].name && folders[id].name.trim().toLowerCase() === 'rrr') {
          delete folders[id];
        } else {
          folders[id].chatSession = null;
          if (!folders[id].level) folders[id].level = 3;
        }
      });
      persistGuestData();
    } catch (e) {
      folders = {};
    }
  } else {
    folders = {};
  }
  renderFolderList();
  if (Object.keys(folders).length > 0) {
    switchToFolder(Object.keys(folders)[0]);
  }
}

function persistGuestData() {
  if (isGuest) {
    const dataToSave = {};
    Object.keys(folders).forEach(id => {
      const f = folders[id];
      dataToSave[id] = {
        name: f.name,
        emoji: f.emoji,
        level: f.level || 3,
        mistakes: f.mistakes,
        trapActive: f.trapActive,
        currentTrapData: f.currentTrapData,
        messages: f.messages,
        uploadedContext: f.uploadedContext,
        successes: f.successes || 0,
        quizStats: f.quizStats || null
      };
    });
    try {
      localStorage.setItem('synapse_guest_folders', dataToSave ? JSON.stringify(dataToSave) : '{}');
    } catch (e) {
      console.warn("localStorage write restricted:", e);
    }
  }
}

function updateSidebarAuth() {
  if (typeof updateProfileUI === 'function') updateProfileUI();
  const btnSidebarAuth = document.getElementById('btn-sidebar-auth');
  const sidebarAuthIcon = document.getElementById('sidebar-auth-icon');
  const sidebarAuthText = document.getElementById('sidebar-auth-text');

  if (btnSidebarAuth && sidebarAuthIcon && sidebarAuthText) {
    if (currentUser) {
      btnSidebarAuth.classList.add('hidden');
    } else if (isGuest) {
      btnSidebarAuth.classList.remove('hidden');
      sidebarAuthIcon.setAttribute('data-lucide', 'log-in');
      sidebarAuthText.textContent = '로그인하러 가기';
      btnSidebarAuth.onclick = () => {
        location.reload();
      };
    } else {
      btnSidebarAuth.classList.add('hidden');
    }
    lucide.createIcons();
  }
}

