// ===== BAR REVIEWS & STAR RATINGS (SUPABASE public.bar_reviews) =====
const barRatingStatsMap = {}; // { [barId]: { sum, count, avg } }

function escapeReviewHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReviewDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return tl('방금 전', 'Just now', 'たった今');
  if (diffMin < 60) return tl(diffMin + '분 전', diffMin + 'm ago', diffMin + '分前');
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return tl(diffHr + '시간 전', diffHr + 'h ago', diffHr + '時間前');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '.' + m + '.' + day;
}

function renderStarsText(rating) {
  const r = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function updateBarStatsCache(barId, reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    delete barRatingStatsMap[barId];
    return;
  }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  barRatingStatsMap[barId] = {
    sum,
    count: reviews.length,
    avg: (sum / reviews.length).toFixed(1)
  };
}

async function preloadAllBarRatings() {
  if (typeof hasLiveSupabase !== 'function' || !hasLiveSupabase()) return;
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  try {
    const res = await fetch(base + '/rest/v1/bar_reviews?select=bar_id,rating', {
      headers: { 'apikey': key }
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    Object.keys(barRatingStatsMap).forEach(k => delete barRatingStatsMap[k]);
    rows.forEach(r => {
      if (!r.bar_id) return;
      if (!barRatingStatsMap[r.bar_id]) barRatingStatsMap[r.bar_id] = { sum: 0, count: 0, avg: '0.0' };
      barRatingStatsMap[r.bar_id].sum += Number(r.rating) || 0;
      barRatingStatsMap[r.bar_id].count += 1;
    });
    Object.values(barRatingStatsMap).forEach(st => {
      st.avg = (st.sum / st.count).toFixed(1);
    });
    if (state.view === 'results' || state.view === 'likes') renderResults();
    if (state.view === 'search') renderSearchResults();
  } catch (e) {}
}

async function fetchReviewsForBar(barId) {
  if (typeof hasLiveSupabase !== 'function' || !hasLiveSupabase()) {
    return { reviews: [], missingTable: false };
  }
  const base = window.SPEAKEASY_SUPABASE.url.replace(/\/$/, '');
  const key = window.SPEAKEASY_SUPABASE.anonKey;
  const encodedId = encodeURIComponent(barId);
  const headers = { 'apikey': key };
  if (state.account && state.account.accessToken) {
    headers['Authorization'] = 'Bearer ' + state.account.accessToken;
  }
  try {
    let res = await fetch(
      base + '/rest/v1/bar_reviews?bar_id=eq.' + encodedId + '&select=id,bar_id,user_id,author_name,rating,content,tags,photos,created_at&order=created_at.desc&limit=30',
      { headers }
    );
    // Fallback if photos/tags columns haven't been added yet
    if (res.status === 400) {
      res = await fetch(
        base + '/rest/v1/bar_reviews?bar_id=eq.' + encodedId + '&select=id,bar_id,user_id,author_name,rating,content,created_at&order=created_at.desc&limit=30',
        { headers }
      );
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const code = String(errBody.code || '');
      const msg = String(errBody.message || errBody.hint || '').toLowerCase();
      const missingTable = res.status === 404 || code === '42P01' || code === 'PGRST205' || msg.includes('does not exist') || msg.includes('could not find the table');
      return { reviews: [], missingTable };
    }
    const rows = await res.json();
    const list = Array.isArray(rows) ? rows : [];
    updateBarStatsCache(barId, list);
    return { reviews: list, missingTable: false };
  } catch (e) {
    return { reviews: [], missingTable: false };
  }
}

async function submitBarReview(barId, rating, content, tags, photos) {
  const cleanText = String(content || '').trim();
  if (cleanText.length < 2) {
    showToast(tl('후기 내용을 2자 이상 입력해 주세요', 'Please write at least 2 characters', 'レビュー内容を2文字以上入力してください'));
    return false;
  }
  if (!state.account || !state.account.accessToken) {
    showToast(tl('로그인 후 리뷰를 남길 수 있어요', 'Sign in to post a review', 'ログイン後にレビューを投稿できます'));
    return false;
  }
  if (!state.account.userId && typeof ensureAccountUserId === 'function') {
    await ensureAccountUserId();
  }
  if (!state.account.userId) {
    showToast(tl('로그인 정보를 확인해 주세요', 'Please check your account session', 'ログイン情報をご確認ください'));
    return false;
  }
  const authorName = (state.profile && state.profile.name) || state.account.name || tl('스피크이지 멤버', 'Speakeasy Member', 'speakeasyメンバー');
  const baseBody = {
    bar_id: barId,
    user_id: state.account.userId,
    author_name: authorName,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    content: cleanText
  };
  const fullBody = Object.assign({}, baseBody, {
    tags: Array.isArray(tags) ? tags : [],
    photos: Array.isArray(photos) ? photos : []
  });

  try {
    let res = await supabaseAuthedFetch('/rest/v1/bar_reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fullBody)
    });

    // If photos/tags columns aren't added yet, fall back to base columns gracefully
    let savedWithoutMedia = false;
    if (res && res.status === 400) {
      const err1 = await res.json().catch(() => ({}));
      const msg1 = String(err1.message || '').toLowerCase();
      if (msg1.includes('photos') || msg1.includes('tags') || msg1.includes('column')) {
        res = await supabaseAuthedFetch('/rest/v1/bar_reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(baseBody)
        });
        savedWithoutMedia = Boolean(res && res.ok);
      }
    }

    if (!res || !res.ok) {
      const err = res ? await res.json().catch(() => ({})) : {};
      const msg = String(err.message || '').toLowerCase();
      if ((res && res.status === 404) || msg.includes('bar_reviews') || msg.includes('could not find')) {
        showToast(tl('Supabase에 bar_reviews 테이블 SQL을 먼저 실행해 주세요', 'Please set up the bar_reviews table in Supabase first', 'Supabaseでbar_reviewsテーブルを作成してください'));
      } else {
        showToast(tl('리뷰 등록에 실패했어요. 잠시 후 다시 시도해 주세요', 'Couldn’t post review. Please try again', 'レビューの投稿に失敗しました'));
      }
      return false;
    }
    showToast(savedWithoutMedia
      ? tl('후기가 등록되었어요! (사진·태그는 SQL 추가 후 저장)', 'Review posted!', 'レビューを投稿しました！')
      : tl('리뷰가 등록되었어요!', 'Review posted!', 'レビューを投稿しました！'));
    return true;
  } catch (e) {
    showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
    return false;
  }
}

