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
    scheduleCloudSync();
  }
}

function setTastingNotesFromSync(notesArr) {
  if (!Array.isArray(notesArr)) return;
  myTastingNotes = notesArr;
  safeSetStorage('speakeasy-tasting-notes', JSON.stringify(myTastingNotes));
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
}

// ===== SUPABASE CLOUD SYNC (profile, likes, whisky_likes, tasting_notes, prefs, region) =====
let cloudSyncTimer = null;
let isHydratingFromCloud = false;

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

async function pushUserDataToCloud() {
  if (isHydratingFromCloud) return false;
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken || !state.account.userId) return false;
  try {
    const payload = {
      user_id: state.account.userId,
      profile: state.profile,
      likes: Array.from(state.likes),
      whisky_likes: Array.from(state.likedWhiskies),
      tasting_notes: myTastingNotes,
      prefs: state.prefs,
      region: state.region,
      updated_at: new Date().toISOString()
    };
    const res = await supabaseAuthedFetch('/rest/v1/user_data?on_conflict=user_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(payload)
    });
    return !!(res && res.ok);
  } catch (e) {
    return false;
  }
}

function scheduleCloudSync() {
  if (isHydratingFromCloud) return;
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken || !state.account.userId) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    pushUserDataToCloud();
  }, 450);
}

async function pullUserDataFromCloud() {
  if (!hasLiveSupabase() || !state.account || !state.account.accessToken || !state.account.userId) return false;
  try {
    const uid = encodeURIComponent(state.account.userId);
    const res = await supabaseAuthedFetch('/rest/v1/user_data?user_id=eq.' + uid + '&select=*', {
      method: 'GET'
    });
    if (!res || !res.ok) return false;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      await pushUserDataToCloud();
      return true;
    }
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
  email:  { label: '이메일', badge: '이메일', demoEmail: 'member@speakeasy.app' },
  apple:  { label: 'Apple',  badge: 'Apple',  demoEmail: 'member@privaterelay.appleid.com' },
  naver:  { label: '네이버', badge: '네이버', demoEmail: 'speakeasy@naver.com' },
  google: { label: 'Google', badge: 'Google', demoEmail: 'speakeasy@gmail.com' }
};

function hasLiveSupabase() {
  return Boolean(window.SPEAKEASY_SUPABASE && window.SPEAKEASY_SUPABASE.url && window.SPEAKEASY_SUPABASE.anonKey);
}

function setAccountState(nextAccount, silentNative) {
  state.account = nextAccount || null;
  if (state.account) safeSetStorage('speakeasy-account', JSON.stringify(state.account));
  else safeSetStorage('speakeasy-account', 'null');
  if (!silentNative) postToNative({ type: 'ACCOUNT', account: state.account });
  if (state.view === 'my') renderMyView();
  if (document.getElementById('settingsScreen')?.classList.contains('open')) renderSettingsScreen();
}

function handleSocialLogin(provider) {
  const meta = PROVIDER_META[provider] || PROVIDER_META.apple;
  if (hasLiveSupabase() && (provider === 'google' || provider === 'apple')) {
    const redirectTo = encodeURIComponent(window.location.href);
    const authUrl = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '') +
      '/auth/v1/authorize?provider=' + encodeURIComponent(provider) + '&redirect_to=' + redirectTo;
    window.open(authUrl, '_blank');
    showToast(meta.label + ' 인증 창을 열었어요');
    return;
  }
  setAccountState({
    provider,
    name: state.profile.name || '스피크이지 멤버',
    email: meta.demoEmail,
    signedInAt: Date.now()
  });
  closeAuthScreen();
  showToast(meta.label + ' 계정으로 로그인했어요 (Supabase 연결 시 실인증 전환)');
}

