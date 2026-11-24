// ===== VIEW NAVIGATION =====
const viewScrollMemory = {};
let lastViewBeforeLikes = null;

function getRootTabView() {
  return window.__SPEAKEASY_INITIAL_TAB__ || 'home';
}

function getViewElByName(name) {
  const map = {
    home: 'viewHome',
    results: 'viewResults',
    likes: 'viewResults',
    search: 'viewSearch',
    guide: 'viewGuide',
    map: 'viewMap',
    my: 'viewMy'
  };
  return map[name] ? document.getElementById(map[name]) : null;
}

function setActiveNavTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(n => {
    const isMatch = n.dataset.tab === tabName;
    n.classList.toggle('active', isMatch);
    n.classList.toggle('inactive', !isMatch);
  });
}

function setView(nextView, opts) {
  closeDetailSheet();
  const prevView = state.view;
  const prevEl = getViewElByName(prevView);
  if (prevEl && prevView && prevView !== nextView) {
    viewScrollMemory[prevView] = prevEl.scrollTop;
  }
  if (nextView === 'likes' && prevView !== 'likes') {
    lastViewBeforeLikes = prevView || getRootTabView();
  }
  state.view = nextView;
  const homeEl = document.getElementById('viewHome');
  const resEl = document.getElementById('viewResults');
  const searchEl = document.getElementById('viewSearch');
  const guideEl = document.getElementById('viewGuide');
  const mapEl = document.getElementById('viewMap');
  const myEl = document.getElementById('viewMy');
  const ctaEl = document.getElementById('ctaContainer');
  const backBtn = document.getElementById('backBtn');
  const titleEl = document.getElementById('headerTitle');
  const likeBtn = document.getElementById('headerLikeBtn');

  homeEl.classList.remove('behind');
  resEl.classList.remove('active');
  searchEl.classList.remove('active');
  guideEl.classList.remove('active');
  if (mapEl) mapEl.classList.remove('active');
  if (myEl) myEl.classList.remove('active');
  likeBtn.classList.remove('liked-filter');

  if (nextView === 'home') {
    ctaEl.classList.remove('hidden');
    backBtn.classList.remove('visible');
    titleEl.textContent = 'speakeasy';
    setActiveNavTab('home');
    if (typeof viewScrollMemory.home === 'number') {
      requestAnimationFrame(() => { homeEl.scrollTop = viewScrollMemory.home; });
    }
  } else if (nextView === 'search') {
    homeEl.classList.add('behind');
    searchEl.classList.add('active');
    ctaEl.classList.add('hidden');
    backBtn.classList.remove('visible');
    titleEl.textContent = 'speakeasy';
    setActiveNavTab('search');
    renderSearchResults();
    if (typeof viewScrollMemory.search === 'number') {
      requestAnimationFrame(() => { searchEl.scrollTop = viewScrollMemory.search; });
    }
  } else if (nextView === 'guide') {
    homeEl.classList.add('behind');
    guideEl.classList.add('active');
    ctaEl.classList.add('hidden');
    setActiveNavTab('guide');
    renderGuideView({ preserveScroll: true });
    if (typeof viewScrollMemory.guide === 'number') {
      requestAnimationFrame(() => { guideEl.scrollTop = viewScrollMemory.guide; });
    }
  } else if (nextView === 'map') {
    homeEl.classList.add('behind');
    if (mapEl) mapEl.classList.add('active');
    ctaEl.classList.add('hidden');
    backBtn.classList.remove('visible');
    titleEl.textContent = 'speakeasy';
    setActiveNavTab('map');
    if (typeof renderMapView === 'function') renderMapView();
  } else if (nextView === 'my') {
    homeEl.classList.add('behind');
    if (myEl) myEl.classList.add('active');
    ctaEl.classList.add('hidden');
    backBtn.classList.remove('visible');
    titleEl.textContent = typeof t === 'function' ? t('headerMy') : '마이 페이지';
    setActiveNavTab('my');
    if (typeof renderMyView === 'function') renderMyView();
    if (myEl && typeof viewScrollMemory.my === 'number') {
      requestAnimationFrame(() => { myEl.scrollTop = viewScrollMemory.my; });
    }
  } else {
    renderResults();
    if (opts && opts.resetScroll) {
      resEl.scrollTop = 0;
    } else if (typeof viewScrollMemory[nextView] === 'number') {
      requestAnimationFrame(() => { resEl.scrollTop = viewScrollMemory[nextView]; });
    }
    homeEl.classList.add('behind');
    resEl.classList.add('active');
    ctaEl.classList.add('hidden');
    backBtn.classList.add('visible');
    titleEl.textContent = nextView === 'likes'
      ? (typeof t === 'function' ? t('headerLikes') : '찜한 바')
      : (typeof t === 'function' ? t('headerResults') : '취향 추천 결과');
    likeBtn.classList.toggle('liked-filter', nextView === 'likes');
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    if (tab === 'home') setView('home');
    else if (tab === 'search') setView('search');
    else if (tab === 'guide') {
      if (state.view === 'guide' && guideState.level > 1) {
        guideState.level = 1;
        guideState.categoryId = null;
        guideState.brandName = null;
      }
      setView('guide');
    } else if (tab === 'map') {
      setView('map');
    } else if (tab === 'my') {
      setView('my');
    }
  });
});

