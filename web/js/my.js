// ===== VIEW 6: MY PAGE (CLEAN PROFILE + 3 COLLECTIONS + NOTE CTA) + SETTINGS SCREEN + AUTH SCREEN =====
// Ready for real Supabase Auth: fill url & anonKey to enable live email/password + Google/Apple OAuth immediately
window.SPEAKEASY_SUPABASE = window.SPEAKEASY_SUPABASE || {
  url: 'https://sixykuarnemxlykqbknp.supabase.co',
  anonKey: 'sb_publishable_L-cvr5g_h1SOtnvzaXJ7eA_x2vxkfCg'
};

let myTastingNotes = [];
try {
  const rawNotes = safeGetStorage('speakeasy-tasting-notes');
  const parsed = JSON.parse(rawNotes || '[]');
  if (Array.isArray(parsed)) myTastingNotes = parsed;
} catch (e) { myTastingNotes = []; }

function persistTastingNotes(silentNative) {
  safeSetStorage('speakeasy-tasting-notes', JSON.stringify(myTastingNotes));
  if (!silentNative) {
    postToNative({ type: 'TASTING_NOTES', tastingNotes: myTastingNotes });
    scheduleCloudSync('tasting_notes');
  }
}

function setTastingNotesFromSync(notesArr) {
  if (!Array.isArray(notesArr)) return;
  myTastingNotes = notesArr;
  safeSetStorage('speakeasy-tasting-notes', JSON.stringify(myTastingNotes));
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
}

// ===== SUPABASE CLOUD SYNC (PARTIAL-FIELD SAFE PATCH + FULL UPSERT FALLBACK) =====
let cloudSyncTimer = null;
let isHydratingFromCloud = false;
let hasCloudRow = false;
const pendingCloudFields = new Set();

function buildCloudFieldPayload(fields) {
  const payload = { updated_at: new Date().toISOString() };
  const includeAll = !fields || fields.size === 0;
  if (includeAll || fields.has('profile')) payload.profile = state.profile;
  if (includeAll || fields.has('likes')) payload.likes = Array.from(state.likes);
  if (includeAll || fields.has('whisky_likes')) payload.whisky_likes = Array.from(state.likedWhiskies);
  if (includeAll || fields.has('tasting_notes')) payload.tasting_notes = myTastingNotes;
  if (includeAll || fields.has('prefs')) payload.prefs = state.prefs;
  if (includeAll || fields.has('region')) payload.region = state.region;
  return payload;
}

async function refreshSupabaseSession() {
  if (!hasLiveSupabase() || !state.account || !state.account.refreshToken) return false;
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  try {
    const res = await fetch(base + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ refresh_token: state.account.refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.access_token) return false;
    const userObj = data.user || {};
    setAccountState({
      ...state.account,
      userId: userObj.id || state.account.userId || '',
      accessToken: data.access_token,
      refreshToken: data.refresh_token || state.account.refreshToken
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function supabaseAuthedFetch(path, options, allowRetry) {
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  const token = state.account && state.account.accessToken;
  if (!token) return null;
  const headers = Object.assign(
    { 'apikey': key, 'Authorization': 'Bearer ' + token },
    (options && options.headers) || {}
  );
  let res = await fetch(base + path, Object.assign({}, options, { headers }));
  if (res.status === 401 && allowRetry !== false) {
    const refreshed = await refreshSupabaseSession();
    if (refreshed && state.account && state.account.accessToken) {
      headers['Authorization'] = 'Bearer ' + state.account.accessToken;
      res = await fetch(base + path, Object.assign({}, options, { headers }));
    }
  }
  return res;
}

async function ensureAccountUserId() {
  if (!state.account || !state.account.accessToken) return false;
  if (state.account.userId) return true;
  try {
    const res = await supabaseAuthedFetch('/auth/v1/user', { method: 'GET' });
    if (!res || !res.ok) return false;
    const u = await res.json();
    if (u && u.id) {
      setAccountState({ ...state.account, userId: u.id });
      return true;
    }
  } catch (e) {}
  return false;
}

async function pushUserDataToCloud(fieldsSet) {
  if (isHydratingFromCloud) return false;
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken) return false;
  if (!state.account.userId) {
    const okId = await ensureAccountUserId();
    if (!okId) return false;
  }
  const uid = encodeURIComponent(state.account.userId);
  try {
    // 1) When updating specific fields, PATCH only those fields so other tabs never overwrite untouched columns
    if (fieldsSet && fieldsSet.size > 0) {
      const partialPayload = buildCloudFieldPayload(fieldsSet);
      const patchRes = await supabaseAuthedFetch('/rest/v1/user_data?user_id=eq.' + uid, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(partialPayload)
      });
      if (patchRes && patchRes.ok) {
        const updatedRows = await patchRes.json().catch(() => []);
        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
          hasCloudRow = true;
          return true;
        }
      }
    }

    // 2) Full upsert (initial creation or explicit full push)
    const fullPayload = Object.assign({ user_id: state.account.userId }, buildCloudFieldPayload(null));
    const res = await supabaseAuthedFetch('/rest/v1/user_data?on_conflict=user_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(fullPayload)
    });
    if (res && res.ok) {
      hasCloudRow = true;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function flushCloudSync(forceAll) {
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = null;
  if (forceAll) {
    pendingCloudFields.clear();
    return pushUserDataToCloud(null);
  }
  if (pendingCloudFields.size === 0) return true;
  const snapshot = new Set(pendingCloudFields);
  pendingCloudFields.clear();
  const ok = await pushUserDataToCloud(snapshot);
  if (!ok) {
    snapshot.forEach(f => pendingCloudFields.add(f));
  }
  return ok;
}

function scheduleCloudSync(fieldName) {
  if (isHydratingFromCloud) return;
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken) return;
  if (fieldName) pendingCloudFields.add(fieldName);
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    flushCloudSync(false);
  }, 200);
}

async function pullUserDataFromCloud() {
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken) return false;
  if (!state.account.userId) {
    const okId = await ensureAccountUserId();
    if (!okId) return false;
  }
  try {
    const uid = encodeURIComponent(state.account.userId);
    const res = await supabaseAuthedFetch('/rest/v1/user_data?user_id=eq.' + uid + '&select=*', {
      method: 'GET'
    });
    if (!res || !res.ok) return false;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      hasCloudRow = false;
      await flushCloudSync(true);
      return true;
    }
    hasCloudRow = true;
    const row = rows[0];
    isHydratingFromCloud = true;
    try {
      if (row.profile && typeof row.profile === 'object') {
        setProfileState(row.profile, false);
      }
      if (Array.isArray(row.likes)) {
        state.likes = new Set(row.likes);
        safeSetStorage('speakeasy-likes', JSON.stringify(row.likes));
        postToNative({ type: 'LIKES', likes: row.likes });
        if (typeof updateLikeBadge === 'function') updateLikeBadge();
        if (typeof refreshMapMarkers === 'function') refreshMapMarkers();
      }
      if (Array.isArray(row.whisky_likes)) {
        state.likedWhiskies = new Set(row.whisky_likes);
        safeSetStorage('speakeasy-liked-whiskies', JSON.stringify(row.whisky_likes));
        postToNative({ type: 'WHISKY_LIKES', whiskyLikes: row.whisky_likes });
      }
      if (Array.isArray(row.tasting_notes)) {
        myTastingNotes = row.tasting_notes;
        safeSetStorage('speakeasy-tasting-notes', JSON.stringify(myTastingNotes));
        postToNative({ type: 'TASTING_NOTES', tastingNotes: myTastingNotes });
      }
      if (row.prefs && typeof row.prefs === 'object') {
        state.prefs = { ...state.prefs, ...row.prefs };
        safeSetStorage('speakeasy-prefs', JSON.stringify(state.prefs));
      }
      if (typeof row.region === 'string' && row.region) {
        state.region = row.region;
        safeSetStorage('speakeasy-region', state.region);
      }
      postToNative({ type: 'PREFS', prefs: state.prefs, region: state.region });
      if (typeof applyPrefsToUI === 'function') applyPrefsToUI();
      if (typeof updateCtaCount === 'function') updateCtaCount();
      if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
      if (state.view === 'results' || state.view === 'likes') renderResults();
      if (state.view === 'search') renderSearchResults();
      if (state.view === 'guide') renderGuideView();
    } finally {
      isHydratingFromCloud = false;
    }
    return true;
  } catch (e) {
    isHydratingFromCloud = false;
    return false;
  }
}

function resetLocalUserRecords() {
  isHydratingFromCloud = true;
  try {
    state.likes = new Set();
    safeSetStorage('speakeasy-likes', '[]');
    postToNative({ type: 'LIKES', likes: [] });
    if (typeof updateLikeBadge === 'function') updateLikeBadge();
    if (typeof refreshMapMarkers === 'function') refreshMapMarkers();

    state.likedWhiskies = new Set();
    safeSetStorage('speakeasy-liked-whiskies', '[]');
    postToNative({ type: 'WHISKY_LIKES', whiskyLikes: [] });

    myTastingNotes = [];
    safeSetStorage('speakeasy-tasting-notes', '[]');
    postToNative({ type: 'TASTING_NOTES', tastingNotes: [] });

    setProfileState({ name: '스피크이지 멤버', avatar: '' }, false);

    if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
    if (state.view === 'results' || state.view === 'likes') renderResults();
    if (state.view === 'search') renderSearchResults();
    if (state.view === 'guide') renderGuideView();
  } finally {
    isHydratingFromCloud = false;
  }
}

