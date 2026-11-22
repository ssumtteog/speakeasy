# speakeasy

위스키 바 취향 추천 · 검색 · 가이드 · 지도 · 테이스팅 노트 앱 (**Web + Expo Mobile + Supabase**).

## 폴더 구조

- `web/` — HTML/CSS/JS 앱 본체 (69개 위스키 바 데이터, 위스키 가이드, Leaflet 지도, Supabase 이메일 로그인 & 클라우드 동기화)
- `mobile/` — Expo (React Native + WebView 브릿지) 모바일 앱 래퍼

## 실행 방법

### 1) 웹 수정 후 Expo 번들 업데이트
```bash
python3 mobile/scripts/bundle-speakeasy.py
```

### 2) 모바일 앱 실행 (Expo Go)
```bash
cd mobile
npm install
npx expo start -c
```

### 3) 웹 미리보기 실행
```bash
python3 -m http.server 8090 --directory web
```
