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

const GUIDE_CAT_COPY = {
  '블렌디드': {
    badge: { en: 'Best to Start', ja: '入門におすすめ' },
    tagline: { en: 'Smooth, balanced, and effortless to enjoy', ja: 'まろやかでバランスの取れた最初の一杯' },
    shortDesc: { en: 'Malt and grain whiskies blended in harmony for an easy sip.', ja: 'モルトとグレーンを絶妙に調和させた、飲みやすい王道スタイル。' },
    whatIsTitle: { en: 'What is Blended Whisky?', ja: 'ブレンデッドウイスキーとは？' },
    whatIsBody: {
      en: 'Crafted by master blenders combining single malts and grain whiskies from multiple distilleries. Smooth, consistent, and approachable — ideal for highballs or your first dram.',
      ja: '複数の蒸留所のモルト原酒とグレーン原酒を、マスターブレンダーが黄金比で調和させたウイスキー。クセが少なく飲みやすいため、ハイボールや入門に最適です。'
    }
  },
  '싱글몰트': {
    badge: { en: 'Classic Craft', ja: '個性の王道' },
    tagline: { en: '100% malted barley from a single distillery', ja: '単一蒸留所・大麦モルト100%の個性' },
    shortDesc: { en: 'Every distillery brings its own fruit, honey, oak, and character.', ja: '水・樽・風土が織りなす多彩な香りとストーリーを楽しめます。' },
    whatIsTitle: { en: 'What is Single Malt?', ja: 'シングルモルトとは？' },
    whatIsBody: {
      en: 'Made from 100% malted barley at a single distillery. Unblended with other houses, it captures pure terroir — from bright orchard fruit and honey to rich sherry and spice.',
      ja: '単一の蒸留所で大麦麦芽のみを使って造られるウイスキー。果実や蜂蜜、シェリー樽由来の奥深い香りなど、蒸留所ごとの個性を飲み比べる楽しさがあります。'
    }
  },
  '피트': {
    badge: { en: 'Bold & Smoky', ja: '強烈な個性' },
    tagline: { en: 'Campfire smoke meets Atlantic sea spray', ja: '焚き火のスモークと潮風の深い余韻' },
    shortDesc: { en: 'Malted barley dried over peat fires for unmistakable smoky depth.', ja: 'ピート（泥炭）で燻した大麦が生む、虜になるスモーキーさ。' },
    whatIsTitle: { en: 'What is Peated Whisky?', ja: 'ピートウイスキーとは？' },
    whatIsBody: {
      en: 'Iconic to Scotland’s Islay island, barley is dried over burning peat turf. The smoke infuses notes of hearth fire, sea salt, iodine, and dark barbecue — unforgettable once it clicks.',
      ja: 'スコットランド・アイラ島などで泥炭（ピート）を焚いて大麦を乾燥させることで、焚き火や潮風、燻製のような独特の香りをまとわせた個性派ウイスキーです。'
    }
  },
  '버번': {
    badge: { en: 'Rich & Sweet', ja: '濃厚な甘み' },
    tagline: { en: 'Charred new oak and rich corn sweetness', ja: '新樽オークとトウモロコシの豊かなバニラ' },
    shortDesc: { en: '51%+ corn aged in newly charred American oak for lush vanilla & caramel.', ja: 'トウモロコシ51%以上を焦がした新樽で熟成。濃いバニラとキャラメル香。' },
    whatIsTitle: { en: 'What is Bourbon & Rye?', ja: 'バーボン・ライとは？' },
    whatIsBody: {
      en: 'American whiskey distilled from at least 51% corn and aged exclusively in brand-new charred oak barrels. Expect bold vanilla, caramel, toasted oak, and warming spice.',
      ja: 'アメリカでトウモロコシを51%以上使用し、内側を焦がした新しいオーク樽のみで熟成。力強いバニラやキャラメル、香ばしいウッディ感が魅力です。'
    }
  }
};

function gLoc(obj, key) {
  if (!obj) return '';
  if (state.lang === 'en' && obj[key + '_en'] !== undefined) return obj[key + '_en'];
  if (state.lang === 'ja' && obj[key + '_ja'] !== undefined) return obj[key + '_ja'];
  return obj[key] !== undefined ? obj[key] : '';
}