function getLocalUsers() {
  try {
    const arr = JSON.parse(safeGetStorage('speakeasy-local-users') || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveLocalUsers(arr) {
  safeSetStorage('speakeasy-local-users', JSON.stringify(arr));
}

const PROVIDER_META = {
  email: { label: '이메일', badge: '이메일', demoEmail: 'member@speakeasy.app' }
};

function hasLiveSupabase() {
  return Boolean(window.SPEAKEASY_SUPABASE && window.SPEAKEASY_SUPABASE.url && window.SPEAKEASY_SUPABASE.anonKey);
}

function setAccountState(nextAccount, silentNative) {
  const prevKey = (state.account && (state.account.userId || state.account.email)) || '';
  const nextKey = (nextAccount && (nextAccount.userId || nextAccount.email)) || '';
  if (prevKey !== nextKey && typeof invalidateMyBarReviewsCache === 'function') {
    invalidateMyBarReviewsCache();
  }
  state.account = nextAccount || null;
  if (state.account) safeSetStorage('speakeasy-account', JSON.stringify(state.account));
  else safeSetStorage('speakeasy-account', 'null');
  if (!silentNative) postToNative({ type: 'ACCOUNT', account: state.account });
  if (state.view === 'my') renderMyView();
  if (document.getElementById('settingsScreen')?.classList.contains('open')) renderSettingsScreen();
}

async function handleSocialLogout() {
  let syncedBeforeLogout = false;
  if (state.account && state.account.accessToken) {
    // Always flush full current state to Supabase BEFORE clearing session so nothing is ever lost
    syncedBeforeLogout = await flushCloudSync(true);
    try {
      await supabaseAuthedFetch('/auth/v1/logout', { method: 'POST' }, false);
    } catch (e) {}
  }
  hasCloudRow = false;
  pendingCloudFields.clear();
  setAccountState(null);
  if (syncedBeforeLogout) {
    resetLocalUserRecords();
    showToast(
      state.lang === 'en'
        ? 'Signed out · Your records are safely saved in your account'
        : (state.lang === 'ja'
          ? 'ログアウトしました（記録はアカウントに保存されています）'
          : '로그아웃되었어요 · 기록은 계정에 안전하게 보관돼요')
    );
  } else {
    showToast(
      state.lang === 'en'
        ? 'Signed out'
        : (state.lang === 'ja' ? 'ログアウトしました' : '로그아웃되었어요')
    );
  }
}

function jumpToTab(tabName) {
  if (window.ReactNativeWebView) {
    postToNative({ type: 'NAVIGATE_TAB', tab: tabName });
    return;
  }
  setView(tabName);
}

function findMatchingWhiskyForNote(name) {
  const n = String(name || '').toLowerCase().replace(/\s+/g, '');
  const found = WHISKIES.find(w =>
    w.name.toLowerCase().replace(/\s+/g, '').includes(n) ||
    n.includes(w.brand.toLowerCase().replace(/\s+/g, ''))
  );
  return found || WHISKIES[0];
}

// ===== FULL-SCREEN LOGIN / SIGNUP / PASSWORD RESET SCREEN (EMAIL ONLY) =====
let authMode = 'login'; // 'login' | 'signup' | 'reset'
let authEmailDraft = '';
let authPwVisible = false;

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim());
}

function openAuthScreen(mode) {
  authMode = mode === 'signup' ? 'signup' : (mode === 'reset' ? 'reset' : 'login');
  authPwVisible = false;
  renderAuthScreen();
  const el = document.getElementById('authScreen');
  if (el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeAuthScreen() {
  const el = document.getElementById('authScreen');
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

async function submitPasswordReset(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    showToast(tl('올바른 이메일 주소를 입력해 주세요', 'Please enter a valid email address', '正しいメールアドレスを入力してください'));
    return;
  }
  if (!hasLiveSupabase()) {
    showToast(tl('Supabase 연결 후 비밀번호 재설정을 사용할 수 있어요', 'Password reset requires a live Supabase connection', 'Supabase接続後にパスワード再設定を利用できます'));
    return;
  }
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  try {
    const res = await fetch(base + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ email: cleanEmail })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const rawErr = String(data.error_description || data.msg || data.message || '').toLowerCase();
      if (rawErr.includes('rate limit')) {
        showToast(tl('요청이 너무 많아요. 잠시 후 다시 시도해 주세요', 'Too many requests. Please try again in a moment', 'リクエストが集中しています。しばらくしてからお試しください'));
      } else {
        showToast(tl('비밀번호 재설정 메일 발송에 실패했어요', 'Could not send reset email. Please try again', '再設定メールの送信に失敗しました'));
      }
      return;
    }
    authMode = 'login';
    renderAuthScreen();
    showToast(tl('비밀번호 재설정 메일을 보냈어요! 메일함을 확인해 주세요', 'Reset link sent! Check your inbox', '再設定メールを送信しました。受信箱をご確認ください'));
  } catch (e) {
    showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
  }
}

async function submitEmailAuth(email, password, name, confirmPassword) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPw = String(password || '');
  const cleanName = String(name || '').trim();

  if (!isValidEmail(cleanEmail)) {
    showToast(tl('올바른 이메일 주소를 입력해 주세요', 'Please enter a valid email address', '正しいメールアドレスを入力してください'));
    return;
  }
  if (cleanPw.length < 6) {
    showToast(tl('비밀번호는 6자 이상 입력해 주세요', 'Password must be at least 6 characters', 'パスワードは6文字以上で入力してください'));
    return;
  }
  if (authMode === 'signup' && cleanPw !== String(confirmPassword || '')) {
    showToast(tl('비밀번호가 서로 일치하지 않아요', 'Passwords don’t match', 'パスワードが一致しません'));
    return;
  }

  // Live Supabase Auth path when project keys are provided
  if (hasLiveSupabase()) {
    const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
    const key = window.SPEAKEASY_SUPABASE.anonKey;
    try {
      const endpoint = authMode === 'signup'
        ? base + '/auth/v1/signup'
        : base + '/auth/v1/token?grant_type=password';
      const body = authMode === 'signup'
        ? { email: cleanEmail, password: cleanPw, data: { name: cleanName || cleanEmail.split('@')[0] } }
        : { email: cleanEmail, password: cleanPw };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': key },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        const rawErr = String(data.error_description || data.msg || data.message || '').toLowerCase();
        if (rawErr.includes('invalid login credentials')) {
          showToast(tl('이메일 또는 비밀번호가 올바르지 않아요', 'Incorrect email or password', 'メールアドレスまたはパスワードが正しくありません'));
        } else if (rawErr.includes('email not confirmed')) {
          showToast(tl('이메일 인증이 필요해요. 메일함을 확인해 주세요', 'Please verify your email first — check your inbox', 'メール認証が必要です。受信箱をご確認ください'));
        } else if (rawErr.includes('already registered')) {
          showToast(tl('이미 가입된 이메일이에요. 로그인해 주세요', 'This email is already registered — try signing in', 'すでに登録済みのメールです。ログインしてください'));
        } else if (rawErr.includes('rate limit')) {
          showToast(tl('요청이 너무 많아요. 잠시 후 다시 시도해 주세요', 'Too many attempts. Please try again shortly', 'リクエストが集中しています。少し待ってからお試しください'));
        } else {
          showToast(data.error_description || data.msg || tl('이메일 또는 비밀번호를 확인해 주세요', 'Please check your email and password', 'メールアドレスとパスワードをご確認ください'));
        }
        return;
      }
      if (authMode === 'signup' && !data.access_token) {
        authMode = 'login';
        renderAuthScreen();
        showToast(tl('인증 메일을 보냈어요! 메일함 확인 후 로그인해 주세요', 'Verification email sent! Confirm it, then sign in', '確認メールを送信しました。認証後にログインしてください'));
        return;
      }
      const userObj = data.user || data;
      const resolvedName = (userObj.user_metadata && userObj.user_metadata.name) || cleanName || cleanEmail.split('@')[0];
      const nextAcc = {
        provider: 'email',
        userId: userObj.id || '',
        name: resolvedName,
        email: cleanEmail,
        accessToken: data.access_token || '',
        refreshToken: data.refresh_token || '',
        signedInAt: Date.now()
      };
      setAccountState(nextAcc);
      if (authMode === 'signup') {
        isHydratingFromCloud = true;
        setProfileState({ ...state.profile, name: resolvedName }, false);
        isHydratingFromCloud = false;
        await flushCloudSync(true);
      } else {
        await pullUserDataFromCloud();
      }
      closeAuthScreen();
      if (typeof closeOnboardingScreen === 'function') closeOnboardingScreen(true);
      showToast(authMode === 'signup'
        ? tl('회원가입이 완료되었어요!', 'Welcome to speakeasy!', 'ご登録が完了しました！')
        : tl('로그인 및 기록 동기화 완료!', 'Signed in & synced!', 'ログインして記録を同期しました！'));
      return;
    } catch (err) {
      showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
      return;
    }
  }

  // Local account verification fallback
  const users = getLocalUsers();
  if (authMode === 'signup') {
    if (users.some(u => u.email === cleanEmail)) {
      showToast(tl('이미 가입된 이메일이에요. 로그인해 주세요', 'This email is already registered — try signing in', 'すでに登録済みのメールです。ログインしてください'));
      return;
    }
    const newName = cleanName || cleanEmail.split('@')[0];
    users.push({ email: cleanEmail, password: cleanPw, name: newName });
    saveLocalUsers(users);
    setProfileState({ ...state.profile, name: newName });
    setAccountState({ provider: 'email', name: newName, email: cleanEmail, signedInAt: Date.now() });
    closeAuthScreen();
    if (typeof closeOnboardingScreen === 'function') closeOnboardingScreen(true);
    showToast(tl('회원가입 후 로그인되었어요!', 'Welcome to speakeasy!', 'ご登録・ログインが完了しました！'));
  } else {
    const matched = users.find(u => u.email === cleanEmail);
    if (matched && matched.password !== cleanPw) {
      showToast(tl('비밀번호가 일치하지 않아요', 'Incorrect password', 'パスワードが一致しません'));
      return;
    }
    const resolvedName = matched ? matched.name : (state.profile.name || cleanEmail.split('@')[0]);
    if (!matched) {
      users.push({ email: cleanEmail, password: cleanPw, name: resolvedName });
      saveLocalUsers(users);
    }
    setAccountState({ provider: 'email', name: resolvedName, email: cleanEmail, signedInAt: Date.now() });
    closeAuthScreen();
    if (typeof closeOnboardingScreen === 'function') closeOnboardingScreen(true);
    showToast(tl('로그인되었어요!', 'Signed in!', 'ログインしました！'));
  }
}