async function deleteBarReview(reviewId) {
  if (!state.account || !state.account.accessToken) return false;
  try {
    const res = await supabaseAuthedFetch('/rest/v1/bar_reviews?id=eq.' + encodeURIComponent(reviewId), {
      method: 'DELETE'
    });
    if (!res || !res.ok) {
      showToast(tl('리뷰 삭제에 실패했어요', 'Couldn’t delete review', 'レビューの削除に失敗しました'));
      return false;
    }
    showToast(tl('리뷰를 삭제했어요', 'Review deleted', 'レビューを削除しました'));
    return true;
  } catch (e) {
    showToast(tl('네트워크 연결을 확인해 주세요', 'Please check your internet connection', 'ネットワーク接続をご確認ください'));
    return false;
  }
}

function compressReviewPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('img error'));
      img.onload = () => {
        const maxSide = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
          else { w = Math.round((w * maxSide) / h); h = maxSide; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        } catch (e) {
          resolve(String(reader.result || ''));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openReviewLightbox(src) {
  const lb = document.getElementById('reviewLightbox');
  const lbImg = document.getElementById('reviewLightboxImg');
  if (!lb || !lbImg || !src) return;
  lbImg.src = src;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
}

document.getElementById('reviewLightbox')?.addEventListener('click', () => {
  const lb = document.getElementById('reviewLightbox');
  if (!lb) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
});

// ===== DEDICATED FULL-SCREEN REVIEW COMPOSER =====
const REVIEW_QUICK_TAGS = ['혼술추천', '분위기맛집', '바텐더친절', '위스키다양', '데이트추천', '조용한대화'];
let reviewWriteBarId = null;

function closeReviewWriteScreen() {
  const el = document.getElementById('reviewWriteScreen');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  reviewWriteBarId = null;
}

document.getElementById('reviewWriteCloseBtn')?.addEventListener('click', closeReviewWriteScreen);

function openReviewWriteScreen(barId) {
  const isLoggedIn = Boolean(state.account && state.account.accessToken);
  if (!isLoggedIn) {
    closeDetailSheet();
    showToast(tl('로그인 후 바 후기를 남길 수 있어요', 'Sign in to write a bar review', 'ログイン後にバーのレビューを投稿できます'));
    if (typeof openAuthScreen === 'function') openAuthScreen('login');
    return;
  }

  const bar = BARS.find(b => b.id === barId);
  if (!bar) return;
  reviewWriteBarId = barId;

  const body = document.getElementById('reviewWriteBody');
  const screenEl = document.getElementById('reviewWriteScreen');
  if (!body || !screenEl) return;

  let draftRating = 5;
  const draftTags = new Set();
  const draftPhotos = [];

  const ratingTexts = {
    1: tl('1점 · 아쉬웠어요', '1 · Not for me', '1 · 少し残念でした'),
    2: tl('2점 · 그저 그랬어요', '2 · Just okay', '2 · 普通でした'),
    3: tl('3점 · 무난하게 좋았어요', '3 · Pretty good', '3 · なかなか良かったです'),
    4: tl('4점 · 추천하고 싶어요', '4 · Worth a visit', '4 · おすすめしたいです'),
    5: tl('5점 · 또 가고 싶은 인생 바', '5 · An absolute favorite', '5 · また行きたいお気に入り')
  };

  body.innerHTML = `
    <div class="rw-bar-banner">
      <div class="rw-bar-name">${escapeReviewHtml(bar.name)}</div>
      <div class="rw-bar-sub">${escapeReviewHtml(bar.region)} · ${escapeReviewHtml(bar.subloc)}</div>
    </div>

    <div class="rw-section">
      <div class="rw-label">${tl('별점을 선택해 주세요', 'How was your visit?', '評価を選んでください')}</div>
      <div class="rw-star-box">
        <div class="rw-star-row" id="rwStarRow">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rw-star-btn active" data-rw-star="${n}" aria-label="${n}">★</button>`).join('')}
        </div>
        <div class="rw-star-caption" id="rwStarCaption">${ratingTexts[5]}</div>
      </div>
    </div>

    <div class="rw-section">
      <div class="rw-label">${tl('어떤 점이 좋았나요?', 'What stood out?', '良かったポイントは？')} <span class="rw-opt">${tl('(선택)', '(Optional)', '(任意)')}</span></div>
      <div class="rw-tag-grid" id="rwTagGrid">
        ${REVIEW_QUICK_TAGS.map(tag => `<button type="button" class="rw-tag-chip" data-rw-tag="${tag}">#${escapeReviewHtml(tReviewTag(tag))}</button>`).join('')}
      </div>
    </div>

    <div class="rw-section">
      <div class="rw-label-row">
        <span class="rw-label" style="margin-bottom:0;">${tl('사진 첨부', 'Add Photos', '写真を追加')} <span class="rw-opt">${tl('(최대 3장)', '(Up to 3)', '(最大3枚)')}</span></span>
        <span class="rw-count" id="rwPhotoCount">0 / 3</span>
      </div>
      <div class="rw-photo-grid" id="rwPhotoGrid"></div>
    </div>

    <div class="rw-section">
      <div class="rw-label-row">
        <label class="rw-label" for="rwTextarea" style="margin-bottom:0;">${tl('방문 후기', 'Your Review', 'レビュー内容')}</label>
        <span class="rw-count" id="rwCharCount">0 / 500</span>
      </div>
      <textarea class="rw-textarea" id="rwTextarea" rows="5" maxlength="500" placeholder="${tl('분위기, 마신 위스키, 바텐더 추천, 좌석 느낌 등 솔직한 후기를 남겨보세요!', 'Share the vibe, what you drank, bartender recommendations, or seating tips…', '雰囲気や飲んだウイスキー、バーテンダーの接客など、率直な感想を残してみてください')}"></textarea>
    </div>

    <button type="button" class="rw-submit-cta" id="rwSubmitBtn">${tl('리뷰 등록하기', 'Post Review', 'レビューを投稿する')}</button>
  `;

  const photoGrid = body.querySelector('#rwPhotoGrid');
  const photoCountEl = body.querySelector('#rwPhotoCount');
  const photoInput = document.getElementById('reviewPhotoInput');

  function renderPhotoGrid() {
    if (!photoGrid) return;
    if (photoCountEl) photoCountEl.textContent = draftPhotos.length + ' / 3';
    photoGrid.innerHTML = `
      ${draftPhotos.map((src, idx) => `
        <div class="rw-photo-item">
          <img src="${src}" alt="첨부 사진 ${idx + 1}" />
          <button type="button" class="rw-photo-remove" data-rm-photo="${idx}" aria-label="사진 삭제">×</button>
        </div>
      `).join('')}
      ${draftPhotos.length < 3 ? `
        <button type="button" class="rw-photo-add" id="rwAddPhotoBtn">
          <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>${tl('사진 추가', 'Add Photo', '写真を追加')}</span>
        </button>
      ` : ''}
    `;

    photoGrid.querySelectorAll('[data-rm-photo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.rmPhoto, 10);
        if (!isNaN(i)) {
          draftPhotos.splice(i, 1);
          renderPhotoGrid();
        }
      });
    });

    photoGrid.querySelector('#rwAddPhotoBtn')?.addEventListener('click', () => {
      if (!photoInput) return;
      photoInput.value = '';
      photoInput.onchange = async (e) => {
        const files = Array.from(e.target.files || []);
        const remain = 3 - draftPhotos.length;
        for (const f of files.slice(0, remain)) {
          try {
            const compressed = await compressReviewPhoto(f);
            if (compressed) draftPhotos.push(compressed);
          } catch (err) {}
        }
        renderPhotoGrid();
      };
      photoInput.click();
    });
  }
  renderPhotoGrid();

  const starBtns = body.querySelectorAll('[data-rw-star]');
  const starCaption = body.querySelector('#rwStarCaption');
  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      draftRating = parseInt(btn.dataset.rwStar, 10) || 5;
      starBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.rwStar, 10) <= draftRating));
      if (starCaption) starCaption.textContent = ratingTexts[draftRating] || (draftRating + '점');
    });
  });

  body.querySelectorAll('[data-rw-tag]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.rwTag;
      if (draftTags.has(tag)) draftTags.delete(tag);
      else draftTags.add(tag);
      chip.classList.toggle('active', draftTags.has(tag));
    });
  });

  const textarea = body.querySelector('#rwTextarea');
  const charCount = body.querySelector('#rwCharCount');
  textarea?.addEventListener('input', () => {
    if (charCount) charCount.textContent = textarea.value.length + ' / 500';
  });

  const submitBtn = body.querySelector('#rwSubmitBtn');
  submitBtn?.addEventListener('click', async () => {
    const text = textarea ? textarea.value : '';
    if (text.trim().length < 2) {
      showToast(tl('후기 내용을 2자 이상 입력해 주세요', 'Please write at least 2 characters', 'レビュー内容を2文字以上入力してください'));
      textarea?.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = tl('등록 중...', 'Posting…', '投稿中…');
    const ok = await submitBarReview(barId, draftRating, text, Array.from(draftTags), draftPhotos);
    if (ok) {
      closeReviewWriteScreen();
      if (typeof invalidateMyBarReviewsCache === 'function') invalidateMyBarReviewsCache();
      const refreshed = await fetchReviewsForBar(barId);
      renderBarReviewsSection(barId, refreshed.reviews, refreshed.missingTable);
      if (state.view === 'results' || state.view === 'likes') renderResults();
      if (state.view === 'search') renderSearchResults();
      if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = tl('리뷰 등록하기', 'Post Review', 'レビューを投稿する');
    }
  });

  body.scrollTop = 0;
  screenEl.classList.add('open');
  screenEl.setAttribute('aria-hidden', 'false');
}

function renderBarReviewsSection(barId, reviews, missingTable) {
  const sec = document.getElementById('barReviewsSection');
  if (!sec || sec.dataset.barId !== barId) return;

  const count = reviews.length;
  const avg = count > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / count).toFixed(1)
    : null;
  const myUid = state.account && state.account.userId;

  sec.innerHTML = `
    <div class="review-sec-header">
      <div class="sheet-sec-title" style="margin-bottom:0;">${tl('리뷰 작성하기', 'Reviews', 'レビュー')}</div>
      ${avg
        ? `<span class="review-avg-pill"><span class="review-star-gold">★</span> ${avg} · ${tl(count + '개', count + (count === 1 ? ' review' : ' reviews'), count + '件')}</span>`
        : `<span class="review-avg-pill muted">${tl('첫 후기를 남겨보세요', 'Be the first to review', '最初のレビューを書く')}</span>`
      }
    </div>

    ${missingTable ? `
      <div class="review-empty-box">${tl('Supabase에 <strong>bar_reviews</strong> 테이블을 생성하면 실시간 후기 작성이 활성화돼요.', 'Create the <strong>bar_reviews</strong> table in Supabase to enable live reviews.', 'Supabaseに<strong>bar_reviews</strong>テーブルを作成するとレビュー機能が有効になります。')}</div>
    ` : `
      <button type="button" class="review-write-entry-btn" id="openReviewWriteBtn">
        <div class="review-write-entry-left">
          <span class="review-write-entry-icon">★</span>
          <div>
            <div class="review-write-entry-title">${tl('리뷰 작성하기', 'Write a Review', 'レビューを書く')}</div>
            <div class="review-write-entry-sub">${tl('사진 · 별점 · 솔직한 방문 후기 남기기', 'Share photos, a rating & your honest take', '写真・星評価・率直な感想を残す')}</div>
          </div>
        </div>
        <svg class="review-write-entry-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <div class="review-list">
        ${count > 0 ? reviews.map(r => {
          const isMine = myUid && r.user_id === myUid;
          const initial = (r.author_name || 'S').trim().charAt(0).toUpperCase() || 'S';
          const tags = Array.isArray(r.tags) ? r.tags : [];
          const photos = Array.isArray(r.photos) ? r.photos : [];
          return `
            <div class="review-card">
              <div class="review-card-top">
                <div class="review-author-wrap">
                  <span class="review-avatar">${escapeReviewHtml(initial)}</span>
                  <div>
                    <div class="review-author-name">${escapeReviewHtml(r.author_name || tl('스피크이지 멤버', 'Speakeasy Member', 'メンバー'))}</div>
                    <div class="review-card-meta">
                      <span class="review-stars-inline">${renderStarsText(r.rating)}</span>
                      <span class="review-date">${formatReviewDate(r.created_at)}</span>
                    </div>
                  </div>
                </div>
                ${isMine ? `<button type="button" class="review-del-btn" data-del-review="${escapeReviewHtml(r.id)}">${tl('삭제', 'Delete', '削除')}</button>` : ''}
              </div>
              ${tags.length > 0 ? `
                <div class="review-card-tags">
                  ${tags.map(tg => `<span class="review-card-tag">#${escapeReviewHtml(tReviewTag(tg))}</span>`).join('')}
                </div>
              ` : ''}
              ${photos.length > 0 ? `
                <div class="review-card-photos">
                  ${photos.map(src => `<img class="review-card-photo" src="${src}" alt="review photo" data-zoom-photo="1" />`).join('')}
                </div>
              ` : ''}
              <div class="review-card-content">${escapeReviewHtml(r.content)}</div>
            </div>
          `;
        }).join('') : `
          <div class="review-empty-box">${tl('아직 등록된 후기가 없어요.<br/>위 버튼을 눌러 첫 번째 리뷰를 남겨보세요!', 'No reviews yet.<br/>Tap above to share the first one!', 'まだレビューがありません。<br/>上のボタンから最初の感想を残してみませんか？')}</div>
        `}
      </div>
    `}
  `;

  sec.querySelector('#openReviewWriteBtn')?.addEventListener('click', () => {
    openReviewWriteScreen(barId);
  });

  sec.querySelectorAll('[data-zoom-photo]').forEach(img => {
    img.addEventListener('click', () => openReviewLightbox(img.src));
  });

  sec.querySelectorAll('[data-del-review]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reviewId = btn.dataset.delReview;
      btn.disabled = true;
      const ok = await deleteBarReview(reviewId);
      if (ok) {
        if (typeof invalidateMyBarReviewsCache === 'function') invalidateMyBarReviewsCache();
        const refreshed = await fetchReviewsForBar(barId);
        renderBarReviewsSection(barId, refreshed.reviews, refreshed.missingTable);
        if (state.view === 'results' || state.view === 'likes') renderResults();
        if (state.view === 'search') renderSearchResults();
        if (state.view === 'my' && typeof renderMyView === 'function') renderMyView();
      } else {
        btn.disabled = false;
      }
    });
  });
}

