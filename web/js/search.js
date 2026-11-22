// ===== SEARCH LOGIC (FOCUS RECENT HISTORY + FULL-SCREEN MULTI-FILTER + NATIONWIDE) =====
function matchesSearchTag(bar, tag) {
  if (!tag) return true;
  if (tag === '혼술하기 좋은') return bar.space <= 2;
  if (tag === '고급진') return bar.price >= 4;
  if (tag === '입문 위스키') return bar.taste <= 2;
  if (tag === '조용한 바') return bar.mood <= 2;
  if (tag === '피트 위스키') return bar.taste >= 4 || bar.whiskeys.some(w => /아드벡|라프로익|라가불린|탈리스커/.test(w));
  if (tag === '가성비') return bar.price <= 2;
  return true;
}

function normText(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, '');
}

const AROMA_PATTERNS = {
  '달콤·바닐라': /바닐라|카라멜|달콤|토피|흑설탕|버터|시럽|초콜릿/,
  '과일·꿀':     /과일|사과|배|복숭아|오렌지|시트러스|레몬|꿀|허니|체리|베리/,
  '스모키·피트': /피트|스모키|스모크|훈제|연기|바다|요오드|장작|후추/,
  '셰리·우디':   /셰리|오크|우드|건포도|무화과|견과|스파이스|시나몬|가죽/,
  '부드러운 입문': /부드|깔끔|입문|가볍|밸런스|하이볼/
};

function matchesAromaWhisky(w, aroma) {
  if (!aroma || aroma === '전체') return true;
  if (aroma === '부드러운 입문') return (w.level || '').includes('입문') || AROMA_PATTERNS[aroma].test(w.summary + ' ' + w.palate);
  const rx = AROMA_PATTERNS[aroma];
  if (!rx) return true;
  return rx.test([w.summary, w.nose, w.palate, w.finish, w.category].join(' '));
}

function matchesAromaBar(bar, aroma) {
  if (!aroma || aroma === '전체') return true;
  if (aroma === '스모키·피트') return bar.taste >= 4 || bar.whiskeys.some(w => /아드벡|라프로익|라가불린|탈리스커|보모어/.test(w));
  if (aroma === '부드러운 입문') return bar.taste <= 2;
  if (aroma === '달콤·바닐라') return bar.taste <= 3 || bar.whiskeys.some(w => /메이커스|버번|우드포드|버팔로|불릿|발베니/.test(w));
  if (aroma === '과일·꿀') return bar.taste <= 3 || bar.whiskeys.some(w => /글렌피딕|글렌모렌지|글렌리벳|발베니|히비키/.test(w));
  if (aroma === '셰리·우디') return bar.taste >= 3 || bar.whiskeys.some(w => /맥캘란|글렌드로낙|글렌알라키|스프링뱅크/.test(w));
  return true;
}

function matchesWhiskyTypeBar(bar, wtype) {
  if (!wtype || wtype === '전체') return true;
  if (wtype === '피트') return bar.taste >= 4 || bar.whiskeys.some(w => /아드벡|라프로익|라가불린|탈리스커|보모어/.test(w));
  if (wtype === '버번') return bar.whiskeys.some(w => /메이커스|버번|우드포드|버팔로|불릿|와일드터키|놉크릭/.test(w));
  if (wtype === '블렌디드') return bar.taste <= 3 || bar.whiskeys.some(w => /히비키|제임슨|산토리|몽키숄더|조니워커|발렌타인/.test(w));
  if (wtype === '싱글몰트') return bar.whiskeys.some(w => /맥캘란|글렌|발베니|야마자키|스프링뱅크|카발란|기원/.test(w));
  return true;
}

function matchesPriceBar(bar, priceKey) {
  if (!priceKey || priceKey === '전체') return true;
  if (priceKey === 'low') return bar.price <= 2;
  if (priceKey === 'mid') return bar.price === 3;
  if (priceKey === 'high') return bar.price >= 4;
  return true;
}

function hasAnyActiveFilter(f) {
  return (
    f.region !== '전체' ||
    f.whiskyType !== '전체' ||
    f.aroma !== '전체' ||
    f.price !== '전체'
  );
}