// ===== NATIVE BRIDGE (EXPO GO / REACT NATIVE WEBVIEW) =====
window.__speakeasyBridge = {
  setTab(tab, opts) {
    if (tab === 'home') setView('home');
    else if (tab === 'search') {
      if (opts && typeof opts.query === 'string') {
        state.searchQuery = opts.query;
        if (typeof searchInputEl !== 'undefined' && searchInputEl) searchInputEl.value = opts.query;
        if (opts.query) saveRecentSearch(opts.query);
      }
      setView('search');
    } else if (tab === 'guide') {
      if (opts && opts.reset) {
        guideState.level = 1;
        guideState.categoryId = null;
        guideState.brandName = null;
      }
      setView('guide');
    } else if (tab === 'map') {
      setView('map');
    } else if (tab === 'my') {
      setView('my');
    }
  },
  ensureRootTab(tab) {
    if (!tab) return;
    // Prevent non-home native tabs (especially My Page) from ever getting trapped in Home view
    if (tab !== 'home' && state.view === 'home') {
      setView(tab);
    }
  },
  setTheme(theme) {
    safeSetStorage('speakeasy-theme', theme);
    applyTheme(theme, true);
  },
  syncLikes(likesArr) {
    if (Array.isArray(likesArr)) {
      state.likes = new Set(likesArr);
      safeSetStorage('speakeasy-likes', JSON.stringify(likesArr));
      updateLikeBadge();
      if (typeof refreshMapMarkers === 'function') refreshMapMarkers();
      if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
      if (state.view === 'results' || state.view === 'likes') renderResults();
      if (state.view === 'search') renderSearchResults();
    }
  },
  syncWhiskyLikes(arr) {
    if (Array.isArray(arr)) {
      state.likedWhiskies = new Set(arr);
      safeSetStorage('speakeasy-liked-whiskies', JSON.stringify(arr));
      if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
      if (state.view === 'guide' && typeof renderGuideView === 'function') renderGuideView({ preserveScroll: true });
    }
  },
  syncAccount(acc) {
    if (typeof setAccountState === 'function') {
      setAccountState(acc || null, true);
    } else {
      state.account = acc || null;
      safeSetStorage('speakeasy-account', acc ? JSON.stringify(acc) : 'null');
    }
  },
  syncProfile(profile) {
    if (typeof setProfileState === 'function') setProfileState(profile, true);
  },
  syncTastingNotes(notes) {
    if (typeof setTastingNotesFromSync === 'function') setTastingNotesFromSync(notes);
  },
  syncLang(lang) {
    if (typeof applyLanguage === 'function') applyLanguage(lang, true);
  },
  syncPrefs(prefs, region) {
    if (prefs && typeof prefs === 'object') {
      state.prefs = { ...state.prefs, ...prefs };
      safeSetStorage('speakeasy-prefs', JSON.stringify(state.prefs));
    }
    if (typeof region === 'string') {
      state.region = region;
      safeSetStorage('speakeasy-region', region);
    }
    if (typeof applyPrefsToUI === 'function') applyPrefsToUI();
    if (typeof updateCtaCount === 'function') updateCtaCount();
    if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
  },
  setUserLocation(lat, lng, autoCenter) {
    if (typeof setUserLocation === 'function') setUserLocation(lat, lng, autoCenter);
  }
};