function handleSocialLogout() {
  setAccountState(null);
  showToast(state.lang === 'en' ? 'Signed out' : (state.lang === 'ja' ? 'ログアウトしました' : '로그아웃되었어요'));
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

// ===== 19+ ADULT VERIFICATION GATE =====
let ageGateBlocked = false;
function renderAgeGateContent() {
  const card = document.getElementById('ageGateCard');
  if (!card) return;
  const cutoffYear = new Date().getFullYear() - 19;
  if (ageGateBlocked) {
    card.innerHTML = `
      <div class="age-gate-emblem restricted">19</div>
      <div class="age-gate-title">${t('ageBlockedTitle')}</div>
      <div class="age-gate-desc">${t('ageBlockedDesc')}</div>
      <button type="button" class="age-gate-btn secondary" id="ageGateRetryBtn">${t('ageBlockedRetry')}</button>
    `;
    document.getElementById('ageGateRetryBtn')?.addEventListener('click', () => {
      ageGateBlocked = false;
      renderAgeGateContent();
    });
    return;
  }

  const yearHint = state.lang === 'ko'
    ? cutoffYear + '년 이전 출생자 이용 가능'
    : (state.lang === 'ja' ? cutoffYear + '年以前生まれの方' : 'Born in ' + cutoffYear + ' or earlier');

  card.innerHTML = `
    <div class="age-gate-emblem">19+</div>
    <div class="age-gate-brand">speakeasy</div>
    <div class="age-gate-title">${t('ageGateTitle')}</div>
    <div class="age-gate-desc">${t('ageGateDesc')}</div>
    <div class="age-gate-year-pill">${yearHint}</div>
    <button type="button" class="age-gate-btn primary" id="ageGateConfirmBtn">${t('ageGateYes')}</button>
    <button type="button" class="age-gate-btn secondary" id="ageGateDenyBtn">${t('ageGateNo')}</button>
    <div class="age-gate-foot">${t('ageGateFoot')}</div>
  `;

  document.getElementById('ageGateConfirmBtn')?.addEventListener('click', () => {
    setAgeVerifiedState(true);
    showToast(state.lang === 'en' ? 'Age verified (19+)' : (state.lang === 'ja' ? '成人確認が完了しました' : '만 19세 이상 확인이 완료되었어요'));
  });
  document.getElementById('ageGateDenyBtn')?.addEventListener('click', () => {
    ageGateBlocked = true;
    renderAgeGateContent();
  });
}

function initAgeGate() {
  const overlay = document.getElementById('ageGateOverlay');
  if (!overlay) return;
  renderAgeGateContent();
  overlay.classList.toggle('open', !state.ageVerified);
}

// ===== FULL-SCREEN LOGIN / SIGNUP SCREEN (MATCHING USER DESIGN) =====
let authMode = 'login'; // 'login' | 'signup'
let authEmailDraft = '';
let authPwVisible = false;

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim());
}

