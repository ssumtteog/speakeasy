// ===== VIEW 5: ULTRA-CLEAN TEXT-FREE 2D MAP + CURATED AREA ANCHORS ONLY =====
const mapState = {
  initialized: false,
  leafletMap: null,
  tileLayer: null,
  areaLabelsLayer: null,
  userLocMarker: null,
  markersLayer: null,
  city: '전체',
  query: '',
  exploreAll: false, // Default OFF: ONLY saved(찜) bars show as clean location pings!
  selectedBarId: null,
  hasCenteredOnUser: false
};

// Pure geometry 2D tiles (ZERO road names ㅇㅇ로, ZERO dong names ㅇㅇ동, ZERO POIs/stations/icons):
// - s.e:l|p.v:off  -> ALL map text & icons OFF (pure clean land + river + roads + subway lines image!)
// - s.t:2|p.v:off  -> ALL POIs OFF
// - s.t:51|p.v:off -> ALL tiny residential alleys OFF
function getCleanColorfulTileUrl() {
  return 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko&apistyle=s.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff%2Cs.t%3A51%7Cp.v%3Aoff';
}

// Curated minimal area anchors ONLY (no ㅇㅇ동 / ㅇㅇ로 — clean landmark neighborhood names only)
const MAP_CITY_LABELS = [
  { name: '서울', en: 'Seoul', ja: 'ソウル', lat: 37.5665, lng: 126.9780 },
  { name: '인천', en: 'Incheon', ja: '仁川', lat: 37.4563, lng: 126.7052 },
  { name: '수원', en: 'Suwon', ja: '水原', lat: 37.2636, lng: 127.0286 },
  { name: '강릉', en: 'Gangneung', ja: '江陵', lat: 37.7519, lng: 128.8761 },
  { name: '대전', en: 'Daejeon', ja: '大田', lat: 36.3504, lng: 127.3845 },
  { name: '전주', en: 'Jeonju', ja: '全州', lat: 35.8242, lng: 127.1480 },
  { name: '광주', en: 'Gwangju', ja: '光州', lat: 35.1595, lng: 126.8526 },
  { name: '대구', en: 'Daegu', ja: '大邱', lat: 35.8714, lng: 128.6014 },
  { name: '부산', en: 'Busan', ja: '釜山', lat: 35.1796, lng: 129.0756 },
  { name: '제주', en: 'Jeju', ja: '済州', lat: 33.4996, lng: 126.5312 }
];

