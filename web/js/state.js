// ===== STATE + I18N =====
function safeGetStorage(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
function safeSetStorage(key, val) { try { window.localStorage.setItem(key, val); } catch (e) {} }

function postToNative(payload) {
  if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }
}

if (window.__SPEAKEASY_NATIVE__ || window.ReactNativeWebView) {
  document.documentElement.classList.add('native-tabs-mode');
}

let savedLikes = [];
try { savedLikes = JSON.parse(safeGetStorage('speakeasy-likes') || '[]'); } catch (e) {}

let savedWhiskyLikes = [];
try { savedWhiskyLikes = JSON.parse(safeGetStorage('speakeasy-liked-whiskies') || '[]'); } catch (e) {}

let savedPrefs = { mood: 1, price: 4, space: 3, taste: 4 };
try {
  const p = JSON.parse(safeGetStorage('speakeasy-prefs') || 'null');
  if (p && typeof p === 'object') savedPrefs = { ...savedPrefs, ...p };
} catch (e) {}
const savedRegion = safeGetStorage('speakeasy-region') || '전체';

let savedUserAccount = null;
try { savedUserAccount = JSON.parse(safeGetStorage('speakeasy-account') || 'null'); } catch (e) {}

let savedProfile = { name: '스피크이지 멤버', avatar: '' };
try {
  const pr = JSON.parse(safeGetStorage('speakeasy-profile') || 'null');
  if (pr && typeof pr === 'object') savedProfile = { name: pr.name || '스피크이지 멤버', avatar: pr.avatar || '' };
} catch (e) {}

const savedLangRaw = safeGetStorage('speakeasy-lang') || 'ko';
const savedLang = (savedLangRaw === 'en' || savedLangRaw === 'ja') ? savedLangRaw : 'ko';
const savedAgeVerified = safeGetStorage('speakeasy-age-verified') === 'true';

const state = {
  region: savedRegion,
  prefs: savedPrefs,
  view: 'home', // 'home' | 'results' | 'likes' | 'search' | 'guide' | 'map' | 'my'
  sortBy: 'match', // 'match' | 'distance' | 'price'
  likes: new Set(savedLikes),
  likedWhiskies: new Set(savedWhiskyLikes),
  account: savedUserAccount, // { provider: 'apple'|'naver'|'google', name, email } | null
  profile: savedProfile,     // { name, avatar }
  lang: savedLang,           // 'ko' | 'en' | 'ja'
  ageVerified: savedAgeVerified,
  searchQuery: '',
  searchTag: '',
  searchRegion: '전체',
  searchWhiskyType: '전체',
  searchAroma: '전체',
  searchPrice: '전체',
  userLocation: null // { lat, lng } when GPS available
};