function openAuthScreen(mode) {
  authMode = mode === 'signup' ? 'signup' : 'login';
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

async function submitEmailAuth(email, password, name) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPw = String(password || '');
  const cleanName = String(name || '').trim();

  if (!isValidEmail(cleanEmail)) {
    showToast('올바른 이메일 주소를 입력해 주세요');
    return;
  }
  if (cleanPw.length < 6) {
    showToast('비밀번호는 6자 이상 입력해 주세요');
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
          showToast('이메일 또는 비밀번호가 올바르지 않아요');
        } else if (rawErr.includes('email not confirmed')) {
          showToast('이메일 인증이 필요해요. 메일함을 확인해 주세요');
        } else if (rawErr.includes('already registered')) {
          showToast('이미 가입된 이메일이에요. 로그인해 주세요');
        } else if (rawErr.includes('rate limit')) {
          showToast('요청이 너무 많아요. 잠시 후 다시 시도해 주세요');
        } else {
          showToast(data.error_description || data.msg || '이메일 또는 비밀번호를 확인해 주세요');
        }
        return;
      }
      if (authMode === 'signup' && !data.access_token) {
        authMode = 'login';
        renderAuthScreen();
        showToast('인증 메일을 보냈어요! 메일함 확인 후 로그인해 주세요');
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
        setProfileState({ ...state.profile, name: resolvedName });
        await pushUserDataToCloud();
      } else {
        setProfileState({ ...state.profile, name: resolvedName }, true);
        await pullUserDataFromCloud();
      }
      closeAuthScreen();
      showToast(authMode === 'signup' ? '회원가입이 완료되었어요!' : '로그인 및 기록 동기화 완료!');
      return;
    } catch (err) {
      showToast('네트워크 연결을 확인해 주세요');
      return;
    }
  }

  // Local account verification fallback (real email/password check until Supabase keys are connected)
  const users = getLocalUsers();
  if (authMode === 'signup') {
    if (users.some(u => u.email === cleanEmail)) {
      showToast('이미 가입된 이메일이에요. 로그인해 주세요');
      return;
    }
    const newName = cleanName || cleanEmail.split('@')[0];
    users.push({ email: cleanEmail, password: cleanPw, name: newName });
    saveLocalUsers(users);
    setProfileState({ ...state.profile, name: newName });
    setAccountState({ provider: 'email', name: newName, email: cleanEmail, signedInAt: Date.now() });
    closeAuthScreen();
    showToast('회원가입 후 로그인되었어요!');
  } else {
    const matched = users.find(u => u.email === cleanEmail);
    if (matched && matched.password !== cleanPw) {
      showToast('비밀번호가 일치하지 않아요');
      return;
    }
    const resolvedName = matched ? matched.name : (state.profile.name || cleanEmail.split('@')[0]);
    if (!matched) {
      users.push({ email: cleanEmail, password: cleanPw, name: resolvedName });
      saveLocalUsers(users);
    }
    setAccountState({ provider: 'email', name: resolvedName, email: cleanEmail, signedInAt: Date.now() });
    closeAuthScreen();
    showToast('로그인되었어요!');
  }
}

