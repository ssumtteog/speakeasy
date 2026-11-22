// ===== WHISKY GUIDE (3-LEVEL DRILLDOWN: MAIN -> CATEGORY -> BRAND -> BOTTLE SHEET) =====
const guideState = {
  level: 1,       // 1 = 4 categories, 2 = category detail + brands, 3 = brand detail + bottles
  categoryId: null,
  brandName: null
};

function getGuideWhiskiesByCategory(catId) {
  return WHISKIES.filter(w => w.category === catId);
}

function getGuideBrandsInCategory(catId) {
  const list = getGuideWhiskiesByCategory(catId);
  const map = new Map();
  list.forEach(w => {
    if (!map.has(w.brand)) map.set(w.brand, []);
    map.get(w.brand).push(w);
  });
  const catMeta = GUIDE_CATEGORIES.find(c => c.id === catId);
  const priority = catMeta ? catMeta.highlights : [];
  return Array.from(map.entries())
    .map(([brand, bottles]) => ({ brand, bottles }))
    .sort((a, b) => {
      const ia = priority.indexOf(a.brand);
      const ib = priority.indexOf(b.brand);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.bottles.length - a.bottles.length;
    });
}

function openGlossarySheet(index) {
  const item = GUIDE_GLOSSARY[index];
  if (!item) return;
  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${item.term}</div>
      <span class="sheet-match">위스키 기초 용어</span>
    </div>
    <div class="sheet-desc" style="margin-top:14px; margin-bottom:10px;">${item.desc}</div>
  `;
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function updateGuideHeader() {
  if (state.view !== 'guide') return;
  const backBtn = document.getElementById('backBtn');
  const titleEl = document.getElementById('headerTitle');
  if (guideState.level === 1) {
    backBtn.classList.remove('visible');
    titleEl.textContent = 'speakeasy';
  } else if (guideState.level === 2) {
    backBtn.classList.add('visible');
    titleEl.textContent = guideState.categoryId + ' 가이드';
  } else {
    backBtn.classList.add('visible');
    titleEl.textContent = guideState.brandName;
  }
}

function handleGuideBack() {
  if (guideState.level === 3) {
    guideState.level = 2;
    guideState.brandName = null;
    renderGuideView();
    return true;
  }
  if (guideState.level === 2) {
    guideState.level = 1;
    guideState.categoryId = null;
    renderGuideView();
    return true;
  }
  return false;
}

function renderGuideView() {
  const container = document.getElementById('guideContent');
  const guideViewEl = document.getElementById('viewGuide');
  if (!container) return;

  updateGuideHeader();
  guideViewEl.scrollTop = 0;

  // ===== LEVEL 1: 4 MAIN CATEGORIES =====
  if (guideState.level === 1) {
    container.innerHTML = `
      <div class="guide-hero-title">위스키, 쉽게 알아보기</div>
      <div class="guide-hero-sub">처음이어도 괜찮아요. 4가지 큰 종류부터 브랜드별 특징까지 차근차근 안내해 드릴게요.</div>

      <div class="guide-sec-label">
        <span>입문자 기초 용어 30초 컷</span>
        <span class="guide-sec-count">눌러서 확인</span>
      </div>
      <div class="glossary-strip">
        ${GUIDE_GLOSSARY.map((g, idx) => `<button class="glossary-chip" data-glossary="${idx}">${g.term}</button>`).join('')}
      </div>

      <div class="guide-sec-label">
        <span>위스키 4대 종류</span>
        <span class="guide-sec-count">총 ${WHISKIES.length}종 수록</span>
      </div>
      <div class="guide-cat-list">
        ${GUIDE_CATEGORIES.map(cat => {
          const count = getGuideWhiskiesByCategory(cat.id).length;
          return `
            <div class="guide-cat-card" data-guide-cat="${cat.id}">
              <div class="guide-cat-top">
                <img class="guide-cat-art" src="${cat.image}" alt="${cat.name} 일러스트" />
                <div class="guide-cat-top-row">
                  <span class="guide-cat-badge">${cat.badge}</span>
                  <span class="guide-cat-count">${count}종 수록</span>
                </div>
                <div class="guide-cat-heading">
                  <span class="guide-cat-name">${cat.name}</span>
                  <span class="guide-cat-en">${cat.en}</span>
                </div>
              </div>
              <div class="guide-cat-body">
                <div class="guide-cat-tagline">${cat.tagline}</div>
                <div class="guide-cat-desc">${cat.shortDesc}</div>
                <div class="guide-cat-footer">
                  <div class="guide-mini-brands">
                    ${cat.highlights.slice(0, 3).map(h => `<span class="guide-mini-pill">${h}</span>`).join('')}
                  </div>
                  <div class="guide-arrow">
                    <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('[data-glossary]').forEach(btn => {
      btn.addEventListener('click', () => openGlossarySheet(parseInt(btn.dataset.glossary, 10)));
    });
    container.querySelectorAll('[data-guide-cat]').forEach(card => {
      card.addEventListener('click', () => {
        guideState.level = 2;
        guideState.categoryId = card.dataset.guideCat;
        guideState.brandName = null;
        renderGuideView();
      });
    });
    return;
  }

  // ===== LEVEL 2: CATEGORY EXPLANATION + REPRESENTATIVE BRANDS =====
  if (guideState.level === 2) {
    const cat = GUIDE_CATEGORIES.find(c => c.id === guideState.categoryId);
    if (!cat) return;
    const brands = getGuideBrandsInCategory(cat.id);

    container.innerHTML = `
      <div class="guide-breadcrumb">
        <button class="guide-crumb-btn" id="crumbToRoot">가이드</button>
        <span class="guide-crumb-sep">›</span>
        <span class="guide-crumb-current">${cat.name}</span>
      </div>

      <div class="guide-concept-card">
        <div class="guide-concept-photo-wrap">
          <img class="guide-concept-art" src="${cat.image}" alt="${cat.name} 일러스트" />
        </div>
        <span class="guide-concept-eyebrow">${cat.en} · ${cat.badge}</span>
        <div class="guide-concept-title">${cat.whatIsTitle}</div>
        <div class="guide-concept-body">${cat.whatIsBody}</div>
        <div class="guide-facts-list">
          ${cat.facts.map(f => `
            <div class="guide-fact-row">
              <span class="guide-fact-label">${f.label}</span>
              <span class="guide-fact-val">${f.value}</span>
            </div>
          `).join('')}
        </div>
        <div class="match-bars" style="margin-bottom:0;">
          <div class="match-bar-item"><span class="match-bar-label">달콤함</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.sweet}%"></div></div><span class="match-bar-text">${cat.profile.sweet}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">스모키</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.smoky}%"></div></div><span class="match-bar-text">${cat.profile.smoky}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">바디감</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.body}%"></div></div><span class="match-bar-text">${cat.profile.body}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">입문 추천</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.beginner}%"></div></div><span class="match-bar-text">${cat.profile.beginner}%</span></div>
        </div>
      </div>

      <div class="guide-sec-label">
        <span>대표 ${cat.name} 브랜드</span>
        <span class="guide-sec-count">${brands.length}개 브랜드</span>
      </div>

      <div class="guide-brand-list">
        ${brands.map(item => {
          const storyMeta = GUIDE_BRAND_STORIES[item.brand];
          const previewText = storyMeta
            ? storyMeta.story
            : item.bottles[0].summary;
          return `
            <div class="guide-brand-card" data-guide-brand="${item.brand}">
              ${renderWhiskyBottleSVG(item.bottles[0], 'thumb-sm')}
              <div class="guide-brand-info">
                <div class="guide-brand-top">
                  <span class="guide-brand-name">${item.brand}</span>
                  <span class="guide-brand-count">${item.bottles.length}종</span>
                </div>
                <div class="guide-brand-sub">${previewText}</div>
              </div>
              <div class="guide-arrow">
                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('crumbToRoot').addEventListener('click', () => {
      guideState.level = 1;
      guideState.categoryId = null;
      renderGuideView();
    });
    container.querySelectorAll('[data-guide-brand]').forEach(card => {
      card.addEventListener('click', () => {
        guideState.level = 3;
        guideState.brandName = card.dataset.guideBrand;
        renderGuideView();
      });
    });
    return;
  }

  // ===== LEVEL 3: BRAND EXPLANATION ("글렌피딕이란?") + BOTTLE LINEUPS =====
  const cat = GUIDE_CATEGORIES.find(c => c.id === guideState.categoryId);
  const bottles = getGuideWhiskiesByCategory(guideState.categoryId).filter(w => w.brand === guideState.brandName);
  const storyMeta = GUIDE_BRAND_STORIES[guideState.brandName];
  const sample = bottles[0];

  const brandEn = storyMeta ? storyMeta.en : (sample ? sample.en.split(' ')[0] : '');
  const brandOrigin = storyMeta ? storyMeta.origin : (sample ? sample.origin : '');
  const brandStory = storyMeta
    ? storyMeta.story
    : `${guideState.brandName}은(는) ${brandOrigin} 지역의 개성이 살아있는 대표적인 ${guideState.categoryId} 위스키 브랜드입니다. ${sample ? sample.summary : ''}`;
  const brandTip = storyMeta
    ? storyMeta.tip
    : `아래 라인업 중 도수와 난이도를 참고해 취향에 맞는 바틀부터 가볍게 시작해 보세요.`;

  container.innerHTML = `
    <div class="guide-breadcrumb">
      <button class="guide-crumb-btn" id="crumbToRoot">가이드</button>
      <span class="guide-crumb-sep">›</span>
      <button class="guide-crumb-btn" id="crumbToCat">${cat ? cat.name : guideState.categoryId}</button>
      <span class="guide-crumb-sep">›</span>
      <span class="guide-crumb-current">${guideState.brandName}</span>
    </div>

    <div class="guide-concept-card">
      <span class="guide-concept-eyebrow">${brandEn} · ${brandOrigin}</span>
      <div class="guide-concept-title">${guideState.brandName}이란?</div>
      <div class="guide-concept-body">${brandStory}</div>
      <div class="guide-tip-box">
        <div class="guide-tip-label">입문 · 테이스팅 팁</div>
        <div>${brandTip}</div>
      </div>
    </div>

    <div class="guide-sec-label">
      <span>대표 라인업 알아보기</span>
      <span class="guide-sec-count">${bottles.length}종</span>
    </div>

    <div class="guide-bottle-list">
      ${bottles.map(w => {
        const isWLiked = state.likedWhiskies.has(w.id);
        return `
        <div class="guide-bottle-card" data-guide-bottle="${w.id}">
          <div class="guide-bottle-row">
            ${renderWhiskyBottleSVG(w, '')}
            <div class="guide-bottle-meta">
              <div class="guide-bottle-top">
                <span class="guide-bottle-name">${w.name}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="guide-bottle-abv">${w.abv}</span>
                  <button type="button" class="guide-bottle-like-btn ${isWLiked ? 'liked' : ''}" data-whisky-like="${w.id}" aria-label="술 찜하기">
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                </div>
              </div>
              <div class="guide-bottle-en">${w.en} · ${w.level}</div>
              <div class="guide-bottle-summary" style="margin-bottom:0;">${w.summary}</div>
            </div>
          </div>
          <div class="guide-bottle-footer">
            <span>향 · 맛 · 여운 테이스팅 노트 보기</span>
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      `;
      }).join('')}
    </div>

    <button class="guide-find-bar-btn" id="guideFindBarsBtn">
      <span>${guideState.brandName} 즐길 수 있는 바 검색하기</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M7 17L17 7"/><polyline points="8 7 17 7 17 16"/></svg>
    </button>
  `;

  document.getElementById('crumbToRoot').addEventListener('click', () => {
    guideState.level = 1;
    guideState.categoryId = null;
    guideState.brandName = null;
    renderGuideView();
  });
  document.getElementById('crumbToCat').addEventListener('click', () => {
    guideState.level = 2;
    guideState.brandName = null;
    renderGuideView();
  });
  container.querySelectorAll('[data-guide-bottle]').forEach(card => {
    card.addEventListener('click', () => openWhiskySheet(card.dataset.guideBottle));
  });
  container.querySelectorAll('[data-whisky-like]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.whiskyLike;
      const w = WHISKIES.find(x => x.id === id);
      const liked = toggleWhiskyLike(id);
      btn.classList.toggle('liked', liked);
      if (w) showToast(liked ? w.name + '을(를) 찜한 술에 저장했어요' : w.name + ' 찜 해제됨');
    });
  });

  const findBtn = document.getElementById('guideFindBarsBtn');
  if (findBtn) {
    bindTouchHighlight(findBtn);
    findBtn.addEventListener('click', () => {
      const keyword = guideState.brandName;
      if (window.ReactNativeWebView) {
        postToNative({ type: 'NAVIGATE_SEARCH', query: keyword });
        return;
      }
      state.searchQuery = keyword;
      searchInputEl.value = keyword;
      saveRecentSearch(keyword);
      setView('search');
    });
  }
}