// ===== MULTI-LANGUAGE DICTIONARY (KO / EN / JA) =====
const I18N = {
  ko: {
    langName: '한국어',
    tabHome: '홈', tabSearch: '검색', tabGuide: '가이드', tabMap: '지도', tabMy: '나',
    headerMy: '마이 페이지', headerLikes: '찜한 바', headerResults: '취향 추천 결과',
    homeTitle: '어떤 바를 원하시나요?',
    homeSub: '원하는 느낌을 선택하고 장소를 찾아보세요!',
    homeRegion: '지역 선택',
    sliderMood: '분위기', sliderPrice: '가격대', sliderSpace: '공간', sliderTaste: '취향',
    homeCta: '바 찾으러 가기',
    searchTitle: '무엇을 찾으시나요?', searchCancel: '취소', filterTitle: '검색 필터',
    mapPlaceholder: '전국 바, 지역, 지하철역, 위스키 검색',
    editProfile: '편집',
    notSignedIn: '로그인하고 내 기록을 동기화하세요',
    savedBars: '저장한 바', tastingNotes: '테이스팅 노트', likedWhiskies: '찜한 술',
    unitPlace: '곳', unitNote: '개', unitBottle: '병',
    writeNoteTitle: '테이스팅 노트 기록 남기기',
    writeNoteSubEmpty: '오늘 마신 위스키의 향과 여운을 가볍게 남겨보세요',
    settingLang: '언어 설정',
    settingTaste: '내 위스키 취향',
    settingLocation: '내 위치 정보 (거리순 · 지도)',
    locationConnected: '현재 위치 연결됨 · 탭해서 위치 갱신',
    locationDisconnected: '위치 미연결 · 탭해서 현재 위치 확인',
    settingAge: '만 19세 성인 확인',
    ageVerifiedBadge: '확인 완료',
    agePendingBadge: '미확인',
    ageVerifiedSub: '법정 음주 가능 연령 확인 완료 · 안내 보기',
    agePendingSub: '성인 확인을 진행해 주세요',
    settingTerms: '약관 및 정책',
    settingTermsSub: '이용약관 · 개인정보처리방침 · 위치기반서비스',
    logout: '로그아웃',
    logoutSub: '계정 연결 해제',
    ageGateBadge: '19+ 성인 확인',
    ageGateTitle: '만 19세 이상이신가요?',
    ageGateDesc: 'speakeasy는 위스키와 바 정보를 제공하는 성인 전용 큐레이션 앱입니다. 법정 음주 가능 연령 확인 후 이용해 주세요.',
    ageGateYes: '네, 만 19세 이상입니다',
    ageGateNo: '아니요, 만 19세 미만입니다',
    ageGateFoot: '지나친 음주는 뇌졸중, 기억력 손상이나 치매를 유발합니다.',
    ageBlockedTitle: '만 19세 미만은 이용할 수 없어요',
    ageBlockedDesc: '대한민국 청소년 보호법에 따라 만 19세 이상 성인만 speakeasy를 이용할 수 있습니다.',
    ageBlockedRetry: '잘못 눌렀어요 · 다시 확인하기'
  },
  en: {
    langName: 'English',
    tabHome: 'Home', tabSearch: 'Search', tabGuide: 'Guide', tabMap: 'Map', tabMy: 'My',
    headerMy: 'My Page', headerLikes: 'Saved Bars', headerResults: 'Matched Bars',
    homeTitle: 'What bar are you in the mood for?',
    homeSub: 'Tune your vibe and discover your next dram.',
    homeRegion: 'Region',
    sliderMood: 'Mood', sliderPrice: 'Price', sliderSpace: 'Space', sliderTaste: 'Flavor',
    homeCta: 'Find My Bars',
    searchTitle: 'What are you looking for?', searchCancel: 'Cancel', filterTitle: 'Search Filter',
    mapPlaceholder: 'Search bars, regions, stations, whisky',
    editProfile: 'Edit',
    notSignedIn: 'Sign in to sync your saved bars & notes',
    savedBars: 'Saved Bars', tastingNotes: 'Tasting Notes', likedWhiskies: 'Liked Whisky',
    unitPlace: '', unitNote: '', unitBottle: '',
    writeNoteTitle: 'Write a Tasting Note',
    writeNoteSubEmpty: 'Capture the nose, palate, and finish of your dram',
    settingLang: 'Language',
    settingTaste: 'My Whisky Taste',
    settingLocation: 'Location (Distance · Map)',
    locationConnected: 'Location active · Tap to refresh',
    locationDisconnected: 'Not connected · Tap to locate',
    settingAge: '19+ Age Verification',
    ageVerifiedBadge: 'Verified',
    agePendingBadge: 'Pending',
    ageVerifiedSub: 'Legal drinking age confirmed · View details',
    agePendingSub: 'Confirm legal drinking age',
    settingTerms: 'Terms & Policies',
    settingTermsSub: 'Terms of Service · Privacy · Location Policy',
    logout: 'Sign Out',
    logoutSub: 'Disconnect account',
    ageGateBadge: '19+ AGE GATE',
    ageGateTitle: 'Are you 19 or older?',
    ageGateDesc: 'speakeasy curates whisky bars and spirits for adults of legal drinking age. Please confirm your age to continue.',
    ageGateYes: 'Yes, I am 19 or older',
    ageGateNo: 'No, I am under 19',
    ageGateFoot: 'Please drink responsibly.',
    ageBlockedTitle: 'Access Restricted (19+)',
    ageBlockedDesc: 'You must be of legal drinking age (19+ in Korea) to use speakeasy.',
    ageBlockedRetry: 'Pressed by mistake · Check again'
  },
  ja: {
    langName: '日本語',
    tabHome: 'ホーム', tabSearch: '検索', tabGuide: 'ガイド', tabMap: '地図', tabMy: 'マイ',
    headerMy: 'マイページ', headerLikes: '保存したバー', headerResults: 'おすすめバー',
    homeTitle: 'どんなバーをお探しですか？',
    homeSub: '好みの雰囲気を選んでバーを探してみましょう！',
    homeRegion: 'エリア選択',
    sliderMood: '雰囲気', sliderPrice: '価格帯', sliderSpace: '空間', sliderTaste: '好み',
    homeCta: 'バーを探しに行く',
    searchTitle: '何をお探しですか？', searchCancel: 'キャンセル', filterTitle: '検索フィルター',
    mapPlaceholder: '全国のバー・エリア・駅・ウイスキー検索',
    editProfile: '編集',
    notSignedIn: 'ログインして記録を安全に保存しましょう',
    savedBars: '保存したバー', tastingNotes: 'テイスティング', likedWhiskies: 'お気に入りの酒',
    unitPlace: '軒', unitNote: '件', unitBottle: '本',
    writeNoteTitle: 'テイスティングノートを記録',
    writeNoteSubEmpty: '今日飲んだウイスキーの香りや余韻を残しましょう',
    settingLang: '言語設定',
    settingTaste: 'マイ・ウイスキー好み',
    settingLocation: '位置情報（距離順・地図）',
    locationConnected: '現在地接続中・タップして更新',
    locationDisconnected: '未接続・タップして現在地を取得',
    settingAge: '成人確認（満19歳以上）',
    ageVerifiedBadge: '確認済み',
    agePendingBadge: '未確認',
    ageVerifiedSub: '飲酒可能年齢の確認が完了しました',
    agePendingSub: '年齢確認を行ってください',
    settingTerms: '利用規約・ポリシー',
    settingTermsSub: '利用規約・プライバシーポリシー・位置情報規約',
    logout: 'ログアウト',
    logoutSub: 'アカウント連携を解除',
    ageGateBadge: '19+ 成人確認',
    ageGateTitle: '満19歳以上ですか？',
    ageGateDesc: 'speakeasyはウイスキーとバー情報を扱う成人向けアプリです。法定飲酒可能年齢をご確認のうえご利用ください。',
    ageGateYes: 'はい、満19歳以上です',
    ageGateNo: 'いいえ、19歳未満です',
    ageGateFoot: 'お酒は20歳（韓国は満19歳）になってから。適量を楽しみましょう。',
    ageBlockedTitle: '未成年の方はご利用いただけません',
    ageBlockedDesc: '法令に基づき、満19歳以上の方のみspeakeasyをご利用いただけます。',
    ageBlockedRetry: '誤って押しました・もう一度確認する'
  }
};

