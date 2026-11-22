// ===== REUSABLE BAR CARD RENDERER =====
function renderBarCards(containerEl, bars, emptyMsg) {
  if (bars.length === 0) {
    containerEl.innerHTML = '<div class="empty-state">' + emptyMsg + '</div>';
    return;
  }

  containerEl.innerHTML = bars.map(bar => {
    const isLiked = state.likes.has(bar.id);
    const distText = formatDistanceText(getBarDistanceKm(bar));
    const naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(bar.naverQuery);
    return `
      <div class="bar-card" data-bar-id="${bar.id}">
        <div class="bar-card-visual" data-open-detail="${bar.id}">
          <div class="visual-top">
            <span class="match-badge">취향 ${bar.match}% 일치${distText ? ' · ' + distText : ''}</span>
            <button class="card-like-btn ${isLiked ? 'liked' : ''}" data-like-id="${bar.id}" aria-label="찜하기">
              <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
          <div class="visual-bottom">
            <div>
              <div class="bar-name">${bar.name}</div>
              <div class="bar-subloc">${bar.subloc}</div>
            </div>
          </div>
        </div>
        <div class="bar-card-body">
          <div class="bar-desc" data-open-detail="${bar.id}">${bar.desc}</div>
          <div class="bar-meta-row">
            <span>${bar.priceText}</span>
            <span class="bar-meta-dot">•</span>
            <span>${bar.cover}</span>
            <span class="bar-meta-dot">•</span>
            <span>${bar.hours}</span>
          </div>
          <div class="bar-whiskeys">
            ${bar.whiskeys.map(w => '<span class="whiskey-tag">' + w + '</span>').join('')}
          </div>
          <div class="bar-card-actions">
            <button class="btn-detail" data-open-detail="${bar.id}">상세 보기</button>
            <a class="btn-naver" href="${naverUrl}" target="_blank" rel="noopener noreferrer">
              <span>네이버 지도</span>
              <svg viewBox="0 0 24 24"><path d="M7 17L17 7"/><polyline points="8 7 17 7 17 16"/></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  containerEl.querySelectorAll('[data-like-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(btn.dataset.likeId);
    });
  });
  containerEl.querySelectorAll('[data-open-detail]').forEach(el => {
    el.addEventListener('click', () => openDetailSheet(el.dataset.openDetail));
  });
  containerEl.querySelectorAll('.btn-naver').forEach(bindTouchHighlight);
}

// ===== RENDER RESULTS VIEW =====
function renderResults() {
  const likesOnly = state.view === 'likes';
  const bars = getFilteredBars(likesOnly);
  const heading = document.getElementById('resultsHeading');
  const pills = document.getElementById('prefPills');
  const listEl = document.getElementById('resultsList');

  heading.innerHTML = likesOnly
    ? '찜한 바 <span>' + bars.length + '곳</span>'
    : (state.region === '전체' ? '전국 추천 바 ' : state.region + ' 추천 바 ') + '<span>' + bars.length + '곳</span>';

  if (likesOnly) {
    pills.innerHTML = '';
  } else {
    const tags = [
      state.region === '전체' ? '전국' : state.region,
      LABEL_MAP.mood[state.prefs.mood - 1],
      LABEL_MAP.price[state.prefs.price - 1],
      LABEL_MAP.space[state.prefs.space - 1],
      LABEL_MAP.taste[state.prefs.taste - 1]
    ];
    pills.innerHTML = tags.map(t => '<span class="pref-pill">#' + t + '</span>').join('');
  }

  const emptyMsg = likesOnly
    ? '아직 찜한 위스키 바가 없어요.<br>마음에 드는 바의 하트를 눌러 저장해 보세요!'
    : '해당 조건의 바를 찾지 못했어요.';
  renderBarCards(listEl, bars, emptyMsg);
}

function updateLikeBadge() {
  const badge = document.getElementById('likeBadge');
  badge.textContent = state.likes.size;
  badge.classList.toggle('show', state.likes.size > 0);
}

function toggleLike(id) {
  if (state.likes.has(id)) state.likes.delete(id);
  else state.likes.add(id);
  const likesArr = Array.from(state.likes);
  safeSetStorage('speakeasy-likes', JSON.stringify(likesArr));
  postToNative({ type: 'LIKES', likes: likesArr });
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
  updateLikeBadge();
  if (typeof refreshMapMarkers === 'function') refreshMapMarkers();
  if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
  if (state.view === 'search') renderSearchResults();
  else if (state.view === 'results' || state.view === 'likes') renderResults();
}

// ===== DETAIL SHEET =====
const sheetScrim = document.getElementById('sheetScrim');
const detailSheet = document.getElementById('detailSheet');
const sheetBody = document.getElementById('sheetBody');

function openDetailSheet(id) {
  const raw = BARS.find(b => b.id === id);
  if (!raw) return;
  const bar = { ...raw, match: calcMatch(raw) };
  const naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(bar.naverQuery);

  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${bar.name}</div>
      <span class="sheet-match">취향 ${bar.match}% 일치</span>
    </div>
    <div class="sheet-addr">${bar.region} · ${bar.subloc}</div>
    <div class="sheet-desc">${bar.desc}</div>
    <div class="sheet-info-grid">
      <div class="info-box"><div class="info-box-label">가격대</div><div class="info-box-val">${bar.priceText}</div></div>
      <div class="info-box"><div class="info-box-label">영업시간</div><div class="info-box-val">${bar.hours}</div></div>
      <div class="info-box"><div class="info-box-label">커버차지</div><div class="info-box-val">${bar.cover}</div></div>
      <div class="info-box"><div class="info-box-label">추천 공간</div><div class="info-box-val">${LABEL_MAP.space[bar.space - 1]}</div></div>
    </div>
    <div class="sheet-sec-title">이 바의 취향 프로필</div>
    <div class="match-bars">
      <div class="match-bar-item"><span class="match-bar-label">분위기</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.mood * 20}%"></div></div><span class="match-bar-text">${LABEL_MAP.mood[bar.mood - 1]}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">가격대</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.price * 20}%"></div></div><span class="match-bar-text">${LABEL_MAP.price[bar.price - 1]}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">공간</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.space * 20}%"></div></div><span class="match-bar-text">${LABEL_MAP.space[bar.space - 1]}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">위스키</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.taste * 20}%"></div></div><span class="match-bar-text">${LABEL_MAP.taste[bar.taste - 1]}</span></div>
    </div>
    <div class="sheet-sec-title">대표 보유 위스키</div>
    <div class="bar-whiskeys" style="margin-bottom:20px;">
      ${bar.whiskeys.map(w => '<span class="whiskey-tag">' + w + '</span>').join('')}
    </div>
    <a class="sheet-naver-cta" href="${naverUrl}" target="_blank" rel="noopener noreferrer">
      <span>네이버 지도로 길찾기</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M7 17L17 7"/><polyline points="8 7 17 7 17 16"/></svg>
    </a>
  `;
  const sheetNaverBtn = sheetBody.querySelector('.sheet-naver-cta');
  if (sheetNaverBtn) bindTouchHighlight(sheetNaverBtn);
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function closeDetailSheet() {
  detailSheet.style.transition = '';
  detailSheet.style.transform = '';
  sheetScrim.style.transition = '';
  sheetScrim.style.opacity = '';
  sheetScrim.classList.remove('open');
  detailSheet.classList.remove('open');
}
sheetScrim.addEventListener('click', closeDetailSheet);
document.getElementById('sheetCloseHandle').addEventListener('click', closeDetailSheet);

// ===== SWIPE-DOWN TO DISMISS SHEET (ONE-HANDED ~18% OR QUICK FLICK) =====
(function initSheetSwipeDismiss() {
  let dragging = false;
  let startY = 0;
  let startTime = 0;
  let currentDy = 0;
  const handleWrap = document.getElementById('sheetCloseHandle');

  function canStartDrag(target) {
    if (!detailSheet.classList.contains('open')) return false;
    if (handleWrap.contains(target)) return true;
    return sheetBody.scrollTop <= 0;
  }

  function onStart(clientY, target) {
    if (!canStartDrag(target)) return;
    dragging = true;
    startY = clientY;
    startTime = Date.now();
    currentDy = 0;
  }

  function onMove(clientY, preventDefaultFn) {
    if (!dragging) return;
    const dy = clientY - startY;
    if (dy <= 0) {
      if (currentDy > 0) {
        currentDy = 0;
        detailSheet.style.transform = 'translateY(0px)';
        sheetScrim.style.opacity = '';
      }
      return;
    }
    if (preventDefaultFn) preventDefaultFn();
    currentDy = dy;
    const h = detailSheet.offsetHeight || 400;
    detailSheet.style.transition = 'none';
    sheetScrim.style.transition = 'none';
    detailSheet.style.transform = 'translateY(' + dy + 'px)';
    sheetScrim.style.opacity = String(Math.max(0, 1 - dy / h));
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    const h = detailSheet.offsetHeight || 400;
    const elapsed = Date.now() - startTime;
    const threshold = Math.min(h * 0.18, 82);
    detailSheet.style.transition = '';
    sheetScrim.style.transition = '';

    if (currentDy >= threshold || (currentDy >= 44 && elapsed < 280)) {
      // Dismiss effortlessly with one hand (~18% drag or quick flick)
      closeDetailSheet();
    } else {
      // Snap back to open position
      detailSheet.style.transform = '';
      sheetScrim.style.opacity = '';
    }
    currentDy = 0;
  }

  // Touch events (iOS / Android)
  detailSheet.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    onStart(e.touches[0].clientY, e.target);
  }, { passive: true });

  detailSheet.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    onMove(e.touches[0].clientY, () => { if (e.cancelable) e.preventDefault(); });
  }, { passive: false });

  detailSheet.addEventListener('touchend', onEnd, { passive: true });
  detailSheet.addEventListener('touchcancel', onEnd, { passive: true });

  // Mouse events (Desktop preview)
  detailSheet.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onStart(e.clientY, e.target);
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    onMove(e.clientY, () => e.preventDefault());
  });
  window.addEventListener('mouseup', onEnd);
})();