function computeSearchMatches(params) {
  const q = normText((params.query || '').trim());
  const region = params.region || '전체';
  const whiskyType = params.whiskyType || '전체';
  const aroma = params.aroma || '전체';
  const price = params.price || '전체';
  const tag = params.tag || '';

  // 1) Whiskies matching query + whiskyType + aroma (hidden only when strictly filtering by city/price without whisky filters)
  let matchedWhiskies = [];
  const wantsWhisky = Boolean(q || whiskyType !== '전체' || aroma !== '전체' || tag === '입문 위스키' || tag === '피트 위스키');
  if (wantsWhisky && region === '전체' && price === '전체') {
    matchedWhiskies = WHISKIES
      .map(w => {
        if (whiskyType !== '전체' && w.category !== whiskyType) return { w, rank: 0 };
        if (!matchesAromaWhisky(w, aroma)) return { w, rank: 0 };
        if (tag === '입문 위스키' && !w.level.includes('입문')) return { w, rank: 0 };
        if (tag === '피트 위스키' && w.category !== '피트') return { w, rank: 0 };
        if (!q) return { w, rank: 2 };
        const nameN = normText(w.name);
        const brandN = normText(w.brand);
        const enN = normText(w.en);
        const keysN = normText(w.matchKeys.join(' '));
        const bodyN = normText([w.category, w.origin, w.summary, w.nose, w.palate, w.finish].join(' '));
        let rank = 0;
        if (nameN.includes(q) || brandN.includes(q) || enN.includes(q)) rank = 3;
        else if (keysN.includes(q)) rank = 2;
        else if (bodyN.includes(q)) rank = 1;
        return { w, rank };
      })
      .filter(item => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .map(item => item.w);
  } else if (wantsWhisky && (whiskyType !== '전체' || aroma !== '전체' || q)) {
    // Even if region/price is selected, still surface matching whiskies cleanly when whisky query/type/aroma is set
    matchedWhiskies = WHISKIES
      .filter(w => {
        if (whiskyType !== '전체' && w.category !== whiskyType) return false;
        if (!matchesAromaWhisky(w, aroma)) return false;
        if (!q) return true;
        const all = normText([w.name, w.brand, w.en, w.matchKeys.join(' '), w.category, w.summary, w.nose, w.palate].join(' '));
        return all.includes(q);
      });
  }

  // 2) Nationwide Bars matching all filters
  const matchedBrands = Array.from(new Set(matchedWhiskies.slice(0, 12).map(w => normText(w.brand))));
  let matchedBars = BARS
    .map(b => ({ ...b, match: calcMatch(b) }))
    .filter(b => {
      if (region !== '전체' && b.city !== region && b.region !== region) return false;
      if (!matchesWhiskyTypeBar(b, whiskyType)) return false;
      if (!matchesAromaBar(b, aroma)) return false;
      if (!matchesPriceBar(b, price)) return false;
      if (!matchesSearchTag(b, tag)) return false;
      if (!q) return true;
      const hay = normText([b.name, b.city, b.region, b.subloc, b.station, b.desc, ...b.whiskeys].join(' '));
      if (hay.includes(q)) return true;
      return matchedBrands.some(br => b.whiskeys.some(bw => normText(bw).includes(br)));
    })
    .sort((a, b) => b.match - a.match);

  let barSectionTitle = region === '전체' ? '전국 관련 위스키 바' : region + ' 관련 위스키 바';
  if (matchedBars.length === 0 && matchedWhiskies.length > 0 && region === '전체' && price === '전체' && !tag) {
    const primaryCat = matchedWhiskies[0].category;
    matchedBars = BARS
      .map(b => ({ ...b, match: calcMatch(b) }))
      .filter(b => matchesWhiskyTypeBar(b, primaryCat))
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);
    barSectionTitle = primaryCat + ' 즐기기 좋은 전국 추천 바';
  }

  return { matchedWhiskies, matchedBars, barSectionTitle };
}