const MAP_DISTRICT_LABELS = [
  { name: '이태원', en: 'Itaewon', ja: '梨泰院', lat: 37.5345, lng: 126.9946 },
  { name: '용산', en: 'Yongsan', ja: '龍山', lat: 37.5299, lng: 126.9648 },
  { name: '한남', en: 'Hannam', ja: '漢南', lat: 37.5348, lng: 127.0095 },
  { name: '강남', en: 'Gangnam', ja: '江南', lat: 37.4980, lng: 127.0276 },
  { name: '청담', en: 'Cheongdam', ja: '清潭', lat: 37.5245, lng: 127.0474 },
  { name: '압구정', en: 'Apgujeong', ja: '狎鴎亭', lat: 37.5271, lng: 127.0285 },
  { name: '신사', en: 'Sinsa', ja: '新沙', lat: 37.5165, lng: 127.0205 },
  { name: '성수', en: 'Seongsu', ja: '聖水', lat: 37.5446, lng: 127.0560 },
  { name: '잠실', en: 'Jamsil', ja: '蚕室', lat: 37.5133, lng: 127.1001 },
  { name: '여의도', en: 'Yeouido', ja: '汝矣島', lat: 37.5219, lng: 126.9245 },
  { name: '목동', en: 'Mokdong', ja: '木洞', lat: 37.5262, lng: 126.8752 },
  { name: '홍대', en: 'Hongdae', ja: '弘大', lat: 37.5563, lng: 126.9236 },
  { name: '연남', en: 'Yeonnam', ja: '延南', lat: 37.5656, lng: 126.9255 },
  { name: '합정', en: 'Hapjeong', ja: '合井', lat: 37.5495, lng: 126.9138 },
  { name: '서촌', en: 'Seochon', ja: '西村', lat: 37.5795, lng: 126.9708 },
  { name: '을지로', en: 'Euljiro', ja: '乙支路', lat: 37.5663, lng: 126.9910 },
  { name: '종로', en: 'Jongno', ja: '鐘路', lat: 37.5704, lng: 126.9831 },
  { name: '광화문', en: 'Gwanghwamun', ja: '光化門', lat: 37.5759, lng: 126.9768 },
  { name: '서래마을', en: 'Seorae', ja: 'ソレマウル', lat: 37.4955, lng: 126.9975 },
  { name: '삼성', en: 'Samseong', ja: '三成', lat: 37.5089, lng: 127.0631 },
  { name: '건대', en: 'Konkuk', ja: '建大', lat: 37.5404, lng: 127.0692 },
  { name: '혜화', en: 'Hyehwa', ja: '恵化', lat: 37.5821, lng: 127.0019 },
  { name: '마포', en: 'Mapo', ja: '麻浦', lat: 37.5396, lng: 126.9459 },
  { name: '신촌', en: 'Sinchon', ja: '新村', lat: 37.5559, lng: 126.9369 },
  { name: '방배', en: 'Bangbae', ja: '方背', lat: 37.4814, lng: 126.9976 },
  { name: '노원', en: 'Nowon', ja: '芦原', lat: 37.6542, lng: 127.0568 },
  { name: '판교', en: 'Pangyo', ja: '板橋', lat: 37.3948, lng: 127.1112 },
  { name: '분당', en: 'Bundang', ja: '盆唐', lat: 37.3595, lng: 127.1086 },
  { name: '안양', en: 'Anyang', ja: '安養', lat: 37.3943, lng: 126.9568 },
  { name: '일산', en: 'Ilsan', ja: '一山', lat: 37.6584, lng: 126.7745 },
  { name: '송도', en: 'Songdo', ja: '松島', lat: 37.3860, lng: 126.6435 },
  { name: '부평', en: 'Bupyeong', ja: '富平', lat: 37.4900, lng: 126.7235 },
  { name: '서면', en: 'Seomyeon', ja: '西面', lat: 35.1578, lng: 129.0598 },
  { name: '해운대', en: 'Haeundae', ja: '海雲台', lat: 35.1631, lng: 129.1635 },
  { name: '광안리', en: 'Gwangalli', ja: '広安里', lat: 35.1532, lng: 129.1189 },
  { name: '남포', en: 'Nampo', ja: '南浦', lat: 35.0979, lng: 129.0355 },
  { name: '동성로', en: 'Dongseongno', ja: '東城路', lat: 35.8693, lng: 128.5956 },
  { name: '둔산', en: 'Dunsan', ja: '屯山', lat: 36.3512, lng: 127.3782 },
  { name: '상무', en: 'Sangmu', ja: '尚武', lat: 35.1528, lng: 126.8515 },
  { name: '서귀포', en: 'Seogwipo', ja: '西帰浦', lat: 33.2541, lng: 126.5601 }
];

function refreshAreaLabels() {
  if (!mapState.leafletMap || !mapState.areaLabelsLayer || typeof L === 'undefined') return;
  mapState.areaLabelsLayer.clearLayers();
  const z = mapState.leafletMap.getZoom();
  const list = z <= 10 ? MAP_CITY_LABELS : MAP_DISTRICT_LABELS;
  const cls = z <= 10 ? 'is-city' : 'is-district';

  list.forEach(item => {
    const labelText = state.lang === 'en' ? item.en : (state.lang === 'ja' ? item.ja : item.name);
    L.marker([item.lat, item.lng], {
      interactive: false,
      keyboard: false,
      zIndexOffset: -50,
      icon: L.divIcon({
        className: 'se-area-wrap',
        iconSize: [0, 0],
        html: `<div class="se-area-label ${cls}">${labelText}</div>`
      })
    }).addTo(mapState.areaLabelsLayer);
  });
}

function updateMapTileTheme() {
  // Smooth Light/Dark color mode handled via .leaflet-tile-pane CSS filter (preserves blue river & colored subway lines!)
}

