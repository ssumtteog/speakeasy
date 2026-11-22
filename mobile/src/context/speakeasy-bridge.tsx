import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import type WebView from 'react-native-webview';

export type SpeakeasyTheme = 'light' | 'dark';
export type SpeakeasyTabKey = 'home' | 'search' | 'guide' | 'map' | 'my';
export type SpeakeasyLang = 'ko' | 'en' | 'ja';
export interface UserCoords {
  lat: number;
  lng: number;
}
export interface UserPrefs {
  mood: number;
  price: number;
  space: number;
  taste: number;
}
export interface UserAccount {
  provider: 'email' | 'apple' | 'naver' | 'google';
  userId?: string;
  name: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  signedInAt?: number;
}
export interface UserProfile {
  name: string;
  avatar: string;
}

interface BridgeContextValue {
  theme: SpeakeasyTheme;
  likes: string[];
  whiskyLikes: string[];
  tastingNotes: unknown[] | null;
  account: UserAccount | null;
  profile: UserProfile;
  lang: SpeakeasyLang;
  ageVerified: boolean;
  prefs: UserPrefs;
  region: string;
  userLocation: UserCoords | null;
  pendingSearchQuery: string | null;
  consumePendingSearchQuery: () => string | null;
  registerWebView: (tab: SpeakeasyTabKey, ref: WebView | null) => void;
  setThemeFromWeb: (next: SpeakeasyTheme, sourceTab: SpeakeasyTabKey) => void;
  setLikesFromWeb: (nextLikes: string[], sourceTab: SpeakeasyTabKey) => void;
  setWhiskyLikesFromWeb: (nextLikes: string[], sourceTab: SpeakeasyTabKey) => void;
  setTastingNotesFromWeb: (nextNotes: unknown[], sourceTab: SpeakeasyTabKey) => void;
  setAccountFromWeb: (nextAccount: UserAccount | null, sourceTab: SpeakeasyTabKey) => void;
  setProfileFromWeb: (nextProfile: UserProfile, sourceTab: SpeakeasyTabKey) => void;
  setLangFromWeb: (nextLang: SpeakeasyLang, sourceTab: SpeakeasyTabKey) => void;
  setAgeVerifiedFromWeb: (verified: boolean, sourceTab: SpeakeasyTabKey) => void;
  setPrefsFromWeb: (nextPrefs: UserPrefs, nextRegion: string, sourceTab: SpeakeasyTabKey) => void;
  requestNativeLocation: (autoCenter?: boolean | 'force') => Promise<void>;
  navigateToSearchWithQuery: (query: string) => void;
  navigateToTab: (tab: SpeakeasyTabKey) => void;
}

const ALL_TABS: SpeakeasyTabKey[] = ['home', 'search', 'guide', 'map', 'my'];

const SpeakeasyBridgeContext = createContext<BridgeContextValue | null>(null);