// ===== GLOBAL LEFT-TO-RIGHT SWIPE BACK GESTURE =====
(function initSwipeBackGesture() {
  let tracking = false;
  let lockedHorizontal = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let currentDx = 0;
  let activeViewEl = null;

  function getBackableViewEl() {
    const rwEl = document.getElementById('reviewWriteScreen');
    if (rwEl && rwEl.classList.contains('open')) return rwEl;
    if (detailSheet && detailSheet.classList.contains('open')) return null;
    const authEl = document.getElementById('authScreen');
    if (authEl && authEl.classList.contains('open')) return authEl;
    const setEl = document.getElementById('settingsScreen');
    if (setEl && setEl.classList.contains('open')) return setEl;
    const fs = document.getElementById('searchFilterScreen');
    if (fs && fs.classList.contains('open')) return fs;
    if (state.view === 'search') {
      const vs = document.getElementById('viewSearch');
      if (vs && (vs.classList.contains('is-focused') || vs.classList.contains('has-results'))) {
        return vs;
      }
    }
    if (state.view === 'results' || state.view === 'likes') {
      return document.getElementById('viewResults');
    }
    if (state.view === 'guide' && typeof guideState !== 'undefined' && guideState.level > 1) {
      return document.getElementById('viewGuide');
    }
    return null;
  }

  function isInsideHorizontalScroll(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('input, textarea, #sortBar, .sort-option, .onboarding-screen, .onboarding-slides, .location-scroll, .glossary-strip, .pairing-strip, .whisky-shelf, .whisky-search-shelf, .slider-track, .map-chips-scroll, #leafletMap, #searchCancelBtn, #searchClearBtn, #recentClearAllBtn, [data-recent-del]');
  }

  function triggerBackAction() {
    const rwEl = document.getElementById('reviewWriteScreen');
    if (rwEl && rwEl.classList.contains('open') && typeof closeReviewWriteScreen === 'function') {
      closeReviewWriteScreen();
      return;
    }
    const authEl = document.getElementById('authScreen');
    if (authEl && authEl.classList.contains('open') && typeof closeAuthScreen === 'function') {
      closeAuthScreen();
      return;
    }
    const setEl = document.getElementById('settingsScreen');
    if (setEl && setEl.classList.contains('open') && typeof closeSettingsScreen === 'function') {
      closeSettingsScreen();
      return;
    }
    const fs = document.getElementById('searchFilterScreen');
    if (fs && fs.classList.contains('open') && typeof closeSearchFilterScreen === 'function') {
      closeSearchFilterScreen();
      return;
    }
    if (state.view === 'search' && typeof handleSearchBack === 'function' && handleSearchBack()) return;
    if (state.view === 'guide' && typeof handleGuideBack === 'function' && handleGuideBack()) return;
    if (state.view === 'likes') {
      setView(lastViewBeforeLikes || getRootTabView());
      return;
    }
    setView(getRootTabView());
  }

  const viewsContainer = document.getElementById('phoneFrame');
  if (!viewsContainer) return;

  viewsContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const viewEl = getBackableViewEl();
    if (!viewEl) return;
    if (isInsideHorizontalScroll(e.target)) return;

    const t = e.touches[0];
    tracking = true;
    lockedHorizontal = false;
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
    currentDx = 0;
    activeViewEl = viewEl;
  }, { passive: true });

  viewsContainer.addEventListener('touchmove', (e) => {
    if (!tracking || !activeViewEl || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!lockedHorizontal) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // Require clear left-to-right horizontal motion (not vertical scroll)
      if (dx > 10 && dx > Math.abs(dy) * 1.4) {
        lockedHorizontal = true;
        activeViewEl.style.transition = 'none';
      } else {
        tracking = false;
        activeViewEl = null;
        return;
      }
    }

    if (dx <= 0) {
      currentDx = 0;
      activeViewEl.style.transform = 'translateX(0px)';
      return;
    }

    if (e.cancelable) e.preventDefault();
    currentDx = dx;
    // Slight damping for natural iOS swipe feel
    const visualDx = Math.min(dx * 0.85, 260);
    activeViewEl.style.transform = 'translateX(' + visualDx + 'px)';
    activeViewEl.style.opacity = String(Math.max(0.45, 1 - visualDx / 520));
  }, { passive: false });

  let isAnimatingOut = false;

  function finishSwipe() {
    if (!tracking || !activeViewEl) {
      tracking = false;
      lockedHorizontal = false;
      activeViewEl = null;
      return;
    }
    const el = activeViewEl;
    const elapsed = Date.now() - startTime;
    const shouldGoBack = lockedHorizontal && (currentDx >= 72 || (currentDx >= 46 && elapsed < 260));

    tracking = false;
    lockedHorizontal = false;
    activeViewEl = null;
    currentDx = 0;

    if (shouldGoBack) {
      if (isAnimatingOut) return;
      isAnimatingOut = true;
      // Glide continuously out to the right — ZERO snap-back / bounce glitch!
      el.style.transition = 'transform 0.2s cubic-bezier(0.22, 0.85, 0.36, 1), opacity 0.18s ease-out';
      el.style.transform = 'translateX(100%)';
      el.style.opacity = '0';

      setTimeout(() => {
        el.style.transition = 'none';
        triggerBackAction();
        el.style.transform = '';
        el.style.opacity = '';
        void el.offsetWidth;
        el.style.transition = '';
        isAnimatingOut = false;
      }, 200);
    } else {
      // Smoothly return to 0 without harsh jump
      el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.8, 0.35, 1), opacity 0.2s ease';
      el.style.transform = 'translateX(0px)';
      el.style.opacity = '';
      setTimeout(() => {
        el.style.transition = '';
        el.style.transform = '';
      }, 210);
    }
  }

  viewsContainer.addEventListener('touchend', finishSwipe, { passive: true });
  viewsContainer.addEventListener('touchcancel', finishSwipe, { passive: true });
})();

