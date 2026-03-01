import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View as RNView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';
import { useAuthStore } from '@/store/authStore';
import {
  DEFAULT_USER_PREFERENCES,
  getOrCreateUserPreferences,
  updateUserPreferences,
  UserPreferences,
} from '@/services/userPreferences';

type ToggleKey = 'push_enabled' | 'email_enabled' | 'reminder_enabled' | 'marketing_enabled';

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Omit<UserPreferences, 'user_id'>>({
    ...DEFAULT_USER_PREFERENCES,
  });

  useEffect(() => {
    if (!user?.id) return;
    void loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await getOrCreateUserPreferences(user.id);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (data) {
      setPrefs({
        push_enabled: data.push_enabled,
        email_enabled: data.email_enabled,
        reminder_enabled: data.reminder_enabled,
        biometric_enabled: data.biometric_enabled,
        marketing_enabled: data.marketing_enabled,
        preferred_currencies: data.preferred_currencies,
      });
    }
  };

  const togglePreference = async (key: ToggleKey) => {
    if (!user?.id) return;
    const nextValue = !prefs[key];
    const previous = prefs;
    setPrefs({ ...prefs, [key]: nextValue });

    const { data, error } = await updateUserPreferences(user.id, { [key]: nextValue });
    if (error) {
      setPrefs(previous);
      Alert.alert('Error', error.message);
      return;
    }

    if (data) {
      setPrefs({
        push_enabled: data.push_enabled,
        email_enabled: data.email_enabled,
        reminder_enabled: data.reminder_enabled,
        biometric_enabled: data.biometric_enabled,
        marketing_enabled: data.marketing_enabled,
        preferred_currencies: data.preferred_currencies,
      });
    }
  };

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <PreferenceRow
            title="Push Notifications"
            subtitle="Alerts for requests, reminders and updates"
            value={prefs.push_enabled}
            onChange={() => togglePreference('push_enabled')}
          />
          <PreferenceRow
            title="Email Notifications"
            subtitle="Receive account and activity emails"
            value={prefs.email_enabled}
            onChange={() => togglePreference('email_enabled')}
          />
          <PreferenceRow
            title="Payment Reminders"
            subtitle="Get reminder alerts before due dates"
            value={prefs.reminder_enabled}
            onChange={() => togglePreference('reminder_enabled')}
          />
          <PreferenceRow
            title="Product Updates"
            subtitle="Tips and feature announcements"
            value={prefs.marketing_enabled}
            onChange={() => togglePreference('marketing_enabled')}
            noBorder
          />
        </Card>
        {loading ? <Text style={styles.footerText}>Loading preferences...</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function PreferenceRow({
  title,
  subtitle,
  value,
  onChange,
  noBorder = false,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
  noBorder?: boolean;
}) {
  return (
    <RNView style={[styles.row, noBorder && styles.noBorder]}>
      <RNView style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </RNView>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
        thumbColor="#FFFFFF"
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 120,
    paddingBottom: 40,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 14,
    color: '#64748B',
    fontSize: 12,
  },
});