function renderActiveFilterBar() {
  const barEl = document.getElementById('activeFilterBar');
  const filterBtn = document.getElementById('searchFilterBtn');
  if (!barEl) return;

  const priceLabels = { low: '가성비(1만원대)', mid: '합리적(2만원대)', high: '프리미엄(3만원+)' };
  const chips = [];
  if (state.searchRegion !== '전체') chips.push({ key: 'region', label: state.searchRegion });
  if (state.searchWhiskyType !== '전체') chips.push({ key: 'whiskyType', label: state.searchWhiskyType });
  if (state.searchAroma !== '전체') chips.push({ key: 'aroma', label: state.searchAroma });
  if (state.searchPrice !== '전체') chips.push({ key: 'price', label: priceLabels[state.searchPrice] || state.searchPrice });

  if (filterBtn) filterBtn.classList.toggle('active', chips.length > 0);

  if (!chips.length) {
    barEl.classList.remove('show');
    barEl.innerHTML = '';
    return;
  }

  barEl.classList.add('show');
  barEl.innerHTML = chips.map(c => `
    <button class="active-filter-pill" data-remove-filter="${c.key}">
      <span>${c.label}</span>
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `).join('');

  barEl.querySelectorAll('[data-remove-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.removeFilter;
      if (k === 'region') state.searchRegion = '전체';
      if (k === 'whiskyType') state.searchWhiskyType = '전체';
      if (k === 'aroma') state.searchAroma = '전체';
      if (k === 'price') state.searchPrice = '전체';
      renderSearchResults();
    });
  });
}

function renderSearchResults() {
  const viewSearch = document.getElementById('viewSearch');
  const whiskyBlock = document.getElementById('searchWhiskyBlock');
  const listEl = document.getElementById('searchResultsList');
  const countEl = document.getElementById('searchResultsCount');
  const clearBtn = document.getElementById('searchClearBtn');

  const qRaw = state.searchQuery.trim();
  const hasFilters = hasAnyActiveFilter({
    region: state.searchRegion,
    whiskyType: state.searchWhiskyType,
    aroma: state.searchAroma,
    price: state.searchPrice
  });
  const hasCondition = Boolean(qRaw || state.searchTag || hasFilters);

  clearBtn.classList.toggle('show', Boolean(qRaw));
  updateRollingPhVisibility();
  renderActiveFilterBar();
  viewSearch.classList.toggle('has-results', hasCondition);
  if (typeof updateSearchHeaderBack === 'function') updateSearchHeaderBack();

  if (!hasCondition) {
    whiskyBlock.innerHTML = '';
    listEl.innerHTML = '';
    renderRecentSearches();
    return;
  }

  const { matchedWhiskies, matchedBars, barSectionTitle } = computeSearchMatches({
    query: qRaw,
    region: state.searchRegion,
    whiskyType: state.searchWhiskyType,
    aroma: state.searchAroma,
    price: state.searchPrice,
    tag: state.searchTag
  });

  const total = matchedWhiskies.length + matchedBars.length;
  countEl.innerHTML = '검색 결과 <span>' + total + '건</span>';

  if (matchedWhiskies.length > 0) {
    const shelfWhiskies = matchedWhiskies.slice(0, 16);
    const isSingle = shelfWhiskies.length === 1;
    whiskyBlock.innerHTML = `
      <div class="search-group-label">
        <span>위스키 알아보기 · ${matchedWhiskies.length}종</span>
        ${matchedWhiskies.length > 1 ? '<span class="search-group-sub">좌우로 넘기기 →</span>' : ''}
      </div>
      <div class="whisky-search-shelf ${isSingle ? 'single-item' : ''}">
        ${shelfWhiskies.map(w => `
          <div class="whisky-result-card" data-open-whisky="${w.id}">
            <div>
              <div class="whisky-shelf-head">
                ${renderWhiskyBottleSVG(w, 'thumb-sm')}
                <div class="whisky-shelf-meta">
                  <div class="whisky-result-top" style="margin-bottom:4px;">
                    <span class="whisky-cat-badge">${w.category}</span>
                    <span class="whisky-abv">${w.abv}</span>
                  </div>
                  <div class="whisky-result-name">${w.name}</div>
                </div>
              </div>
              <div class="whisky-result-summary">${w.summary}</div>
            </div>
            <div class="whisky-result-footer">
              <span>자세히 알아보기</span>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        `).join('')}
      </div>
      ${matchedBars.length > 0 ? '<div class="search-group-label"><span>' + barSectionTitle + '</span><span>' + matchedBars.length + '곳</span></div>' : ''}
    `;
    whiskyBlock.querySelectorAll('[data-open-whisky]').forEach(el => {
      el.addEventListener('click', () => {
        if (state.searchQuery.trim()) saveRecentSearch(state.searchQuery.trim());
        openWhiskySheet(el.dataset.openWhisky);
      });
    });
  } else {
    whiskyBlock.innerHTML = matchedBars.length > 0
      ? '<div class="search-group-label"><span>' + barSectionTitle + '</span><span>' + matchedBars.length + '곳</span></div>'
      : '';
  }

  if (matchedBars.length === 0 && matchedWhiskies.length > 0) {
    listEl.innerHTML = '';
  } else {
    renderBarCards(
      listEl,
      matchedBars,
      '선택한 조건에 맞는 위스키나 바가 없어요.<br>필터를 조금 넓히거나 다른 키워드로 검색해 보세요!'
    );
  }
}