export function SpeakeasyBridgeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SpeakeasyTheme>('light');
  const [likes, setLikes] = useState<string[]>([]);
  const [whiskyLikes, setWhiskyLikes] = useState<string[]>([]);
  const [tastingNotes, setTastingNotes] = useState<unknown[] | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ name: '스피크이지 멤버', avatar: '' });
  const [lang, setLang] = useState<SpeakeasyLang>('ko');
  const [ageVerified, setAgeVerified] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<UserPrefs>({ mood: 1, price: 4, space: 3, taste: 4 });
  const [region, setRegion] = useState<string>('전체');
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const pendingSearchRef = useRef<string | null>(null);
  const webViewsRef = useRef<Partial<Record<SpeakeasyTabKey, WebView | null>>>({});

  const registerWebView = useCallback((tab: SpeakeasyTabKey, ref: WebView | null) => {
    webViewsRef.current[tab] = ref;
  }, []);

  const broadcastJS = useCallback((js: string, skipTab?: SpeakeasyTabKey) => {
    ALL_TABS.forEach((tab) => {
      if (tab === skipTab) return;
      const wv = webViewsRef.current[tab];
      if (wv) wv.injectJavaScript(js);
    });
  }, []);

  const syncAppearance = useCallback((next: SpeakeasyTheme) => {
    try {
      Appearance.setColorScheme(next);
    } catch {
      // Ignore if unsupported
    }
  }, []);

  const setThemeFromWeb = useCallback(
    (next: SpeakeasyTheme, sourceTab: SpeakeasyTabKey) => {
      setTheme(next);
      syncAppearance(next);
      Haptics.selectionAsync().catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.setTheme(${JSON.stringify(next)}); true;`,
        sourceTab
      );
    },
    [broadcastJS, syncAppearance]
  );

  const setLikesFromWeb = useCallback(
    (nextLikes: string[], sourceTab: SpeakeasyTabKey) => {
      setLikes(nextLikes);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncLikes(${JSON.stringify(nextLikes)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setWhiskyLikesFromWeb = useCallback(
    (nextLikes: string[], sourceTab: SpeakeasyTabKey) => {
      setWhiskyLikes(nextLikes);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncWhiskyLikes(${JSON.stringify(nextLikes)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setTastingNotesFromWeb = useCallback(
    (nextNotes: unknown[], sourceTab: SpeakeasyTabKey) => {
      setTastingNotes(nextNotes);
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncTastingNotes(${JSON.stringify(nextNotes)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setAccountFromWeb = useCallback(
    (nextAccount: UserAccount | null, sourceTab: SpeakeasyTabKey) => {
      setAccount(nextAccount);
      Haptics.selectionAsync().catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncAccount(${JSON.stringify(nextAccount)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setProfileFromWeb = useCallback(
    (nextProfile: UserProfile, sourceTab: SpeakeasyTabKey) => {
      setProfile(nextProfile);
      Haptics.selectionAsync().catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncProfile(${JSON.stringify(nextProfile)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setLangFromWeb = useCallback(
    (nextLang: SpeakeasyLang, sourceTab: SpeakeasyTabKey) => {
      setLang(nextLang);
      Haptics.selectionAsync().catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncLang(${JSON.stringify(nextLang)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setAgeVerifiedFromWeb = useCallback(
    (verified: boolean, sourceTab: SpeakeasyTabKey) => {
      setAgeVerified(verified);
      Haptics.selectionAsync().catch(() => {});
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncAgeVerified(${JSON.stringify(verified)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const setPrefsFromWeb = useCallback(
    (nextPrefs: UserPrefs, nextRegion: string, sourceTab: SpeakeasyTabKey) => {
      setPrefs(nextPrefs);
      setRegion(nextRegion);
      broadcastJS(
        `window.__speakeasyBridge && window.__speakeasyBridge.syncPrefs(${JSON.stringify(nextPrefs)}, ${JSON.stringify(nextRegion)}); true;`,
        sourceTab
      );
    },
    [broadcastJS]
  );

  const requestNativeLocation = useCallback(
    async (autoCenter: boolean | 'force' = true) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords: UserCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        broadcastJS(
          `window.__speakeasyBridge && window.__speakeasyBridge.setUserLocation(${coords.lat}, ${coords.lng}, ${JSON.stringify(autoCenter)}); true;`
        );
      } catch {
        // Ignore if GPS unavailable
      }
    },
    [broadcastJS]
  );

  useEffect(() => {
    requestNativeLocation(true);
  }, [requestNativeLocation]);

  const navigateToSearchWithQuery = useCallback((query: string) => {
    pendingSearchRef.current = query;
    const searchWv = webViewsRef.current.search;
    if (searchWv) {
      searchWv.injectJavaScript(
        `window.__speakeasyBridge && window.__speakeasyBridge.setTab('search', { query: ${JSON.stringify(query)} }); true;`
      );
      pendingSearchRef.current = null;
    }
    router.navigate('/search');
  }, []);

  const navigateToTab = useCallback((tab: SpeakeasyTabKey) => {
    if (tab === 'home') router.navigate('/');
    else if (tab === 'search') router.navigate('/search');
    else if (tab === 'guide') router.navigate('/guide');
    else if (tab === 'map') router.navigate('/map');
    else if (tab === 'my') router.navigate('/my');
  }, []);

  const consumePendingSearchQuery = useCallback(() => {
    const q = pendingSearchRef.current;
    pendingSearchRef.current = null;
    return q;
  }, []);

  return (
    <SpeakeasyBridgeContext.Provider
      value={{
        theme,
        likes,
        whiskyLikes,
        tastingNotes,
        account,
        profile,
        lang,
        ageVerified,
        prefs,
        region,
        userLocation,
        pendingSearchQuery: pendingSearchRef.current,
        consumePendingSearchQuery,
        registerWebView,
        setThemeFromWeb,
        setLikesFromWeb,
        setWhiskyLikesFromWeb,
        setTastingNotesFromWeb,
        setAccountFromWeb,
        setProfileFromWeb,
        setLangFromWeb,
        setAgeVerifiedFromWeb,
        setPrefsFromWeb,
        requestNativeLocation,
        navigateToSearchWithQuery,
        navigateToTab,
      }}>
      {children}
    </SpeakeasyBridgeContext.Provider>
  );
}

export function useSpeakeasyBridge() {
  const ctx = useContext(SpeakeasyBridgeContext);
  if (!ctx) throw new Error('useSpeakeasyBridge must be used inside SpeakeasyBridgeProvider');
  return ctx;
}
