import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSpeakeasyBridge } from '@/context/speakeasy-bridge';

const WEB_TABS = [
  { name: 'index', href: '/' as const, label: '홈' },
  { name: 'search', href: '/search' as const, label: '검색' },
  { name: 'guide', href: '/guide' as const, label: '가이드' },
  { name: 'map', href: '/map' as const, label: '지도' },
  { name: 'my', href: '/my' as const, label: '나' },
];

export default function AppTabs() {
  const { theme } = useSpeakeasyBridge();
  const isDark = theme === 'dark';

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View
          style={[
            styles.bar,
            { backgroundColor: isDark ? '#16211C' : '#F7F4F0' },
          ]}>
          {WEB_TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <Pressable style={styles.btn}>
                <Text style={{ color: isDark ? '#F5F2EB' : '#1E3A2F', fontWeight: '600' }}>
                  {t.label}
                </Text>
              </Pressable>
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