function openWhiskySheet(id) {
  const w = WHISKIES.find(x => x.id === id);
  if (!w) return;
  const brandN = normText(w.brand);
  const carryingBars = BARS.filter(b => b.whiskeys.some(bw => normText(bw).includes(brandN)));
  const styleFallbackBars = carryingBars.length > 0 ? [] : BARS.filter(b => matchesWhiskyTypeBar(b, w.category)).slice(0, 4);
  const isWLiked = state.likedWhiskies.has(w.id);

  sheetBody.innerHTML = `
    <div class="whisky-sheet-hero">
      ${renderWhiskyBottleSVG(w, 'thumb-lg')}
      <div class="whisky-sheet-hero-info">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
          <span class="sheet-match" style="display:inline-block;">${w.category}</span>
          <button type="button" class="whisky-like-pill ${isWLiked ? 'liked' : ''}" id="sheetWhiskyLikeBtn">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>${isWLiked ? '찜한 술' : '술 찜하기'}</span>
          </button>
        </div>
        <div class="sheet-bar-name" style="font-size:20px;">${w.name}</div>
        <div class="sheet-addr" style="margin-bottom:0; margin-top:3px;">${w.en}</div>
      </div>
    </div>
    <div class="sheet-desc">${w.summary}</div>
    <div class="sheet-info-grid">
      <div class="info-box"><div class="info-box-label">원산지</div><div class="info-box-val">${w.origin}</div></div>
      <div class="info-box"><div class="info-box-label">도수 · 난이도</div><div class="info-box-val">${w.abv} · ${w.level}</div></div>
    </div>
    <div class="sheet-sec-title">테이스팅 노트</div>
    <div class="tasting-notes-box">
      <div class="tasting-row"><span class="tasting-key">향 Nose</span><span class="tasting-val">${w.nose}</span></div>
      <div class="tasting-row"><span class="tasting-key">맛 Palate</span><span class="tasting-val">${w.palate}</span></div>
      <div class="tasting-row"><span class="tasting-key">여운 Finish</span><span class="tasting-val">${w.finish}</span></div>
    </div>
    ${carryingBars.length > 0 ? `
      <div class="sheet-sec-title">이 위스키를 즐길 수 있는 전국 바 (${carryingBars.length}곳)</div>
      <div class="bar-whiskeys" style="margin-bottom:16px;">
        ${carryingBars.map(b => '<button class="whiskey-tag" style="cursor:pointer;" data-jump-bar="' + b.id + '">' + b.name + ' (' + b.city + ') →</button>').join('')}
      </div>
    ` : `
      <div class="sheet-sec-title">${w.category} 취향에 어울리는 전국 추천 바</div>
      <div class="bar-whiskeys" style="margin-bottom:16px;">
        ${styleFallbackBars.map(b => '<button class="whiskey-tag" style="cursor:pointer;" data-jump-bar="' + b.id + '">' + b.name + ' (' + b.city + ') →</button>').join('')}
      </div>
    `}
  `;
  sheetBody.querySelectorAll('[data-jump-bar]').forEach(btn => {
    btn.addEventListener('click', () => openDetailSheet(btn.dataset.jumpBar));
  });
  const wLikeBtn = document.getElementById('sheetWhiskyLikeBtn');
  if (wLikeBtn) {
    wLikeBtn.addEventListener('click', () => {
      const liked = toggleWhiskyLike(w.id);
      wLikeBtn.classList.toggle('liked', liked);
      const sp = wLikeBtn.querySelector('span');
      if (sp) sp.textContent = liked ? '찜한 술' : '술 찜하기';
      showToast(liked ? w.name + '을(를) 찜한 술에 저장했어요' : w.name + ' 찜 해제됨');
    });
  }
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== ROLLING POPULAR PLACEHOLDER TICKER =====
const rollingPhContainer = document.getElementById('searchRollingPh');
let rollingIdx = 0;
let rollingCurrentEl = null;

function initRollingPlaceholder() {
  rollingPhContainer.innerHTML = '';
  const first = document.createElement('span');
  first.className = 'rolling-ph-item current';
  first.textContent = ROLLING_KEYWORDS[0];
  rollingPhContainer.appendChild(first);
  rollingCurrentEl = first;

  setInterval(() => {
    if (state.searchQuery.length > 0) return;
    const nextIdx = (rollingIdx + 1) % ROLLING_KEYWORDS.length;
    const incoming = document.createElement('span');
    incoming.className = 'rolling-ph-item';
    incoming.textContent = ROLLING_KEYWORDS[nextIdx];
    rollingPhContainer.appendChild(incoming);

    void incoming.offsetWidth;
    if (rollingCurrentEl) {
      rollingCurrentEl.classList.remove('current');
      rollingCurrentEl.classList.add('exit');
      const oldEl = rollingCurrentEl;
      setTimeout(() => { if (oldEl.parentNode) oldEl.parentNode.removeChild(oldEl); }, 560);
    }
    incoming.classList.add('current');
    rollingCurrentEl = incoming;
    rollingIdx = nextIdx;
  }, 2700);
}

function updateRollingPhVisibility() {
  rollingPhContainer.classList.toggle('hidden', state.searchQuery.length > 0);
}

function triggerBounce(el) {
  el.classList.remove('bouncing');
  void el.offsetWidth;
  el.classList.add('bouncing');
}

// ===== RECENT SEARCH HISTORY (ONLY ON FOCUS RIGHT BELOW SEARCH BAR) =====
let recentSearches = [];
try {
  recentSearches = JSON.parse(safeGetStorage('speakeasy-recent-searches') || '[]');
  if (!Array.isArray(recentSearches)) recentSearches = [];
} catch (e) { recentSearches = []; }

function persistRecentSearches() {
  safeSetStorage('speakeasy-recent-searches', JSON.stringify(recentSearches));
}

function saveRecentSearch(term) {
  const clean = String(term || '').trim();
  if (clean.length < 1) return;
  recentSearches = [clean, ...recentSearches.filter(x => x !== clean)].slice(0, 7);
  persistRecentSearches();
  renderRecentSearches();
}

// Keyboard-safe instant tap for iOS WKWebView:
// On iOS, tapping a button while <input> has focus causes a keyboard-blur touchcancel BEFORE touchend/click fires.
// Handling action on touchstart (with preventDefault) guarantees 100% immediate response on first tap!
function bindKeyboardSafeTap(el, handler) {
  if (!el) return;
  let lastFired = 0;
  const fire = (e) => {
    const now = Date.now();
    if (now - lastFired < 360) return;
    lastFired = now;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    handler(e);
  };
  el.addEventListener('touchstart', fire, { passive: false });
  el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
  el.addEventListener('click', fire);
}

// Scroll-safe tap for list items (allows vertical scroll / horizontal swipe without accidental triggers)
function bindInstantTap(el, handler) {
  if (!el) return;
  let lastHandled = 0;
  let sx = 0, sy = 0, moved = false;
  const run = (e) => {
    const now = Date.now();
    if (now - lastHandled < 320) return;
    lastHandled = now;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    handler(e);
  };
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    moved = false;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    if (Math.abs(e.touches[0].clientX - sx) > 12 || Math.abs(e.touches[0].clientY - sy) > 12) {
      moved = true;
    }
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (moved) return;
    run(e);
  }, { passive: false });
  el.addEventListener('mousedown', (e) => { e.preventDefault(); });
  el.addEventListener('click', run);
}