function t(key) {
  const dict = I18N[state.lang] || I18N.ko;
  return dict[key] !== undefined ? dict[key] : (I18N.ko[key] || key);
}

function applyLanguage(lang, silentNative) {
  const valid = (lang === 'en' || lang === 'ja') ? lang : 'ko';
  state.lang = valid;
  document.documentElement.lang = valid;
  safeSetStorage('speakeasy-lang', valid);
  if (!silentNative) postToNative({ type: 'LANG', lang: valid });

  // Web bottom nav labels
  const navMap = { home: 'tabHome', search: 'tabSearch', guide: 'tabGuide', map: 'tabMap', my: 'tabMy' };
  document.querySelectorAll('.nav-item').forEach(item => {
    const k = navMap[item.dataset.tab];
    const span = item.querySelector('span');
    if (k && span) span.textContent = t(k);
  });

  // Home view static strings
  const homeTitle = document.querySelector('#viewHome .page-title');
  if (homeTitle) homeTitle.textContent = t('homeTitle');
  const homeSub = document.querySelector('#viewHome .page-subtitle');
  if (homeSub) homeSub.textContent = t('homeSub');
  const locLabel = document.querySelector('#viewHome .location-label');
  if (locLabel) {
    const svg = locLabel.querySelector('svg');
    locLabel.innerHTML = (svg ? svg.outerHTML : '') + ' ' + t('homeRegion');
  }
  const sliderKeys = ['sliderMood', 'sliderPrice', 'sliderSpace', 'sliderTaste'];
  document.querySelectorAll('#viewHome .slider-title').forEach((el, idx) => {
    if (sliderKeys[idx]) el.textContent = t(sliderKeys[idx]);
  });
  const ctaSpan = document.querySelector('#ctaButton > span:first-child');
  if (ctaSpan) ctaSpan.textContent = t('homeCta');

  // Search & Map strings
  const searchTitle = document.querySelector('#viewSearch .search-title');
  if (searchTitle) searchTitle.textContent = t('searchTitle');
  const cancelBtn = document.getElementById('searchCancelBtn');
  if (cancelBtn) cancelBtn.textContent = t('searchCancel');
  const filterTitle = document.querySelector('.filter-header-title');
  if (filterTitle) filterTitle.textContent = t('filterTitle');
  const mapInput = document.getElementById('mapSearchInput');
  if (mapInput) mapInput.placeholder = t('mapPlaceholder');

  // Active header title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    if (state.view === 'my') headerTitle.textContent = t('headerMy');
    else if (state.view === 'likes') headerTitle.textContent = t('headerLikes');
    else if (state.view === 'results') headerTitle.textContent = t('headerResults');
  }

  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
}

