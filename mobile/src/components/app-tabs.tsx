import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { useSpeakeasyBridge, type SpeakeasyLang } from '@/context/speakeasy-bridge';

const TAB_LABELS: Record<SpeakeasyLang, { home: string; search: string; guide: string; map: string; my: string }> = {
  ko: { home: '홈', search: '검색', guide: '가이드', map: '지도', my: '나' },
  en: { home: 'Home', search: 'Search', guide: 'Guide', map: 'Map', my: 'My' },
  ja: { home: 'ホーム', search: '検索', guide: 'ガイド', map: '地図', my: 'マイ' },
};

export default function AppTabs() {
  const { theme, lang } = useSpeakeasyBridge();
  const isDark = theme === 'dark';
  const labels = TAB_LABELS[lang] || TAB_LABELS.ko;

  const activeColor = isDark ? '#C9A86C' : '#1E3A2F';
  const inactiveColor = isDark ? '#8B9A93' : '#74827B';

  return (
    <NativeTabs
      tintColor={activeColor}
      iconColor={{ default: inactiveColor, selected: activeColor }}
      labelStyle={{
        default: { color: inactiveColor, fontSize: 11 },
        selected: { color: activeColor, fontSize: 11, fontWeight: '600' },
      }}
      minimizeBehavior="never"
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      backgroundColor={Platform.OS === 'android' ? (isDark ? '#16211C' : '#FFFFFF') : undefined}
      indicatorColor={isDark ? 'rgba(201,168,108,0.2)' : 'rgba(30,58,47,0.12)'}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{labels.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>{labels.search}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="guide">
        <NativeTabs.Trigger.Label>{labels.guide}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book', selected: 'book.fill' }}
          md="menu_book"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>{labels.map}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          md="map"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Label>{labels.my}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
