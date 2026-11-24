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

// ===== MULTI-LANGUAGE DICTIONARY (KO / EN / JA — IDIOMATIC NATIVE LOCALIZATION) =====
function tl(ko, en, ja) {
  if (state.lang === 'en') return en;
  if (state.lang === 'ja') return ja;
  return ko;
}

const REGION_I18N = {
  '전체': { ko: '전국', en: 'All Korea', ja: '全国' },
  '서울': { ko: '서울', en: 'Seoul', ja: 'ソウル' },
  '경기': { ko: '경기', en: 'Gyeonggi', ja: '京畿' },
  '인천': { ko: '인천', en: 'Incheon', ja: '仁川' },
  '부산': { ko: '부산', en: 'Busan', ja: '釜山' },
  '대구': { ko: '대구', en: 'Daegu', ja: '大邱' },
  '대전': { ko: '대전', en: 'Daejeon', ja: '大田' },
  '광주': { ko: '광주', en: 'Gwangju', ja: '光州' },
  '강원': { ko: '강원', en: 'Gangwon', ja: '江原' },
  '충청': { ko: '충청', en: 'Chungcheong', ja: '忠清' },
  '전라': { ko: '전라', en: 'Jeolla', ja: '全羅' },
  '경상': { ko: '경상', en: 'Gyeongsang', ja: '慶尚' },
  '제주': { ko: '제주', en: 'Jeju', ja: '済州' }
};
function tRegion(key) {
  const rec = REGION_I18N[key];
  if (!rec) return key;
  return rec[state.lang] || rec.ko;
}

const LABEL_MAP_I18N = {
  ko: {
    mood: ['매우 조용한', '차분한', '적당한 분위기', '경쾌한', '활기찬'],
    price: ['가성비', '합리적 가격', '중간 가격대', '고급진', '프리미엄'],
    space: ['혼술 최적', '소수 아늑한', '혼술·둘다 OK', '소모임 추천', '모임에 좋은'],
    taste: ['가볍고 달콤', '부드러운', '밸런스 좋은', '묵직한', '강렬·피트']
  },
  en: {
    mood: ['Hushed', 'Intimate', 'Balanced', 'Lively', 'Vibrant'],
    price: ['Great Value', 'Fair', 'Mid-Range', 'Upscale', 'Luxury'],
    space: ['Solo-Friendly', 'Cozy for Two', 'Solo or Group', 'Small Groups', 'Great for Groups'],
    taste: ['Light & Sweet', 'Smooth', 'Well-Balanced', 'Rich & Full', 'Bold & Peaty']
  },
  ja: {
    mood: ['とても静か', '落ち着いた', 'ほどよい', 'にぎやか', '活気ある'],
    price: ['コスパ重視', 'お手頃', 'スタンダード', '上質', 'プレミアム'],
    space: ['ひとり飲み向き', '少人数向け', 'ひとり・仲間OK', '少人数会に', 'グループ向き'],
    taste: ['軽やかで甘め', 'まろやか', 'バランス良好', '重厚', '力強いピート']
  }
};
function tLabel(dim, idx) {
  const dict = LABEL_MAP_I18N[state.lang] || LABEL_MAP_I18N.ko;
  const arr = dict[dim] || LABEL_MAP_I18N.ko[dim] || [];
  return arr[idx] || '';
}

const CAT_I18N = {
  '전체': { ko: '전체', en: 'All', ja: 'すべて' },
  '블렌디드': { ko: '블렌디드', en: 'Blended', ja: 'ブレンデッド' },
  '싱글몰트': { ko: '싱글몰트', en: 'Single Malt', ja: 'シングルモルト' },
  '피트': { ko: '피트', en: 'Peated', ja: 'ピート' },
  '버번': { ko: '버번', en: 'Bourbon', ja: 'バーボン' }
};
function tCat(cat) {
  const rec = CAT_I18N[cat];
  return rec ? (rec[state.lang] || rec.ko) : cat;
}