function updateMapUserLocation(lat, lng, autoCenter) {
  if (!mapState.leafletMap || typeof L === 'undefined') return;
  if (mapState.userLocMarker) {
    mapState.userLocMarker.setLatLng([lat, lng]);
  } else {
    mapState.userLocMarker = L.marker([lat, lng], {
      interactive: false,
      zIndexOffset: 250,
      icon: L.divIcon({
        className: 'se-marker-wrap',
        iconSize: [0, 0],
        html: `<div class="se-user-loc"><span class="se-user-loc-pulse"></span><div class="se-user-loc-dot"></div></div>`
      })
    }).addTo(mapState.leafletMap);
  }
  if (autoCenter && !mapState.hasCenteredOnUser) {
    mapState.hasCenteredOnUser = true;
    mapState.leafletMap.flyTo([lat, lng], 14, { duration: 0.7 });
  } else if (autoCenter === 'force') {
    mapState.leafletMap.flyTo([lat, lng], 14, { duration: 0.6 });
  }
}

function getMapMatchingBars() {
  const q = mapState.query.trim().toLowerCase().replace(/\s+/g, '');
  return BARS.filter(bar => {
    if (mapState.city !== '전체' && bar.city !== mapState.city) return false;
    if (q) {
      const hay = [bar.name, bar.city, bar.region, bar.subloc, bar.station, ...bar.whiskeys]
        .join(' ')
        .toLowerCase()
        .replace(/\s+/g, '');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function getMapVisiblePins() {
  const q = mapState.query.trim();
  const candidates = getMapMatchingBars();
  if (q || mapState.exploreAll) return candidates;
  return candidates.filter(b => state.likes.has(b.id));
}

function createPinIcon(bar, isSaved, isSelected, isSearchMode) {
  const cls = [
    'se-pin',
    isSaved ? 'is-saved' : 'is-explore',
    isSelected ? 'is-selected' : '',
    isSearchMode ? 'is-search' : ''
  ].filter(Boolean).join(' ');

  const pinHtml = isSaved
    ? `
      <div class="se-ping-anchor">
        <span class="se-ping-ripple"></span>
        <svg class="se-ping-drop" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 1.5C7.1 1.5 1.5 7.1 1.5 14C1.5 22.8 14 32.5 14 32.5C14 32.5 26.5 22.8 26.5 14C26.5 7.1 20.9 1.5 14 1.5Z" fill="#C9A86C" stroke="#FFFFFF" stroke-width="2.2"/>
          <circle cx="14" cy="13.5" r="4.8" fill="#1E3A2F"/>
          <circle cx="14" cy="13.5" r="2" fill="#F7F4F0"/>
        </svg>
      </div>
    `
    : `<div class="se-pin-dot"></div>`;

  return L.divIcon({
    className: 'se-marker-wrap',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div class="${cls}">
        ${pinHtml}
        <div class="se-pin-label">${bar.name}</div>
      </div>
    `
  });
}

// Prevent overlapping pins from hiding behind each other at lower zoom levels
function getDeconflictedPositions(bars) {
  if (!mapState.leafletMap || typeof L === 'undefined') {
    return bars.map(b => ({ bar: b, lat: b.lat, lng: b.lng }));
  }
  const map = mapState.leafletMap;
  const z = map.getZoom();
  const minDistPx = z >= 15 ? 10 : 24;
  const placed = [];

  return bars.map(bar => {
    const pt = map.latLngToLayerPoint([bar.lat, bar.lng]);
    let px = pt.x;
    let py = pt.y;
    let tries = 0;
    while (tries < 12 && placed.some(p => Math.hypot(p.x - px, p.y - py) < minDistPx)) {
      tries++;
      const angle = (tries * 60) * (Math.PI / 180);
      const radius = minDistPx * (1 + Math.floor((tries - 1) / 6) * 0.65);
      px = pt.x + Math.cos(angle) * radius;
      py = pt.y + Math.sin(angle) * radius;
    }
    placed.push({ x: px, y: py });
    if (tries === 0) return { bar, lat: bar.lat, lng: bar.lng };
    const ll = map.layerPointToLatLng([px, py]);
    return { bar, lat: ll.lat, lng: ll.lng };
  });
}

function updateZoomLabelState() {
  const el = document.getElementById('leafletMap');
  if (!el || !mapState.leafletMap) return;
  const z = mapState.leafletMap.getZoom();
  el.classList.toggle('map-zoomed-in', z >= 13);
}

function refreshMapMarkers() {
  const savedCountEl = document.getElementById('mapSavedCount');
  const listPill = document.getElementById('mapListPill');
  const listPillText = document.getElementById('mapListPillText');
  const exploreBtn = document.getElementById('mapExploreAllBtn');
  const savedBtn = document.getElementById('mapFocusSavedBtn');

  if (savedCountEl) savedCountEl.textContent = String(state.likes.size);
  if (exploreBtn) exploreBtn.classList.toggle('explore-on', mapState.exploreAll);
  if (savedBtn) savedBtn.classList.toggle('active', !mapState.exploreAll && !mapState.query.trim());

  const q = mapState.query.trim();
  const visibleBars = getMapVisiblePins();

  if (listPillText) {
    if (q) {
      listPillText.textContent = tl(`"${q}" 검색 결과 ${visibleBars.length}곳 · 목록`, `"${q}" · ${visibleBars.length} bars · List`, `「${q}」${visibleBars.length}軒・一覧`);
    } else if (mapState.exploreAll) {
      listPillText.textContent = tl(
        `${mapState.city === '전체' ? '전국 위스키 바 ' : mapState.city + ' 위스키 바 '}${visibleBars.length}곳 · 목록`,
        `${mapState.city === '전체' ? 'All Bars' : tRegion(mapState.city)} · ${visibleBars.length} · List`,
        `${mapState.city === '전체' ? '全国のバー' : tRegion(mapState.city) + 'のバー'} ${visibleBars.length}軒・一覧`
      );
    } else {
      listPillText.textContent = tl(
        `${mapState.city === '전체' ? '저장한 바 ' : mapState.city + ' 저장한 바 '}${visibleBars.length}곳 · 목록`,
        `${mapState.city === '전체' ? 'Saved Bars' : tRegion(mapState.city) + ' Saved'} · ${visibleBars.length} · List`,
        `${mapState.city === '전체' ? '保存したバー' : tRegion(mapState.city) + 'の保存'} ${visibleBars.length}軒・一覧`
      );
    }
  }

  if (mapState.leafletMap && mapState.markersLayer && typeof L !== 'undefined') {
    mapState.markersLayer.clearLayers();
    const items = getDeconflictedPositions(visibleBars);
    items.forEach(({ bar, lat, lng }) => {
      const isSaved = state.likes.has(bar.id);
      const isSelected = mapState.selectedBarId === bar.id;
      const marker = L.marker([lat, lng], {
        icon: createPinIcon(bar, isSaved, isSelected, Boolean(q)),
        zIndexOffset: isSelected ? 1000 : (isSaved ? 500 : 100)
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectMapBar(bar.id, true);
      });
      marker.addTo(mapState.markersLayer);
    });
    updateZoomLabelState();
  }

  if (mapState.selectedBarId) {
    const stillHere = visibleBars.some(b => b.id === mapState.selectedBarId);
    if (stillHere) {
      renderMapPreviewCard(mapState.selectedBarId);
      if (listPill) listPill.classList.add('hidden');
    } else {
      closeMapPreviewCard();
    }
  } else if (listPill) {
    listPill.classList.remove('hidden');
  }
}

function renderMapPreviewCard(barId) {
  const card = document.getElementById('mapPreviewCard');
  const listPill = document.getElementById('mapListPill');
  const bar = BARS.find(b => b.id === barId);
  if (!card || !bar) return;

  const isLiked = state.likes.has(bar.id);
  const match = calcMatch(bar);
  const distText = formatDistanceText(getBarDistanceKm(bar));
  const naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(bar.naverQuery);

  card.innerHTML = `
    <div class="map-card-head">
      <div class="map-card-title-wrap">
        <div class="map-card-title-row">
          <span class="map-card-name">${bar.name}</span>
          <span class="map-card-match">${tl('취향 ' + match + '%', match + '% Match', 'マッチ ' + match + '%')}</span>
        </div>
        <div class="map-card-sub">
          ${distText ? `<strong style="color:var(--text);">${distText}</strong><span>·</span>` : ''}
          <span>${tRegion(bar.city)} ${bar.region} (${bar.station})</span>
          <span>·</span>
          <span>${bar.priceText}</span>
        </div>
      </div>
      <div class="map-card-head-actions">
        <button class="map-card-icon-btn ${isLiked ? 'liked' : ''}" id="mapCardLikeBtn" aria-label="${tl('바 저장', 'Save bar', '保存')}">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="map-card-icon-btn" id="mapCardCloseBtn" aria-label="${tl('닫기', 'Close', '閉じる')}">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="map-card-meta">${bar.desc}</div>
    <div class="map-card-tags">
      ${bar.whiskeys.slice(0, 3).map(w => `<span class="whiskey-tag">${w}</span>`).join('')}
    </div>
    <div class="map-card-actions">
      <button class="btn-detail" id="mapCardDetailBtn">${tl('상세정보', 'Details', '詳細')}</button>
      <a class="btn-naver" id="mapCardNaverBtn" href="${naverUrl}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${tl('네이버 지도 길찾기', 'Directions', 'Naver地図でルート')}
      </a>
    </div>
  `;

  card.classList.add('visible');
  if (listPill) listPill.classList.add('hidden');

  document.getElementById('mapCardLikeBtn')?.addEventListener('click', () => {
    toggleLike(bar.id);
    showToast(state.likes.has(bar.id) ? bar.name + ' 저장됨 (지도에 핑 표시)' : bar.name + ' 저장 해제됨');
  });
  document.getElementById('mapCardCloseBtn')?.addEventListener('click', closeMapPreviewCard);
  document.getElementById('mapCardDetailBtn')?.addEventListener('click', () => openDetailSheet(bar.id));
  const naverBtn = document.getElementById('mapCardNaverBtn');
  if (naverBtn) bindTouchHighlight(naverBtn);
}

function selectMapBar(barId, shouldFly) {
  const bar = BARS.find(b => b.id === barId);
  if (!bar) return;
  mapState.selectedBarId = barId;
  refreshMapMarkers();
  if (shouldFly && mapState.leafletMap) {
    const nextZoom = Math.max(mapState.leafletMap.getZoom(), 14);
    mapState.leafletMap.flyTo([bar.lat, bar.lng], nextZoom, { duration: 0.55 });
  }
}

function closeMapPreviewCard() {
  mapState.selectedBarId = null;
  const card = document.getElementById('mapPreviewCard');
  const listPill = document.getElementById('mapListPill');
  if (card) card.classList.remove('visible');
  if (listPill) listPill.classList.remove('hidden');
  refreshMapMarkers();
}

function openMapListSheet() {
  const q = mapState.query.trim();
  const visible = getMapVisiblePins().slice();
  if (state.userLocation) {
    visible.sort((a, b) => (getBarDistanceKm(a) || 9999) - (getBarDistanceKm(b) || 9999));
  }
  const cityLabel = tRegion(mapState.city);
  const title = q
    ? tl(`"${q}" 검색 결과`, `Results for "${q}"`, `「${q}」の検索結果`)
    : (mapState.exploreAll
      ? tl(`${cityLabel} 위스키 바`, `Whisky Bars · ${cityLabel}`, `${cityLabel}のバー`)
      : tl(`${cityLabel} 저장한 바`, `Saved Bars · ${cityLabel}`, `${cityLabel}の保存したバー`));

  if (!visible.length) {
    sheetBody.innerHTML = `
      <div class="sheet-title-row">
        <div class="sheet-bar-name">${title}</div>
        <span class="sheet-match">${tl('0곳', '0', '0軒')}</span>
      </div>
      <div class="sheet-desc" style="margin-top:14px;">
        ${!mapState.exploreAll && !q
          ? tl('아직 저장한 바가 없어요. 마음에 드는 바의 하트(♡)를 누르면 지도에 위치 핑으로 깔끔하게 표시돼요!', 'No saved bars yet. Tap the heart on any bar to pin it right onto your map.', 'まだ保存したバーがありません。お気に入りのバーにハートを付けると地図にピンで表示されます。')
          : tl('현재 조건에 맞는 바를 찾지 못했어요.', 'No bars found in this area.', '条件に合うバーが見つかりませんでした。')}
      </div>
    `;
  } else {
    sheetBody.innerHTML = `
      <div class="sheet-title-row" style="margin-bottom:14px;">
        <div class="sheet-bar-name">${title}</div>
        <span class="sheet-match">${tl(visible.length + '곳', String(visible.length), visible.length + '軒')}</span>
      </div>
      <div class="guide-brand-list">
        ${visible.map(b => {
          const isSaved = state.likes.has(b.id);
          const dist = formatDistanceText(getBarDistanceKm(b));
          return `
            <div class="guide-brand-card" data-map-list-bar="${b.id}" style="padding:13px 14px;">
              <div class="guide-brand-info">
                <div class="guide-brand-top">
                  <span class="guide-brand-name">${b.name}</span>
                  <span class="guide-brand-count">${tRegion(b.city)}</span>
                  ${dist ? `<span class="guide-brand-count">${dist}</span>` : ''}
                  ${isSaved ? '<span class="guide-brand-count" style="background:rgba(201,168,108,0.24); color:var(--whiskey-text);">' + tl('저장됨', 'Saved', '保存済') + '</span>' : ''}
                </div>
                <div class="guide-brand-sub" style="-webkit-line-clamp:1;">
                  <strong style="color:var(--text);">${b.region}</strong> · ${b.station} · ${b.priceText}
                </div>
              </div>
              <div class="guide-arrow">
                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    sheetBody.querySelectorAll('[data-map-list-bar]').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.mapListBar;
        closeDetailSheet();
        selectMapBar(id, true);
      });
    });
  }

  sheetScrim.classList.add('open');
  detailSheet.classList.add('open');
}

function fitBarsOnMap(bars) {
  if (!mapState.leafletMap || typeof L === 'undefined' || !bars.length) return;
  if (bars.length === 1) {
    mapState.leafletMap.flyTo([bars[0].lat, bars[0].lng], 14, { duration: 0.6 });
    return;
  }
  const bounds = L.latLngBounds(bars.map(b => [b.lat, b.lng]));
  mapState.leafletMap.flyToBounds(bounds, { padding: [90, 90], maxZoom: 15, duration: 0.6 });
}

function initLeafletEngine() {
  const container = document.getElementById('leafletMap');
  if (!container) return;

  if (typeof L === 'undefined') {
    container.innerHTML = `
      <div class="map-offline-fallback">
        <strong>전국 2D 컬러 지도</strong>
        오프라인 미리보기에서는 외부 지도 타일이 제한돼요.<br/>
        <strong>Expo Go</strong>나 <strong>Netlify 웹</strong>에서 열면 땅·한강·차도·지하철 라인만 깔끔하게 구분되는 컬러 지도가 표시됩니다.
      </div>
    `;
    return;
  }

  // Default zoom = 14 (comfortable neighborhood scale — NEVER shows giant "서울특별시" text!)
  const startCenter = state.userLocation
    ? [state.userLocation.lat, state.userLocation.lng]
    : [37.535, 126.995];
  const startZoom = 14;

  const map = L.map(container, {
    center: startCenter,
    zoom: startZoom,
    minZoom: 6,
    maxZoom: 17, // Full zoom freedom so closely-located saved bars always separate cleanly!
    zoomControl: false,
    attributionControl: false
  });

  mapState.tileLayer = L.tileLayer(getCleanColorfulTileUrl(), {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 18
  }).addTo(map);

  mapState.leafletMap = map;
  mapState.areaLabelsLayer = L.layerGroup().addTo(map);
  mapState.markersLayer = L.layerGroup().addTo(map);
  refreshAreaLabels();

  if (state.userLocation) {
    updateMapUserLocation(state.userLocation.lat, state.userLocation.lng, false);
    mapState.hasCenteredOnUser = true;
  }

  // Re-deconflict marker spacing smoothly whenever zoom level changes
  map.on('zoomend', () => {
    refreshAreaLabels();
    updateZoomLabelState();
    refreshMapMarkers();
  });
  map.on('click', () => {
    if (mapState.selectedBarId) closeMapPreviewCard();
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (mapState.leafletMap && container.clientWidth > 0 && container.clientHeight > 0) {
        mapState.leafletMap.invalidateSize({ animate: false });
      }
    });
    ro.observe(container);
  }
  window.addEventListener('resize', () => {
    if (mapState.leafletMap) mapState.leafletMap.invalidateSize({ animate: false });
  });
}

window.__speakeasyMapFocus = function () {
  if (!mapState.initialized) renderMapView();
  if (mapState.leafletMap) {
    setTimeout(() => {
      mapState.leafletMap.invalidateSize({ animate: false });
      refreshMapMarkers();
    }, 60);
    setTimeout(() => {
      mapState.leafletMap.invalidateSize({ animate: false });
      refreshMapMarkers();
    }, 260);
  }
  if (!state.userLocation) requestWebUserLocation(true);
  refreshMapMarkers();
};

function initMapControls() {
  const cityChips = document.querySelectorAll('#mapChipsScroll [data-mcity]');
  cityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      mapState.city = chip.dataset.mcity;
      cityChips.forEach(c => c.classList.toggle('active', c === chip));
      closeMapPreviewCard();
      const preset = MAP_CITY_VIEWS[mapState.city] || MAP_CITY_VIEWS['전체'];
      if (mapState.leafletMap) {
        mapState.leafletMap.flyTo([preset.lat, preset.lng], preset.zoom, { duration: 0.6 });
      }
      refreshMapMarkers();
    });
  });

  const mapInput = document.getElementById('mapSearchInput');
  const mapClear = document.getElementById('mapSearchClear');
  if (mapInput) {
    mapInput.addEventListener('input', () => {
      mapState.query = mapInput.value;
      if (mapClear) mapClear.classList.toggle('visible', mapInput.value.length > 0);
      refreshMapMarkers();
      const matches = getMapVisiblePins();
      if (mapState.query.trim().length >= 2 && matches.length > 0) {
        fitBarsOnMap(matches);
      }
    });
  }
  if (mapClear) {
    mapClear.addEventListener('click', () => {
      mapInput.value = '';
      mapState.query = '';
      mapClear.classList.remove('visible');
      closeMapPreviewCard();
      refreshMapMarkers();
    });
  }

  // Right floating button 1: Reset to 전국 & fit ALL Saved(찜) Bars cleanly on screen!
  document.getElementById('mapFocusSavedBtn')?.addEventListener('click', () => {
    mapState.exploreAll = false;
    mapState.query = '';
    mapState.city = '전체';
    cityChips.forEach(c => c.classList.toggle('active', c.dataset.mcity === '전체'));
    if (mapInput) mapInput.value = '';
    if (mapClear) mapClear.classList.remove('visible');
    const savedBars = BARS.filter(b => state.likes.has(b.id));
    refreshMapMarkers();
    if (!savedBars.length) {
      showToast('저장한 바가 없어요. 하트(♡)를 누르면 지도에 핑으로 찍혀요!');
    } else {
      fitBarsOnMap(savedBars);
      showToast(`저장한 바 ${savedBars.length}곳을 모두 표시했어요`);
    }
  });

  // Right floating button 2: Optional toggle to explore all 69 nationwide bars
  document.getElementById('mapExploreAllBtn')?.addEventListener('click', () => {
    mapState.exploreAll = !mapState.exploreAll;
    refreshMapMarkers();
    showToast(mapState.exploreAll ? `전국 위스키 바 ${BARS.length}곳 둘러보기 켜짐` : '저장한 바 위치 핑만 깔끔하게 표시해요');
  });

  // Right floating button 3: Move to My Current GPS Location
  document.getElementById('mapResetBtn')?.addEventListener('click', () => {
    closeMapPreviewCard();
    if (state.userLocation) {
      updateMapUserLocation(state.userLocation.lat, state.userLocation.lng, 'force');
      showToast('현재 위치로 이동했어요');
    } else {
      requestWebUserLocation('force');
      showToast('현재 위치를 확인하고 있어요...');
    }
  });

  document.getElementById('mapListPill')?.addEventListener('click', openMapListSheet);
}

function renderMapView() {
  if (!mapState.initialized) {
    mapState.initialized = true;
    initLeafletEngine();
    initMapControls();
    requestWebUserLocation(true);
  }
  refreshMapMarkers();
  if (mapState.leafletMap) {
    setTimeout(() => {
      mapState.leafletMap.invalidateSize({ animate: false });
      refreshMapMarkers();
    }, 120);
  }
}