function setProfileState(nextProfile, silentNative) {
  if (!nextProfile || typeof nextProfile !== 'object') return;
  state.profile = {
    name: (nextProfile.name || '스피크이지 멤버').trim() || '스피크이지 멤버',
    avatar: typeof nextProfile.avatar === 'string' ? nextProfile.avatar : ''
  };
  safeSetStorage('speakeasy-profile', JSON.stringify(state.profile));
  if (!silentNative) {
    postToNative({ type: 'PROFILE', profile: state.profile });
    if (typeof scheduleCloudSync === 'function') scheduleCloudSync('profile');
  }
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
}

// Distance helper (Haversine km)
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBarDistanceKm(bar) {
  if (!state.userLocation || typeof bar.lat !== 'number' || typeof bar.lng !== 'number') return null;
  return calcDistanceKm(state.userLocation.lat, state.userLocation.lng, bar.lat, bar.lng);
}

function formatDistanceText(km) {
  if (km == null || !isFinite(km)) return '';
  if (km < 1) return Math.round(km * 1000) + 'm';
  if (km < 10) return km.toFixed(1) + 'km';
  return Math.round(km) + 'km';
}

function setUserLocation(lat, lng, autoCenterMap) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return;
  state.userLocation = { lat, lng };
  if (typeof updateMapUserLocation === 'function') updateMapUserLocation(lat, lng, !!autoCenterMap);
  if (state.view === 'results' || state.view === 'likes') {
    if (typeof renderResults === 'function') renderResults();
  }
  if (state.view === 'search' && typeof renderSearchResults === 'function') {
    renderSearchResults();
  }
  if (state.view === 'my' && typeof renderMyView === 'function') {
    renderMyView();
  }
}

