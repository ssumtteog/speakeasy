// ===== MAGNETIC WAVE SLIDERS =====
function positionOrb(track, targetPos, instant, prevPos) {
  const dots = track.querySelectorAll('.slider-dot');
  const orb = track.querySelector('.slider-orb');
  const core = track.querySelector('.slider-orb-core');
  const glow = track.querySelector('.slider-track-glow');
  const targetDot = dots[targetPos];
  if (!targetDot || !orb || !core) return;

  const centerX = targetDot.offsetLeft + targetDot.offsetWidth / 2;
  const size = DOT_SIZES[targetPos];

  if (instant) {
    orb.style.transition = 'none';
    core.style.transition = 'none';
    if (glow) glow.style.transition = 'none';
  } else {
    orb.style.transition = '';
    core.style.transition = '';
    if (glow) glow.style.transition = '';
  }

  orb.style.left = centerX + 'px';
  orb.style.width = size.outer + 'px';
  orb.style.height = size.outer + 'px';
  core.style.width = size.inner + 'px';
  core.style.height = size.inner + 'px';

  if (glow) {
    glow.style.left = (targetPos * 25) + '%';
  }

  if (instant) {
    // Force reflow then restore smooth transitions
    void orb.offsetWidth;
    orb.style.transition = '';
    core.style.transition = '';
    if (glow) glow.style.transition = '';
    return;
  }

  // Directional liquid magnetic flow & wave ripple across passed dots
  if (typeof prevPos === 'number' && prevPos !== targetPos) {
    const dir = targetPos > prevPos ? 1 : -1;
    const waveClass = dir > 0 ? 'wave-right' : 'wave-left';

    // Magnetic stretch while traveling
    orb.classList.remove('flowing');
    void orb.offsetWidth;
    orb.classList.add('flowing');
    clearTimeout(orb._flowTimer);
    orb._flowTimer = setTimeout(() => {
      orb.classList.remove('flowing');
    }, 130);

    // Staggered wave along intermediate dots toward target
    const distance = Math.abs(targetPos - prevPos);
    for (let step = 1; step <= distance; step++) {
      const idx = prevPos + dir * step;
      const d = dots[idx];
      if (!d) continue;
      const delay = (step - 1) * 26;
      setTimeout(() => {
        d.classList.remove('wave-right', 'wave-left');
        void d.offsetWidth;
        d.classList.add(waveClass);
      }, delay);
    }
  }
}

function positionAllOrbs(instant) {
  document.querySelectorAll('.slider-track').forEach(track => {
    const pos = parseInt(track.dataset.selected, 10) || 0;
    positionOrb(track, pos, instant);
  });
}

document.querySelectorAll('.slider-track').forEach(track => {
  const key = track.dataset.slider;
  track.querySelectorAll('.slider-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const prevPos = parseInt(track.dataset.selected, 10);
      const nextPos = parseInt(dot.dataset.pos, 10);
      if (prevPos === nextPos) return;
      track.dataset.selected = String(nextPos);
      state.prefs[key] = parseInt(dot.dataset.value, 10);
      safeSetStorage('speakeasy-prefs', JSON.stringify(state.prefs));
      postToNative({ type: 'PREFS', prefs: state.prefs, region: state.region });
      if (typeof scheduleCloudSync === 'function') scheduleCloudSync('prefs');
      positionOrb(track, nextPos, false, prevPos);
      updateCtaCount();
    });
  });
});

function applyPrefsToUI() {
  document.querySelectorAll('.slider-track').forEach(track => {
    const key = track.dataset.slider;
    const val = state.prefs[key];
    if (typeof val !== 'number') return;
    const matchingDot = track.querySelector('.slider-dot[data-value="' + val + '"]');
    if (matchingDot) {
      const pos = parseInt(matchingDot.dataset.pos, 10);
      track.dataset.selected = String(pos);
      positionOrb(track, pos, true);
    }
  });
  document.querySelectorAll('.location-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.region === state.region);
  });
}

// ===== MATCHING ALGORITHM =====
function calcMatch(bar) {
  const dMood  = Math.abs(bar.mood  - state.prefs.mood);
  const dPrice = Math.abs(bar.price - state.prefs.price);
  const dSpace = Math.abs(bar.space - state.prefs.space);
  const dTaste = Math.abs(bar.taste - state.prefs.taste);
  const maxDiff = 16;
  const totalDiff = dMood * 1.15 + dPrice * 1.0 + dSpace * 0.9 + dTaste * 0.95;
  const score = Math.round(Math.max(58, Math.min(99, 100 - (totalDiff / maxDiff) * 46)));
  return score;
}

function getFilteredBars(likesOnly) {
  let list = BARS.map(b => ({ ...b, match: calcMatch(b), distKm: getBarDistanceKm(b) }));
  if (likesOnly) {
    list = list.filter(b => state.likes.has(b.id));
  } else if (state.region !== '전체') {
    list = list.filter(b => b.city === state.region || b.region === state.region);
  }
  if (state.sortBy === 'price') {
    list.sort((a, b) => a.price - b.price || b.match - a.match);
  } else if (state.sortBy === 'distance') {
    list.sort((a, b) => {
      const da = a.distKm == null ? 99999 : a.distKm;
      const db = b.distKm == null ? 99999 : b.distKm;
      return da - db || b.match - a.match;
    });
  } else {
    list.sort((a, b) => b.match - a.match);
  }
  return list;
}

