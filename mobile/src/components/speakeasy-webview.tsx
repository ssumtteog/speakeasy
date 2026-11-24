import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Keyboard, Linking, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewOpenWindowEvent } from 'react-native-webview/lib/WebViewTypes';

const TypedWebView = WebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.Ref<WebView> }
>;

import {
  useSpeakeasyBridge,
  type SpeakeasyLang,
  type SpeakeasyTabKey,
  type SpeakeasyTheme,
} from '@/context/speakeasy-bridge';
import { SPEAKEASY_HTML, SPEAKEASY_HTML_VERSION } from '@/generated/speakeasyHtml';

interface Props {
  tab: SpeakeasyTabKey;
}

export function SpeakeasyWebView({ tab }: Props) {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const {
    theme,
    likes,
    whiskyLikes,
    tastingNotes,
    account,
    profile,
    lang,
    prefs,
    region,
    userLocation,
    registerWebView,
    setThemeFromWeb,
    setLikesFromWeb,
    setWhiskyLikesFromWeb,
    setTastingNotesFromWeb,
    setAccountFromWeb,
    setProfileFromWeb,
    setLangFromWeb,
    setPrefsFromWeb,
    requestNativeLocation,
    navigateToSearchWithQuery,
    navigateToTab,
    consumePendingSearchQuery,
  } = useSpeakeasyBridge();

  useEffect(() => {
    registerWebView(tab, webViewRef.current);
    return () => registerWebView(tab, null);
  }, [tab, registerWebView]);

  // Always sync latest shared state (only fields already reported by a tab) & recalculate map viewport
  useFocusEffect(
    useCallback(() => {
      const wv = webViewRef.current;
      if (!wv) return;
      wv.injectJavaScript(`
        if (window.__speakeasyBridge) {
          window.__speakeasyBridge.ensureRootTab(${JSON.stringify(tab)});
          window.__speakeasyBridge.setTheme(${JSON.stringify(theme)});
          ${likes !== null ? `window.__speakeasyBridge.syncLikes(${JSON.stringify(likes)});` : ''}
          ${whiskyLikes !== null ? `window.__speakeasyBridge.syncWhiskyLikes(${JSON.stringify(whiskyLikes)});` : ''}
          ${tastingNotes !== null ? `window.__speakeasyBridge.syncTastingNotes(${JSON.stringify(tastingNotes)});` : ''}
          ${account !== undefined ? `window.__speakeasyBridge.syncAccount(${JSON.stringify(account)});` : ''}
          ${profile !== null ? `window.__speakeasyBridge.syncProfile(${JSON.stringify(profile)});` : ''}
          ${lang !== null ? `window.__speakeasyBridge.syncLang(${JSON.stringify(lang)});` : ''}
          ${prefs !== null ? `window.__speakeasyBridge.syncPrefs(${JSON.stringify(prefs)}, ${JSON.stringify(region || '전체')});` : ''}
          ${userLocation ? `window.__speakeasyBridge.setUserLocation(${userLocation.lat}, ${userLocation.lng}, false);` : ''}
        }
        ${tab === 'map' ? 'window.__speakeasyMapFocus && window.__speakeasyMapFocus();' : ''}
        ${tab === 'my' ? 'typeof renderMyView === "function" && renderMyView();' : ''}
        true;
      `);
    }, [tab, theme, likes, whiskyLikes, tastingNotes, account, profile, lang, prefs, region, userLocation])
  );

  // On iOS NativeTabs, insets.bottom may already include the native tab bar height (~83pt),
  // or only report the home indicator (~34pt). Compute the exact top edge of the native tab bar.
  const tabBarTopPx = insets.bottom >= 60 ? Math.round(insets.bottom) : Math.round(insets.bottom + 52);

  // Keep native safe area insets synced into CSS variables if orientation/insets update
  useEffect(() => {
    const wv = webViewRef.current;
    if (!wv) return;
    wv.injectJavaScript(`
      document.documentElement.style.setProperty('--native-inset-top', '${Math.round(insets.top)}px');
      document.documentElement.style.setProperty('--native-inset-bottom', '${Math.round(insets.bottom)}px');
      document.documentElement.style.setProperty('--native-tabbar-top', '${tabBarTopPx}px');
      true;
    `);
  }, [insets.top, insets.bottom, tabBarTopPx]);

  // Forward native iOS/Android soft keyboard height into WebView so sheets & auth inputs lift above keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, (e) => {
      const kbHeight = Math.round(e.endCoordinates?.height || 0);
      webViewRef.current?.injectJavaScript(`
        window.__speakeasyKeyboardChange && window.__speakeasyKeyboardChange(${kbHeight});
        true;
      `);
    });
    const subHide = Keyboard.addListener(hideEvent, () => {
      webViewRef.current?.injectJavaScript(`
        window.__speakeasyKeyboardChange && window.__speakeasyKeyboardChange(0);
        true;
      `);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const injectedBeforeLoad = useMemo(() => {
    const topPx = Math.round(insets.top);
    const bottomPx = Math.round(insets.bottom);
    return `
      window.__SPEAKEASY_NATIVE__ = true;
      window.__SPEAKEASY_INITIAL_TAB__ = ${JSON.stringify(tab)};
      document.documentElement.classList.add('native-tabs-mode');
      document.documentElement.style.setProperty('--native-inset-top', '${topPx}px');
      document.documentElement.style.setProperty('--native-inset-bottom', '${bottomPx}px');
      document.documentElement.style.setProperty('--native-tabbar-top', '${tabBarTopPx}px');
      true;
    `;
  }, [tab, insets.top, insets.bottom, tabBarTopPx]);

  const handleLoadEnd = useCallback(() => {
    const wv = webViewRef.current;
    if (!wv) return;
    wv.injectJavaScript(`
      document.documentElement.classList.add('native-tabs-mode');
      document.documentElement.style.setProperty('--native-inset-top', '${Math.round(insets.top)}px');
      document.documentElement.style.setProperty('--native-inset-bottom', '${Math.round(insets.bottom)}px');
      document.documentElement.style.setProperty('--native-tabbar-top', '${tabBarTopPx}px');
      if (window.__speakeasyBridge) {
        window.__speakeasyBridge.ensureRootTab(${JSON.stringify(tab)});
        window.__speakeasyBridge.setTheme(${JSON.stringify(theme)});
        ${likes !== null ? `window.__speakeasyBridge.syncLikes(${JSON.stringify(likes)});` : ''}
        ${whiskyLikes !== null ? `window.__speakeasyBridge.syncWhiskyLikes(${JSON.stringify(whiskyLikes)});` : ''}
        ${tastingNotes !== null ? `window.__speakeasyBridge.syncTastingNotes(${JSON.stringify(tastingNotes)});` : ''}
        ${account !== undefined ? `window.__speakeasyBridge.syncAccount(${JSON.stringify(account)});` : ''}
        ${profile !== null ? `window.__speakeasyBridge.syncProfile(${JSON.stringify(profile)});` : ''}
        ${lang !== null ? `window.__speakeasyBridge.syncLang(${JSON.stringify(lang)});` : ''}
        ${prefs !== null ? `window.__speakeasyBridge.syncPrefs(${JSON.stringify(prefs)}, ${JSON.stringify(region || '전체')});` : ''}
        ${userLocation ? `window.__speakeasyBridge.setUserLocation(${userLocation.lat}, ${userLocation.lng}, true);` : ''}
      }
      true;
    `);
    if (tab === 'search') {
      const pending = consumePendingSearchQuery();
      if (pending) {
        wv.injectJavaScript(
          `window.__speakeasyBridge && window.__speakeasyBridge.setTab('search', { query: ${JSON.stringify(pending)} }); true;`
        );
      }
    }
  }, [tab, theme, likes, whiskyLikes, tastingNotes, account, profile, lang, prefs, region, userLocation, insets.top, insets.bottom, tabBarTopPx, consumePendingSearchQuery]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'THEME' && (msg.theme === 'light' || msg.theme === 'dark')) {
          setThemeFromWeb(msg.theme as SpeakeasyTheme, tab);
        } else if (msg.type === 'LIKES' && Array.isArray(msg.likes)) {
          setLikesFromWeb(msg.likes, tab);
        } else if (msg.type === 'WHISKY_LIKES' && Array.isArray(msg.whiskyLikes)) {
          setWhiskyLikesFromWeb(msg.whiskyLikes, tab);
        } else if (msg.type === 'TASTING_NOTES' && Array.isArray(msg.tastingNotes)) {
          setTastingNotesFromWeb(msg.tastingNotes, tab);
        } else if (msg.type === 'ACCOUNT') {
          setAccountFromWeb(msg.account || null, tab);
        } else if (msg.type === 'PROFILE' && msg.profile) {
          setProfileFromWeb(msg.profile, tab);
        } else if (msg.type === 'LANG' && (msg.lang === 'ko' || msg.lang === 'en' || msg.lang === 'ja')) {
          setLangFromWeb(msg.lang as SpeakeasyLang, tab);
        } else if (msg.type === 'PREFS' && msg.prefs) {
          setPrefsFromWeb(msg.prefs, msg.region || '전체', tab);
        } else if (msg.type === 'REQUEST_LOCATION') {
          requestNativeLocation(msg.autoCenter ?? 'force');
        } else if (msg.type === 'NAVIGATE_SEARCH' && typeof msg.query === 'string') {
          navigateToSearchWithQuery(msg.query);
        } else if (msg.type === 'NAVIGATE_TAB' && typeof msg.tab === 'string') {
          navigateToTab(msg.tab as SpeakeasyTabKey);
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [tab, setThemeFromWeb, setLikesFromWeb, setWhiskyLikesFromWeb, setTastingNotesFromWeb, setAccountFromWeb, setProfileFromWeb, setLangFromWeb, setPrefsFromWeb, requestNativeLocation, navigateToSearchWithQuery, navigateToTab]
  );

  const handleShouldStartLoad = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url || '';
    if (
      url === 'about:blank' ||
      url.startsWith('https://speakeasy.local') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return true;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  const bgColor = theme === 'dark' ? '#121213' : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TypedWebView
        key={SPEAKEASY_HTML_VERSION}
        ref={webViewRef}
        source={{ html: SPEAKEASY_HTML, baseUrl: 'https://speakeasy.local/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        setSupportMultipleWindows={false}
        onOpenWindow={(e: WebViewOpenWindowEvent) => {
          if (e.nativeEvent.targetUrl) {
            Linking.openURL(e.nativeEvent.targetUrl).catch(() => {});
          }
        }}
        allowsBackForwardNavigationGestures={false}
        style={[styles.webview, { backgroundColor: bgColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