// Browser geolocation fallback when running outside Expo native bridge
function requestWebUserLocation(autoCenter) {
  if (window.ReactNativeWebView) {
    postToNative({ type: 'REQUEST_LOCATION', autoCenter: !!autoCenter });
    return;
  }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => setUserLocation(pos.coords.latitude, pos.coords.longitude, autoCenter),
    () => {},
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
  );
}

// ===== AUTO-SCALE (DESKTOP PREVIEW ONLY) =====
const isMobileMedia = window.matchMedia('(pointer: coarse), (max-width: 480px)');
function scalePhone() {
  const phone = document.getElementById('phoneFrame');
  if (isMobileMedia.matches) {
    phone.style.transform = '';
    phone.parentElement.style.height = '';
  } else {
    const vh = window.innerHeight - 24;
    const scale = Math.min(1, vh / 874);
    phone.style.transform = 'scale(' + scale + ')';
    phone.parentElement.style.height = (874 * scale) + 'px';
  }
  positionAllOrbs(true);
}

// ===== THEME (LIGHT / DARK) =====
const themeMeta = document.getElementById('themeColorMeta');
const savedTheme = safeGetStorage('speakeasy-theme');
function forceHeaderGlassRepaint() {
  const hdr = document.querySelector('.fixed-header');
  if (!hdr) return;
  // Invalidate iOS WKWebView backdrop-filter cache immediately when theme flips
  hdr.style.webkitBackdropFilter = 'none';
  hdr.style.backdropFilter = 'none';
  void hdr.offsetHeight;
  requestAnimationFrame(() => {
    hdr.style.webkitBackdropFilter = '';
    hdr.style.backdropFilter = '';
  });
}

function applyTheme(theme, silentNative) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeMeta.setAttribute('content', '#121213');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeMeta.setAttribute('content', '#FFFFFF');
  }
  forceHeaderGlassRepaint();
  if (!silentNative) postToNative({ type: 'THEME', theme: theme === 'dark' ? 'dark' : 'light' });
  if (typeof updateMapTileTheme === 'function') updateMapTileTheme(theme === 'dark' ? 'dark' : 'light');
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
}
applyTheme(savedTheme || 'light');

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  safeSetStorage('speakeasy-theme', next);
  applyTheme(next);
});

// Whisky bookmark/like toggle (synced across Search, Guide, My, and Expo Go tabs)
function toggleWhiskyLike(whiskyId) {
  if (!whiskyId) return false;
  if (state.likedWhiskies.has(whiskyId)) state.likedWhiskies.delete(whiskyId);
  else state.likedWhiskies.add(whiskyId);
  const arr = Array.from(state.likedWhiskies);
  safeSetStorage('speakeasy-liked-whiskies', JSON.stringify(arr));
  postToNative({ type: 'WHISKY_LIKES', whiskyLikes: arr });
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync('whisky_likes');
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
  if (state.view === 'guide' && guideState && guideState.level === 3 && typeof renderGuideView === 'function') {
    document.querySelectorAll('[data-whisky-like="' + whiskyId + '"]').forEach(btn => {
      btn.classList.toggle('liked', state.likedWhiskies.has(whiskyId));
    });
  }
  return state.likedWhiskies.has(whiskyId);
}

// Toast helper
let toastTimer = null;
function showToast(msg) {
  const tEl = document.getElementById('appToast');
  tEl.textContent = msg;
  tEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => tEl.classList.remove('show'), 2100);
}

// Immediate press feedback on iOS/mobile touch (like location chip hover/active)
function bindTouchHighlight(el) {
  const on = () => el.classList.add('is-pressed');
  const off = () => el.classList.remove('is-pressed');
  el.addEventListener('touchstart', on, { passive: true });
  el.addEventListener('touchend', off, { passive: true });
  el.addEventListener('touchcancel', off, { passive: true });
  el.addEventListener('touchmove', off, { passive: true });
}
