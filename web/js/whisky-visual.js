// ===== BRAND-AWARE WHISKY BOTTLE ILLUSTRATION GENERATOR (149 BOTTLES, ZERO BROKEN IMAGES) =====
function getBottlePalette(w) {
  const id = (w.id || '').toLowerCase();
  const brand = w.brand || '';
  const cat = w.category || '';

  // Iconic signature bottle appearances
  if (id.startsWith('jw-red'))        return { shape: 'square', glass: '#9E4B1E', liquid: '#B85A24', cap: '#1A1A1A', labelBg: '#B8292F', labelText: '#FFF', accent: '#E5C67E', slanted: true };
  if (id.startsWith('jw-black'))      return { shape: 'square', glass: '#8C441B', liquid: '#A65221', cap: '#1A1A1A', labelBg: '#1C1B1A', labelText: '#E5C67E', accent: '#C9A86C', slanted: true };
  if (id.startsWith('jw-doubleblack'))return { shape: 'square', glass: '#2C2A29', liquid: '#4A3628', cap: '#111111', labelBg: '#191919', labelText: '#D7D2CB', accent: '#8E8A84', slanted: true };
  if (id.startsWith('jw-green'))      return { shape: 'square', glass: '#8A481D', liquid: '#A65824', cap: '#1E3A2F', labelBg: '#1E4A36', labelText: '#F5E6C8', accent: '#C9A86C', slanted: true };
  if (id.startsWith('jw-gold'))       return { shape: 'square', glass: '#B87B28', liquid: '#D49435', cap: '#B8924A', labelBg: '#C9A04E', labelText: '#1F180D', accent: '#F7E7B7', slanted: true };
  if (id.startsWith('jw-blue'))       return { shape: 'square', glass: '#2D5973', liquid: '#7E542B', cap: '#1B384F', labelBg: '#163554', labelText: '#E5C67E', accent: '#C9A86C', slanted: true };

  if (brand === '글렌피딕')           return { shape: 'tall',   glass: '#1F4B35', liquid: '#2D6045', cap: '#162E22', labelBg: '#F6F1E6', labelText: '#1E3A2F', accent: '#C9A86C' };
  if (brand === '발베니')             return { shape: 'round',  glass: '#A45A23', liquid: '#C2712E', cap: '#3B281B', labelBg: '#F7F1E3', labelText: '#3A281A', accent: '#C9A86C' };
  if (brand === '맥캘란')             return { shape: 'tall',   glass: '#8F3E18', liquid: '#A84B1D', cap: '#2A1D15', labelBg: '#F7F3EA', labelText: '#231A14', accent: '#B88946' };
  if (brand === '글렌모렌지')         return { shape: 'slim',   glass: '#B86F28', liquid: '#D18636', cap: '#2E231B', labelBg: '#FBF6EC', labelText: '#2B2016', accent: '#D47B2A' };
  if (brand === '글렌리벳')           return { shape: 'round',  glass: '#2B5B47', liquid: '#407059', cap: '#1E3A2F', labelBg: '#F7F3E9', labelText: '#1E3A2F', accent: '#C9A86C' };
  if (brand === '메이커스마크')       return { shape: 'square', glass: '#9E471C', liquid: '#B55522', cap: '#B51F24', labelBg: '#F7F1E2', labelText: '#2A1B12', accent: '#B51F24', wax: true };
  if (brand === '아드벡')             return { shape: 'tall',   glass: '#1C3527', liquid: '#284534', cap: '#111915', labelBg: '#161B18', labelText: '#D9C28E', accent: '#C9A86C' };
  if (brand === '라프로익')           return { shape: 'tall',   glass: '#1B3D2A', liquid: '#264F38', cap: '#14261C', labelBg: '#F7F5EF', labelText: '#17291E', accent: '#2C5240' };
  if (brand === '라가불린')           return { shape: 'tall',   glass: '#2B3E2B', liquid: '#3E523A', cap: '#1A241A', labelBg: '#F2EBD9', labelText: '#2B241A', accent: '#9E7D42' };
  if (brand === '탈리스커')           return { shape: 'round',  glass: '#9C5522', liquid: '#B8692C', cap: '#1F2C38', labelBg: '#1C3347', labelText: '#F5EFE2', accent: '#C9A86C' };
  if (brand === '브루클라디' && id.includes('laddie'))
                                      return { shape: 'tall',   glass: '#2BA4A8', liquid: '#3BB8BC', cap: '#1B6F73', labelBg: '#1E7E82', labelText: '#FFFFFF', accent: '#B8F0F2' };
  if (brand === '브루클라디')         return { shape: 'tall',   glass: '#1F2A26', liquid: '#2C3A35', cap: '#111614', labelBg: '#181E1C', labelText: '#F2EFE9', accent: '#C9A86C' };
  if (brand === '몽키숄더')           return { shape: 'stout',  glass: '#B86E24', liquid: '#D18230', cap: '#3D2719', labelBg: '#F7EFE0', labelText: '#2E1E12', accent: '#C98A3A' };
  if (brand === '제임슨')             return { shape: 'tall',   glass: '#235334', liquid: '#326A45', cap: '#8C2323', labelBg: '#F5EEDB', labelText: '#1D422A', accent: '#A82E2E' };
  if (brand === '산토리' && id.includes('hibiki'))
                                      return { shape: 'stout',  glass: '#C98B38', liquid: '#DDA048', cap: '#2E231C', labelBg: '#F9F6EE', labelText: '#2C231C', accent: '#C9A86C' };
  if (brand === '로얄 살루트')        return { shape: 'stout',  glass: '#1D3C6A', liquid: '#244A82', cap: '#C9A86C', labelBg: '#162F54', labelText: '#E8CC8C', accent: '#C9A86C' };
  if (brand === '잭 다니엘스')        return { shape: 'square', glass: '#8C3F19', liquid: '#A64D20', cap: '#141414', labelBg: '#171717', labelText: '#F7F4F0', accent: '#C9A86C' };
  if (brand === '놉크릭')             return { shape: 'square', glass: '#8F3C16', liquid: '#AA4A1D', cap: '#261810', labelBg: '#F4ECDD', labelText: '#2C1B10', accent: '#8E4A24' };
  if (brand === '와일드터키')         return { shape: 'round',  glass: '#9B421A', liquid: '#B55122', cap: '#361E14', labelBg: '#F6EFE2', labelText: '#3A1E12', accent: '#B85424' };
  if (brand === '우드포드 리저브')    return { shape: 'stout',  glass: '#9A431B', liquid: '#B45224', cap: '#2A1D14', labelBg: '#F6F0E4', labelText: '#2A1D14', accent: '#B88946' };
  if (brand === '발렌타인')           return { shape: 'square', glass: '#263829', liquid: '#354D39', cap: '#1A261C', labelBg: '#F6EFE2', labelText: '#1E3A2F', accent: '#B88946' };
  if (brand === '시바스 리갈')        return { shape: 'round',  glass: '#A35A22', liquid: '#BD6E2D', cap: '#7A2024', labelBg: '#F7F1E3', labelText: '#2D1E14', accent: '#C9A86C' };
  if (brand === '카발란')             return { shape: 'slim',   glass: '#8F3A18', liquid: '#AB4A20', cap: '#241B16', labelBg: '#1F1B18', labelText: '#E8CC8C', accent: '#C9A86C' };

  // Category-based refined fallbacks
  if (cat === '피트')     return { shape: 'tall',   glass: '#1F3A2C', liquid: '#2D4F3D', cap: '#122119', labelBg: '#F3EFE6', labelText: '#1E3A2F', accent: '#C9A86C' };
  if (cat === '버번')     return { shape: 'square', glass: '#9E471C', liquid: '#B85725', cap: '#2E1C12', labelBg: '#F7F1E4', labelText: '#2E1C12', accent: '#C98A42' };
  if (cat === '블렌디드') return { shape: 'round',  glass: '#B06A26', liquid: '#C97E32', cap: '#1E3A2F', labelBg: '#F7F4EC', labelText: '#1E3A2F', accent: '#C9A86C' };
  return { shape: 'round', glass: '#B57029', liquid: '#CE8436', cap: '#2C5240', labelBg: '#F8F4EC', labelText: '#1E3A2F', accent: '#C9A86C' };
}