const AROMA_I18N = {
  '전체': { ko: '전체', en: 'All', ja: 'すべて' },
  '달콤·바닐라': { ko: '달콤·바닐라', en: 'Sweet & Vanilla', ja: 'バニラ・甘い' },
  '과일·꿀': { ko: '과일·꿀', en: 'Fruit & Honey', ja: 'フルーティー・蜂蜜' },
  '스모키·피트': { ko: '스모키·피트', en: 'Smoky & Peaty', ja: 'スモーキー・ピート' },
  '셰리·우디': { ko: '셰리·우디', en: 'Sherry & Oak', ja: 'シェリー・ウッディ' },
  '부드러운 입문': { ko: '부드러운 입문', en: 'Easy Drinking', ja: '飲みやすい入門' }
};
function tAroma(a) {
  const rec = AROMA_I18N[a];
  return rec ? (rec[state.lang] || rec.ko) : a;
}

const PRICE_OPT_I18N = {
  '전체': { ko: '전체', en: 'Any Price', ja: 'すべて' },
  'low': { ko: '가성비 (1만원대)', en: 'Value (~₩10k)', ja: 'お手頃 (1万₩台)' },
  'mid': { ko: '합리적 (2만원대)', en: 'Mid-Range (~₩20k)', ja: '標準 (2万₩台)' },
  'high': { ko: '프리미엄 (3만원+)', en: 'Premium (₩30k+)', ja: 'プレミアム (3万₩+)' }
};
function tPriceOpt(p) {
  const rec = PRICE_OPT_I18N[p];
  return rec ? (rec[state.lang] || rec.ko) : p;
}

const SEARCH_TAG_I18N = {
  '혼술하기 좋은': { ko: '#혼술하기 좋은', en: '#Solo-Friendly', ja: '#ひとり飲み' },
  '고급진': { ko: '#고급진', en: '#Upscale', ja: '#ラグジュアリー' },
  '입문 위스키': { ko: '#입문 위스키', en: '#Beginner Whisky', ja: '#入門ウイスキー' },
  '조용한 바': { ko: '#조용한 바', en: '#Quiet Bar', ja: '#静かなバー' },
  '피트 위스키': { ko: '#피트 위스키', en: '#Peated', ja: '#ピート' },
  '가성비': { ko: '#가성비', en: '#Great Value', ja: '#コスパ抜群' }
};
function tSearchTag(tag) {
  const rec = SEARCH_TAG_I18N[tag];
  return rec ? (rec[state.lang] || rec.ko) : ('#' + tag);
}

const REVIEW_TAG_I18N = {
  '혼술추천': { ko: '혼술추천', en: 'Great Solo', ja: 'ひとり飲み◎' },
  '분위기맛집': { ko: '분위기맛집', en: 'Great Vibe', ja: '雰囲気最高' },
  '바텐더친절': { ko: '바텐더친절', en: 'Friendly Staff', ja: '接客が丁寧' },
  '위스키다양': { ko: '위스키다양', en: 'Wide Selection', ja: '品揃え豊富' },
  '데이트추천': { ko: '데이트추천', en: 'Date Spot', ja: 'デート向け' },
  '조용한대화': { ko: '조용한대화', en: 'Quiet Talk', ja: '静かに話せる' }
};
function tReviewTag(tag) {
  const rec = REVIEW_TAG_I18N[tag];
  return rec ? (rec[state.lang] || rec.ko) : tag;
}