function renderRecentSearches() {
  const box = document.getElementById('recentSearchesBox');
  if (!box) return;
  box.classList.add('show');
  if (recentSearches.length === 0) {
    box.innerHTML = `<div class="recent-empty">최근 검색 기록이 아직 없어요.<br/>위스키 이름, 지역(부산·인천·안양·제주), 바 이름을 검색해 보세요!</div>`;
    return;
  }
  box.innerHTML = `
    <div class="recent-header">
      <span class="recent-title">최근 검색어</span>
      <button type="button" class="recent-clear-all" id="recentClearAllBtn">전체 삭제</button>
    </div>
    <div class="recent-list">
      ${recentSearches.map((term, idx) => `
        <div class="recent-item" data-recent-term="${term.replace(/"/g, '&quot;')}">
          <svg class="recent-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
          <span class="recent-text">${term}</span>
          <button type="button" class="recent-del-btn" data-recent-del="${idx}" aria-label="기록 삭제">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('')}
    </div>
  `;
  box.querySelectorAll('[data-recent-term]').forEach(row => {
    bindInstantTap(row, () => {
      const term = row.dataset.recentTerm;
      state.searchQuery = term;
      searchInputEl.value = term;
      saveRecentSearch(term);
      renderSearchResults();
      searchInputEl.blur();
    });
  });
  box.querySelectorAll('[data-recent-del]').forEach(btn => {
    bindKeyboardSafeTap(btn, () => {
      const idx = parseInt(btn.dataset.recentDel, 10);
      recentSearches.splice(idx, 1);
      persistRecentSearches();
      renderRecentSearches();
    });
  });
  bindKeyboardSafeTap(document.getElementById('recentClearAllBtn'), () => {
    recentSearches = [];
    persistRecentSearches();
    renderRecentSearches();
    showToast('최근 검색 기록을 모두 삭제했어요');
  });
}

// ===== CAMERA / ALBUM IMAGE PICKER =====
let lastObjectUrl = null;
function openCameraScanSheet(imgUrl) {
  const quickBrands = ['발베니', '글렌피딕', '조니워커', '몽키숄더', '글렌모렌지', '아드벡', '메이커스마크', '놉크릭', '제임슨', '맥캘란'];
  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">위스키 라벨 스캔</div>
      <span class="sheet-match">미리보기</span>
    </div>
    <div class="sheet-addr">선택한 라벨 사진입니다. AI 자동 판독 연동 전까지 아래에서 브랜드를 골라 바로 검색할 수 있어요.</div>
    <div class="scan-preview-wrap">
      <img class="scan-preview-img" src="${imgUrl}" alt="선택된 위스키 라벨" />
      <div class="scan-beam"></div>
      <div class="scan-status-pill">AI 자동 인식은 백엔드(Gemini Vision) 연결 후 활성화</div>
    </div>
    <div class="sheet-sec-title">사진 속 위스키 빠르게 찾기</div>
    <div class="bar-whiskeys" style="margin-bottom:16px;">
      ${quickBrands.map(b => '<button class="whiskey-tag" style="cursor:pointer;" data-scan-brand="' + b + '">' + b + '</button>').join('')}
    </div>
    <button class="scan-retake-btn" id="scanRetakeBtn">다른 사진 선택 / 다시 찍기</button>
  `;
  sheetBody.querySelectorAll('[data-scan-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      const brand = btn.dataset.scanBrand;
      closeDetailSheet();
      state.searchQuery = brand;
      searchInputEl.value = brand;
      saveRecentSearch(brand);
      renderSearchResults();
    });
  });
  document.getElementById('scanRetakeBtn')?.addEventListener('click', () => {
    cameraFileInput.value = '';
    cameraFileInput.click();
  });
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

