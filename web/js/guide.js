// ===== WHISKY GUIDE (ARCHIVE SEARCH + DICTIONARY + PAIRINGS + AI SOMMELIER + 3-LEVEL DRILLDOWN) =====
const guideState = {
  level: 1,       // 1 = archive home, 2 = category detail + brands, 3 = brand detail + bottles
  categoryId: null,
  brandName: null,
  searchQuery: ''
};
const guideScrollStack = { 1: 0, 2: 0 };
let guideAiSeq = 0;

function escapeGuideHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
      <div class="sheet-bar-name">${escapeGuideHtml(item.term)}</div>
      <span class="sheet-match">${escapeGuideHtml(item.group || '위스키 사전')}</span>
    </div>
    <div class="sheet-desc" style="margin-top:14px; margin-bottom:14px;">${escapeGuideHtml(item.desc)}</div>
    <button type="button" class="my-sheet-secondary-cta" id="openFullDictFromItem">위스키 사전 전체 보기 (${GUIDE_GLOSSARY.length}개)</button>
  `;
  document.getElementById('openFullDictFromItem')?.addEventListener('click', () => openFullDictionarySheet(item.group || '전체'));
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function openFullDictionarySheet(activeGroup) {
  const group = activeGroup || '전체';
  const groups = ['전체', '바 · 음용', '캐스크 · 숙성', '심화 · 매니아'];
  const items = group === '전체'
    ? GUIDE_GLOSSARY
    : GUIDE_GLOSSARY.filter(g => g.group === group);

  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:12px;">
      <div class="sheet-bar-name">위스키 용어 사전</div>
      <span class="sheet-match">${items.length}개</span>
    </div>
    <div class="guide-dict-tabs">
      ${groups.map(gp => `<button type="button" class="guide-dict-tab ${gp === group ? 'active' : ''}" data-dict-tab="${gp}">${gp}</button>`).join('')}
    </div>
    <div class="guide-dict-list">
      ${items.map(g => `
        <div class="guide-dict-item">
          <div class="guide-dict-head">
            <span class="guide-dict-term">${escapeGuideHtml(g.term)}</span>
            <span class="guide-dict-group">${escapeGuideHtml(g.group || '')}</span>
          </div>
          <div class="guide-dict-desc">${escapeGuideHtml(g.desc)}</div>
        </div>
      `).join('')}
    </div>
  `;

  sheetBody.querySelectorAll('[data-dict-tab]').forEach(btn => {
    btn.addEventListener('click', () => openFullDictionarySheet(btn.dataset.dictTab));
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function openFullPairingsSheet() {
  sheetBody.innerHTML = `
    <div class="sheet-title-row" style="margin-bottom:14px;">
      <div class="sheet-bar-name">스타일별 안주 페어링</div>
      <span class="sheet-match">${GUIDE_PAIRINGS.length}종</span>
    </div>
    <div class="guide-dict-list">
      ${GUIDE_PAIRINGS.map(p => `
        <button type="button" class="guide-search-item" data-open-pairing="${p.id}">
          <div class="guide-dict-head">
            <span class="guide-dict-term">${escapeGuideHtml(p.style)}</span>
            <span class="guide-dict-group">${escapeGuideHtml(p.badge)}</span>
          </div>
          <div class="guide-dict-desc">${escapeGuideHtml(p.foods.join(' · '))}</div>
        </button>
      `).join('')}
    </div>
  `;

  sheetBody.querySelectorAll('[data-open-pairing]').forEach(btn => {
    btn.addEventListener('click', () => openPairingSheet(btn.dataset.openPairing));
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function openPairingSheet(pairingId) {
  const p = GUIDE_PAIRINGS.find(x => x.id === pairingId);
  if (!p) return;
  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${escapeGuideHtml(p.style)}</div>
      <span class="sheet-match">${escapeGuideHtml(p.badge)}</span>
    </div>
    <div class="sheet-addr" style="margin-bottom:14px;">${escapeGuideHtml(p.subtitle)}</div>

    <div class="sheet-sec-title">추천 안주 페어링</div>
    <div class="bar-whiskeys" style="margin-bottom:18px;">
      ${p.foods.map(f => `<span class="whiskey-tag">${escapeGuideHtml(f)}</span>`).join('')}
    </div>

    <div class="guide-tip-box" style="margin-bottom:18px;">
      <div class="guide-tip-label">왜 잘 어울릴까요?</div>
      <div>${escapeGuideHtml(p.why)}</div>
    </div>

    <div class="sheet-sec-title">어울리는 대표 위스키</div>
    <div class="bar-whiskeys" style="margin-bottom:16px;">
      ${p.examples.map(ex => `<button type="button" class="whiskey-tag" style="cursor:pointer;" data-pairing-whisky="${escapeGuideHtml(ex)}">${escapeGuideHtml(ex)} →</button>`).join('')}
    </div>

    <button type="button" class="my-sheet-secondary-cta" id="openAllPairingsFromDetail">안주 페어링 전체 보기 (${GUIDE_PAIRINGS.length}종)</button>
  `;

  document.getElementById('openAllPairingsFromDetail')?.addEventListener('click', openFullPairingsSheet);

  sheetBody.querySelectorAll('[data-pairing-whisky]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = normText(btn.dataset.pairingWhisky);
      const found = WHISKIES.find(w => normText(w.name).includes(q) || q.includes(normText(w.brand)));
      if (found) {
        openWhiskySheet(found.id);
      } else {
        closeDetailSheet();
        if (window.ReactNativeWebView) {
          postToNative({ type: 'NAVIGATE_SEARCH', query: p.searchKey });
          return;
        }
        state.searchQuery = p.searchKey;
        searchInputEl.value = p.searchKey;
        setView('search');
      }
    });
  });

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

async function askWhiskyGuideAI(question) {
  if (typeof hasLiveSupabase !== 'function' || !hasLiveSupabase()) {
    return { notConfigured: true };
  }
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  const res = await fetch(base + '/functions/v1/ask-whisky-guide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key
    },
    body: JSON.stringify({ question })
  });
  if (res.status === 404) {
    return { notDeployed: true };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: data.status === 503 || data.status === 429
        ? 'AI 소믈리에 응답이 잠시 혼잡해요. 다시 눌러 재시도해 보세요!'
        : (data.error || '답변을 불러오지 못했어요')
    };
  }
  return { result: data };
}

function triggerGuideAiAsk(question) {
  const cleanQ = String(question || '').trim();
  if (cleanQ.length < 2) {
    showToast('궁금한 내용을 2자 이상 입력해 주세요');
    return;
  }
  const box = document.getElementById('guideAiAnswerWrap');
  if (!box) return;
  const reqId = ++guideAiSeq;
  box.innerHTML = `
    <div class="guide-ai-card loading">
      <div class="guide-ai-badge">AI 소믈리에</div>
      <div class="guide-ai-loading">질문을 정리하고 있어요... (약 1~3초)</div>
    </div>
  `;

  askWhiskyGuideAI(cleanQ)
    .then(payload => {
      if (reqId !== guideAiSeq) return;
      const target = document.getElementById('guideAiAnswerWrap');
      if (!target) return;

      if (payload.notDeployed || payload.notConfigured) {
        target.innerHTML = `
          <div class="guide-ai-card">
            <div class="guide-ai-badge">AI 소믈리에 준비 중</div>
            <div class="guide-ai-body">Supabase에 <strong>ask-whisky-guide</strong> Edge Function을 배포하면 어떤 위스키 질문이든 실시간으로 답변해 드려요!</div>
          </div>
        `;
        return;
      }

      if (payload.error) {
        target.innerHTML = `
          <div class="guide-ai-card">
            <div class="guide-ai-badge">재시도</div>
            <div class="guide-ai-body">${escapeGuideHtml(payload.error)}</div>
            <button type="button" class="guide-ai-retry-btn" id="guideAiRetryBtn">다시 물어보기</button>
          </div>
        `;
        document.getElementById('guideAiRetryBtn')?.addEventListener('click', () => triggerGuideAiAsk(cleanQ));
        return;
      }

      const ai = payload.result || {};
      const kws = Array.isArray(ai.keywords) ? ai.keywords.slice(0, 3) : [];
      const recName = String(ai.recommendedWhisky || '').trim();
      const matchedRec = recName
        ? WHISKIES.find(w => normText(w.name).includes(normText(recName)) || normText(recName).includes(normText(w.brand)))
        : null;

      target.innerHTML = `
        <div class="guide-ai-card">
          <div class="guide-ai-head">
            <span class="guide-ai-badge">AI 소믈리에</span>
            ${ai.title ? `<span class="guide-ai-title">${escapeGuideHtml(ai.title)}</span>` : ''}
          </div>
          <div class="guide-ai-body">${escapeGuideHtml(ai.answer || '')}</div>
          ${kws.length > 0 ? `
            <div class="guide-ai-tags">
              ${kws.map(k => `<span class="guide-ai-tag">#${escapeGuideHtml(k)}</span>`).join('')}
            </div>
          ` : ''}
          ${recName ? `
            <button type="button" class="guide-ai-rec-btn" id="guideAiRecBtn">
              <span>${escapeGuideHtml(recName)} 자세히 보기</span>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ` : ''}
        </div>
      `;

      document.getElementById('guideAiRecBtn')?.addEventListener('click', () => {
        if (matchedRec) {
          openWhiskySheet(matchedRec.id);
        } else if (window.ReactNativeWebView) {
          postToNative({ type: 'NAVIGATE_SEARCH', query: recName });
        } else {
          state.searchQuery = recName;
          searchInputEl.value = recName;
          setView('search');
        }
      });
    })
    .catch(() => {
      if (reqId !== guideAiSeq) return;
      const target = document.getElementById('guideAiAnswerWrap');
      if (!target) return;
      target.innerHTML = `
        <div class="guide-ai-card">
          <div class="guide-ai-badge">오류</div>
          <div class="guide-ai-body">네트워크 연결을 확인해 주세요.</div>
          <button type="button" class="guide-ai-retry-btn" id="guideAiRetryBtn">다시 물어보기</button>
        </div>
      `;
      document.getElementById('guideAiRetryBtn')?.addEventListener('click', () => triggerGuideAiAsk(cleanQ));
    });
}

function renderGuideSearchPanel(query) {
  const resBox = document.getElementById('guideSearchResults');
  const mainBox = document.getElementById('guideMainSections');
  const clearBtn = document.getElementById('guideSearchClearBtn');
  if (!resBox || !mainBox) return;

  const raw = String(query || '').trim();
  if (clearBtn) clearBtn.classList.toggle('show', raw.length > 0);

  if (!raw) {
    resBox.innerHTML = '';
    resBox.style.display = 'none';
    mainBox.style.display = '';
    return;
  }

  mainBox.style.display = 'none';
  resBox.style.display = 'block';
  const q = normText(raw);

  const matchedGlossary = GUIDE_GLOSSARY
    .map((g, idx) => ({ g, idx }))
    .filter(({ g }) => normText([g.term, g.group, g.keywords, g.desc].join(' ')).includes(q));

  const matchedPairings = GUIDE_PAIRINGS.filter(p =>
    normText([p.style, p.badge, p.subtitle, p.why, ...p.foods, ...p.examples].join(' ')).includes(q)
  );

  const matchedWhiskies = WHISKIES.filter(w =>
    normText([w.name, w.brand, w.en, w.category, w.summary, w.nose, w.palate, ...(w.matchKeys || [])].join(' ')).includes(q)
  ).slice(0, 6);

  const totalLocal = matchedGlossary.length + matchedPairings.length + matchedWhiskies.length;

  resBox.innerHTML = `
    <div id="guideAiAnswerWrap">
      <button type="button" class="guide-ai-prompt-btn" id="guideAskAiBtn">
        <div class="guide-ai-prompt-left">
          <span class="guide-ai-spark">✦</span>
          <div>
            <div class="guide-ai-prompt-title">"${escapeGuideHtml(raw)}" AI 소믈리에에게 물어보기</div>
            <div class="guide-ai-prompt-sub">용어·추천·페어링·보관법 무엇이든 바로 답변해 드려요</div>
          </div>
        </div>
        <div class="guide-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
    </div>

    ${matchedGlossary.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>위스키 사전</span>
        <span class="guide-sec-count">${matchedGlossary.length}건</span>
      </div>
      <div class="guide-search-list">
        ${matchedGlossary.map(({ g, idx }) => `
          <button type="button" class="guide-search-item" data-gs-glossary="${idx}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(g.term)}</span>
              <span class="guide-dict-group">${escapeGuideHtml(g.group || '')}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(g.desc)}</div>
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${matchedPairings.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>안주 페어링</span>
        <span class="guide-sec-count">${matchedPairings.length}건</span>
      </div>
      <div class="guide-search-list">
        ${matchedPairings.map(p => `
          <button type="button" class="guide-search-item" data-gs-pairing="${p.id}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(p.style)}</span>
              <span class="guide-dict-group">${escapeGuideHtml(p.badge)}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(p.foods.join(' · '))}</div>
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${matchedWhiskies.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>수록 위스키</span>
        <span class="guide-sec-count">${matchedWhiskies.length}종</span>
      </div>
      <div class="guide-search-list">
        ${matchedWhiskies.map(w => `
          <button type="button" class="guide-search-item" data-gs-whisky="${w.id}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(w.name)}</span>
              <span class="guide-dict-group">${escapeGuideHtml(w.category)} · ${escapeGuideHtml(w.abv)}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(w.summary)}</div>
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${totalLocal === 0 ? `
      <div class="guide-search-empty">사전에 바로 일치하는 항목이 없어요.<br/>위 <strong>AI 소믈리에에게 물어보기</strong>를 눌러 바로 답변을 받아보세요!</div>
    ` : ''}
  `;

  document.getElementById('guideAskAiBtn')?.addEventListener('click', () => triggerGuideAiAsk(raw));
  resBox.querySelectorAll('[data-gs-glossary]').forEach(btn => {
    btn.addEventListener('click', () => openGlossarySheet(parseInt(btn.dataset.gsGlossary, 10)));
  });
  resBox.querySelectorAll('[data-gs-pairing]').forEach(btn => {
    btn.addEventListener('click', () => openPairingSheet(btn.dataset.gsPairing));
  });
  resBox.querySelectorAll('[data-gs-whisky]').forEach(btn => {
    btn.addEventListener('click', () => openWhiskySheet(btn.dataset.gsWhisky));
  });
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
    renderGuideView({ scrollTop: guideScrollStack[2] || 0 });
    return true;
  }
  if (guideState.level === 2) {
    guideState.level = 1;
    guideState.categoryId = null;
    renderGuideView({ scrollTop: guideScrollStack[1] || 0 });
    return true;
  }
  if (guideState.level === 1 && guideState.searchQuery) {
    guideState.searchQuery = '';
    const inp = document.getElementById('guideSearchInput');
    if (inp) inp.value = '';
    renderGuideSearchPanel('');
    return true;
  }
  return false;
}

function renderGuideView(opts) {
  const container = document.getElementById('guideContent');
  const guideViewEl = document.getElementById('viewGuide');
  if (!container) return;

  const prevScroll = guideViewEl ? guideViewEl.scrollTop : 0;
  const targetScroll = opts && typeof opts.scrollTop === 'number'
    ? opts.scrollTop
    : (opts && opts.preserveScroll ? prevScroll : 0);

  updateGuideHeader();

  const restoreGuideScroll = () => {
    if (!guideViewEl) return;
    guideViewEl.scrollTop = targetScroll;
    requestAnimationFrame(() => {
      guideViewEl.scrollTop = targetScroll;
    });
  };

  // ===== LEVEL 1: ARCHIVE SEARCH + DICTIONARY + PAIRINGS + 4 CATEGORIES =====
  if (guideState.level === 1) {
    container.innerHTML = `
      <div class="guide-hero-title">위스키 아카이브</div>
      <div class="guide-hero-sub">용어 사전과 페어링부터 증류소별 라인업, AI 소믈리에 질문까지 한곳에서 찾아보세요.</div>

      <div class="guide-search-bar">
        <svg class="guide-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="guide-search-input" id="guideSearchInput" value="${escapeGuideHtml(guideState.searchQuery)}" placeholder="용어, 페어링, 궁금한 위스키 질문하기" autocomplete="off" />
        <button type="button" class="guide-search-clear ${guideState.searchQuery ? 'show' : ''}" id="guideSearchClearBtn" aria-label="검색어 지우기">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div id="guideSearchResults" style="display:none;"></div>

      <div id="guideMainSections">
        <div class="guide-quick-grid">
          <button type="button" class="guide-quick-card" id="openFullDictBtn">
            <div class="guide-quick-top">
              <span class="guide-quick-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </span>
              <span class="guide-quick-count">${GUIDE_GLOSSARY.length}개</span>
            </div>
            <div class="guide-quick-title">용어 사전</div>
            <div class="guide-quick-sub">바 · 캐스크 · 심화</div>
          </button>

          <button type="button" class="guide-quick-card" id="openFullPairingsBtn">
            <div class="guide-quick-top">
              <span class="guide-quick-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M17 2H7l1.2 7.2A4 4 0 0 0 12 12.5a4 4 0 0 0 3.8-3.3L17 2z"/></svg>
              </span>
              <span class="guide-quick-count">${GUIDE_PAIRINGS.length}종</span>
            </div>
            <div class="guide-quick-title">안주 페어링</div>
            <div class="guide-quick-sub">스타일별 추천 조합</div>
          </button>
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
      </div>
    `;

    const gInput = document.getElementById('guideSearchInput');
    const gClear = document.getElementById('guideSearchClearBtn');

    gInput?.addEventListener('input', (e) => {
      guideState.searchQuery = e.target.value;
      renderGuideSearchPanel(guideState.searchQuery);
    });
    gInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = (gInput.value || '').trim();
        if (val.length >= 2) {
          triggerGuideAiAsk(val);
          gInput.blur();
        }
      }
    });
    gClear?.addEventListener('click', () => {
      guideState.searchQuery = '';
      if (gInput) {
        gInput.value = '';
        gInput.focus();
      }
      renderGuideSearchPanel('');
    });

    document.getElementById('openFullDictBtn')?.addEventListener('click', () => openFullDictionarySheet('전체'));
    document.getElementById('openFullPairingsBtn')?.addEventListener('click', openFullPairingsSheet);

    container.querySelectorAll('[data-guide-cat]').forEach(card => {
      card.addEventListener('click', () => {
        if (guideViewEl) guideScrollStack[1] = guideViewEl.scrollTop;
        guideState.level = 2;
        guideState.categoryId = card.dataset.guideCat;
        guideState.brandName = null;
        renderGuideView({ scrollTop: 0 });
      });
    });

    if (guideState.searchQuery) {
      renderGuideSearchPanel(guideState.searchQuery);
    }
    restoreGuideScroll();
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
      renderGuideView({ scrollTop: guideScrollStack[1] || 0 });
    });
    container.querySelectorAll('[data-guide-brand]').forEach(card => {
      card.addEventListener('click', () => {
        if (guideViewEl) guideScrollStack[2] = guideViewEl.scrollTop;
        guideState.level = 3;
        guideState.brandName = card.dataset.guideBrand;
        renderGuideView({ scrollTop: 0 });
      });
    });
    restoreGuideScroll();
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
    renderGuideView({ scrollTop: guideScrollStack[1] || 0 });
  });
  document.getElementById('crumbToCat').addEventListener('click', () => {
    guideState.level = 2;
    guideState.brandName = null;
    renderGuideView({ scrollTop: guideScrollStack[2] || 0 });
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
  restoreGuideScroll();
}