function renderAuthScreen() {
  const body = document.getElementById('authScreenBody');
  if (!body) return;
  const isSignup = authMode === 'signup';
  const isReset = authMode === 'reset';
  const emailValid = isValidEmail(authEmailDraft);

  body.innerHTML = `
    <div class="auth-hero">
      <span class="auth-eyebrow">${isReset ? 'PASSWORD RESET' : (isSignup ? 'NEW MEMBER' : 'SPEAKEASY MEMBER')}</span>
      <div class="auth-title">${isReset ? tl('비밀번호 찾기', 'Reset Password', 'パスワード再設定') : (isSignup ? tl('회원가입', 'Create Account', '新規登録') : tl('로그인', 'Sign In', 'ログイン'))}</div>
      <div class="auth-subtitle">${isReset
        ? tl('가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드려요.', 'Enter your email and we’ll send a password reset link.', 'ご登録のメールアドレス宛に再設定リンクをお送りします。')
        : (isSignup
          ? tl('내 취향에 맞는 위스키 바와 테이스팅 노트를 한곳에 보관해 보세요.', 'Keep your favorite whisky bars, tasting notes, and reviews synced across devices.', 'お気に入りのバーやテイスティング記録をまとめて保存しましょう。')
          : tl('저장한 바와 찜한 위스키, 나만의 테이스팅 노트를 이어서 확인해요.', 'Pick up right where you left off with your saved bars and notes.', '保存したバーやノートを引き続き確認できます。'))
      }</div>
    </div>

    <form class="auth-form" id="authForm" novalidate>
      ${isSignup ? `
        <div class="auth-field">
          <label class="auth-label" for="authNameInput">${tl('이름 (닉네임)', 'Display Name', 'ニックネーム')}</label>
          <div class="auth-input-box">
            <input type="text" class="auth-input" id="authNameInput" maxlength="20" placeholder="${tl('사용할 이름을 입력해 주세요', 'What should we call you?', '表示名を入力してください')}" autocomplete="nickname" />
          </div>
        </div>
      ` : ''}

      <div class="auth-field">
        <label class="auth-label" for="authEmailInput">${tl('이메일 주소', 'Email Address', 'メールアドレス')}</label>
        <div class="auth-input-box">
          <input type="email" class="auth-input" id="authEmailInput" value="${authEmailDraft.replace(/"/g, '&quot;')}" placeholder="name@example.com" autocomplete="email" inputmode="email" />
          <span class="auth-valid-check ${emailValid ? 'valid' : ''}" id="authEmailCheck" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </div>
      </div>

      ${!isReset ? `
        <div class="auth-field">
          <label class="auth-label" for="authPwInput">${tl('비밀번호', 'Password', 'パスワード')}</label>
          <div class="auth-input-box">
            <input type="${authPwVisible ? 'text' : 'password'}" class="auth-input" id="authPwInput" placeholder="${tl('6자 이상 입력해 주세요', 'At least 6 characters', '6文字以上で入力してください')}" autocomplete="${isSignup ? 'new-password' : 'current-password'}" />
            <button type="button" class="auth-eye-btn" id="authPwToggleBtn" aria-label="Toggle password">
              ${authPwVisible
                ? '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
              }
            </button>
          </div>
        </div>
      ` : ''}

      ${isSignup ? `
        <div class="auth-field">
          <label class="auth-label" for="authPwConfirmInput">${tl('비밀번호 확인', 'Confirm Password', 'パスワード確認')}</label>
          <div class="auth-input-box">
            <input type="${authPwVisible ? 'text' : 'password'}" class="auth-input" id="authPwConfirmInput" placeholder="${tl('비밀번호를 한 번 더 입력해 주세요', 'Re-enter your password', 'もう一度入力してください')}" autocomplete="new-password" />
          </div>
        </div>
      ` : ''}

      ${(!isSignup && !isReset) ? `
        <div class="auth-forgot-row">
          <button type="button" class="auth-forgot-btn" id="authForgotBtn">${tl('비밀번호를 잊으셨나요?', 'Forgot password?', 'パスワードをお忘れですか？')}</button>
        </div>
      ` : ''}

      <button type="submit" class="auth-submit-btn" id="authSubmitBtn">${isReset ? tl('재설정 메일 보내기', 'Send Reset Link', '再設定メールを送る') : (isSignup ? tl('가입하고 시작하기', 'Create Account', '登録してはじめる') : tl('이메일로 로그인', 'Sign In', 'メールでログイン'))}</button>
    </form>

    <div class="auth-switch-row">
      ${isReset ? `
        <span>${tl('비밀번호가 기억나셨나요?', 'Remembered it?', '思い出しましたか？')}</span>
        <button type="button" class="auth-switch-btn" id="authSwitchModeBtn">${tl('로그인으로 돌아가기', 'Back to Sign In', 'ログインに戻る')}</button>
      ` : `
        <span>${isSignup ? tl('이미 계정이 있으신가요?', 'Already have an account?', 'すでにアカウントをお持ちですか？') : tl('스피크이지가 처음이신가요?', 'New to speakeasy?', 'speakeasyは初めてですか？')}</span>
        <button type="button" class="auth-switch-btn" id="authSwitchModeBtn">${isSignup ? tl('로그인', 'Sign In', 'ログイン') : tl('회원가입', 'Sign Up', '新規登録')}</button>
      `}
    </div>
  `;

  const emailEl = document.getElementById('authEmailInput');
  const checkEl = document.getElementById('authEmailCheck');
  const pwEl = document.getElementById('authPwInput');
  const pwConfirmEl = document.getElementById('authPwConfirmInput');

  emailEl?.addEventListener('input', (e) => {
    authEmailDraft = e.target.value;
    checkEl?.classList.toggle('valid', isValidEmail(authEmailDraft));
  });

  document.getElementById('authPwToggleBtn')?.addEventListener('click', () => {
    const curPw = pwEl ? pwEl.value : '';
    const curConfirm = pwConfirmEl ? pwConfirmEl.value : '';
    authPwVisible = !authPwVisible;
    renderAuthScreen();
    const newPwEl = document.getElementById('authPwInput');
    const newConfirmEl = document.getElementById('authPwConfirmInput');
    if (newPwEl) { newPwEl.value = curPw; newPwEl.focus(); }
    if (newConfirmEl) { newConfirmEl.value = curConfirm; }
  });

  document.getElementById('authForgotBtn')?.addEventListener('click', () => {
    authMode = 'reset';
    renderAuthScreen();
  });

  document.getElementById('authForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isReset) {
      submitPasswordReset(emailEl?.value || '');
      return;
    }
    const nameVal = document.getElementById('authNameInput')?.value || '';
    submitEmailAuth(emailEl?.value || '', pwEl?.value || '', nameVal, pwConfirmEl?.value || '');
  });

  document.getElementById('authSwitchModeBtn')?.addEventListener('click', () => {
    authMode = isReset ? 'login' : (isSignup ? 'login' : 'signup');
    renderAuthScreen();
  });
}