// ===== SEARCH INPUT FOCUS MODE (YouTube / Google / Naver style) =====
const viewSearchEl = document.getElementById('viewSearch');
const searchInputEl = document.getElementById('searchInput');
const cameraFileInput = document.getElementById('cameraFileInput');
let autoSaveTimer = null;

function updateSearchHeaderBack() {
  if (state.view !== 'search') return;
  const backBtn = document.getElementById('backBtn');
  if (!backBtn) return;
  const isActiveSub = viewSearchEl.classList.contains('is-focused') || viewSearchEl.classList.contains('has-results');
  backBtn.classList.toggle('visible', isActiveSub);
}

function enterSearchFocusMode() {
  viewSearchEl.classList.add('is-focused');
  renderRecentSearches();
  updateSearchHeaderBack();
}

function exitSearchFocusMode() {
  viewSearchEl.classList.remove('is-focused');
  searchInputEl.blur();
  updateSearchHeaderBack();
}

function handleSearchBack() {
  if (filterScreenEl && filterScreenEl.classList.contains('open')) {
    closeSearchFilterScreen();
    return true;
  }
  const hasRes = viewSearchEl.classList.contains('has-results');
  const isFoc = viewSearchEl.classList.contains('is-focused');
  if (!hasRes && !isFoc) return false;
  clearTimeout(autoSaveTimer);
  state.searchQuery = '';
  state.searchTag = '';
  state.searchRegion = '전체';
  state.searchWhiskyType = '전체';
  state.searchAroma = '전체';
  state.searchPrice = '전체';
  searchInputEl.value = '';
  document.querySelectorAll('#searchTagsWrap .search-tag-chip').forEach(b => b.classList.remove('active'));
  exitSearchFocusMode();
  renderSearchResults();
  return true;
}