// Init
initRollingPlaceholder();
updateLikeBadge();
updateCtaCount();
scalePhone();
if (typeof applyLanguage === 'function') applyLanguage(state.lang, true);
if (typeof preloadAllBarRatings === 'function') preloadAllBarRatings();
if (
  typeof pullUserDataFromCloud === 'function' &&
  state.account &&
  state.account.accessToken &&
  state.account.userId &&
  (!window.__SPEAKEASY_NATIVE__ || window.__SPEAKEASY_INITIAL_TAB__ === 'home')
) {
  pullUserDataFromCloud();
}
if (window.__SPEAKEASY_INITIAL_TAB__ && window.__SPEAKEASY_INITIAL_TAB__ !== 'home') {
  window.__speakeasyBridge.setTab(window.__SPEAKEASY_INITIAL_TAB__);
}
window.addEventListener('load', () => positionAllOrbs(true));
window.addEventListener('resize', scalePhone);
window.addEventListener('orientationchange', () => setTimeout(scalePhone, 80));
if (window.visualViewport) window.visualViewport.addEventListener('resize', scalePhone);

// ===== RESPONSIVE KEYBOARD AVOIDANCE (iOS / Android WebView + Mobile Web) =====
(function initKeyboardAvoidance() {
  let currentKbHeight = 0;

  function isEditableEl(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function scrollInputAboveKeyboard(el) {
    if (!isEditableEl(el)) return;
    if (el.id === 'searchInput' || el.id === 'mapSearchInput') {
      try { window.scrollTo(0, 0); } catch (e) {}
      return;
    }
    const target = el.closest('.auth-field, .note-form-field') || el;
    const scrollBox = el.closest('.auth-screen-body, .sheet-scroll, .sub-screen-body, .view');
    if (!scrollBox) {
      try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      return;
    }
    const boxRect = scrollBox.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const visibleBottom = Math.min(boxRect.bottom, window.innerHeight - currentKbHeight - 18);
    const visibleTop = boxRect.top + 16;

    if (targetRect.bottom > visibleBottom) {
      scrollBox.scrollBy({
        top: targetRect.bottom - visibleBottom + 24,
        behavior: 'smooth'
      });
    } else if (targetRect.top < visibleTop) {
      scrollBox.scrollBy({
        top: targetRect.top - visibleTop - 16,
        behavior: 'smooth'
      });
    }
  }

  function applyKeyboardHeight(kbHeight) {
    const h = Math.max(0, Math.round(Number(kbHeight) || 0));
    currentKbHeight = h;
    document.documentElement.style.setProperty('--keyboard-height', h + 'px');
    document.documentElement.classList.toggle('keyboard-open', h > 0);
    if (h > 0 && isEditableEl(document.activeElement)) {
      const active = document.activeElement;
      setTimeout(() => scrollInputAboveKeyboard(active), 60);
      setTimeout(() => scrollInputAboveKeyboard(active), 240);
    }
  }

  window.__speakeasyKeyboardChange = applyKeyboardHeight;

  document.addEventListener('focusin', (e) => {
    if (!isEditableEl(e.target)) return;
    const el = e.target;
    setTimeout(() => scrollInputAboveKeyboard(el), 120);
    setTimeout(() => scrollInputAboveKeyboard(el), 320);
  });

  // Fallback for mobile Safari / Chrome when running outside React Native WebView
  if (!window.__SPEAKEASY_NATIVE__ && window.visualViewport) {
    const syncViewportKb = () => {
      const diff = Math.round(window.innerHeight - window.visualViewport.height);
      applyKeyboardHeight(diff > 100 ? diff : 0);
    };
    window.visualViewport.addEventListener('resize', syncViewportKb);
  }
})();