// ===== REUSABLE BAR CARD RENDERER =====
function renderBarCards(containerEl, bars, emptyMsg) {
  if (bars.length === 0) {
    containerEl.innerHTML = '<div class="empty-state">' + emptyMsg + '</div>';
    return;
  }

  containerEl.innerHTML = bars.map(bar => {
    const isLiked = state.likes.has(bar.id);
    const distText = formatDistanceText(getBarDistanceKm(bar));
    const ratingStat = barRatingStatsMap[bar.id];
    const ratingBadge = ratingStat ? ' · ★ ' + ratingStat.avg + ' (' + ratingStat.count + ')' : '';
    const naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(bar.naverQuery);
    return `
      <div class="bar-card" data-bar-id="${bar.id}">
        <div class="bar-card-visual" data-open-detail="${bar.id}">
          <div class="visual-top">
            <span class="match-badge">${tl('취향 ' + bar.match + '% 일치', bar.match + '% Match', 'マッチ度 ' + bar.match + '%')}${distText ? ' · ' + distText : ''}${ratingBadge}</span>
            <button class="card-like-btn ${isLiked ? 'liked' : ''}" data-like-id="${bar.id}" aria-label="${tl('찜하기', 'Save bar', '保存する')}">
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
            <button class="btn-detail" data-open-detail="${bar.id}">${tl('상세 보기', 'Details', '詳細を見る')}</button>
            <a class="btn-naver" href="${naverUrl}" target="_blank" rel="noopener noreferrer">
              <span>${tl('네이버 지도', 'Naver Map', 'Naver地図')}</span>
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
  const resViewEl = document.getElementById('viewResults');
  const prevScroll = resViewEl ? resViewEl.scrollTop : 0;
  const likesOnly = state.view === 'likes';
  const bars = getFilteredBars(likesOnly);
  const heading = document.getElementById('resultsHeading');
  const pills = document.getElementById('prefPills');
  const listEl = document.getElementById('resultsList');

  heading.innerHTML = likesOnly
    ? tl('찜한 바 <span>' + bars.length + '곳</span>', 'Saved Bars <span>' + bars.length + '</span>', '保存したバー <span>' + bars.length + '軒</span>')
    : tl(
        (state.region === '전체' ? '전국 추천 바 ' : state.region + ' 추천 바 ') + '<span>' + bars.length + '곳</span>',
        (state.region === '전체' ? 'Matched Bars ' : tRegion(state.region) + ' Bars ') + '<span>' + bars.length + '</span>',
        (state.region === '전체' ? '全国のおすすめバー ' : tRegion(state.region) + 'のバー ') + '<span>' + bars.length + '軒</span>'
      );

  if (likesOnly) {
    pills.innerHTML = '';
  } else {
    const tags = [
      tRegion(state.region),
      tLabel('mood', state.prefs.mood - 1),
      tLabel('price', state.prefs.price - 1),
      tLabel('space', state.prefs.space - 1),
      tLabel('taste', state.prefs.taste - 1)
    ];
    pills.innerHTML = tags.map(t => '<span class="pref-pill">#' + t + '</span>').join('');
  }

  const emptyMsg = likesOnly
    ? tl('아직 찜한 위스키 바가 없어요.<br>마음에 드는 바의 하트를 눌러 저장해 보세요!', 'No saved bars yet.<br>Tap the heart on any bar to save it here.', 'まだ保存したバーがありません。<br>気になるバーのハートをタップして追加しましょう。')
    : tl('해당 조건의 바를 찾지 못했어요.', 'No bars matched your current filters.', '条件に合うバーが見つかりませんでした。');
  renderBarCards(listEl, bars, emptyMsg);
  if (resViewEl) resViewEl.scrollTop = prevScroll;
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
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync('likes');
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
  const isBarLiked = state.likes.has(bar.id);
  const naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(bar.naverQuery);

  sheetBody.innerHTML = `
    <div class="sheet-title-row">
      <div class="sheet-bar-name">${bar.name}</div>
      <div class="sheet-title-actions">
        <span class="sheet-match">${tl('취향 ' + bar.match + '%', bar.match + '% Match', 'マッチ ' + bar.match + '%')}</span>
        <button type="button" class="sheet-bar-like-btn ${isBarLiked ? 'liked' : ''}" id="sheetBarLikeBtn" aria-label="${isBarLiked ? tl('찜 해제', 'Remove', '保存解除') : tl('바 찜하기', 'Save bar', '保存する')}">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
    </div>
    <div class="sheet-addr">${bar.region} · ${bar.subloc}</div>
    <div class="sheet-desc">${bar.desc}</div>
    <div class="sheet-info-grid">
      <div class="info-box"><div class="info-box-label">${tl('가격대', 'Price Range', '価格帯')}</div><div class="info-box-val">${bar.priceText}</div></div>
      <div class="info-box"><div class="info-box-label">${tl('영업시간', 'Hours', '営業時間')}</div><div class="info-box-val">${bar.hours}</div></div>
      <div class="info-box"><div class="info-box-label">${tl('커버차지', 'Cover Charge', 'チャージ')}</div><div class="info-box-val">${bar.cover}</div></div>
      <div class="info-box"><div class="info-box-label">${tl('추천 공간', 'Best For', 'おすすめ')}</div><div class="info-box-val">${tLabel('space', bar.space - 1)}</div></div>
    </div>
    <div class="sheet-sec-title">${tl('이 바의 취향 프로필', 'Bar Vibe Profile', 'このバーの雰囲気')}</div>
    <div class="match-bars">
      <div class="match-bar-item"><span class="match-bar-label">${t('sliderMood')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.mood * 20}%"></div></div><span class="match-bar-text">${tLabel('mood', bar.mood - 1)}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">${t('sliderPrice')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.price * 20}%"></div></div><span class="match-bar-text">${tLabel('price', bar.price - 1)}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">${t('sliderSpace')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.space * 20}%"></div></div><span class="match-bar-text">${tLabel('space', bar.space - 1)}</span></div>
      <div class="match-bar-item"><span class="match-bar-label">${tl('위스키', 'Whisky', 'ウイスキー')}</span><div class="match-bar-track"><div class="match-bar-fill" style="width:${bar.taste * 20}%"></div></div><span class="match-bar-text">${tLabel('taste', bar.taste - 1)}</span></div>
    </div>
    <div class="sheet-sec-title">${tl('대표 보유 위스키', 'Featured Whiskies', '主な取扱ウイスキー')}</div>
    <div class="bar-whiskeys" style="margin-bottom:20px;">
      ${bar.whiskeys.map(w => '<span class="whiskey-tag">' + w + '</span>').join('')}
    </div>
    <div class="bar-reviews-section" id="barReviewsSection" data-bar-id="${bar.id}">
      <div class="review-sec-header">
        <div class="sheet-sec-title" style="margin-bottom:0;">${tl('리뷰 작성하기', 'Reviews', 'レビュー')}</div>
        <span class="review-avg-pill muted">${tl('불러오는 중...', 'Loading…', '読み込み中…')}</span>
      </div>
    </div>
    <a class="sheet-naver-cta" href="${naverUrl}" target="_blank" rel="noopener noreferrer">
      <span>${tl('네이버 지도에서 위치 · 리뷰 보기', 'Open in Naver Map', 'Naver地図で場所・口コミを見る')}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M7 17L17 7"/><polyline points="8 7 17 7 17 16"/></svg>
    </a>
  `;
  const barLikeBtn = document.getElementById('sheetBarLikeBtn');
  if (barLikeBtn) {
    barLikeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(bar.id);
      const nowLiked = state.likes.has(bar.id);
      barLikeBtn.classList.toggle('liked', nowLiked);
      barLikeBtn.setAttribute('aria-label', nowLiked ? tl('찜 해제', 'Remove', '保存解除') : tl('바 찜하기', 'Save bar', '保存する'));
      showToast(nowLiked
        ? tl(bar.name + '을(를) 찜한 바에 저장했어요', 'Saved ' + bar.name + ' to your bars', bar.name + 'を保存しました')
        : tl(bar.name + ' 찜 해제됨', 'Removed ' + bar.name, bar.name + 'の保存を解除しました'));
    });
  }
  const sheetNaverBtn = sheetBody.querySelector('.sheet-naver-cta');
  if (sheetNaverBtn) bindTouchHighlight(sheetNaverBtn);
  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');

  fetchReviewsForBar(bar.id).then(({ reviews, missingTable }) => {
    renderBarReviewsSection(bar.id, reviews, missingTable);
  });
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
    if (target && target.closest && target.closest('input, textarea, select, .review-star-btn')) return false;
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