function updateCtaCount() {
  const matched = getFilteredBars(false);
  const el = document.getElementById('ctaCount');
  if (el) el.textContent = tl(matched.length + '곳', matched.length + ' bars', matched.length + '軒');
}

// ===== LOCATION CHIPS =====
document.querySelectorAll('.location-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.location-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.region = chip.dataset.region;
    safeSetStorage('speakeasy-region', state.region);
    postToNative({ type: 'PREFS', prefs: state.prefs, region: state.region });
    if (typeof scheduleCloudSync === 'function') scheduleCloudSync('region');
    updateCtaCount();
  });
});

// ===== BLUR LOADING TRANSITION -> RESULTS =====
let isLoadingResults = false;
function startSearchTransition() {
  if (isLoadingResults) return;
  isLoadingResults = true;
  const overlay = document.getElementById('loadingOverlay');
  const pctEl = document.getElementById('loadingPercent');
  pctEl.textContent = '0%';
  overlay.classList.add('active');

  const duration = 1150;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    // Smooth ease-out curve for natural progress feel
    const eased = 1 - Math.pow(1 - t, 2.4);
    const pct = Math.round(eased * 100);
    pctEl.textContent = pct + '%';

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      pctEl.textContent = '100%';
      setView('results', { resetScroll: true });
      setTimeout(() => {
        overlay.classList.remove('active');
        isLoadingResults = false;
      }, 180);
    }
  }
  requestAnimationFrame(tick);
}

document.getElementById('ctaButton').addEventListener('click', startSearchTransition);
document.getElementById('backBtn').addEventListener('click', () => {
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
    setView(typeof lastViewBeforeLikes !== 'undefined' && lastViewBeforeLikes ? lastViewBeforeLikes : (typeof getRootTabView === 'function' ? getRootTabView() : 'home'));
    return;
  }
  setView(typeof getRootTabView === 'function' ? getRootTabView() : 'home');
});
document.getElementById('headerLikeBtn').addEventListener('click', () => {
  if (state.view === 'likes') {
    setView(typeof lastViewBeforeLikes !== 'undefined' && lastViewBeforeLikes ? lastViewBeforeLikes : (typeof getRootTabView === 'function' ? getRootTabView() : 'home'));
  } else {
    setView('likes', { resetScroll: true });
  }
});

const sortBarEl = document.getElementById('sortBar');
const viewResultsEl = document.getElementById('viewResults');
if (sortBarEl && viewResultsEl) {
  let sortTouchStartX = 0;
  let sortTouchStartY = 0;
  let sortLastHandled = 0;

  const activateSortBtn = (btn) => {
    if (!btn) return;
    const now = Date.now();
    if (now - sortLastHandled < 220) return;
    sortLastHandled = now;
    document.querySelectorAll('#sortBar .sort-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sortBy = btn.dataset.sort;
    if (state.sortBy === 'distance' && !state.userLocation) {
      requestWebUserLocation(false);
      showToast(tl('현재 위치를 확인해 가까운 순으로 정렬하고 있어요', 'Checking your location to sort by distance…', '現在地を取得して近い順に並べ替えています…'));
    }
    renderResults();
  };

  // Match tap coordinates directly against exact visual button rects so iOS WKWebView never drifts hitbox below text
  const findSortBtnAtPoint = (x, y) => {
    const barRect = sortBarEl.getBoundingClientRect();
    if (barRect.width === 0 || barRect.height === 0) return null;
    if (x < barRect.left - 4 || x > barRect.right + 4 || y < barRect.top - 8 || y > barRect.bottom + 8) {
      return null;
    }
    const btns = Array.from(sortBarEl.querySelectorAll('.sort-option'));
    for (const btn of btns) {
      const r = btn.getBoundingClientRect();
      if (x >= r.left - 3 && x <= r.right + 3) return btn;
    }
    return null;
  };

  viewResultsEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sortTouchStartX = e.touches[0].clientX;
    sortTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  viewResultsEl.addEventListener('touchend', (e) => {
    if (!viewResultsEl.classList.contains('active')) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    if (Math.abs(t.clientX - sortTouchStartX) > 16 || Math.abs(t.clientY - sortTouchStartY) > 16) {
      return;
    }
    const btn = findSortBtnAtPoint(t.clientX, t.clientY)
      || (e.target && e.target.closest ? e.target.closest('.sort-option') : null);
    if (!btn) return;
    if (e.cancelable) e.preventDefault();
    activateSortBtn(btn);
  }, { passive: false });

  viewResultsEl.addEventListener('click', (e) => {
    if (!viewResultsEl.classList.contains('active')) return;
    const btn = findSortBtnAtPoint(e.clientX, e.clientY)
      || (e.target && e.target.closest ? e.target.closest('.sort-option') : null);
    if (btn) activateSortBtn(btn);
  });
}