function extractAgeBadge(name) {
  const m = String(name || '').match(/(\d+)\s*년/);
  if (m) return m[1] + 'Y';
  const m2 = String(name || '').match(/\b(101|105|46|47|1920)\b/);
  if (m2) return m2[1];
  return '';
}

function renderWhiskyBottleSVG(w, sizeClass) {
  const p = getBottlePalette(w);
  const age = extractAgeBadge(w.name);
  const shortBrand = (w.brand || w.name).slice(0, 4);

  // Choose bottle silhouette path (viewBox 0 0 64 112)
  let bodyPath = 'M25 22 L25 34 C17 38 14 45 14 54 L14 100 C14 104 17 106 21 106 L43 106 C47 106 50 104 50 100 L50 54 C50 45 47 38 39 34 L39 22 Z';
  let liquidPath = 'M16 56 L48 56 L48 99 C48 102 46 104 43 104 L21 104 C18 104 16 102 16 99 Z';

  if (p.shape === 'square') {
    bodyPath = 'M25 20 L25 32 L15 38 L15 102 C15 104.5 17 106 19.5 106 L44.5 106 C47 106 49 104.5 49 102 L49 38 L39 32 L39 20 Z';
    liquidPath = 'M17 48 L47 48 L47 101 C47 103 45.5 104 44 104 L20 104 C18.5 104 17 103 17 101 Z';
  } else if (p.shape === 'stout') {
    bodyPath = 'M25 24 L25 36 C15 41 11 49 11 60 L11 98 C11 103 15 106 20 106 L44 106 C49 106 53 103 53 98 L53 60 C53 49 49 41 39 36 L39 24 Z';
    liquidPath = 'M13 60 L51 60 L51 97 C51 101 48 104 43 104 L21 104 C16 104 13 101 13 97 Z';
  } else if (p.shape === 'slim') {
    bodyPath = 'M26 16 L26 36 C20 40 17 46 17 55 L17 101 C17 104 19 106 22 106 L42 106 C45 106 47 104 47 101 L47 55 C47 46 44 40 38 36 L38 16 Z';
    liquidPath = 'M19 56 L45 56 L45 100 C45 102.5 43.5 104 41.5 104 L22.5 104 C20.5 104 19 102.5 19 100 Z';
  } else if (p.shape === 'tall') {
    bodyPath = 'M26 18 L26 33 C19 36 16 42 16 50 L16 101 C16 104 18.5 106 21.5 106 L42.5 106 C45.5 106 48 104 48 101 L48 50 C48 42 45 36 38 33 L38 18 Z';
    liquidPath = 'M18 52 L46 52 L46 100 C46 102.5 44 104 42 104 L22 104 C20 104 18 102.5 18 100 Z';
  }

  const waxDrip = p.wax
    ? `<path d="M24 10 L40 10 L40 27 C38 29 37 33 35 31 C33 29 32 35 30 33 C28 31 27 28 24 27 Z" fill="${p.cap}"/>`
    : `<rect x="24.5" y="10" width="15" height="11" rx="2.5" fill="${p.cap}"/>
       <rect x="24.5" y="18" width="15" height="2.2" fill="${p.accent}" opacity="0.85"/>`;

  const labelEl = p.slanted
    ? `<g transform="rotate(-14 32 72)">
         <rect x="17" y="59" width="30" height="24" rx="2" fill="${p.labelBg}" stroke="${p.accent}" stroke-width="0.9"/>
         <line x1="21" y1="65" x2="43" y2="65" stroke="${p.accent}" stroke-width="0.8" opacity="0.8"/>
         <text x="32" y="75" text-anchor="middle" font-size="6.8" font-weight="700" fill="${p.labelText}" font-family="Pretendard, sans-serif">${age || shortBrand}</text>
         <line x1="23" y1="79" x2="41" y2="79" stroke="${p.accent}" stroke-width="0.7" opacity="0.65"/>
       </g>`
    : `<rect x="18" y="56" width="28" height="30" rx="2.5" fill="${p.labelBg}" stroke="${p.accent}" stroke-width="0.9"/>
       <line x1="22" y1="62" x2="42" y2="62" stroke="${p.accent}" stroke-width="0.8" opacity="0.85"/>
       <text x="32" y="72.5" text-anchor="middle" font-size="6.4" font-weight="700" fill="${p.labelText}" font-family="Pretendard, sans-serif">${shortBrand}</text>
       ${age ? `<text x="32" y="81.5" text-anchor="middle" font-size="7.2" font-weight="800" fill="${p.accent}" font-family="Pretendard, sans-serif">${age}</text>` : `<line x1="24" y1="79" x2="40" y2="79" stroke="${p.accent}" stroke-width="0.8" opacity="0.7"/>`}`;

  return `
    <div class="whisky-bottle-thumb ${sizeClass || ''}" aria-hidden="true">
      <svg viewBox="0 0 64 112" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="107.5" rx="18" ry="2.6" fill="rgba(0,0,0,0.12)"/>
        <path d="${bodyPath}" fill="${p.glass}"/>
        <path d="${liquidPath}" fill="${p.liquid}" opacity="0.85"/>
        <path d="M20 46 L20 98" stroke="rgba(255,255,255,0.28)" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M44 50 L44 96" stroke="rgba(0,0,0,0.14)" stroke-width="1.6" stroke-linecap="round"/>
        ${waxDrip}
        ${labelEl}
      </svg>
    </div>
  `;
}