function gBrandName(brandKo, fallbackBottle) {
  const meta = GUIDE_BRAND_STORIES[brandKo];
  if (state.lang === 'en') {
    if (meta && meta.en) return meta.en;
    if (fallbackBottle && fallbackBottle.en) {
      return fallbackBottle.en.replace(/\s+\d+Y.*$/i, '').replace(/\s+(Original|Double|Reserve|Harmony|Select|Black|Blue|Gold|Green|Red|Single|Small|Rare|Cask).*$/i, '').trim() || brandKo;
    }
  }
  if (state.lang === 'ja') {
    if (meta && meta.ja) return meta.ja;
  }
  return brandKo;
}

function tDictGroup(gp) {
  const map = {
    '전체': { ko: '전체', en: 'All', ja: 'すべて' },
    '바 · 음용': { ko: '바 · 음용', en: 'Bar & Serving', ja: 'バー・飲み方' },
    '캐스크 · 숙성': { ko: '캐스크 · 숙성', en: 'Cask & Aging', ja: '樽・熟成' },
    '심화 · 매니아': { ko: '심화 · 매니아', en: 'Enthusiast', ja: 'マニア向け' }
  };
  return (map[gp] && map[gp][state.lang]) || gp;
}

function openGlossarySheet(index) {
  const item = GUIDE_GLOSSARY[index];
  if (!item) return;
  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${escapeGuideHtml(gLoc(item, 'term'))}</div>
      <span class="sheet-match">${escapeGuideHtml(tDictGroup(item.group || '바 · 음용'))}</span>
    </div>
    <div class="sheet-desc" style="margin-top:14px; margin-bottom:14px;">${escapeGuideHtml(gLoc(item, 'desc'))}</div>
    <button type="button" class="my-sheet-secondary-cta" id="openFullDictFromItem">${tl('위스키 사전 전체 보기 (' + GUIDE_GLOSSARY.length + '개)', 'View Full Glossary (' + GUIDE_GLOSSARY.length + ' terms)', '用語辞典をすべて見る (' + GUIDE_GLOSSARY.length + '語)')}</button>
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
      <div class="sheet-bar-name">${tl('위스키 용어 사전', 'Whisky Glossary', 'ウイスキー用語辞典')}</div>
      <span class="sheet-match">${tl(items.length + '개', items.length + ' terms', items.length + '語')}</span>
    </div>
    <div class="guide-dict-tabs">
      ${groups.map(gp => `<button type="button" class="guide-dict-tab ${gp === group ? 'active' : ''}" data-dict-tab="${gp}">${tDictGroup(gp)}</button>`).join('')}
    </div>
    <div class="guide-dict-list">
      ${items.map(g => `
        <div class="guide-dict-item">
          <div class="guide-dict-head">
            <span class="guide-dict-term">${escapeGuideHtml(gLoc(g, 'term'))}</span>
            <span class="guide-dict-group">${escapeGuideHtml(tDictGroup(g.group || ''))}</span>
          </div>
          <div class="guide-dict-desc">${escapeGuideHtml(gLoc(g, 'desc'))}</div>
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
      <div class="sheet-bar-name">${tl('스타일별 안주 페어링', 'Whisky & Food Pairings', 'スタイル別ペアリング')}</div>
      <span class="sheet-match">${tl(GUIDE_PAIRINGS.length + '종', GUIDE_PAIRINGS.length + ' styles', GUIDE_PAIRINGS.length + '種')}</span>
    </div>
    <div class="guide-dict-list">
      ${GUIDE_PAIRINGS.map(p => {
        const foods = gLoc(p, 'foods') || p.foods;
        return `
        <button type="button" class="guide-search-item" data-open-pairing="${p.id}">
          <div class="guide-dict-head">
            <span class="guide-dict-term">${escapeGuideHtml(gLoc(p, 'style'))}</span>
            <span class="guide-dict-group">${escapeGuideHtml(gLoc(p, 'badge'))}</span>
          </div>
          <div class="guide-dict-desc">${escapeGuideHtml(foods.join(' · '))}</div>
        </button>
      `;
      }).join('')}
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
  const foods = gLoc(p, 'foods') || p.foods;
  const examplesDisp = gLoc(p, 'examples') || p.examples;
  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${escapeGuideHtml(gLoc(p, 'style'))}</div>
      <span class="sheet-match">${escapeGuideHtml(gLoc(p, 'badge'))}</span>
    </div>
    <div class="sheet-addr" style="margin-bottom:14px;">${escapeGuideHtml(gLoc(p, 'subtitle'))}</div>

    <div class="sheet-sec-title">${tl('추천 안주 페어링', 'Recommended Bites', 'おすすめのおつまみ')}</div>
    <div class="bar-whiskeys" style="margin-bottom:18px;">
      ${foods.map(f => `<span class="whiskey-tag">${escapeGuideHtml(f)}</span>`).join('')}
    </div>

    <div class="guide-tip-box" style="margin-bottom:18px;">
      <div class="guide-tip-label">${tl('왜 잘 어울릴까요?', 'Why It Works', '相性が良い理由')}</div>
      <div>${escapeGuideHtml(gLoc(p, 'why'))}</div>
    </div>

    <div class="sheet-sec-title">${tl('어울리는 대표 위스키', 'Great Bottles to Pair', 'おすすめの銘柄')}</div>
    <div class="bar-whiskeys" style="margin-bottom:16px;">
      ${p.examples.map((koEx, idx) => `<button type="button" class="whiskey-tag" style="cursor:pointer;" data-pairing-whisky="${escapeGuideHtml(koEx)}">${escapeGuideHtml(examplesDisp[idx] || koEx)} →</button>`).join('')}
    </div>

    <button type="button" class="my-sheet-secondary-cta" id="openAllPairingsFromDetail">${tl('안주 페어링 전체 보기 (' + GUIDE_PAIRINGS.length + '종)', 'All Food Pairings (' + GUIDE_PAIRINGS.length + ')', 'ペアリング一覧を見る (' + GUIDE_PAIRINGS.length + '種)')}</button>
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
    body: JSON.stringify({ question, lang: state.lang })
  });
  if (res.status === 404) {
    return { notDeployed: true };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: data.status === 503 || data.status === 429
        ? tl('AI 소믈리에 응답이 잠시 혼잡해요. 다시 눌러 재시도해 보세요!', 'AI Sommelier is busy right now. Tap below to try again.', 'AIソムリエが混み合っています。もう一度お試しください。')
        : (data.error || tl('답변을 불러오지 못했어요', 'Couldn’t load an answer. Please try again.', '回答を読み込めませんでした。'))
    };
  }
  return { result: data };
}

function triggerGuideAiAsk(question) {
  const cleanQ = String(question || '').trim();
  if (cleanQ.length < 2) {
    showToast(tl('궁금한 내용을 2자 이상 입력해 주세요', 'Please enter at least 2 characters', '2文字以上入力してください'));
    return;
  }
  const box = document.getElementById('guideAiAnswerWrap');
  if (!box) return;
  const reqId = ++guideAiSeq;
  box.innerHTML = `
    <div class="guide-ai-card loading">
      <div class="guide-ai-badge">${tl('AI 소믈리에', 'AI Sommelier', 'AIソムリエ')}</div>
      <div class="guide-ai-loading">${tl('질문을 정리하고 있어요... (약 1~3초)', 'Crafting your answer… (1–3 sec)', '回答を作成しています…（約1〜3秒）')}</div>
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
            <div class="guide-ai-badge">${tl('AI 소믈리에 준비 중', 'AI Sommelier Setup', 'AIソムリエ準備中')}</div>
            <div class="guide-ai-body">${tl('Supabase에 <strong>ask-whisky-guide</strong> Edge Function을 배포하면 어떤 위스키 질문이든 실시간으로 답변해 드려요!', 'Deploy the <strong>ask-whisky-guide</strong> Edge Function on Supabase for instant answers to any whisky question.', 'Supabaseに<strong>ask-whisky-guide</strong>をデプロイすると、あらゆる質問にリアルタイムで回答できます。')}</div>
          </div>
        `;
        return;
      }

      if (payload.error) {
        target.innerHTML = `
          <div class="guide-ai-card">
            <div class="guide-ai-badge">${tl('재시도', 'Retry', '再試行')}</div>
            <div class="guide-ai-body">${escapeGuideHtml(payload.error)}</div>
            <button type="button" class="guide-ai-retry-btn" id="guideAiRetryBtn">${tl('다시 물어보기', 'Ask Again', 'もう一度聞く')}</button>
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
            <span class="guide-ai-badge">${tl('AI 소믈리에', 'AI Sommelier', 'AIソムリエ')}</span>
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
              <span>${tl(escapeGuideHtml(recName) + ' 자세히 보기', 'Explore ' + escapeGuideHtml(recName), escapeGuideHtml(recName) + 'を詳しく見る')}</span>
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
          <div class="guide-ai-badge">${tl('오류', 'Error', 'エラー')}</div>
          <div class="guide-ai-body">${tl('네트워크 연결을 확인해 주세요.', 'Please check your internet connection.', 'ネットワーク接続をご確認ください。')}</div>
          <button type="button" class="guide-ai-retry-btn" id="guideAiRetryBtn">${tl('다시 물어보기', 'Ask Again', 'もう一度聞く')}</button>
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
    .filter(({ g }) => normText([g.term, g.term_en, g.term_ja, g.group, g.keywords, g.desc, g.desc_en, g.desc_ja].join(' ')).includes(q));

  const matchedPairings = GUIDE_PAIRINGS.filter(p =>
    normText([
      p.style, p.style_en, p.style_ja, p.badge, p.badge_en, p.badge_ja,
      p.subtitle, p.subtitle_en, p.subtitle_ja, p.why, p.why_en, p.why_ja,
      ...p.foods, ...(p.foods_en || []), ...(p.foods_ja || []),
      ...p.examples, ...(p.examples_en || []), ...(p.examples_ja || [])
    ].join(' ')).includes(q)
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
            <div class="guide-ai-prompt-title">${tl('"' + escapeGuideHtml(raw) + '" AI 소믈리에에게 물어보기', 'Ask AI Sommelier about "' + escapeGuideHtml(raw) + '"', '「' + escapeGuideHtml(raw) + '」をAIソムリエに聞く')}</div>
            <div class="guide-ai-prompt-sub">${tl('용어·추천·페어링·보관법 무엇이든 바로 답변해 드려요', 'Instant answers on terms, bottles, pairings & storage', '用語・おすすめ銘柄・ペアリング何でもお答えします')}</div>
          </div>
        </div>
        <div class="guide-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </button>
    </div>

    ${matchedGlossary.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>${tl('위스키 사전', 'Glossary', '用語辞典')}</span>
        <span class="guide-sec-count">${tl(matchedGlossary.length + '건', String(matchedGlossary.length), matchedGlossary.length + '件')}</span>
      </div>
      <div class="guide-search-list">
        ${matchedGlossary.map(({ g, idx }) => `
          <button type="button" class="guide-search-item" data-gs-glossary="${idx}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(gLoc(g, 'term'))}</span>
              <span class="guide-dict-group">${escapeGuideHtml(tDictGroup(g.group || ''))}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(gLoc(g, 'desc'))}</div>
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${matchedPairings.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>${tl('안주 페어링', 'Food Pairings', 'ペアリング')}</span>
        <span class="guide-sec-count">${tl(matchedPairings.length + '건', String(matchedPairings.length), matchedPairings.length + '件')}</span>
      </div>
      <div class="guide-search-list">
        ${matchedPairings.map(p => {
          const foods = gLoc(p, 'foods') || p.foods;
          return `
          <button type="button" class="guide-search-item" data-gs-pairing="${p.id}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(gLoc(p, 'style'))}</span>
              <span class="guide-dict-group">${escapeGuideHtml(gLoc(p, 'badge'))}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(foods.join(' · '))}</div>
          </button>
        `;
        }).join('')}
      </div>
    ` : ''}

    ${matchedWhiskies.length > 0 ? `
      <div class="guide-sec-label" style="margin-top:16px;">
        <span>${tl('수록 위스키', 'Whiskies', '収録ウイスキー')}</span>
        <span class="guide-sec-count">${tl(matchedWhiskies.length + '종', String(matchedWhiskies.length), matchedWhiskies.length + '種')}</span>
      </div>
      <div class="guide-search-list">
        ${matchedWhiskies.map(w => `
          <button type="button" class="guide-search-item" data-gs-whisky="${w.id}">
            <div class="guide-dict-head">
              <span class="guide-dict-term">${escapeGuideHtml(state.lang === 'en' && w.en ? w.en : w.name)}</span>
              <span class="guide-dict-group">${escapeGuideHtml(tCat(w.category))} · ${escapeGuideHtml(w.abv)}</span>
            </div>
            <div class="guide-search-snippet">${escapeGuideHtml(w.summary)}</div>
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${totalLocal === 0 ? `
      <div class="guide-search-empty">${tl('사전에 바로 일치하는 항목이 없어요.<br/>위 <strong>AI 소믈리에에게 물어보기</strong>를 눌러 바로 답변을 받아보세요!', 'No direct glossary matches.<br/>Tap <strong>Ask AI Sommelier</strong> above for an instant answer!', '辞典に一致する項目がありません。<br/>上の<strong>AIソムリエに聞く</strong>からすぐ回答を受け取れます。')}</div>
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
    titleEl.textContent = tl(guideState.categoryId + ' 가이드', tCat(guideState.categoryId) + ' Guide', tCat(guideState.categoryId) + 'ガイド');
  } else {
    backBtn.classList.add('visible');
    titleEl.textContent = gBrandName(guideState.brandName);
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
      <div class="guide-hero-title">${tl('위스키 아카이브', 'Whisky Archive', 'ウイスキーアーカイブ')}</div>
      <div class="guide-hero-sub">${tl('용어 사전과 페어링부터 증류소별 라인업, AI 소믈리에 질문까지 한곳에서 찾아보세요.', 'Explore whisky styles, tasting terms, food pairings, and ask our AI sommelier anything.', '用語辞典やペアリングから蒸留所別ラインナップ、AIソムリエへの質問までこれひとつで。')}</div>

      <div class="guide-search-bar">
        <svg class="guide-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="guide-search-input" id="guideSearchInput" value="${escapeGuideHtml(guideState.searchQuery)}" placeholder="${tl('용어, 페어링, 궁금한 위스키 질문하기', 'Search terms, pairings, or ask AI…', '用語・ペアリング検索やAIに質問…')}" autocomplete="off" />
        <button type="button" class="guide-search-clear ${guideState.searchQuery ? 'show' : ''}" id="guideSearchClearBtn" aria-label="Clear">
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
              <span class="guide-quick-count">${tl(GUIDE_GLOSSARY.length + '개', GUIDE_GLOSSARY.length + ' terms', GUIDE_GLOSSARY.length + '語')}</span>
            </div>
            <div class="guide-quick-title">${tl('용어 사전', 'Glossary', '用語辞典')}</div>
            <div class="guide-quick-sub">${tl('바 · 캐스크 · 심화', 'Bar · Cask · Deep Dive', 'バー・樽・マニア向け')}</div>
          </button>

          <button type="button" class="guide-quick-card" id="openFullPairingsBtn">
            <div class="guide-quick-top">
              <span class="guide-quick-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M17 2H7l1.2 7.2A4 4 0 0 0 12 12.5a4 4 0 0 0 3.8-3.3L17 2z"/></svg>
              </span>
              <span class="guide-quick-count">${tl(GUIDE_PAIRINGS.length + '종', GUIDE_PAIRINGS.length + ' styles', GUIDE_PAIRINGS.length + '種')}</span>
            </div>
            <div class="guide-quick-title">${tl('안주 페어링', 'Food Pairings', 'ペアリング')}</div>
            <div class="guide-quick-sub">${tl('스타일별 추천 조합', 'Curated bites by style', 'スタイル別おすすめ')}</div>
          </button>
        </div>

        <div class="guide-sec-label">
          <span>${tl('위스키 4대 종류', '4 Core Whisky Styles', 'ウイスキー4大スタイル')}</span>
          <span class="guide-sec-count">${tl('총 ' + WHISKIES.length + '종 수록', WHISKIES.length + ' bottles', '全' + WHISKIES.length + '種収録')}</span>
        </div>
        <div class="guide-cat-list">
          ${GUIDE_CATEGORIES.map(cat => {
            const count = getGuideWhiskiesByCategory(cat.id).length;
            const catBadge = gLoc(cat, 'badge');
            const catTagline = gLoc(cat, 'tagline');
            const catDesc = gLoc(cat, 'shortDesc');
            const catHighlights = gLoc(cat, 'highlights') || cat.highlights;
            return `
              <div class="guide-cat-card" data-guide-cat="${cat.id}">
                <div class="guide-cat-top">
                  <img class="guide-cat-art" src="${cat.image}" alt="${tCat(cat.id)}" />
                  <div class="guide-cat-top-row">
                    <span class="guide-cat-badge">${catBadge}</span>
                    <span class="guide-cat-count">${tl(count + '종 수록', count + ' bottles', count + '種')}</span>
                  </div>
                  <div class="guide-cat-heading">
                    <span class="guide-cat-name">${tCat(cat.id)}</span>
                    ${state.lang !== 'en' ? `<span class="guide-cat-en">${cat.en}</span>` : ''}
                  </div>
                </div>
                <div class="guide-cat-body">
                  <div class="guide-cat-tagline">${catTagline}</div>
                  <div class="guide-cat-desc">${catDesc}</div>
                  <div class="guide-cat-footer">
                    <div class="guide-mini-brands">
                      ${catHighlights.slice(0, 3).map(h => `<span class="guide-mini-pill">${h}</span>`).join('')}
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

    const catBadge = gLoc(cat, 'badge');
    const catWhatTitle = gLoc(cat, 'whatIsTitle');
    const catWhatBody = gLoc(cat, 'whatIsBody');
    const catFacts = gLoc(cat, 'facts') || cat.facts;

    container.innerHTML = `
      <div class="guide-breadcrumb">
        <button class="guide-crumb-btn" id="crumbToRoot">${tl('가이드', 'Guide', 'ガイド')}</button>
        <span class="guide-crumb-sep">›</span>
        <span class="guide-crumb-current">${tCat(cat.id)}</span>
      </div>

      <div class="guide-concept-card">
        <div class="guide-concept-photo-wrap">
          <img class="guide-concept-art" src="${cat.image}" alt="${tCat(cat.id)}" />
        </div>
        <span class="guide-concept-eyebrow">${cat.en} · ${catBadge}</span>
        <div class="guide-concept-title">${catWhatTitle}</div>
        <div class="guide-concept-body">${catWhatBody}</div>
        <div class="guide-facts-list">
          ${catFacts.map(f => `
            <div class="guide-fact-row">
              <span class="guide-fact-label">${f.label}</span>
              <span class="guide-fact-val">${f.value}</span>
            </div>
          `).join('')}
        </div>
        <div class="match-bars" style="margin-bottom:0;">
          <div class="match-bar-item"><span class="match-bar-label">${tl('달콤함', 'Sweet', '甘み')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.sweet}%"></div></div><span class="match-bar-text">${cat.profile.sweet}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">${tl('스모키', 'Smoky', 'スモーク')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.smoky}%"></div></div><span class="match-bar-text">${cat.profile.smoky}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">${tl('바디감', 'Body', 'ボディ')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.body}%"></div></div><span class="match-bar-text">${cat.profile.body}%</span></div>
          <div class="match-bar-item"><span class="match-bar-label">${tl('입문 추천', 'Beginner', '入門向き')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${cat.profile.beginner}%"></div></div><span class="match-bar-text">${cat.profile.beginner}%</span></div>
        </div>
      </div>

      <div class="guide-sec-label">
        <span>${tl('대표 ' + cat.name + ' 브랜드', 'Signature ' + tCat(cat.id) + ' Brands', '代表的な' + tCat(cat.id) + 'ブランド')}</span>
        <span class="guide-sec-count">${tl(brands.length + '개 브랜드', brands.length + ' brands', brands.length + 'ブランド')}</span>
      </div>

      <div class="guide-brand-list">
        ${brands.map(item => {
          const storyMeta = GUIDE_BRAND_STORIES[item.brand];
          const bLabel = gBrandName(item.brand, item.bottles[0]);
          const previewText = storyMeta
            ? gLoc(storyMeta, 'story')
            : (state.lang === 'ko'
              ? item.bottles[0].summary
              : `${tWhiskyOrigin(item.bottles[0].origin)} · ${item.bottles[0].abv} · ${tWhiskyLevel(item.bottles[0].level)}`);
          return `
            <div class="guide-brand-card" data-guide-brand="${item.brand}">
              ${renderWhiskyBottleSVG(item.bottles[0], 'thumb-sm')}
              <div class="guide-brand-info">
                <div class="guide-brand-top">
                  <span class="guide-brand-name">${bLabel}</span>
                  <span class="guide-brand-count">${tl(item.bottles.length + '종', item.bottles.length + (item.bottles.length === 1 ? ' bottle' : ' bottles'), item.bottles.length + '種')}</span>
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

  const brandDisplay = gBrandName(guideState.brandName, sample);
  const brandEn = storyMeta ? storyMeta.en : (sample ? sample.en.split(' ')[0] : '');
  const brandOrigin = storyMeta ? gLoc(storyMeta, 'origin') : (sample ? tWhiskyOrigin(sample.origin) : '');
  const brandStory = storyMeta
    ? gLoc(storyMeta, 'story')
    : tl(
        `${guideState.brandName}은(는) ${brandOrigin} 지역의 개성이 살아있는 대표적인 ${guideState.categoryId} 위스키 브랜드입니다. ${sample ? sample.summary : ''}`,
        `${brandDisplay} is a signature ${tCat(guideState.categoryId).toLowerCase()} house from ${brandOrigin}, celebrated for its distinct distillery character.`,
        `${brandDisplay}は、${brandOrigin}の個性が際立つ代表的な${tCat(guideState.categoryId)}ブランドです。`
      );
  const brandTip = storyMeta
    ? gLoc(storyMeta, 'tip')
    : tl(
        '아래 라인업 중 도수와 난이도를 참고해 취향에 맞는 바틀부터 가볍게 시작해 보세요.',
        'Browse the lineup below by ABV and style to find the best bottle for your palate.',
        '下のラインナップから度数やスタイルを見て、気になるボトルから試してみてください。'
      );

  container.innerHTML = `
    <div class="guide-breadcrumb">
      <button class="guide-crumb-btn" id="crumbToRoot">${tl('가이드', 'Guide', 'ガイド')}</button>
      <span class="guide-crumb-sep">›</span>
      <button class="guide-crumb-btn" id="crumbToCat">${tCat(cat ? cat.id : guideState.categoryId)}</button>
      <span class="guide-crumb-sep">›</span>
      <span class="guide-crumb-current">${brandDisplay}</span>
    </div>

    <div class="guide-concept-card">
      <span class="guide-concept-eyebrow">${brandEn} · ${brandOrigin}</span>
      <div class="guide-concept-title">${tl(guideState.brandName + '이란?', 'About ' + brandDisplay, brandDisplay + 'について')}</div>
      <div class="guide-concept-body">${brandStory}</div>
      <div class="guide-tip-box">
        <div class="guide-tip-label">${tl('입문 · 테이스팅 팁', 'Tasting Tip', 'テイスティングのコツ')}</div>
        <div>${brandTip}</div>
      </div>
    </div>

    <div class="guide-sec-label">
      <span>${tl('대표 라인업 알아보기', 'Signature Lineup', '代表ラインナップ')}</span>
      <span class="guide-sec-count">${tl(bottles.length + '종', bottles.length + ' bottles', bottles.length + '種')}</span>
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
                <span class="guide-bottle-name">${state.lang === 'en' && w.en ? w.en : w.name}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="guide-bottle-abv">${w.abv}</span>
                  <button type="button" class="guide-bottle-like-btn ${isWLiked ? 'liked' : ''}" data-whisky-like="${w.id}" aria-label="${tl('술 찜하기', 'Save whisky', 'お気に入りに追加')}">
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                </div>
              </div>
              <div class="guide-bottle-en">${w.en} · ${tWhiskyLevel(w.level)}</div>
              <div class="guide-bottle-summary" style="margin-bottom:0;">${state.lang === 'ko' ? w.summary : (tWhiskyOrigin(w.origin) + ' · ' + tCat(w.category))}</div>
            </div>
          </div>
          <div class="guide-bottle-footer">
            <span>${tl('향 · 맛 · 여운 테이스팅 노트 보기', 'View Nose · Palate · Finish', '香り・味わい・余韻を見る')}</span>
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      `;
      }).join('')}
    </div>

    <button class="guide-find-bar-btn" id="guideFindBarsBtn">
      <span>${tl(guideState.brandName + ' 즐길 수 있는 바 검색하기', 'Find Bars Serving ' + brandDisplay, brandDisplay + 'が飲めるバーを探す')}</span>
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
      if (w) {
        const wLabel = state.lang === 'en' && w.en ? w.en : w.name;
        showToast(liked
          ? tl(w.name + '을(를) 찜한 술에 저장했어요', 'Saved ' + wLabel, w.name + 'をお気に入りに保存しました')
          : tl(w.name + ' 찜 해제됨', 'Removed ' + wLabel, w.name + 'を解除しました'));
      }
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