function renderAuthScreen() {
  const body = document.getElementById('authScreenBody');
  if (!body) return;
  const isSignup = authMode === 'signup';
  const emailValid = isValidEmail(authEmailDraft);

  body.innerHTML = `
    <div class="auth-hero">
      <span class="auth-eyebrow">${isSignup ? 'NEW MEMBER' : 'SPEAKEASY MEMBER'}</span>
      <div class="auth-title">${isSignup ? '회원가입' : '로그인'}</div>
      <div class="auth-subtitle">${isSignup
        ? '내 취향에 맞는 위스키 바와 테이스팅 노트를 한곳에 보관해 보세요.'
        : '저장한 바와 찜한 위스키, 나만의 테이스팅 노트를 이어서 확인해요.'
      }</div>
    </div>

    <form class="auth-form" id="authForm" novalidate>
      ${isSignup ? `
        <div class="auth-field">
          <label class="auth-label" for="authNameInput">이름 (닉네임)</label>
          <div class="auth-input-box">
            <input type="text" class="auth-input" id="authNameInput" maxlength="20" placeholder="사용할 이름을 입력해 주세요" autocomplete="nickname" />
          </div>
        </div>
      ` : ''}

      <div class="auth-field">
        <label class="auth-label" for="authEmailInput">이메일 주소</label>
        <div class="auth-input-box">
          <input type="email" class="auth-input" id="authEmailInput" value="${authEmailDraft.replace(/"/g, '&quot;')}" placeholder="name@example.com" autocomplete="email" inputmode="email" />
          <span class="auth-valid-check ${emailValid ? 'valid' : ''}" id="authEmailCheck" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </div>
      </div>

      <div class="auth-field">
        <label class="auth-label" for="authPwInput">비밀번호</label>
        <div class="auth-input-box">
          <input type="${authPwVisible ? 'text' : 'password'}" class="auth-input" id="authPwInput" placeholder="6자 이상 입력해 주세요" autocomplete="${isSignup ? 'new-password' : 'current-password'}" />
          <button type="button" class="auth-eye-btn" id="authPwToggleBtn" aria-label="비밀번호 표시 전환">
            ${authPwVisible
              ? '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
              : '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            }
          </button>
        </div>
      </div>

      <button type="submit" class="auth-submit-btn" id="authSubmitBtn">${isSignup ? '가입하고 시작하기' : '로그인하기'}</button>
    </form>

    <div class="auth-divider">
      <span>간편 로그인</span>
    </div>

    <div class="auth-social-cards">
      <button type="button" class="auth-social-card apple" data-auth-social="apple" aria-label="Apple 로그인">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/></svg>
        <span>Apple</span>
      </button>
      <button type="button" class="auth-social-card google" data-auth-social="google" aria-label="Google 로그인">
        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
        <span>Google</span>
      </button>
      <button type="button" class="auth-social-card naver" data-auth-social="naver" aria-label="네이버 로그인">
        <svg viewBox="0 0 24 24" fill="#03C75A"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>
        <span>네이버</span>
      </button>
    </div>

    <div class="auth-switch-row">
      <span>${isSignup ? '이미 계정이 있으신가요?' : '스피크이지가 처음이신가요?'}</span>
      <button type="button" class="auth-switch-btn" id="authSwitchModeBtn">${isSignup ? '로그인' : '회원가입'}</button>
    </div>
  `;

  const emailEl = document.getElementById('authEmailInput');
  const checkEl = document.getElementById('authEmailCheck');
  const pwEl = document.getElementById('authPwInput');

  emailEl?.addEventListener('input', (e) => {
    authEmailDraft = e.target.value;
    checkEl?.classList.toggle('valid', isValidEmail(authEmailDraft));
  });

  document.getElementById('authPwToggleBtn')?.addEventListener('click', () => {
    const curPw = pwEl ? pwEl.value : '';
    authPwVisible = !authPwVisible;
    renderAuthScreen();
    const newPwEl = document.getElementById('authPwInput');
    if (newPwEl) { newPwEl.value = curPw; newPwEl.focus(); }
  });

  document.getElementById('authForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('authNameInput')?.value || '';
    submitEmailAuth(emailEl?.value || '', pwEl?.value || '', nameVal);
  });

  body.querySelectorAll('[data-auth-social]').forEach(btn => {
    btn.addEventListener('click', () => handleSocialLogin(btn.dataset.authSocial));
  });

  document.getElementById('authSwitchModeBtn')?.addEventListener('click', () => {
    authMode = isSignup ? 'login' : 'signup';
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
    </div>

    <div class="settings-section-label">${state.lang === 'en' ? 'Compliance & Policies' : (state.lang === 'ja' ? '認証・規約' : '인증 및 약관')}</div>
    <div class="my-settings-card">
      <button type="button" class="my-setting-row" id="setAgeRow">
        <div class="my-setting-left">
          <span class="my-setting-title">${t('settingAge')}</span>
          <span class="my-setting-sub">${state.ageVerified ? t('ageVerifiedSub') : t('agePendingSub')}</span>
        </div>
        <div class="my-setting-right">
          <span class="my-age-status ${state.ageVerified ? 'ok' : ''}">${state.ageVerified ? t('ageVerifiedBadge') : t('agePendingBadge')}</span>
          <div class="guide-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
      </button>

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
            <span class="my-setting-title">로그인 계정</span>
            <span class="my-setting-sub">${providerMeta.badge} · ${acc.email}</span>
          </div>
        </div>
        <button type="button" class="my-setting-row danger" id="setLogoutRow">
          <div class="my-setting-left">
            <span class="my-setting-title">${t('logout')}</span>
            <span class="my-setting-sub">${providerMeta.label} ${t('logoutSub')}</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      ` : `
        <button type="button" class="my-setting-row" id="setLoginRow">
          <div class="my-setting-left">
            <span class="my-setting-title">로그인 / 회원가입</span>
            <span class="my-setting-sub">이메일 · Apple · Google · 네이버로 간편 로그인</span>
          </div>
          <div class="guide-arrow">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      `}
    </div>

    <div class="my-footer-meta">speakeasy v1.0 · 전국 ${BARS.length}개 위스키 바 · ${WHISKIES.length}종 위스키 수록</div>
  `;

  document.getElementById('setLangRow')?.addEventListener('click', openLanguageSheet);
  document.getElementById('setLocationRow')?.addEventListener('click', () => {
    requestWebUserLocation(false);
    showToast('현재 위치를 업데이트하고 있어요');
  });
  document.getElementById('setAgeRow')?.addEventListener('click', openAgeInfoSheet);
  document.getElementById('setTermsRow')?.addEventListener('click', () => openTermsSheet('terms'));
  document.getElementById('setLoginRow')?.addEventListener('click', () => openAuthScreen('login'));
  document.getElementById('setLogoutRow')?.addEventListener('click', handleSocialLogout);
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
      <div class="sheet-bar-name">프로필 편집</div>
      <span class="sheet-match">내 정보</span>
    </div>

    <div class="profile-edit-avatar-block">
      <div class="profile-edit-avatar-circle" id="profileEditAvatarPreview">
        ${pendingAvatarDraft ? `<img src="${pendingAvatarDraft}" alt="프로필 사진" />` : `<span>${initialChar}</span>`}
      </div>
      <div class="profile-edit-avatar-actions">
        <button type="button" class="profile-photo-btn primary" id="profilePickPhotoBtn">사진 선택</button>
        ${pendingAvatarDraft ? '<button type="button" class="profile-photo-btn" id="profileResetPhotoBtn">기본 이미지</button>' : ''}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="profileNameInput">이름 (닉네임)</label>
      <input type="text" class="note-form-input" id="profileNameInput" maxlength="20" value="${(state.profile.name || '').replace(/"/g, '&quot;')}" placeholder="표시할 이름을 입력해 주세요" autocomplete="off" />
    </div>

    <button type="button" class="note-save-cta" id="profileSaveBtn">프로필 저장하기</button>
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
          resetBtn.textContent = '기본 이미지';
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
    showToast('프로필을 저장했어요');
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== LANGUAGE SELECTION SHEET =====
function openLanguageSheet() {
  const langs = [
    { code: 'ko', name: '한국어', sub: 'Korean (기본)' },
    { code: 'en', name: 'English', sub: '영어 인터페이스' },
    { code: 'ja', name: '日本語', sub: '일본어 인터페이스' }
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
    terms: `
      <div class="my-policy-heading">제1조 (목적 및 서비스 범위)</div>
      <p class="my-policy-p">본 약관은 speakeasy(이하 "서비스")가 제공하는 위스키 바 탐색, 위스키 가이드, 지도 및 테이스팅 노트 기록 기능의 이용 조건과 절차를 규정합니다.</p>
      <div class="my-policy-heading">제2조 (이용 연령 제한 및 건전 음주)</div>
      <p class="my-policy-p">본 서비스는 대한민국 법정 음주 가능 연령인 만 19세 이상 성인만 이용할 수 있으며, 과도한 음주를 권장하지 않습니다. 매장 영업시간·가격·보유 바틀 정보는 현장 사정에 따라 달라질 수 있습니다.</p>
      <div class="my-policy-heading">제3조 (계정 및 이용자 콘텐츠)</div>
      <p class="my-policy-p">이용자가 작성한 테이스팅 노트 및 찜 목록은 본인의 개인 기록 용도로 보관되며, 언제든 수정하거나 삭제할 수 있습니다.</p>
    `,
    privacy: `
      <div class="my-policy-heading">1. 수집하는 개인정보 항목</div>
      <p class="my-policy-p">• 로그인 연동 시: 이메일 주소, 로그인 제공자 식별값 (이메일 / Apple / 네이버 / Google)<br/>• 프로필 설정 시: 사용자가 직접 입력한 닉네임, 프로필 이미지<br/>• 서비스 이용 시: 찜한 바·찜한 술·테이스팅 노트, (동의 시) 현재 위치 좌표</p>
      <div class="my-policy-heading">2. 개인정보의 이용 목적 및 보관</div>
      <p class="my-policy-p">수집된 정보는 회원 식별, 맞춤형 바 추천, 개인 기록 보관 목적에만 사용되며, 이용자는 언제든 수정·삭제 및 로그아웃할 수 있습니다.</p>
    `,
    location: `
      <div class="my-policy-heading">1. 위치정보 수집 및 이용 목적</div>
      <p class="my-policy-p">speakeasy는 이용자의 동의를 얻어 현재 위치(GPS) 정보를 확인하며, 다음 목적에만 일회성으로 사용합니다.<br/>• 지도 탭에서 내 현재 위치 중심으로 주변 바 표시<br/>• 검색 및 추천 결과의 '가까운 거리순' 정렬</p>
      <div class="my-policy-heading">2. 위치정보 보관 및 권한 철회</div>
      <p class="my-policy-p">현재 위치 좌표는 서버에 영구 저장하거나 제3자에게 제공하지 않습니다. 기기 설정에서 언제든 위치 권한을 변경하거나 철회할 수 있습니다.</p>
    `
  };

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:12px;">
      <div class="sheet-bar-name">${t('settingTerms')}</div>
      <span class="sheet-match">v1.0</span>
    </div>
    <div class="my-policy-tabs">
      <button type="button" class="my-policy-tab ${tab === 'terms' ? 'active' : ''}" data-ptab="terms">이용약관</button>
      <button type="button" class="my-policy-tab ${tab === 'privacy' ? 'active' : ''}" data-ptab="privacy">개인정보처리방침</button>
      <button type="button" class="my-policy-tab ${tab === 'location' ? 'active' : ''}" data-ptab="location">위치기반서비스</button>
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
                  <span class="my-saved-city">${b.city}</span>
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
      <button type="button" class="my-sheet-secondary-cta" id="colBarsOpenMapBtn">지도에서 저장한 바 모두 보기</button>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">아직 저장한 위스키 바가 없어요.<br/>마음에 드는 바에 하트(♡)를 눌러 나만의 리스트를 만들어 보세요!</div>
        <button type="button" class="my-empty-btn" id="colBarsFindBtn">내 취향 바 찾으러 가기</button>
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
      <button type="button" class="my-sheet-head-btn" id="colNotesAddBtn">+ 기록 남기기</button>
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
                  <button type="button" class="my-note-del" data-col-del-note="${idx}" aria-label="기록 삭제">
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
        <div class="my-empty-text">아직 작성한 테이스팅 노트가 없어요.<br/>오늘 마신 위스키의 향과 여운을 첫 기록으로 남겨보세요.</div>
        <button type="button" class="my-empty-btn" id="colNotesFirstBtn">첫 테이스팅 노트 작성하기</button>
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
      showToast('테이스팅 노트를 삭제했어요');
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
                <span class="my-saved-name">${w.name}</span>
                <span class="my-saved-city">${w.category}</span>
              </div>
              <div class="my-saved-sub">${w.origin} · ${w.abv} · ${w.level}</div>
            </div>
            <button type="button" class="my-col-unlike-btn liked" data-col-unwhisky="${w.id}" aria-label="찜 해제">
              <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="my-empty-card" style="margin-bottom:6px;">
        <div class="my-empty-text">아직 찜한 위스키가 없어요.<br/>가이드나 검색에서 마음에 드는 위스키에 하트(♡)를 눌러 모아보세요!</div>
        <button type="button" class="my-empty-btn" id="colWhiskyGuideBtn">위스키 가이드 둘러보기</button>
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
  let pickedStyle = '니트';
  const quickPicks = ['발베니 12년 더블우드', '글렌피딕 12년', '맥캘란 12년 더블캐스크', '아드벡 10년', '메이커스마크', '조니워커 블랙', '히비키 하모니'];

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">테이스팅 노트 기록</div>
      <span class="sheet-match">나만의 기록</span>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteWhiskyInput">마신 위스키</label>
      <input type="text" class="note-form-input" id="noteWhiskyInput" placeholder="예: 발베니 12년, 아드벡 10년" autocomplete="off" />
      <div class="bar-whiskeys" style="margin-top:8px; margin-bottom:0;">
        ${quickPicks.map(p => `<button type="button" class="whiskey-tag" style="cursor:pointer; font-size:12px; padding:4px 9px;" data-note-pick="${p}">${p}</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label">만족도</label>
      <div class="note-stars-picker" id="noteStarsPicker">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-star-btn active" data-star="${n}">★</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label">음용 방식</label>
      <div class="note-style-row" id="noteStyleRow">
        ${['니트', '온더락', '하이볼', '칵테일'].map(s => `<button type="button" class="note-style-chip ${s === '니트' ? 'active' : ''}" data-nstyle="${s}">${s}</button>`).join('')}
      </div>
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteBarInput">방문한 바 (선택)</label>
      <input type="text" class="note-form-input" id="noteBarInput" placeholder="예: 바참, 이카루스, 홈바" autocomplete="off" />
    </div>

    <div class="note-form-field">
      <label class="note-form-label" for="noteMemoInput">향 · 맛 한 줄 메모</label>
      <textarea class="note-form-textarea" id="noteMemoInput" placeholder="느꼈던 향이나 분위기, 다시 마시고 싶은 이유를 가볍게 적어보세요."></textarea>
    </div>

    <button type="button" class="note-save-cta" id="noteSaveSubmitBtn">기록 저장하기</button>
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
      showToast('마신 위스키 이름을 입력해 주세요');
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
      memo: memo || '기분 좋게 즐긴 한 잔',
      date: dateStr
    });
    persistTastingNotes();
    closeDetailSheet();
    renderMyView();
    showToast('테이스팅 노트를 저장했어요');
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== MAIN MY PAGE RENDERER (PURE PROFILE + COLLECTIONS + WRITE NOTE + GEAR TO SETTINGS) =====
function renderMyView() {
  const container = document.getElementById('myContent');
  if (!container) return;

  const savedBarsCount = BARS.filter(b => state.likes.has(b.id)).length;
  const likedWhiskiesCount = WHISKIES.filter(w => state.likedWhiskies.has(w.id)).length;
  const displayName = (state.profile && state.profile.name) || '스피크이지 멤버';
  const avatarData = (state.profile && state.profile.avatar) || '';
  const initialChar = displayName.trim().charAt(0).toUpperCase() || 'S';

  const acc = state.account;
  const providerMeta = acc ? (PROVIDER_META[acc.provider] || PROVIDER_META.email) : null;

  const tasteTags = [
    state.region === '전체' ? '전국' : state.region,
    LABEL_MAP.mood[state.prefs.mood - 1],
    LABEL_MAP.price[state.prefs.price - 1],
    LABEL_MAP.taste[state.prefs.taste - 1]
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
              <span class="my-provider-dot ${acc.provider}">${providerMeta.badge}</span>
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

    <!-- 2. 3-COLUMN COLLECTIONS (저장한 바 · 테이스팅 노트 · 찜한 술) -->
    <div class="my-stats-grid">
      <button type="button" class="my-stat-box" id="myStatSaved">
        <div class="my-stat-num">${savedBarsCount}<span>${t('unitPlace')}</span></div>
        <div class="my-stat-label">${t('savedBars')} ›</div>
      </button>
      <button type="button" class="my-stat-box" id="myStatNotes">
        <div class="my-stat-num">${myTastingNotes.length}<span>${t('unitNote')}</span></div>
        <div class="my-stat-label">${t('tastingNotes')} ›</div>
      </button>
      <button type="button" class="my-stat-box" id="myStatWhiskies">
        <div class="my-stat-num">${likedWhiskiesCount}<span>${t('unitBottle')}</span></div>
        <div class="my-stat-label">${t('likedWhiskies')} ›</div>
      </button>
    </div>

    <!-- 3. TASTING NOTE WRITE ACTION (COMPACT — NEVER GROWS VERTICALLY) -->
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
  document.getElementById('myTasteStripBtn')?.addEventListener('click', () => jumpToTab('home'));
}
