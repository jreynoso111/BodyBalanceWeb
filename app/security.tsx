import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View as RNView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { getOrCreateUserPreferences, updateUserPreferences } from '@/services/userPreferences';

export default function SecurityScreen() {
  const { user } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;
    const { data, error } = await getOrCreateUserPreferences(user.id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setBiometricEnabled(Boolean(data?.biometric_enabled));
  };

  const onToggleBiometric = async () => {
    if (!user?.id) return;
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    const { error } = await updateUserPreferences(user.id, { biometric_enabled: next });
    if (error) {
      setBiometricEnabled(!next);
      Alert.alert('Error', error.message);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Success', 'Password updated');
  };

  const handleGlobalSignOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Success', 'Signed out from all sessions');
  };

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Security' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <RNView style={styles.row}>
            <RNView style={styles.rowText}>
              <Text style={styles.rowTitle}>Biometric Lock</Text>
              <Text style={styles.rowSubtitle}>Use Face ID / Touch ID to unlock app</Text>
            </RNView>
            <Switch
              value={biometricEnabled}
              onValueChange={onToggleBiometric}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </RNView>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            secureTextEntry
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#94A3B8"
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <TextInput
            secureTextEntry
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#94A3B8"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handlePasswordUpdate} disabled={savingPassword}>
            <Text style={styles.primaryButtonText}>{savingPassword ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleGlobalSignOut}>
          <Text style={styles.secondaryButtonText}>Sign Out All Devices</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
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
    gap: 14,
  },
  card: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  rowText: {
    flex: 1,
    marginRight: 10,
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
  sectionTitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  secondaryButtonText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 15,
  },
});