searchInputEl.addEventListener('focus', enterSearchFocusMode);

searchInputEl.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderSearchResults();
  clearTimeout(autoSaveTimer);
  const val = state.searchQuery.trim();
  if (val.length >= 2) {
    autoSaveTimer = setTimeout(() => saveRecentSearch(val), 1400);
  }
});

searchInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(autoSaveTimer);
    const val = state.searchQuery.trim();
    if (val) saveRecentSearch(val);
    searchInputEl.blur();
  }
});

bindKeyboardSafeTap(document.getElementById('searchCancelBtn'), () => {
  handleSearchBack();
});

bindKeyboardSafeTap(document.getElementById('searchClearBtn'), () => {
  clearTimeout(autoSaveTimer);
  state.searchQuery = '';
  searchInputEl.value = '';
  enterSearchFocusMode();
  renderSearchResults();
  searchInputEl.focus();
});

document.getElementById('searchCameraBtn').addEventListener('click', (e) => {
  triggerBounce(e.currentTarget);
  cameraFileInput.value = '';
  cameraFileInput.click();
});

cameraFileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (lastObjectUrl) {
    try { URL.revokeObjectURL(lastObjectUrl); } catch (err) {}
  }
  lastObjectUrl = URL.createObjectURL(file);
  openCameraScanSheet(lastObjectUrl);
});

// ===== DEDICATED FULL-SCREEN SEARCH FILTER SCREEN =====
const filterScreenEl = document.getElementById('searchFilterScreen');
const draftFilter = {
  region: '전체',
  whiskyType: '전체',
  aroma: '전체',
  price: '전체'
};

function syncDraftChipsUI() {
  document.querySelectorAll('#filterRegionGroup [data-fregion]').forEach(b => {
    b.classList.toggle('active', b.dataset.fregion === draftFilter.region);
  });
  document.querySelectorAll('#filterTypeGroup [data-fwtype]').forEach(b => {
    b.classList.toggle('active', b.dataset.fwtype === draftFilter.whiskyType);
  });
  document.querySelectorAll('#filterAromaGroup [data-faroma]').forEach(b => {
    b.classList.toggle('active', b.dataset.faroma === draftFilter.aroma);
  });
  document.querySelectorAll('#filterPriceGroup [data-fprice]').forEach(b => {
    b.classList.toggle('active', b.dataset.fprice === draftFilter.price);
  });
  const preview = computeSearchMatches({
    query: state.searchQuery,
    region: draftFilter.region,
    whiskyType: draftFilter.whiskyType,
    aroma: draftFilter.aroma,
    price: draftFilter.price,
    tag: state.searchTag
  });
  const total = preview.matchedWhiskies.length + preview.matchedBars.length;
  const countEl = document.getElementById('filterPreviewCount');
  if (countEl) countEl.textContent = total + '건';
}