// ===== FULL-SCREEN SETTINGS SCREEN =====
function openSettingsScreen() {
  renderSettingsScreen();
  const el = document.getElementById('settingsScreen');
  if (el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeSettingsScreen() {
  const el = document.getElementById('settingsScreen');
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

function renderSettingsScreen() {
  const titleEl = document.getElementById('settingsHeaderTitle');
  if (titleEl) {
    titleEl.textContent = state.lang === 'en' ? 'Settings' : (state.lang === 'ja' ? '設定' : '설정');
  }
  const body = document.getElementById('settingsScreenBody');
  if (!body) return;

  const acc = state.account;
  const providerMeta = acc ? (PROVIDER_META[acc.provider] || PROVIDER_META.email) : null;

  body.innerHTML = `
    <div class="settings-section-label">${state.lang === 'en' ? 'App' : (state.lang === 'ja' ? 'アプリ設定' : '앱 설정')}</div>
    <div class="my-settings-card">
      <button type="button" class="my-setting-row" id="setLangRow">
        <div class="my-setting-left">
          <span class="my-setting-title">${t('settingLang')}</span>
          <span class="my-setting-sub">${I18N[state.lang].langName}</span>
        </div>
        <div class="my-setting-right">
          <span class="my-setting-pill">${state.lang.toUpperCase()}</span>
          <div class="guide-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
      </button>

      <button type="button" class="my-setting-row" id="setLocationRow">
        <div class="my-setting-left">
          <span class="my-setting-title">${t('settingLocation')}</span>
          <span class="my-setting-sub">${state.userLocation ? t('locationConnected') : t('locationDisconnected')}</span>
        </div>
        <div class="guide-arrow">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>

      <button type="button" class="my-setting-row" id="setOnboardingRow">
        <div class="my-setting-left">
          <span class="my-setting-title">${tl('앱 소개 다시 보기', 'Replay App Intro', 'アプリ紹介をもう一度見る')}</span>
          <span class="my-setting-sub">${tl('speakeasy 첫 진입 온보딩 화면 보기', 'View the speakeasy welcome tour', 'speakeasyのガイド画面を見る')}</span>
        </div>
        <div class="guide-arrow">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>
    </div>

    <div class="settings-section-label">${state.lang === 'en' ? 'Policies' : (state.lang === 'ja' ? '利用規約' : '약관 및 정책')}</div>
    <div class="my-settings-card">
      <button type="button" class="my-setting-row" id="setTermsRow">
        <div class="my-setting-left">
          <span class="my-setting-title">${t('settingTerms')}</span>
          <span class="my-setting-sub">${t('settingTermsSub')}</span>
        </div>
        <div class="guide-arrow">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>
    </div>

    <div class="settings-section-label">${state.lang === 'en' ? 'Account' : (state.lang === 'ja' ? 'アカウント' : '계정')}</div>
    <div class="my-settings-card">
      ${acc ? `
        <div class="my-setting-row static">
          <div class="my-setting-left">
            <span class="my-setting-title">${tl('로그인 계정', 'Signed-in Account', 'ログイン中のアカウント')}</span>
            <span class="my-setting-sub">${tl('이메일', 'Email', 'メール')} · ${acc.email}</span>
          </div>
        </div>
        <button type="button" class="my-setting-row" id="setChangePwRow">
          <div class="my-setting-left">
            <span class="my-setting-title">${tl('비밀번호 변경', 'Change Password', 'パスワード変更')}</span>
            <span class="my-setting-sub">${tl('새 비밀번호로 변경하기', 'Update your password', '新しいパスワードに変更')}</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
        <button type="button" class="my-setting-row" id="setLogoutRow">
          <div class="my-setting-left">
            <span class="my-setting-title">${t('logout')}</span>
            <span class="my-setting-sub">${t('logoutSub')}</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
        <button type="button" class="my-setting-row danger" id="setDeleteAccountRow">
          <div class="my-setting-left">
            <span class="my-setting-title">${tl('회원 탈퇴', 'Delete Account', 'アカウント削除')}</span>
            <span class="my-setting-sub">${tl('계정 및 저장된 모든 기록 영구 삭제', 'Permanently delete account & saved data', 'アカウントと全記録を完全に削除')}</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      ` : `
        <button type="button" class="my-setting-row" id="setLoginRow">
          <div class="my-setting-left">
            <span class="my-setting-title">${tl('로그인 / 회원가입', 'Sign In / Sign Up', 'ログイン / 新規登録')}</span>
            <span class="my-setting-sub">${tl('이메일로 로그인하고 내 기록을 동기화하세요', 'Sign in with email to sync your data', 'メールでログインして記録を同期')}</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      `}
    </div>

    <div class="my-footer-meta">${tl(`speakeasy v1.0 · 전국 ${BARS.length}개 위스키 바 · ${WHISKIES.length}종 위스키 수록`, `speakeasy v1.0 · ${BARS.length} Whisky Bars · ${WHISKIES.length} Bottles`, `speakeasy v1.0 · ${BARS.length}軒のバー · ${WHISKIES.length}種のウイスキー`)}</div>
  `;

  document.getElementById('setLangRow')?.addEventListener('click', openLanguageSheet);
  document.getElementById('setLocationRow')?.addEventListener('click', () => {
    requestWebUserLocation(false);
    showToast(tl('현재 위치를 업데이트하고 있어요', 'Updating your current location…', '現在地を更新しています…'));
  });
  document.getElementById('setOnboardingRow')?.addEventListener('click', () => {
    closeSettingsScreen();
    openOnboardingScreen(0);
  });
  document.getElementById('setTermsRow')?.addEventListener('click', () => openTermsSheet('terms'));
  document.getElementById('setLoginRow')?.addEventListener('click', () => openAuthScreen('login'));
  document.getElementById('setChangePwRow')?.addEventListener('click', openChangePasswordSheet);
  document.getElementById('setLogoutRow')?.addEventListener('click', handleSocialLogout);
  document.getElementById('setDeleteAccountRow')?.addEventListener('click', openDeleteAccountSheet);
}

function openChangePasswordSheet() {
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${tl('비밀번호 변경', 'Change Password', 'パスワード変更')}</div>
      <span class="sheet-match">${tl('계정 보안', 'Security', 'セキュリティ')}</span>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="newPwInput">${tl('새 비밀번호', 'New Password', '新しいパスワード')}</label>
      <input type="password" class="note-form-input" id="newPwInput" placeholder="${tl('6자 이상 입력해 주세요', 'At least 6 characters', '6文字以上で入力してください')}" autocomplete="new-password" />
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="newPwConfirmInput">${tl('새 비밀번호 확인', 'Confirm New Password', '新しいパスワード（確認）')}</label>
      <input type="password" class="note-form-input" id="newPwConfirmInput" placeholder="${tl('비밀번호를 한 번 더 입력해 주세요', 'Re-enter your new password', 'もう一度入力してください')}" autocomplete="new-password" />
    </div>

    <button type="button" class="note-save-cta" id="saveNewPwBtn">${tl('비밀번호 변경하기', 'Update Password', 'パスワードを変更する')}</button>
  `;

  document.getElementById('saveNewPwBtn')?.addEventListener('click', async () => {
    const pw1 = document.getElementById('newPwInput')?.value || '';
    const pw2 = document.getElementById('newPwConfirmInput')?.value || '';
    if (pw1.length < 6) {
      showToast(tl('비밀번호는 6자 이상 입력해 주세요', 'Password must be at least 6 characters', 'パスワードは6文字以上で入力してください'));
      return;
    }
    if (pw1 !== pw2) {
      showToast(tl('비밀번호가 서로 일치하지 않아요', 'Passwords don’t match', 'パスワードが一致しません'));
      return;
    }
    if (!hasLiveSupabase() || !state.account || !state.account.accessToken) {
      showToast(tl('로그인 상태를 확인해 주세요', 'Please sign in again to continue', 'ログイン状態をご確認ください'));
      return;
    }
    try {
      const res = await supabaseAuthedFetch('/auth/v1/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw1 })
      });
      if (!res || !res.ok) {
        const data = res ? await res.json().catch(() => ({})) : {};
        showToast(data.msg || data.message || tl('비밀번호 변경에 실패했어요', 'Couldn’t update password', 'パスワードの変更に失敗しました'));
        return;
      }
      closeDetailSheet();
      showToast(tl('비밀번호가 변경되었어요!', 'Password updated!', 'パスワードを変更しました！'));
    } catch (e) {
      showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
    }
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function openDeleteAccountSheet() {
  const email = state.account?.email || '';
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${tl('회원 탈퇴', 'Delete Account', 'アカウント削除')}</div>
      <span class="sheet-match">${tl('주의', 'Caution', '注意')}</span>
    </div>

    <div class="danger-confirm-box">
      ${tl(`<strong>${email}</strong> 계정을 탈퇴하면 저장한 바, 찜한 위스키, 테이스팅 노트 등 모든 기록이 영구 삭제되며 다시 복구할 수 없어요.`, `Deleting <strong>${email}</strong> will permanently erase all saved bars, whiskies, and tasting notes. This cannot be undone.`, `<strong>${email}</strong>を削除すると、保存したバー・ウイスキー・テイスティング記録がすべて完全に削除され、復元できません。`)}
    </div>

    <button type="button" class="danger-confirm-btn" id="confirmDeleteAccountBtn">${tl('네, 영구 탈퇴할게요', 'Yes, Delete Permanently', 'はい、完全に削除します')}</button>
    <button type="button" class="my-sheet-secondary-cta" id="cancelDeleteAccountBtn">${tl('취소', 'Cancel', 'キャンセル')}</button>
  `;

  document.getElementById('cancelDeleteAccountBtn')?.addEventListener('click', closeDetailSheet);
  document.getElementById('confirmDeleteAccountBtn')?.addEventListener('click', async () => {
    if (!hasLiveSupabase() || !state.account || !state.account.accessToken) {
      showToast(tl('로그인 상태를 확인해 주세요', 'Please sign in again to continue', 'ログイン状態をご確認ください'));
      return;
    }
    const btn = document.getElementById('confirmDeleteAccountBtn');
    if (btn) { btn.disabled = true; btn.textContent = tl('탈퇴 처리 중...', 'Deleting account…', '削除処理中…'); }
    try {
      const res = await supabaseAuthedFetch('/rest/v1/rpc/delete_own_account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (!res || !res.ok) {
        if (btn) { btn.disabled = false; btn.textContent = tl('네, 영구 탈퇴할게요', 'Yes, Delete Permanently', 'はい、完全に削除します'); }
        showToast(tl('Supabase에 delete_own_account 함수를 먼저 등록해 주세요', 'Could not delete account right now', 'アカウント削除を実行できませんでした'));
        return;
      }
      hasCloudRow = false;
      pendingCloudFields.clear();
      clearTimeout(cloudSyncTimer);
      setAccountState(null);
      resetLocalUserRecords();
      closeDetailSheet();
      closeSettingsScreen();
      showToast(tl('회원 탈퇴가 완료되었어요', 'Your account has been deleted', 'アカウントを削除しました'));
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = tl('네, 영구 탈퇴할게요', 'Yes, Delete Permanently', 'はい、完全に削除します'); }
      showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
    }
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

document.getElementById('settingsCloseBtn')?.addEventListener('click', closeSettingsScreen);
document.getElementById('authCloseBtn')?.addEventListener('click', closeAuthScreen);

// ===== PROFILE AVATAR COMPRESSION & EDIT SHEET =====
function compressAvatarFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      try {
        callback(canvas.toDataURL('image/jpeg', 0.8));
      } catch (e) {
        callback(reader.result);
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

let pendingAvatarDraft = null;
function openProfileEditSheet() {
  pendingAvatarDraft = state.profile.avatar || '';
  const initialChar = (state.profile.name || 'S').trim().charAt(0).toUpperCase();

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:16px;">
      <div class="sheet-bar-name">${tl('프로필 편집', 'Edit Profile', 'プロフィール編集')}</div>
      <span class="sheet-match">${tl('내 정보', 'Profile', 'マイ情報')}</span>
    </div>

    <div class="profile-edit-avatar-block">
      <div class="profile-edit-avatar-circle" id="profileEditAvatarPreview">
        ${pendingAvatarDraft ? `<img src="${pendingAvatarDraft}" alt="avatar" />` : `<span>${initialChar}</span>`}
      </div>
      <div class="profile-edit-avatar-actions">
        <button type="button" class="profile-photo-btn primary" id="profilePickPhotoBtn">${tl('사진 선택', 'Choose Photo', '写真を選ぶ')}</button>
        ${pendingAvatarDraft ? '<button type="button" class="profile-photo-btn" id="profileResetPhotoBtn">' + tl('기본 이미지', 'Reset', 'デフォルト') + '</button>' : ''}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="profileNameInput">${tl('이름 (닉네임)', 'Display Name', 'ニックネーム')}</label>
      <input type="text" class="note-form-input" id="profileNameInput" maxlength="20" value="${(state.profile.name || '').replace(/"/g, '&quot;')}" placeholder="${tl('표시할 이름을 입력해 주세요', 'Enter your display name', '表示名を入力してください')}" autocomplete="off" />
    </div>

    <button type="button" class="note-save-cta" id="profileSaveBtn">${tl('프로필 저장하기', 'Save Profile', 'プロフィールを保存')}</button>
  `;

  const avatarInput = document.getElementById('profileAvatarInput');
  const previewEl = document.getElementById('profileEditAvatarPreview');

  document.getElementById('profilePickPhotoBtn')?.addEventListener('click', () => {
    if (!avatarInput) return;
    avatarInput.value = '';
    avatarInput.onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      compressAvatarFile(f, (dataUrl) => {
        pendingAvatarDraft = dataUrl;
        if (previewEl) previewEl.innerHTML = `<img src="${dataUrl}" alt="프로필 사진" />`;
        if (!document.getElementById('profileResetPhotoBtn')) {
          const resetBtn = document.createElement('button');
          resetBtn.type = 'button';
          resetBtn.className = 'profile-photo-btn';
          resetBtn.id = 'profileResetPhotoBtn';
          resetBtn.textContent = tl('기본 이미지', 'Reset', 'デフォルト');
          resetBtn.addEventListener('click', () => {
            pendingAvatarDraft = '';
            const nVal = (document.getElementById('profileNameInput')?.value || 'S').trim();
            if (previewEl) previewEl.innerHTML = `<span>${(nVal.charAt(0) || 'S').toUpperCase()}</span>`;
            resetBtn.remove();
          });
          document.querySelector('.profile-edit-avatar-actions')?.appendChild(resetBtn);
        }
      });
    };
    avatarInput.click();
  });

  document.getElementById('profileResetPhotoBtn')?.addEventListener('click', (e) => {
    pendingAvatarDraft = '';
    const nVal = (document.getElementById('profileNameInput')?.value || 'S').trim();
    if (previewEl) previewEl.innerHTML = `<span>${(nVal.charAt(0) || 'S').toUpperCase()}</span>`;
    e.currentTarget.remove();
  });

  document.getElementById('profileSaveBtn')?.addEventListener('click', () => {
    const nextName = (document.getElementById('profileNameInput')?.value || '').trim() || '스피크이지 멤버';
    setProfileState({ name: nextName, avatar: pendingAvatarDraft || '' });
    closeDetailSheet();
    showToast(tl('프로필을 저장했어요', 'Profile saved', 'プロフィールを保存しました'));
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== LANGUAGE SELECTION SHEET =====
function openLanguageSheet() {
  const langs = [
    { code: 'ko', name: '한국어', sub: 'Korean' },
    { code: 'en', name: 'English', sub: tl('영어', 'English', '英語') },
    { code: 'ja', name: '日本語', sub: tl('일본어', 'Japanese', '日本語') }
  ];
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${t('settingLang')}</div>
      <span class="sheet-match">${I18N[state.lang].langName}</span>
    </div>
    <div class="my-sheet-list">
      ${langs.map(l => `
        <button type="button" class="my-lang-option ${state.lang === l.code ? 'active' : ''}" data-pick-lang="${l.code}">
          <div class="my-setting-left">
            <span class="my-setting-title">${l.name}</span>
            <span class="my-setting-sub">${l.sub}</span>
          </div>
          <span class="my-lang-check">${state.lang === l.code ? '✓' : ''}</span>
        </button>
      `).join('')}
    </div>
  `;
  sheetBody.querySelectorAll('[data-pick-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextLang = btn.dataset.pickLang;
      applyLanguage(nextLang);
      if (document.getElementById('settingsScreen')?.classList.contains('open')) renderSettingsScreen();
      closeDetailSheet();
      showToast(nextLang === 'en' ? 'Language set to English' : (nextLang === 'ja' ? '言語を日本語に変更しました' : '언어를 한국어로 변경했어요'));
    });
  });
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== AGE VERIFICATION INFO SHEET =====
function openAgeInfoSheet() {
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:12px;">
      <div class="sheet-bar-name">${t('settingAge')}</div>
      <span class="sheet-match">${state.ageVerified ? t('ageVerifiedBadge') : t('agePendingBadge')}</span>
    </div>
    <div class="my-policy-card">
      <div class="my-policy-heading">19+ 성인 확인 안내</div>
      <p class="my-policy-p">speakeasy는 주류를 직접 판매·배송하지 않는 위스키 바·주류 정보 큐레이션 서비스로, 앱 최초 진입 시 만 19세 이상 확인 게이트를 통해 성인 여부를 확인합니다.</p>
      <p class="my-policy-p">추후 주류 픽업 예약·스마트오더 결제 기능이 도입될 경우, 관련 법령에 따라 통신사 PASS · SMS 본인인증이 추가로 연동됩니다.</p>
    </div>
    <button type="button" class="my-sheet-secondary-cta" id="reopenAgeGateBtn">성인 확인 화면 다시 보기</button>
  `;
  document.getElementById('reopenAgeGateBtn')?.addEventListener('click', () => {
    closeDetailSheet();
    ageGateBlocked = false;
    setAgeVerifiedState(false);
  });
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== TERMS & POLICIES SHEET =====
function openTermsSheet(activeTab) {
  const tab = activeTab || 'terms';
  const bodies = {
    terms: tl(`
      <div class="my-policy-heading">제1조 (목적 및 서비스 범위)</div>
      <p class="my-policy-p">본 약관은 speakeasy(이하 "서비스")가 제공하는 위스키 바 탐색, 위스키 가이드, 지도 및 테이스팅 노트 기록 기능의 이용 조건과 절차를 규정합니다.</p>
      <div class="my-policy-heading">제2조 (이용 연령 제한 및 건전 음주)</div>
      <p class="my-policy-p">본 서비스는 대한민국 법정 음주 가능 연령인 만 19세 이상 성인만 이용할 수 있으며, 과도한 음주를 권장하지 않습니다. 매장 영업시간·가격·보유 바틀 정보는 현장 사정에 따라 달라질 수 있습니다.</p>
      <div class="my-policy-heading">제3조 (계정 및 이용자 콘텐츠)</div>
      <p class="my-policy-p">이용자가 작성한 테이스팅 노트 및 찜 목록은 본인의 개인 기록 용도로 보관되며, 언제든 수정하거나 삭제할 수 있습니다.</p>
    `, `
      <div class="my-policy-heading">1. Scope of Service</div>
      <p class="my-policy-p">speakeasy provides curated whisky bar discovery, a whisky archive, interactive map, and personal tasting logs across South Korea.</p>
      <div class="my-policy-heading">2. Responsible Drinking &amp; Venue Info</div>
      <p class="my-policy-p">This app is intended for adults of legal drinking age. Venue hours, cover charges, pricing, and bottle availability may vary on-site.</p>
      <div class="my-policy-heading">3. Your Account &amp; Notes</div>
      <p class="my-policy-p">Your saved bars, tasting notes, and reviews remain yours to edit or delete at any time.</p>
    `, `
      <div class="my-policy-heading">第1条（サービスの目的・範囲）</div>
      <p class="my-policy-p">本規約は、speakeasyが提供するウイスキーバー検索、ガイド、地図、テイスティングノート記録機能の利用条件を定めるものです。</p>
      <div class="my-policy-heading">第2条（適正飲酒および店舗情報）</div>
      <p class="my-policy-p">本サービスは飲酒可能な成人を対象としています。営業時間・料金・取扱銘柄は店舗の事情により変更される場合があります。</p>
      <div class="my-policy-heading">第3条（アカウントとユーザー記録）</div>
      <p class="my-policy-p">保存したバーやテイスティングノートは個人記録として保管され、いつでも編集・削除できます。</p>
    `),
    privacy: tl(`
      <div class="my-policy-heading">1. 수집하는 개인정보 항목</div>
      <p class="my-policy-p">• 로그인 연동 시: 이메일 주소<br/>• 프로필 설정 시: 사용자가 직접 입력한 닉네임, 프로필 이미지<br/>• 서비스 이용 시: 찜한 바·찜한 술·테이스팅 노트·작성 리뷰, (동의 시) 현재 위치 좌표</p>
      <div class="my-policy-heading">2. 개인정보의 이용 목적 및 보관</div>
      <p class="my-policy-p">수집된 정보는 회원 식별, 맞춤형 바 추천, 개인 기록 보관 목적에만 사용되며, 이용자는 언제든 수정·삭제 및 로그아웃할 수 있습니다.</p>
    `, `
      <div class="my-policy-heading">1. Information We Collect</div>
      <p class="my-policy-p">• Account: Email address used for sign-in<br/>• Profile: Display name and optional avatar<br/>• Activity: Saved bars, whiskies, tasting notes, reviews, and (when allowed) current location</p>
      <div class="my-policy-heading">2. How We Use It</div>
      <p class="my-policy-p">Your information is used solely to personalize recommendations and sync your personal records. You can edit, sign out, or permanently delete your account anytime.</p>
    `, `
      <div class="my-policy-heading">1. 収集する情報</div>
      <p class="my-policy-p">• アカウント連携時：メールアドレス<br/>• プロフィール設定時：ニックネーム、プロフィール画像<br/>• ご利用時：保存したバー・ウイスキー・ノート・レビュー、（許可時）現在地情報</p>
      <div class="my-policy-heading">2. 利用目的と管理</div>
      <p class="my-policy-p">収集した情報は会員識別・バー提案・記録の同期にのみ使用し、いつでも変更・削除・退会が可能です。</p>
    `),
    location: tl(`
      <div class="my-policy-heading">1. 위치정보 수집 및 이용 목적</div>
      <p class="my-policy-p">speakeasy는 이용자의 동의를 얻어 현재 위치(GPS) 정보를 확인하며, 다음 목적에만 일회성으로 사용합니다.<br/>• 지도 탭에서 내 현재 위치 중심으로 주변 바 표시<br/>• 검색 및 추천 결과의 '가까운 거리순' 정렬</p>
      <div class="my-policy-heading">2. 위치정보 보관 및 권한 철회</div>
      <p class="my-policy-p">현재 위치 좌표는 서버에 영구 저장하거나 제3자에게 제공하지 않습니다. 기기 설정에서 언제든 위치 권한을 변경하거나 철회할 수 있습니다.</p>
    `, `
      <div class="my-policy-heading">1. How Location Is Used</div>
      <p class="my-policy-p">With your permission, speakeasy uses your current GPS location solely to:<br/>• Center the map around nearby bars<br/>• Sort recommendations and search results by distance</p>
      <div class="my-policy-heading">2. Storage &amp; Permissions</div>
      <p class="my-policy-p">Your coordinates are never permanently stored on our servers or shared with third parties. You may revoke location access in your device settings at any time.</p>
    `, `
      <div class="my-policy-heading">1. 位置情報の利用目的</div>
      <p class="my-policy-p">speakeasyはお客様の許可を得た場合のみ現在地（GPS）を使用し、以下の目的に限定して利用します。<br/>• 地図上で現在地周辺のバーを表示<br/>• 検索およびおすすめ結果の「近い順」並び替え</p>
      <div class="my-policy-heading">2. 保管および権限の変更</div>
      <p class="my-policy-p">現在地座標をサーバーに恒久保存したり第三者へ提供することはありません。端末の設定からいつでも権限を変更できます。</p>
    `)
  };

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:12px;">
      <div class="sheet-bar-name">${t('settingTerms')}</div>
      <span class="sheet-match">v1.0</span>
    </div>
    <div class="my-policy-tabs">
      <button type="button" class="my-policy-tab ${tab === 'terms' ? 'active' : ''}" data-ptab="terms">${tl('이용약관', 'Terms', '利用規約')}</button>
      <button type="button" class="my-policy-tab ${tab === 'privacy' ? 'active' : ''}" data-ptab="privacy">${tl('개인정보처리방침', 'Privacy', 'プライバシー')}</button>
      <button type="button" class="my-policy-tab ${tab === 'location' ? 'active' : ''}" data-ptab="location">${tl('위치기반서비스', 'Location', '位置情報')}</button>
    </div>
    <div class="my-policy-card">
      ${bodies[tab]}
    </div>
  `;

  sheetBody.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => openTermsSheet(btn.dataset.ptab));
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== COLLECTION SHEET 1: SAVED BARS =====
function openSavedBarsCollectionSheet() {
  const savedBars = BARS.filter(b => state.likes.has(b.id));
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${t('savedBars')}</div>
      <span class="sheet-match">${savedBars.length}${t('unitPlace')}</span>
    </div>
    ${savedBars.length > 0 ? `
      <div class="my-sheet-list">
        ${savedBars.map(b => {
          const dist = formatDistanceText(getBarDistanceKm(b));
          return `
            <div class="my-saved-item" data-col-bar="${b.id}">
              <div class="my-saved-info">
                <div class="my-saved-top">
                  <span class="my-saved-name">${b.name}</span>
                  <span class="my-saved-city">${tRegion(b.city)}</span>
                  ${dist ? `<span class="my-saved-city">${dist}</span>` : ''}
                </div>
                <div class="my-saved-sub">${b.region} · ${b.station} · ${b.priceText}</div>
              </div>
              <button type="button" class="my-col-unlike-btn liked" data-col-unbar="${b.id}" aria-label="저장 해제">
                <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
      <button type="button" class="my-sheet-secondary-cta" id="colBarsOpenMapBtn">${tl('지도에서 저장한 바 모두 보기', 'View Saved Bars on Map', '地図で保存したバーを見る')}</button>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">${tl('아직 저장한 위스키 바가 없어요.<br/>마음에 드는 바에 하트(♡)를 눌러 나만의 리스트를 만들어 보세요!', 'No saved bars yet.<br/>Tap the heart on bars you love to build your own list.', 'まだ保存したバーがありません。<br/>気になるバーにハートを付けてリストを作りましょう。')}</div>
        <button type="button" class="my-empty-btn" id="colBarsFindBtn">${tl('내 취향 바 찾으러 가기', 'Discover Bars', '好みのバーを探す')}</button>
      </div>
    `}
  `;

  sheetBody.querySelectorAll('[data-col-bar]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-col-unbar]')) return;
      openDetailSheet(row.dataset.colBar);
    });
  });

  sheetBody.querySelectorAll('[data-col-unbar]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(btn.dataset.colUnbar);
      openSavedBarsCollectionSheet();
    });
  });

  document.getElementById('colBarsOpenMapBtn')?.addEventListener('click', () => {
    closeDetailSheet();
    jumpToTab('map');
  });

  document.getElementById('colBarsFindBtn')?.addEventListener('click', () => {
    closeDetailSheet();
    jumpToTab('home');
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== COLLECTION SHEET 2: TASTING NOTES LIST =====
function openTastingNotesCollectionSheet() {
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${t('tastingNotes')}</div>
      <button type="button" class="my-sheet-head-btn" id="colNotesAddBtn">${tl('+ 기록 남기기', '+ Add Note', '+ 記録する')}</button>
    </div>
    ${myTastingNotes.length > 0 ? `
      <div class="my-sheet-list">
        ${myTastingNotes.map((note, idx) => {
          const sampleWhisky = findMatchingWhiskyForNote(note.whisky);
          const stars = '★'.repeat(note.rating) + '☆'.repeat(5 - note.rating);
          return `
            <div class="my-note-card">
              ${renderWhiskyBottleSVG(sampleWhisky, 'thumb-sm')}
              <div class="my-note-body">
                <div class="my-note-top">
                  <span class="my-note-whisky">${note.whisky}</span>
                  <button type="button" class="my-note-del" data-col-del-note="${idx}" aria-label="Delete">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="my-note-meta">
                  <span class="my-note-stars">${stars}</span>
                  <span class="my-note-style">${note.style}</span>
                  ${note.bar ? `<span>${note.bar}</span>` : ''}
                  <span>· ${note.date}</span>
                </div>
                <div class="my-note-memo">${note.memo}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">${tl('아직 작성한 테이스팅 노트가 없어요.<br/>오늘 마신 위스키의 향과 여운을 첫 기록으로 남겨보세요.', 'No tasting notes yet.<br/>Log the nose, palate, and finish of your next dram.', 'まだテイスティングノートがありません。<br/>今日の一杯の香りや余韻を記録してみましょう。')}</div>
        <button type="button" class="my-empty-btn" id="colNotesFirstBtn">${tl('첫 테이스팅 노트 작성하기', 'Write First Note', '最初のノートを書く')}</button>
      </div>
    `}
  `;

  document.getElementById('colNotesAddBtn')?.addEventListener('click', openAddTastingNoteSheet);
  document.getElementById('colNotesFirstBtn')?.addEventListener('click', openAddTastingNoteSheet);

  sheetBody.querySelectorAll('[data-col-del-note]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.colDelNote, 10);
      myTastingNotes.splice(idx, 1);
      persistTastingNotes();
      renderMyView();
      openTastingNotesCollectionSheet();
      showToast(tl('테이스팅 노트를 삭제했어요', 'Tasting note deleted', 'ノートを削除しました'));
    });
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== COLLECTION SHEET 3: LIKED WHISKIES =====
function openLikedWhiskiesCollectionSheet() {
  const likedList = WHISKIES.filter(w => state.likedWhiskies.has(w.id));
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${t('likedWhiskies')}</div>
      <span class="sheet-match">${likedList.length}${t('unitBottle')}</span>
    </div>
    ${likedList.length > 0 ? `
      <div class="my-sheet-list">
        ${likedList.map(w => `
          <div class="my-whisky-item" data-col-whisky="${w.id}">
            ${renderWhiskyBottleSVG(w, 'thumb-sm')}
            <div class="my-saved-info">
              <div class="my-saved-top">
                <span class="my-saved-name">${state.lang === 'en' && w.en ? w.en : w.name}</span>
                <span class="my-saved-city">${tCat(w.category)}</span>
              </div>
              <div class="my-saved-sub">${tWhiskyOrigin(w.origin)} · ${w.abv} · ${tWhiskyLevel(w.level)}</div>
            </div>
            <button type="button" class="my-col-unlike-btn liked" data-col-unwhisky="${w.id}" aria-label="찜 해제">
              <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">${tl('아직 찜한 위스키가 없어요.<br/>가이드나 검색에서 마음에 드는 위스키에 하트(♡)를 눌러 모아보세요!', 'No saved whiskies yet.<br/>Tap the heart on bottles you want to try or remember.', 'まだお気に入りのウイスキーがありません。<br/>ガイドや検索からハートを付けて集めてみましょう。')}</div>
        <button type="button" class="my-empty-btn" id="colWhiskyGuideBtn">${tl('위스키 가이드 둘러보기', 'Browse Whisky Archive', 'ウイスキーアーカイブを見る')}</button>
      </div>
    `}
  `;

  sheetBody.querySelectorAll('[data-col-whisky]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-col-unwhisky]')) return;
      openWhiskySheet(row.dataset.colWhisky);
    });
  });

  sheetBody.querySelectorAll('[data-col-unwhisky]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWhiskyLike(btn.dataset.colUnwhisky);
      openLikedWhiskiesCollectionSheet();
    });
  });

  document.getElementById('colWhiskyGuideBtn')?.addEventListener('click', () => {
    closeDetailSheet();
    jumpToTab('guide');
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== WRITE TASTING NOTE SHEET =====
function openAddTastingNoteSheet() {
  let pickedRating = 5;
  let pickedStyle = tl('니트', 'Neat', 'ストレート');
  const quickPicks = state.lang === 'en'
    ? ['Balvenie 12 DoubleWood', 'Glenfiddich 12', 'Macallan 12 Double Cask', 'Ardbeg 10', "Maker's Mark", 'Johnnie Walker Black', 'Hibiki Harmony']
    : ['발베니 12년 더블우드', '글렌피딕 12년', '맥캘란 12년 더블캐스크', '아드벡 10년', '메이커스마크', '조니워커 블랙', '히비키 하모니'];

  const styleChoices = [
    { key: '니트', label: tl('니트', 'Neat', 'ストレート') },
    { key: '온더락', label: tl('온더락', 'On the Rocks', 'ロック') },
    { key: '하이볼', label: tl('하이볼', 'Highball', 'ハイボール') },
    { key: '칵테일', label: tl('칵테일', 'Cocktail', 'カクテル') }
  ];

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${tl('테이스팅 노트 기록', 'Log a Tasting Note', 'テイスティングノート')}</div>
      <span class="sheet-match">${tl('나만의 기록', 'Personal Log', 'マイ記録')}</span>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteWhiskyInput">${tl('마신 위스키', 'Whisky', '飲んだウイスキー')}</label>
      <input type="text" class="note-form-input" id="noteWhiskyInput" placeholder="${tl('예: 발베니 12년, 아드벡 10년', 'e.g. Balvenie 12, Ardbeg 10', '例：バルヴェニー12年、アードベッグ10年')}" autocomplete="off" />
      <div class="bar-whiskeys" style="margin-top:8px; margin-bottom:0;">
        ${quickPicks.map(p => `<button type="button" class="whiskey-tag" style="cursor:pointer; font-size:12px; padding:4px 9px;" data-note-pick="${p}">${p}</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label">${tl('만족도', 'Rating', '満足度')}</label>
      <div class="note-stars-picker" id="noteStarsPicker">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-star-btn active" data-star="${n}">★</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label">${tl('음용 방식', 'Served', '飲み方')}</label>
      <div class="note-style-row" id="noteStyleRow">
        ${styleChoices.map(s => `<button type="button" class="note-style-chip ${s.key === '니트' ? 'active' : ''}" data-nstyle="${s.label}">${s.label}</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteBarInput">${tl('방문한 바 (선택)', 'Bar Visited (Optional)', '訪問したバー（任意）')}</label>
      <input type="text" class="note-form-input" id="noteBarInput" placeholder="${tl('예: 바참, 이카루스, 홈바', 'e.g. Bar Cham, Home Bar', '例：バーチャム、ホームバー')}" autocomplete="off" />
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteMemoInput">${tl('향 · 맛 한 줄 메모', 'Tasting Notes', '香り・味わいのメモ')}</label>
      <textarea class="note-form-textarea" id="noteMemoInput" placeholder="${tl('느꼈던 향이나 분위기, 다시 마시고 싶은 이유를 가볍게 적어보세요.', 'Jot down flavors, aromas, or why you’d order it again…', '感じた香りや雰囲気、また飲みたい理由を気軽にメモしましょう。')}"></textarea>
    </div>

    <button type="button" class="note-save-cta" id="noteSaveSubmitBtn">${tl('기록 저장하기', 'Save Tasting Note', '記録を保存する')}</button>
  `;

  const whiskyInput = document.getElementById('noteWhiskyInput');
  sheetBody.querySelectorAll('[data-note-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      whiskyInput.value = btn.dataset.notePick;
    });
  });

  sheetBody.querySelectorAll('#noteStarsPicker .note-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pickedRating = parseInt(btn.dataset.star, 10);
      sheetBody.querySelectorAll('#noteStarsPicker .note-star-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.star, 10) <= pickedRating);
      });
    });
  });

  sheetBody.querySelectorAll('#noteStyleRow .note-style-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      pickedStyle = btn.dataset.nstyle;
      sheetBody.querySelectorAll('#noteStyleRow .note-style-chip').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('noteSaveSubmitBtn')?.addEventListener('click', () => {
    const whiskyName = (whiskyInput.value || '').trim();
    if (!whiskyName) {
      showToast(tl('마신 위스키 이름을 입력해 주세요', 'Please enter a whisky name', 'ウイスキー名を入力してください'));
      whiskyInput.focus();
      return;
    }
    const barName = (document.getElementById('noteBarInput').value || '').trim();
    const memo = (document.getElementById('noteMemoInput').value || '').trim();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    myTastingNotes.unshift({
      id: 'note-' + Date.now(),
      whisky: whiskyName,
      rating: pickedRating,
      style: pickedStyle,
      bar: barName,
      memo: memo || tl('기분 좋게 즐긴 한 잔', 'A memorable dram', '心地よく楽しんだ一杯'),
      date: dateStr
    });
    persistTastingNotes();
    closeDetailSheet();
    renderMyView();
    showToast(tl('테이스팅 노트를 저장했어요', 'Tasting note saved', 'テイスティングノートを保存しました'));
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== MY BAR REVIEWS COLLECTION (FROM SUPABASE public.bar_reviews) =====
let myBarReviewsCache = null; // null = not fetched yet, [] = empty
let myBarReviewsFetchedUid = '';
let myBarReviewsFetchedAt = 0;

function invalidateMyBarReviewsCache() {
  myBarReviewsCache = null;
  myBarReviewsFetchedUid = '';
  myBarReviewsFetchedAt = 0;
}

function updateMyBarReviewsSubText(list) {
  const countEl = document.getElementById('myReviewsStatCount');
  if (!countEl) return;
  if (!state.account || !state.account.accessToken) {
    countEl.textContent = '0';
    return;
  }
  const arr = Array.isArray(list) ? list : [];
  countEl.textContent = String(arr.length);
}

async function fetchMyBarReviews(force) {
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken) {
    myBarReviewsCache = [];
    myBarReviewsFetchedUid = '';
    myBarReviewsFetchedAt = 0;
    return [];
  }
  if (!state.account.userId && typeof ensureAccountUserId === 'function') {
    await ensureAccountUserId();
  }
  const uid = state.account.userId;
  if (!uid) return [];
  const isFresh = myBarReviewsCache !== null && myBarReviewsFetchedUid === uid && (Date.now() - myBarReviewsFetchedAt < 5000);
  if (!force && isFresh) {
    return myBarReviewsCache;
  }
  try {
    const res = await supabaseAuthedFetch(
      '/rest/v1/bar_reviews?user_id=eq.' + encodeURIComponent(uid) + '&select=id,bar_id,author_name,rating,content,tags,photos,created_at&order=created_at.desc&limit=50',
      { method: 'GET' }
    );
    if (!res || !res.ok) return myBarReviewsCache || [];
    const rows = await res.json();
    myBarReviewsCache = Array.isArray(rows) ? rows : [];
    myBarReviewsFetchedUid = uid;
    myBarReviewsFetchedAt = Date.now();
    return myBarReviewsCache;
  } catch (e) {
    return myBarReviewsCache || [];
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.view === 'my' && state.account && state.account.accessToken) {
    fetchMyBarReviews(true).then(updateMyBarReviewsSubText);
  }
});

async function openMyBarReviewsSheet() {
  if (!state.account || !state.account.accessToken) {
    sheetBody.innerHTML = `
      <div class="sheet-title-row" style="margin-bottom:14px;">
        <div class="sheet-bar-name">${tl('내가 쓴 바 리뷰', 'My Bar Reviews', '投稿したバーレビュー')}</div>
        <span class="sheet-match">${tl('로그인 필요', 'Sign In', '要ログイン')}</span>
      </div>
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">${tl('로그인하면 내가 작성한 바 후기와 별점을<br/>한곳에서 모아보고 관리할 수 있어요!', 'Sign in to view and manage all your bar reviews<br/>and ratings in one place.', 'ログインすると、投稿したバーのレビューや評価を<br/>まとめて確認・管理できます。')}</div>
        <button type="button" class="my-empty-btn" id="myRevLoginBtn">${tl('이메일로 로그인하기', 'Sign In with Email', 'メールでログイン')}</button>
      </div>
    `;
    document.getElementById('myRevLoginBtn')?.addEventListener('click', () => {
      closeDetailSheet();
      openAuthScreen('login');
    });
    sheetScrim.classList.add('open');
    detailSheet.classList.add('open');
    return;
  }

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${tl('내가 쓴 바 리뷰', 'My Bar Reviews', '投稿したバーレビュー')}</div>
      <span class="sheet-match">${tl('불러오는 중...', 'Loading…', '読み込み中…')}</span>
    </div>
    <div class="review-empty-box">${tl('작성한 바 후기를 불러오고 있어요...', 'Loading your bar reviews…', 'レビューを読み込んでいます…')}</div>
  `;
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');

  const reviews = await fetchMyBarReviews(true);
  renderMyBarReviewsSheetBody(reviews);
  if (state.view === 'my') renderMyView();
}

function renderMyBarReviewsSheetBody(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">${tl('내가 쓴 바 리뷰', 'My Bar Reviews', '投稿したバーレビュー')}</div>
      <span class="sheet-match">${tl(list.length + '개', String(list.length), list.length + '件')}</span>
    </div>
    ${list.length > 0 ? `
      <div class="review-list" style="margin-bottom:8px;">
        ${list.map(r => {
          const bar = BARS.find(b => b.id === r.bar_id);
          const barName = bar ? bar.name : r.bar_id;
          const barRegion = bar ? (tRegion(bar.city) + ' · ' + bar.region) : '';
          const tags = Array.isArray(r.tags) ? r.tags : [];
          const photos = Array.isArray(r.photos) ? r.photos : [];
          return `
            <div class="review-card">
              <div class="review-card-top">
                <div>
                  <button type="button" class="my-review-bar-link" data-jump-review-bar="${r.bar_id}">
                    <span>${escapeReviewHtml(barName)}</span>
                    ${barRegion ? `<span class="my-review-bar-region">${escapeReviewHtml(barRegion)}</span>` : ''}
                  </button>
                  <div class="review-card-meta" style="margin-top:4px;">
                    <span class="review-stars-inline">${renderStarsText(r.rating)}</span>
                    <span class="review-date">${formatReviewDate(r.created_at)}</span>
                  </div>
                </div>
                <button type="button" class="review-del-btn" data-my-del-review="${escapeReviewHtml(r.id)}">${tl('삭제', 'Delete', '削除')}</button>
              </div>
              ${tags.length > 0 ? `
                <div class="review-card-tags">
                  ${tags.map(tg => `<span class="review-card-tag">#${escapeReviewHtml(tReviewTag(tg))}</span>`).join('')}
                </div>
              ` : ''}
              ${photos.length > 0 ? `
                <div class="review-card-photos">
                  ${photos.map(src => `<img class="review-card-photo" src="${src}" alt="review photo" data-zoom-my-photo="1" />`).join('')}
                </div>
              ` : ''}
              <div class="review-card-content">${escapeReviewHtml(r.content)}</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">${tl('아직 작성한 바 리뷰가 없어요.<br/>마음에 드는 바 상세 화면에서 첫 후기를 남겨보세요!', 'No bar reviews yet.<br/>Open any bar’s details to share your first review.', 'まだ投稿したレビューがありません。<br/>お気に入りのバーの詳細画面から最初の感想を残してみましょう。')}</div>
        <button type="button" class="my-empty-btn" id="myRevExploreBtn">${tl('바 둘러보러 가기', 'Explore Bars', 'バーを探しに行く')}</button>
      </div>
    `}
  `;

  sheetBody.querySelector('#myRevExploreBtn')?.addEventListener('click', () => {
    closeDetailSheet();
    jumpToTab('home');
  });

  sheetBody.querySelectorAll('[data-jump-review-bar]').forEach(btn => {
    btn.addEventListener('click', () => openDetailSheet(btn.dataset.jumpReviewBar));
  });

  sheetBody.querySelectorAll('[data-zoom-my-photo]').forEach(img => {
    img.addEventListener('click', () => openReviewLightbox(img.src));
  });

  sheetBody.querySelectorAll('[data-my-del-review]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const revId = btn.dataset.myDelReview;
      btn.disabled = true;
      const ok = await deleteBarReview(revId);
      if (ok) {
        invalidateMyBarReviewsCache();
        const refreshed = await fetchMyBarReviews(true);
        if (typeof preloadAllBarRatings === 'function') preloadAllBarRatings();
        renderMyBarReviewsSheetBody(refreshed);
        if (state.view === 'my') renderMyView();
      } else {
        btn.disabled = false;
      }
    });
  });
}

// ===== MAIN MY PAGE RENDERER (PURE PROFILE + COLLECTIONS + WRITE NOTE + GEAR TO SETTINGS) =====
function renderMyView() {
  const container = document.getElementById('myContent');
  if (!container) return;
  const viewMyEl = document.getElementById('viewMy');
  const prevScroll = viewMyEl ? viewMyEl.scrollTop : 0;

  const savedBarsCount = BARS.filter(b => state.likes.has(b.id)).length;
  const likedWhiskiesCount = WHISKIES.filter(w => state.likedWhiskies.has(w.id)).length;
  const rawProfileName = (state.profile && state.profile.name) || '';
  const displayName = (!rawProfileName || rawProfileName === '스피크이지 멤버')
    ? tl('스피크이지 멤버', 'Speakeasy Member', 'speakeasyメンバー')
    : rawProfileName;
  const avatarData = (state.profile && state.profile.avatar) || '';
  const initialChar = displayName.trim().charAt(0).toUpperCase() || 'S';

  const acc = state.account;
  const providerMeta = acc ? (PROVIDER_META[acc.provider] || PROVIDER_META.email) : null;

  const tasteTags = [
    tRegion(state.region),
    tLabel('mood', state.prefs.mood - 1),
    tLabel('price', state.prefs.price - 1),
    tLabel('taste', state.prefs.taste - 1)
  ];

  const writeNoteSub = myTastingNotes.length > 0
    ? (state.lang === 'en'
      ? myTastingNotes.length + ' notes saved · Tap above to view all'
      : (state.lang === 'ja' ? myTastingNotes.length + '件記録済み・上のボックスで一覧表示' : '지금까지 ' + myTastingNotes.length + '잔 기록했어요 · 위 박스에서 전체 보기'))
    : t('writeNoteSubEmpty');

  container.innerHTML = `
    <!-- TOP BAR: PROFILE LABEL + SETTINGS GEAR BUTTON -->
    <div class="my-top-bar">
      <span class="my-top-bar-label">${state.lang === 'en' ? 'Profile' : (state.lang === 'ja' ? 'プロフィール' : '내 프로필')}</span>
      <button type="button" class="my-settings-gear-btn" id="myOpenSettingsBtn" aria-label="설정 열기">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>${state.lang === 'en' ? 'Settings' : (state.lang === 'ja' ? '設定' : '설정')}</span>
      </button>
    </div>

    <!-- 1. PROFILE CARD (AVATAR + NAME + EMAIL RIGHT BELOW NAME) -->
    <div class="my-profile-card">
      <div class="my-profile-top">
        <button type="button" class="my-avatar-btn" id="myAvatarEditBtn" aria-label="프로필 사진 변경">
          ${avatarData
            ? `<img src="${avatarData}" alt="${displayName}" />`
            : `<span class="my-avatar-initial">${initialChar}</span>`
          }
          <span class="my-avatar-cam" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </span>
        </button>

        <div class="my-profile-info">
          <div class="my-profile-name-row">
            <span class="my-profile-name">${displayName}</span>
            <button type="button" class="my-profile-edit-pill" id="myProfileEditBtn">${t('editProfile')}</button>
          </div>
          ${acc ? `
            <div class="my-profile-login-row">
              <span class="my-provider-dot ${acc.provider}">${tl('이메일', 'Email', 'メール')}</span>
              <span class="my-profile-email">${acc.email}</span>
            </div>
          ` : `
            <button type="button" class="my-profile-login-link" id="myProfileLoginBtn">
              <span>${state.lang === 'en' ? 'Sign in to sync your account ›' : (state.lang === 'ja' ? 'ログインして記録を保存 ›' : '로그인하고 내 계정 연결하기 ›')}</span>
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- 2. MY RECORDS 2x2 COLLECTION GRID (저장한 바 · 찜한 술 · 테이스팅 노트 · 내가 쓴 바 리뷰) -->
    <div class="my-section-head">
      <span class="my-section-title">${state.lang === 'en' ? 'My Collection' : (state.lang === 'ja' ? 'マイコレクション' : '내 기록 모아보기')}</span>
      <span class="my-section-sub">${state.lang === 'en' ? 'Saved & Written' : (state.lang === 'ja' ? '保存・記録' : '저장 · 작성')}</span>
    </div>
    <div class="my-records-grid">
      <button type="button" class="my-record-tile" id="myStatSaved">
        <div class="my-record-top">
          <span class="my-record-label">${t('savedBars')}</span>
          <span class="my-record-chevron">›</span>
        </div>
        <div class="my-stat-num">${savedBarsCount}<span>${t('unitPlace')}</span></div>
      </button>

      <button type="button" class="my-record-tile" id="myStatWhiskies">
        <div class="my-record-top">
          <span class="my-record-label">${t('likedWhiskies')}</span>
          <span class="my-record-chevron">›</span>
        </div>
        <div class="my-stat-num">${likedWhiskiesCount}<span>${t('unitBottle')}</span></div>
      </button>

      <button type="button" class="my-record-tile" id="myStatNotes">
        <div class="my-record-top">
          <span class="my-record-label">${t('tastingNotes')}</span>
          <span class="my-record-chevron">›</span>
        </div>
        <div class="my-stat-num">${myTastingNotes.length}<span>${t('unitNote')}</span></div>
      </button>

      <button type="button" class="my-record-tile" id="myBarReviewsBtn">
        <div class="my-record-top">
          <span class="my-record-label">${state.lang === 'en' ? 'Bar Reviews' : (state.lang === 'ja' ? 'バーレビュー' : '내가 쓴 바 리뷰')}</span>
          <span class="my-record-chevron">›</span>
        </div>
        <div class="my-stat-num"><strong id="myReviewsStatCount">${acc && Array.isArray(myBarReviewsCache) ? myBarReviewsCache.length : 0}</strong><span>${t('unitNote')}</span></div>
      </button>
    </div>

    <!-- 3. TASTING NOTE WRITE ACTION -->
    <button type="button" class="my-write-note-card" id="myAddNoteBtn">
      <div class="my-write-note-icon">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <div class="my-write-note-copy">
        <div class="my-write-note-title">${t('writeNoteTitle')}</div>
        <div class="my-write-note-sub">${writeNoteSub}</div>
      </div>
      <div class="guide-arrow">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </button>

    <!-- 4. COMPACT MY TASTE SUMMARY -->
    <button type="button" class="my-taste-strip" id="myTasteStripBtn">
      <div class="my-taste-strip-top">
        <span class="my-taste-strip-title">${t('settingTaste')}</span>
        <span class="my-taste-strip-edit">${state.lang === 'en' ? 'Tune ›' : (state.lang === 'ja' ? '変更 ›' : '취향 수정 ›')}</span>
      </div>
      <div class="my-taste-strip-tags">
        ${tasteTags.map(tag => `<span class="my-taste-chip">#${tag}</span>`).join('')}
      </div>
    </button>
  `;

  document.getElementById('myOpenSettingsBtn')?.addEventListener('click', openSettingsScreen);
  document.getElementById('myAvatarEditBtn')?.addEventListener('click', openProfileEditSheet);
  document.getElementById('myProfileEditBtn')?.addEventListener('click', openProfileEditSheet);
  document.getElementById('myProfileLoginBtn')?.addEventListener('click', () => openAuthScreen('login'));
  document.getElementById('myStatSaved')?.addEventListener('click', openSavedBarsCollectionSheet);
  document.getElementById('myStatNotes')?.addEventListener('click', openTastingNotesCollectionSheet);
  document.getElementById('myStatWhiskies')?.addEventListener('click', openLikedWhiskiesCollectionSheet);
  document.getElementById('myAddNoteBtn')?.addEventListener('click', openAddTastingNoteSheet);
  document.getElementById('myBarReviewsBtn')?.addEventListener('click', openMyBarReviewsSheet);
  document.getElementById('myTasteStripBtn')?.addEventListener('click', () => jumpToTab('home'));
  if (viewMyEl) viewMyEl.scrollTop = prevScroll;

  if (acc && acc.accessToken) {
    fetchMyBarReviews(false).then(updateMyBarReviewsSubText);
  }
}

// ===== FIRST-LAUNCH ONBOARDING (3 SWIPE INTRO SLIDES + SIGNUP / LOGIN GATEWAY) =====
let onboardingActiveIndex = 0;

function closeOnboardingScreen(markDone) {
  if (markDone !== false) {
    safeSetStorage('speakeasy-onboarding-done', 'true');
  }
  const el = document.getElementById('onboardingScreen');
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

function updateOnboardingIndicators(idx) {
  onboardingActiveIndex = Math.max(0, Math.min(3, idx));
  const el = document.getElementById('onboardingScreen');
  if (!el) return;
  el.querySelectorAll('.ob-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === onboardingActiveIndex);
  });
  const skipBtn = document.getElementById('obSkipBtn');
  const nextBtn = document.getElementById('obNextBtn');
  const footer = document.getElementById('obFooter');
  const isLast = onboardingActiveIndex === 3;
  if (skipBtn) skipBtn.style.visibility = isLast ? 'hidden' : 'visible';
  if (footer) footer.classList.toggle('is-last', isLast);
  if (nextBtn) {
    nextBtn.textContent = onboardingActiveIndex === 2
      ? tl('시작하기', 'Get Started', 'はじめる')
      : tl('다음', 'Next', '次へ');
  }
}

function openOnboardingScreen(startIdx) {
  const el = document.getElementById('onboardingScreen');
  if (!el) return;
  onboardingActiveIndex = typeof startIdx === 'number' ? startIdx : 0;

  el.innerHTML = `
    <div class="ob-top-bar">
      <span class="ob-brand">speakeasy</span>
      <button type="button" class="ob-skip-btn" id="obSkipBtn">${tl('건너뛰기', 'Skip', 'スキップ')}</button>
    </div>

    <div class="onboarding-slides" id="onboardingSlides">
      <!-- SLIDE 1: TASTE CURATION -->
      <section class="ob-slide">
        <div class="ob-visual-card">
          <div class="ob-visual-eyebrow">01 · CURATION</div>
          <div class="ob-mock-sliders">
            <div class="ob-mock-row">
              <span>${t('sliderMood')}</span>
              <div class="ob-mock-track"><div class="ob-mock-fill" style="width:24%"></div><div class="ob-mock-orb" style="left:24%"></div></div>
            </div>
            <div class="ob-mock-row">
              <span>${t('sliderPrice')}</span>
              <div class="ob-mock-track"><div class="ob-mock-fill" style="width:68%"></div><div class="ob-mock-orb" style="left:68%"></div></div>
            </div>
            <div class="ob-mock-row">
              <span>${t('sliderSpace')}</span>
              <div class="ob-mock-track"><div class="ob-mock-fill" style="width:45%"></div><div class="ob-mock-orb" style="left:45%"></div></div>
            </div>
            <div class="ob-mock-row">
              <span>${tl('취향', 'Flavor', '好み')}</span>
              <div class="ob-mock-track"><div class="ob-mock-fill" style="width:82%"></div><div class="ob-mock-orb" style="left:82%"></div></div>
            </div>
          </div>
          <div class="ob-mock-chips">
            <span class="ob-mock-chip active">${tl('조용한 바', 'Quiet Bar', '静かなバー')}</span>
            <span class="ob-mock-chip">${tl('혼술 추천', 'Solo-Friendly', 'ひとり飲み◎')}</span>
            <span class="ob-mock-chip">${tl('취향 96% 일치', '96% Match', 'マッチ度96%')}</span>
          </div>
        </div>
        <div class="ob-copy">
          <h2 class="ob-title">${tl('취향으로 찾는<br/>나만의 위스키 바', 'Find Whisky Bars<br/>Made for Your Mood', '気分で選べる<br/>あなただけのバー')}</h2>
          <p class="ob-desc">${tl('분위기, 가격대, 공간, 위스키 스타일.<br/>네 가지 감각에 꼭 맞는 전국 바를 추천해 드려요.', 'Tune atmosphere, budget, setting, and flavor.<br/>We match you with Korea’s finest whisky bars.', '雰囲気・価格帯・空間・味わいの4つから、<br/>今の気分にぴったりの一軒をご提案します。')}</p>
        </div>
      </section>

      <!-- SLIDE 2: BEGINNER GUIDE + AI LABEL SCAN & ARCHIVE -->
      <section class="ob-slide">
        <div class="ob-visual-card">
          <div class="ob-visual-eyebrow">02 · GUIDE &amp; AI</div>
          <div class="ob-scan-frame">
            <div class="ob-scan-corner tl"></div>
            <div class="ob-scan-corner tr"></div>
            <div class="ob-scan-corner bl"></div>
            <div class="ob-scan-corner br"></div>
            <div class="ob-scan-line"></div>
            <div class="ob-scan-bottle">
              <div class="ob-bottle-neck"></div>
              <div class="ob-bottle-body">
                <div class="ob-bottle-label">
                  <span>SINGLE MALT</span>
                  <strong>12Y</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="ob-mock-chips">
            <span class="ob-mock-chip active">${tl('초보자 가이드', 'Beginner Guide', '初心者ガイド')}</span>
            <span class="ob-mock-chip">${tl('AI 라벨 판독', 'AI Label Scan', 'AIラベル認識')}</span>
            <span class="ob-mock-chip">${tl('사전 · 페어링', 'Glossary & Bites', '辞典・ペアリング')}</span>
          </div>
        </div>
        <div class="ob-copy">
          <h2 class="ob-title">${tl('초보자 가이드부터<br/>AI 라벨 스캔까지', 'From Beginner Guide<br/>to AI Label Scan', '初心者ガイドから<br/>AIラベルスキャンまで')}</h2>
          <p class="ob-desc">${tl('위스키가 처음이어도 쉽게 알아갈 수 있어요.<br/>4대 위스키 입문 가이드·용어 사전·안주 페어링과<br/>AI 라벨 판독·소믈리에까지 한 번에 담아뒀어요.', 'New to whisky? We’ve got you covered.<br/>Explore style guides, glossary & pairings,<br/>plus instant AI label scan and sommelier Q&A.', 'ウイスキーが初めてでも大丈夫。<br/>4大スタイル解説・用語辞典・ペアリングから<br/>AIラベル認識・ソムリエ相談までこれひとつ。')}</p>
        </div>
      </section>

      <!-- SLIDE 3: MINIMAL MAP & TASTING LOG -->
      <section class="ob-slide">
        <div class="ob-visual-card">
          <div class="ob-visual-eyebrow">03 · MAP &amp; LOG</div>
          <div class="ob-map-mock">
            <div class="ob-map-road r1"></div>
            <div class="ob-map-road r2"></div>
            <div class="ob-map-river"></div>
            <span class="ob-map-area a1">${tl('이태원', 'Itaewon', '梨泰院')}</span>
            <span class="ob-map-area a2">${tl('청담', 'Cheongdam', '清潭')}</span>
            <span class="ob-map-area a3">${tl('성수', 'Seongsu', '聖水')}</span>
            <div class="ob-map-pin p1"></div>
            <div class="ob-map-pin p2"></div>
          </div>
          <div class="ob-mock-review">
            <span class="ob-mock-stars">★★★★★</span>
            <span class="ob-mock-review-txt">${tl('바텐더 추천이 완벽했던 조용한 공간', 'Quiet gem with spot-on bartender picks', 'バーテンダーの提案が完璧な隠れ家')}</span>
          </div>
        </div>
        <div class="ob-copy">
          <h2 class="ob-title">${tl('나만의 바 지도와<br/>위스키 테이스팅 기록', 'Your Personal Map<br/>& Tasting Journal', '自分だけのバー地図と<br/>テイスティング記録')}</h2>
          <p class="ob-desc">${tl('저장한 바를 깔끔한 지도 위 핀으로 모아두고,<br/>테이스팅 노트와 방문 리뷰를 한곳에 남겨 보세요.', 'Pin your favorite bars on a clean, minimal map,<br/>and keep tasting notes & reviews in one place.', '保存したバーをシンプルな地図にピン留めして、<br/>飲んだ一杯のノートやレビューをまとめて管理。')}</p>
        </div>
      </section>

      <!-- SLIDE 4: WELCOME GATEWAY (SIGNUP / LOGIN / EXPLORE) -->
      <section class="ob-slide ob-slide-welcome">
        <div class="ob-welcome-copy">
          <span class="ob-welcome-eyebrow">WELCOME TO SPEAKEASY</span>
          <h2 class="ob-welcome-title">${tl('speakeasy가<br/>처음이신가요?', 'New to<br/>speakeasy?', 'speakeasyは<br/>初めてですか？')}</h2>
          <p class="ob-welcome-desc">${tl('이메일 계정을 연결하면 찜한 바와 테이스팅 노트,<br/>내가 쓴 리뷰가 언제든 안전하게 동기화돼요.', 'Connect your email to keep your saved bars,<br/>tasting notes, and reviews synced everywhere.', 'メールアカウントを連携すると、保存したバーや<br/>テイスティング記録がいつでも安全に同期されます。')}</p>
        </div>
        <div class="ob-welcome-actions">
          <button type="button" class="ob-choice-btn primary" id="obSignupBtn">
            <span>${tl('네, 처음이에요', 'Yes, I’m new here', 'はい、初めてです')}</span>
            <small>${tl('회원가입 및 이메일 연동', 'Create an account with email', '新規登録してはじめる')}</small>
          </button>
          <button type="button" class="ob-choice-btn secondary" id="obLoginBtn">
            <span>${tl('아니요, 써봤어요', 'I’ve been here before', 'いいえ、利用したことがあります')}</span>
            <small>${tl('로그인하고 바로 시작하기', 'Sign in to your account', 'ログインしてすぐはじめる')}</small>
          </button>
          <button type="button" class="ob-guest-btn" id="obGuestBtn">${tl('로그인 없이 먼저 둘러보기', 'Explore without signing in', 'ログインせずに見てみる')}</button>
        </div>
      </section>
    </div>

    <div class="ob-footer" id="obFooter">
      <div class="ob-dots" id="obDots">
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
      </div>
      <button type="button" class="ob-next-btn" id="obNextBtn">${tl('다음', 'Next', '次へ')}</button>
    </div>
  `;

  const slidesEl = document.getElementById('onboardingSlides');
  if (slidesEl) {
    slidesEl.addEventListener('scroll', () => {
      const w = slidesEl.clientWidth || 1;
      const idx = Math.round(slidesEl.scrollLeft / w);
      if (idx !== onboardingActiveIndex) updateOnboardingIndicators(idx);
    }, { passive: true });
  }

  document.getElementById('obSkipBtn')?.addEventListener('click', () => {
    if (!slidesEl) return;
    slidesEl.scrollTo({ left: slidesEl.clientWidth * 3, behavior: 'smooth' });
    updateOnboardingIndicators(3);
  });

  document.getElementById('obNextBtn')?.addEventListener('click', () => {
    if (!slidesEl) return;
    const nextIdx = Math.min(3, onboardingActiveIndex + 1);
    slidesEl.scrollTo({ left: slidesEl.clientWidth * nextIdx, behavior: 'smooth' });
    updateOnboardingIndicators(nextIdx);
  });

  document.getElementById('obSignupBtn')?.addEventListener('click', () => {
    openAuthScreen('signup');
  });

  document.getElementById('obLoginBtn')?.addEventListener('click', () => {
    openAuthScreen('login');
  });

  document.getElementById('obGuestBtn')?.addEventListener('click', () => {
    closeOnboardingScreen(true);
  });

  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  updateOnboardingIndicators(onboardingActiveIndex);
  if (slidesEl && onboardingActiveIndex > 0) {
    requestAnimationFrame(() => {
      slidesEl.scrollLeft = slidesEl.clientWidth * onboardingActiveIndex;
    });
  }
}

// Auto-launch onboarding once on first visit (Home tab only in native shell)
if (
  safeGetStorage('speakeasy-onboarding-done') !== 'true' &&
  (!window.__SPEAKEASY_NATIVE__ || window.__SPEAKEASY_INITIAL_TAB__ === 'home')
) {
  openOnboardingScreen(0);
}
