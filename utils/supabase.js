// utils/supabase.js

const SUPABASE_URL = 'https://oeknpevxmjlxjyvsruco.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la25wZXZ4bWpseGp5dnNydWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzgwNzQsImV4cCI6MjA5NjA1NDA3NH0.cxh3W_DOBTc3_EQanDpKdG1HKOvMs66kOcN0SMMlNIw';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DB Error UI Alert Helper
function showToastAlert(title, message) {
  console.error(`${title}:`, message);

  let container = document.getElementById('db-error-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'db-error-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.background = '#EF4444'; // Red-500
  toast.style.color = '#FFFFFF';
  toast.style.padding = '14px 20px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = 'bold';
  toast.style.border = '1px solid rgba(255,255,255,0.2)';
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.gap = '4px';
  toast.style.maxWidth = '350px';

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span>${title}</span>
    </div>
    <div style="font-size:12px; font-weight:normal; opacity:0.9; word-break:break-all;">
      ${message}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.5s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 500);
  }, 7000);
}

function showDBErrorAlert(action, errorMessage) {
  showToastAlert(`⚠️ 데이터베이스 오류 (${action})`, errorMessage);
}

// Auth Methods
async function signUpWithEmail(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  return { data, error };
}

async function signInWithEmail(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Global Export
async function signInWithGoogle() {
  const redirectUrl = window.location.href.split('#')[0].split('?')[0];
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) showDBErrorAlert('signInWithGoogle', error.message);
  return { data, error };
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) showDBErrorAlert('signOut', error.message);
}

async function getCurrentUser() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      showDBErrorAlert('getCurrentUser', error.message);
      return null;
    }
    if (!session) return null;
    return session.user;
  } catch (err) {
    showDBErrorAlert('getCurrentUser', err.message || err);
    return null;
  }
}

function onAuthStateChange(callback) {
  return supabaseClient.auth.onAuthStateChange(callback);
}

// DB Methods
async function fetchUserFolders(userId) {
  const { data, error } = await supabaseClient
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    showDBErrorAlert('fetchUserFolders', error.message);
    return [];
  }
  return data || [];
}

async function fetchFolderMessages(folderId) {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true });

  if (error) {
    showDBErrorAlert('fetchFolderMessages', error.message);
    return [];
  }
  return data || [];
}

async function insertFolder(folderData) {
  const { data, error } = await supabaseClient
    .from('folders')
    .insert([folderData])
    .select();

  if (error) {
    showDBErrorAlert('insertFolder', error.message);
    return null;
  }
  return data[0];
}

async function updateFolder(folderId, updateData) {
  const { data, error } = await supabaseClient
    .from('folders')
    .update(updateData)
    .eq('id', folderId)
    .select();

  if (error) {
    showDBErrorAlert('updateFolder', error.message);
    return null;
  }
  return data ? data[0] : null;
}

async function insertMessage(messageData) {
  const { data, error } = await supabaseClient
    .from('messages')
    .insert([messageData])
    .select();

  if (error) {
    showDBErrorAlert('insertMessage', error.message);
    return null;
  }
  return data[0];
}

// Global Export
window.supabaseAPI = {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  fetchUserFolders,
  fetchFolderMessages,
  insertFolder,
  updateFolder,
  insertMessage
};