const I18N = {
  ko: {
    langName: '한국어',
    tabHome: '홈', tabSearch: '검색', tabGuide: '가이드', tabMap: '지도', tabMy: '나',
    headerMy: '마이 페이지', headerLikes: '찜한 바', headerResults: '취향 추천 결과',
    homeTitle: '어떤 바를 원하시나요?',
    homeSub: '원하는 느낌을 선택하고 장소를 찾아보세요!',
    homeRegion: '지역 선택',
    sliderMood: '분위기', sliderPrice: '가격대', sliderSpace: '공간', sliderTaste: '취향',
    homeCta: '내 취향에 맞는 바 찾기',
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
    logoutSub: '계정 연결 해제'
  },
  en: {
    langName: 'English',
    tabHome: 'Home', tabSearch: 'Search', tabGuide: 'Guide', tabMap: 'Map', tabMy: 'My',
    headerMy: 'My Page', headerLikes: 'Saved Bars', headerResults: 'Your Matches',
    homeTitle: 'What’s the mood tonight?',
    homeSub: 'Dial in your vibe and find the right pour.',
    homeRegion: 'Region',
    sliderMood: 'Atmosphere', sliderPrice: 'Price Range', sliderSpace: 'Setting', sliderTaste: 'Whisky Profile',
    homeCta: 'Find My Bars',
    searchTitle: 'What are you craving?', searchCancel: 'Cancel', filterTitle: 'Filters',
    mapPlaceholder: 'Search bars, neighborhoods, stations, whisky',
    editProfile: 'Edit',
    notSignedIn: 'Sign in to sync your saved bars & notes',
    savedBars: 'Saved Bars', tastingNotes: 'Tasting Notes', likedWhiskies: 'Saved Whisky',
    unitPlace: '', unitNote: '', unitBottle: '',
    writeNoteTitle: 'Log a Tasting Note',
    writeNoteSubEmpty: 'Jot down the nose, palate, and finish of your dram',
    settingLang: 'Language',
    settingTaste: 'My Whisky Taste',
    settingLocation: 'Location (Nearby · Map)',
    locationConnected: 'Location active · Tap to refresh',
    locationDisconnected: 'Not connected · Tap to locate',
    settingAge: '19+ Age Check',
    ageVerifiedBadge: 'Verified',
    agePendingBadge: 'Pending',
    ageVerifiedSub: 'Legal drinking age confirmed',
    agePendingSub: 'Confirm legal drinking age',
    settingTerms: 'Terms & Privacy',
    settingTermsSub: 'Terms of Service · Privacy · Location Policy',
    logout: 'Sign Out',
    logoutSub: 'Disconnect your account'
  },
  ja: {
    langName: '日本語',
    tabHome: 'ホーム', tabSearch: '検索', tabGuide: 'ガイド', tabMap: '地図', tabMy: 'マイ',
    headerMy: 'マイページ', headerLikes: '保存したバー', headerResults: 'おすすめのバー',
    homeTitle: '今夜はどんなバーへ？',
    homeSub: '好みの雰囲気を選んで、ぴったりの一軒を見つけましょう。',
    homeRegion: 'エリア',
    sliderMood: '雰囲気', sliderPrice: '価格帯', sliderSpace: '過ごし方', sliderTaste: 'ウイスキーの好み',
    homeCta: 'ぴったりのバーを探す',
    searchTitle: '何をお探しですか？', searchCancel: 'キャンセル', filterTitle: '絞り込み検索',
    mapPlaceholder: 'バー・エリア・駅・ウイスキーを検索',
    editProfile: '編集',
    notSignedIn: 'ログインして記録を同期しましょう',
    savedBars: '保存したバー', tastingNotes: 'テイスティング', likedWhiskies: 'お気に入りの酒',
    unitPlace: '軒', unitNote: '件', unitBottle: '本',
    writeNoteTitle: 'テイスティングノートを記録',
    writeNoteSubEmpty: '今日の一杯の香りや余韻を気軽にメモしましょう',
    settingLang: '言語設定',
    settingTaste: 'マイ・ウイスキー好み',
    settingLocation: '位置情報（近い順・地図）',
    locationConnected: '現在地を取得済み・タップで更新',
    locationDisconnected: '未取得・タップして現在地を確認',
    settingAge: '年齢確認',
    ageVerifiedBadge: '確認済み',
    agePendingBadge: '未確認',
    ageVerifiedSub: '飲酒可能年齢の確認が完了しました',
    agePendingSub: '年齢確認を行ってください',
    settingTerms: '利用規約・ポリシー',
    settingTermsSub: '利用規約・プライバシー・位置情報ポリシー',
    logout: 'ログアウト',
    logoutSub: 'アカウント連携を解除'
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
  document.querySelectorAll('#locationScroll .location-chip').forEach(chip => {
    chip.textContent = tRegion(chip.dataset.region);
  });
  const sliderKeys = ['sliderMood', 'sliderPrice', 'sliderSpace', 'sliderTaste'];
  document.querySelectorAll('#viewHome .slider-title').forEach((el, idx) => {
    if (sliderKeys[idx]) el.textContent = t(sliderKeys[idx]);
  });
  const endpointLabels = [
    [tl('조용함', 'Quiet', '静か'), tl('활기찬', 'Lively', 'にぎやか')],
    [tl('가성비', 'Value', 'お手頃'), tl('프리미엄', 'Premium', 'プレミアム')],
    [tl('혼술하기 좋은', 'Solo-Friendly', 'ひとり飲み'), tl('모임에 좋은', 'For Groups', 'グループ向け')],
    [tl('가볍고 달콤한', 'Light & Sweet', '軽やかで甘い'), tl('무겁고 강한', 'Bold & Peaty', '重厚・スモーキー')]
  ];
  document.querySelectorAll('#viewHome .slider-labels').forEach((row, idx) => {
    const pair = endpointLabels[idx];
    if (!pair) return;
    const spans = row.querySelectorAll('.slider-label');
    if (spans[0]) spans[0].textContent = pair[0];
    if (spans[1]) spans[1].textContent = pair[1];
  });
  const ctaTextSpan = document.querySelector('#ctaButton > span:not(.cta-count)');
  if (ctaTextSpan) ctaTextSpan.textContent = t('homeCta');
  if (typeof updateCtaCount === 'function') updateCtaCount();

  // Loading overlay
  const loadTxt = document.querySelector('#loadingOverlay .loading-text');
  if (loadTxt) loadTxt.textContent = tl('맞춤 바를 찾는중...', 'Finding your best matches...', 'ぴったりのバーを探しています...');

  // Results sort bar
  const sortLabels = {
    match: tl('취향 일치순', 'Best Match', 'マッチ度順'),
    distance: tl('가까운 거리순', 'Nearest', '近い順'),
    price: tl('낮은 가격순', 'Lowest Price', '安い順')
  };
  document.querySelectorAll('#sortBar .sort-option').forEach(btn => {
    if (sortLabels[btn.dataset.sort]) btn.textContent = sortLabels[btn.dataset.sort];
  });

  // Search view static strings
  const searchTitle = document.querySelector('#viewSearch .search-title');
  if (searchTitle) searchTitle.textContent = t('searchTitle');
  const cancelBtn = document.getElementById('searchCancelBtn');
  if (cancelBtn) cancelBtn.textContent = t('searchCancel');
  const searchResetBtn = document.getElementById('searchResetBtn');
  if (searchResetBtn) searchResetBtn.textContent = tl('초기화', 'Reset', 'リセット');
  document.querySelectorAll('#searchTagsWrap .search-tag-chip').forEach(btn => {
    btn.textContent = tSearchTag(btn.dataset.stag);
  });

  // Search Filter Screen static strings
  const filterTitle = document.querySelector('#searchFilterScreen .filter-header-title');
  if (filterTitle) filterTitle.textContent = t('filterTitle');
  const filterResetBtn = document.getElementById('filterResetDraftBtn');
  if (filterResetBtn) filterResetBtn.textContent = tl('초기화', 'Reset', 'リセット');
  const filterGroupTitles = document.querySelectorAll('#searchFilterScreen .filter-group-title');
  if (filterGroupTitles[0]) filterGroupTitles[0].innerHTML = tl('지역 <span class="filter-group-sub">전국 시/도</span>', 'Region <span class="filter-group-sub">South Korea</span>', 'エリア <span class="filter-group-sub">韓国各地</span>');
  if (filterGroupTitles[1]) filterGroupTitles[1].textContent = tl('원하는 위스키 종류', 'Whisky Style', 'ウイスキーの種類');
  if (filterGroupTitles[2]) filterGroupTitles[2].textContent = tl('향 · 풍미', 'Flavor & Aroma', '香り・味わい');
  if (filterGroupTitles[3]) filterGroupTitles[3].innerHTML = tl('가격대 <span class="filter-group-sub">잔당 기준</span>', 'Price <span class="filter-group-sub">Per glass</span>', '価格帯 <span class="filter-group-sub">1杯あたり</span>');
  document.querySelectorAll('#filterRegionGroup [data-fregion]').forEach(b => { b.textContent = tRegion(b.dataset.fregion); });
  document.querySelectorAll('#filterTypeGroup [data-fwtype]').forEach(b => { b.textContent = tCat(b.dataset.fwtype); });
  document.querySelectorAll('#filterAromaGroup [data-faroma]').forEach(b => { b.textContent = tAroma(b.dataset.faroma); });
  document.querySelectorAll('#filterPriceGroup [data-fprice]').forEach(b => { b.textContent = tPriceOpt(b.dataset.fprice); });
  const filterApplySpan = document.querySelector('#filterApplyBtn > span:first-child');
  if (filterApplySpan) filterApplySpan.textContent = tl('필터 적용하고 검색하기', 'Show Matching Results', 'この条件で検索する');
  const filterSkipBtn = document.getElementById('filterSkipBtn');
  if (filterSkipBtn) filterSkipBtn.textContent = tl('필터 없이 바로 검색하기', 'Search without filters', '条件なしで検索する');

  // Review Write Screen header title
  const rwTitle = document.querySelector('#reviewWriteScreen .filter-header-title');
  if (rwTitle) rwTitle.textContent = tl('리뷰 작성하기', 'Write a Review', 'レビューを書く');

  // Map static strings
  const mapInput = document.getElementById('mapSearchInput');
  if (mapInput) mapInput.placeholder = t('mapPlaceholder');
  document.querySelectorAll('#mapChipsScroll .map-chip').forEach(chip => {
    chip.textContent = tRegion(chip.dataset.mcity);
  });

  // Active header title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    if (state.view === 'my') headerTitle.textContent = t('headerMy');
    else if (state.view === 'likes') headerTitle.textContent = t('headerLikes');
    else if (state.view === 'results') headerTitle.textContent = t('headerResults');
  }

  // Re-render all active dynamic views so zero stale strings remain
  if (typeof refreshRollingPlaceholderLang === 'function') refreshRollingPlaceholderLang();
  if (typeof renderResults === 'function' && (state.view === 'results' || state.view === 'likes')) renderResults();
  if (typeof renderSearchResults === 'function' && state.view === 'search') renderSearchResults();
  if (typeof renderGuideView === 'function' && state.view === 'guide') renderGuideView({ preserveScroll: true });
  if (typeof refreshAreaLabels === 'function') refreshAreaLabels();
  if (typeof refreshMapMarkers === 'function') refreshMapMarkers();
  if (typeof renderMyView === 'function' && state.view === 'my') renderMyView();
  if (document.getElementById('settingsScreen')?.classList.contains('open') && typeof renderSettingsScreen === 'function') renderSettingsScreen();
  if (document.getElementById('authScreen')?.classList.contains('open') && typeof renderAuthScreen === 'function') renderAuthScreen();
  if (document.getElementById('onboardingScreen')?.classList.contains('open') && typeof openOnboardingScreen === 'function') openOnboardingScreen(typeof onboardingActiveIndex === 'number' ? onboardingActiveIndex : 0);
  if (typeof updateFilterPreviewCount === 'function') updateFilterPreviewCount();
  const mapPillTxt = document.getElementById('mapListPillText');
  if (mapPillTxt && (typeof mapState === 'undefined' || !mapState.initialized)) {
    mapPillTxt.textContent = tl('저장한 바 ' + state.likes.size + '곳 · 목록', state.likes.size + ' Saved · List', '保存 ' + state.likes.size + '軒・一覧');
  }
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