function openSearchFilterScreen() {
  draftFilter.region = state.searchRegion;
  draftFilter.whiskyType = state.searchWhiskyType;
  draftFilter.aroma = state.searchAroma;
  draftFilter.price = state.searchPrice;
  syncDraftChipsUI();
  searchInputEl.blur();
  filterScreenEl.classList.add('open');
  filterScreenEl.setAttribute('aria-hidden', 'false');
}

function closeSearchFilterScreen() {
  filterScreenEl.classList.remove('open');
  filterScreenEl.setAttribute('aria-hidden', 'true');
}

document.getElementById('searchFilterBtn').addEventListener('click', (e) => {
  triggerBounce(e.currentTarget);
  openSearchFilterScreen();
});

document.getElementById('filterCloseBtn')?.addEventListener('click', closeSearchFilterScreen);

document.getElementById('filterResetDraftBtn')?.addEventListener('click', () => {
  draftFilter.region = '전체';
  draftFilter.whiskyType = '전체';
  draftFilter.aroma = '전체';
  draftFilter.price = '전체';
  syncDraftChipsUI();
});

document.querySelectorAll('#filterRegionGroup [data-fregion]').forEach(btn => {
  btn.addEventListener('click', () => {
    draftFilter.region = btn.dataset.fregion;
    syncDraftChipsUI();
  });
});
document.querySelectorAll('#filterTypeGroup [data-fwtype]').forEach(btn => {
  btn.addEventListener('click', () => {
    draftFilter.whiskyType = btn.dataset.fwtype;
    syncDraftChipsUI();
  });
});
document.querySelectorAll('#filterAromaGroup [data-faroma]').forEach(btn => {
  btn.addEventListener('click', () => {
    draftFilter.aroma = btn.dataset.faroma;
    syncDraftChipsUI();
  });
});
document.querySelectorAll('#filterPriceGroup [data-fprice]').forEach(btn => {
  btn.addEventListener('click', () => {
    draftFilter.price = btn.dataset.fprice;
    syncDraftChipsUI();
  });
});

// Primary CTA: Apply filters and jump directly to results
document.getElementById('filterApplyBtn')?.addEventListener('click', () => {
  state.searchRegion = draftFilter.region;
  state.searchWhiskyType = draftFilter.whiskyType;
  state.searchAroma = draftFilter.aroma;
  state.searchPrice = draftFilter.price;
  closeSearchFilterScreen();
  if (!hasAnyActiveFilter(draftFilter) && !state.searchQuery.trim() && !state.searchTag) {
    // If user didn't pick any specific filter, show all nationwide bars
    state.searchRegion = '전체';
    enterSearchFocusMode();
    searchInputEl.focus();
    showToast('원하는 위스키나 지역을 입력해 검색해 보세요');
    return;
  }
  renderSearchResults();
});

// Secondary CTA: Skip filters and go straight to free keyword search
document.getElementById('filterSkipBtn')?.addEventListener('click', () => {
  state.searchRegion = '전체';
  state.searchWhiskyType = '전체';
  state.searchAroma = '전체';
  state.searchPrice = '전체';
  closeSearchFilterScreen();
  renderSearchResults();
  enterSearchFocusMode();
  setTimeout(() => searchInputEl.focus(), 180);
});

document.querySelectorAll('#searchTagsWrap .search-tag-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.stag;
    if (state.searchTag === tag) {
      state.searchTag = '';
      btn.classList.remove('active');
    } else {
      document.querySelectorAll('#searchTagsWrap .search-tag-chip').forEach(b => b.classList.remove('active'));
      state.searchTag = tag;
      btn.classList.add('active');
    }
    renderSearchResults();
  });
});

document.getElementById('searchResetBtn').addEventListener('click', () => {
  state.searchQuery = '';
  state.searchTag = '';
  state.searchRegion = '전체';
  state.searchWhiskyType = '전체';
  state.searchAroma = '전체';
  state.searchPrice = '전체';
  searchInputEl.value = '';
  document.querySelectorAll('#searchTagsWrap .search-tag-chip').forEach(b => b.classList.remove('active'));
  exitSearchFocusMode();
  renderSearchResults();
});