// ===== 4 MAIN CATEGORY METAPHOR VECTOR ILLUSTRATIONS (UNIFIED FLAT STYLE) =====
function renderGuideCategorySVG(catId, variant) {
  const isBanner = variant === 'banner';
  const cls = isBanner ? 'guide-cat-svg guide-cat-svg-banner' : 'guide-cat-svg guide-cat-svg-card';

  // 1. BLENDED: 3 distinct drops/streams flowing harmoniously into 1 glass
  if (catId === '블렌디드') {
    return `
      <svg class="${cls}" viewBox="0 0 180 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="96" cy="64" r="52" fill="rgba(201,168,108,0.09)"/>
        <!-- Three distinct origin droplets / sources -->
        <path d="M52 20 C52 20 44 30 44 35 C44 39.4 47.6 43 52 43 C56.4 43 60 39.4 60 35 C60 30 52 20 52 20 Z" fill="#F7F4F0" opacity="0.92"/>
        <path d="M96 12 C96 12 88 22 88 27 C88 31.4 91.6 35 96 35 C100.4 35 104 31.4 104 27 C104 22 96 12 96 12 Z" fill="#C9A86C"/>
        <path d="M140 20 C140 20 132 30 132 35 C132 39.4 135.6 43 140 43 C144.4 43 148 39.4 148 35 C148 30 140 20 140 20 Z" fill="#E3C790" opacity="0.9"/>
        <!-- Flowing blending curves merging into one stream -->
        <path d="M52 46 C52 60 80 58 88 74" stroke="#F7F4F0" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 0" opacity="0.8"/>
        <path d="M96 38 L96 74" stroke="#C9A86C" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M140 46 C140 60 112 58 104 74" stroke="#E3C790" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
        <!-- Unified tumbler glass -->
        <path d="M72 74 L120 74 L115 110 C114.6 113 112 115 109 115 L83 115 C80 115 77.4 113 77 110 Z" fill="rgba(247,244,240,0.14)" stroke="#F7F4F0" stroke-width="2"/>
        <!-- Blended golden liquid -->
        <path d="M76 88 C84 85 92 91 96 88 C102 85 110 90 116 88 L113.5 108.5 C113.2 110.5 111.5 112 109.5 112 L82.5 112 C80.5 112 78.8 110.5 78.5 108.5 Z" fill="#C9A86C"/>
        <!-- Sparkling harmony bubbles -->
        <circle cx="88" cy="98" r="2.2" fill="#F7F4F0" opacity="0.85"/>
        <circle cx="103" cy="95" r="1.8" fill="#F7F4F0" opacity="0.75"/>
        <circle cx="96" cy="105" r="1.5" fill="#F7F4F0" opacity="0.7"/>
      </svg>
    `;
  }

  // 2. SINGLE MALT: One iconic Copper Pot Still + Golden Barley stalks
  if (catId === '싱글몰트') {
    return `
      <svg class="${cls}" viewBox="0 0 180 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="96" cy="64" r="52" fill="rgba(201,168,108,0.09)"/>
        <!-- Left & Right Golden Barley Stalks (100% Malted Barley) -->
        <path d="M44 108 C42 86 48 64 58 46" stroke="#F7F4F0" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
        <ellipse cx="47" cy="66" rx="4.5" ry="2.4" transform="rotate(-35 47 66)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="55" cy="70" rx="4.5" ry="2.4" transform="rotate(28 55 70)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="50" cy="56" rx="4.5" ry="2.4" transform="rotate(-35 50 56)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="58" cy="60" rx="4.5" ry="2.4" transform="rotate(28 58 60)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="55" cy="46" rx="4.2" ry="2.2" transform="rotate(-25 55 46)" fill="#C9A86C"/>

        <path d="M148 108 C150 86 144 64 134 46" stroke="#F7F4F0" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
        <ellipse cx="145" cy="66" rx="4.5" ry="2.4" transform="rotate(35 145 66)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="137" cy="70" rx="4.5" ry="2.4" transform="rotate(-28 137 70)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="142" cy="56" rx="4.5" ry="2.4" transform="rotate(35 142 56)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="134" cy="60" rx="4.5" ry="2.4" transform="rotate(-28 134 60)" fill="#F7F4F0" opacity="0.9"/>
        <ellipse cx="137" cy="46" rx="4.2" ry="2.2" transform="rotate(25 137 46)" fill="#C9A86C"/>

        <!-- Single Iconic Copper Pot Still -->
        <path d="M89 34 L89 22 C89 15 96 14 104 18 L122 28" stroke="#C9A86C" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M85 34 L105 34 L108 58 C120 64 125 76 124 92 L124 104 C124 108 121 111 117 111 L73 111 C69 111 66 108 66 104 L66 92 C65 76 70 64 82 58 Z" fill="#C9A86C"/>
        <!-- Pot Still metallic highlight & seam -->
        <path d="M74 96 C74 82 77 72 84 66" stroke="#F7F4F0" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
        <line x1="68" y1="88" x2="122" y2="88" stroke="#1E3A2F" stroke-width="1.6" opacity="0.35"/>
        <!-- Single-distillery "1" emblem -->
        <circle cx="95" cy="88" r="10" fill="#1E3A2F" stroke="#F7F4F0" stroke-width="1.4"/>
        <text x="95" y="92.5" text-anchor="middle" font-size="11.5" font-weight="800" fill="#F7F4F0" font-family="Pretendard, sans-serif">1</text>
        <!-- Drop from lyne arm -->
        <path d="M123 36 C123 36 120 40 120 42 C120 43.7 121.3 45 123 45 C124.7 45 126 43.7 126 42 C126 40 123 36 123 36 Z" fill="#F7F4F0"/>
      </svg>
    `;
  }

  // 3. PEAT: Peat campfire flames + curling smoke ribbons + Islay sea waves
  if (catId === '피트') {
    return `
      <svg class="${cls}" viewBox="0 0 180 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="96" cy="64" r="52" fill="rgba(247,244,240,0.06)"/>
        <!-- Rising curling smoke ribbons -->
        <path d="M72 56 C66 44 78 36 73 24 C70 18 74 14 78 12" stroke="#F7F4F0" stroke-width="2.4" stroke-linecap="round" opacity="0.65"/>
        <path d="M96 48 C90 35 104 28 98 16 C96 12 99 9 102 8" stroke="#F7F4F0" stroke-width="3" stroke-linecap="round" opacity="0.88"/>
        <path d="M120 56 C115 45 126 38 122 26 C120 21 123 17 126 15" stroke="#F7F4F0" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
        <!-- Campfire flame -->
        <path d="M96 50 C106 62 115 70 114 82 C113 92 105 98 96 98 C87 98 79 92 78 82 C77 70 86 62 96 50 Z" fill="#C9A86C"/>
        <path d="M96 66 C101 73 105 78 104 85 C103.5 90 100 94 96 94 C92 94 88.5 90 88 85 C87 78 91 73 96 66 Z" fill="#F7F4F0" opacity="0.92"/>
        <!-- Stacked peat blocks / firewood -->
        <rect x="64" y="92" width="32" height="9" rx="4.5" transform="rotate(11 64 92)" fill="#162A22" stroke="#C9A86C" stroke-width="1.3"/>
        <rect x="94" y="98" width="32" height="9" rx="4.5" transform="rotate(-11 94 98)" fill="#162A22" stroke="#C9A86C" stroke-width="1.3"/>
        <!-- Islay ocean waves at bottom -->
        <path d="M40 113 Q54 107 68 113 T96 113 T124 113 T152 113" stroke="#F7F4F0" stroke-width="2" stroke-linecap="round" opacity="0.52"/>
      </svg>
    `;
  }

  // 4. BOURBON: Charred American Oak Barrel + Golden Corn cob + Vanilla blossom
  return `
    <svg class="${cls}" viewBox="0 0 180 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="96" cy="64" r="52" fill="rgba(201,168,108,0.10)"/>
      <!-- American Oak Barrel (right-center) -->
      <path d="M84 22 L134 22 C143 44 143 80 134 104 L84 104 C75 80 75 44 84 22 Z" fill="#C9A86C"/>
      <!-- Wood stave vertical lines -->
      <path d="M98 22 C94 46 94 80 98 104" stroke="#1E3A2F" stroke-width="1.3" opacity="0.32"/>
      <path d="M109 22 L109 104" stroke="#1E3A2F" stroke-width="1.3" opacity="0.32"/>
      <path d="M120 22 C124 46 124 80 120 104" stroke="#1E3A2F" stroke-width="1.3" opacity="0.32"/>
      <!-- Metal barrel hoops -->
      <path d="M81 36 Q109 39 137 36" stroke="#1E3A2F" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M78 52 Q109 55 140 52" stroke="#1E3A2F" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
      <path d="M78 74 Q109 77 140 74" stroke="#1E3A2F" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
      <path d="M81 90 Q109 93 137 90" stroke="#1E3A2F" stroke-width="3.2" stroke-linecap="round"/>
      <!-- Bung hole -->
      <circle cx="109" cy="63" r="4.5" fill="#1E3A2F" stroke="#F7F4F0" stroke-width="1.2"/>

      <!-- Golden Corn Cob (front-left, 51%+ corn mashbill) -->
      <g transform="rotate(-14 62 76)">
        <rect x="51" y="42" width="22" height="54" rx="11" fill="#F7F4F0"/>
        <!-- Corn kernels pattern -->
        <g fill="#C9A86C">
          <circle cx="57" cy="52" r="2.2"/><circle cx="62" cy="52" r="2.2"/><circle cx="67" cy="52" r="2.2"/>
          <circle cx="57" cy="59" r="2.2"/><circle cx="62" cy="59" r="2.2"/><circle cx="67" cy="59" r="2.2"/>
          <circle cx="57" cy="66" r="2.2"/><circle cx="62" cy="66" r="2.2"/><circle cx="67" cy="66" r="2.2"/>
          <circle cx="57" cy="73" r="2.2"/><circle cx="62" cy="73" r="2.2"/><circle cx="67" cy="73" r="2.2"/>
          <circle cx="57" cy="80" r="2.2"/><circle cx="62" cy="80" r="2.2"/><circle cx="67" cy="80" r="2.2"/>
        </g>
        <!-- Corn husk leaves -->
        <path d="M51 74 C43 82 46 96 62 102 C54 93 52 84 54 76 Z" fill="#1E3A2F" stroke="#F7F4F0" stroke-width="1.3"/>
        <path d="M73 74 C81 82 78 96 62 102 C70 93 72 84 70 76 Z" fill="#1E3A2F" stroke="#F7F4F0" stroke-width="1.3"/>
      </g>
    </svg>
  `;
}

