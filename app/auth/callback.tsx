import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';

import { Screen, Card, Text } from '@/components/Themed';
import { completeOAuthFromUrl } from '@/services/oauth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const urlFromLinking = Linking.useURL();
  const [statusText, setStatusText] = useState('Completing Google sign in...');
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);

  const initialUrl = useMemo(() => {
    if (urlFromLinking) return urlFromLinking;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.href;
    }
    return null;
  }, [urlFromLinking]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!initialUrl) {
        if (!mounted) return;
        setFailed(true);
        setStatusText('Missing callback data. Please try again.');
        return;
      }

      const result = await completeOAuthFromUrl(initialUrl);
      if (!mounted) return;

      if (result.status === 'success') {
        setCompleted(true);
        setStatusText('Google account linked successfully.');
        router.replace('/(tabs)');
        return;
      }

      setFailed(true);
      setStatusText(result.message || 'Google sign in failed. Please try again.');
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [initialUrl, router]);

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <RNView style={styles.content}>
        <Card style={styles.card}>
          {!completed && !failed ? <ActivityIndicator size="small" color="#6366F1" /> : null}
          <Text style={styles.title}>{failed ? 'Authentication failed' : 'Google authentication'}</Text>
          <Text style={styles.subtitle}>{statusText}</Text>

          {failed ? (
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.buttonText}>Back to login</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      </RNView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
