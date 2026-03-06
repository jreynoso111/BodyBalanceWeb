import React from 'react';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { Home, Users, Settings } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme() || 'light';
  const { t } = useI18n();
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized } = useAuthStore();

  if (initialized && !user) {
    return <Redirect href="/" />;
  }

  const currentTabSegment = segments[1];
  const activeTab = currentTabSegment === 'contacts'
    ? 'contacts'
    : currentTabSegment === 'settings'
      ? 'settings'
      : 'home';

  const goToTab = (tab: 'home' | 'contacts' | 'settings') => {
    if (tab === 'home' && activeTab !== 'home') {
      router.replace('/(tabs)');
      return;
    }
    if (tab === 'contacts' && activeTab !== 'contacts') {
      router.replace('/(tabs)/contacts');
      return;
    }
    if (tab === 'settings' && activeTab !== 'settings') {
      router.replace('/(tabs)/settings');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: {
          backgroundColor: 'transparent',
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => goToTab('home')}>
            <BrandLogo size="sm" showTagline={false} showWordmark={false} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerNav}>
            <TouchableOpacity
              onPress={() => goToTab('home')}
              style={[
                styles.headerNavBtn,
                activeTab === 'home' && { backgroundColor: `${Colors[colorScheme].tint}20` },
              ]}
            >
              <Home size={18} color={activeTab === 'home' ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToTab('contacts')}
              style={[
                styles.headerNavBtn,
                activeTab === 'contacts' && { backgroundColor: `${Colors[colorScheme].tint}20` },
              ]}
            >
              <Users size={18} color={activeTab === 'contacts' ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToTab('settings')}
              style={[
                styles.headerNavBtn,
                activeTab === 'settings' && { backgroundColor: `${Colors[colorScheme].tint}20` },
              ]}
            >
              <Settings size={18} color={activeTab === 'settings' ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault} />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: t('Home') }} />
      <Stack.Screen name="contacts" options={{ title: t('Contacts') }} />
      <Stack.Screen name="settings" options={{ title: t('Settings') }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  headerNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
