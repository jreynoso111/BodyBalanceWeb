import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text, View } from '@/components/Themed';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { CURRENCIES } from '@/constants/Currencies';

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currencyDefault, setCurrencyDefault] = useState('USD');

  useEffect(() => {
    if (!user?.id) return;
    void loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    setInitializing(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, phone, currency_default')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      Alert.alert('Error', error.message);
      setInitializing(false);
      return;
    }

    if (data) {
      setFullName(data.full_name || '');
      setEmail(data.email || user.email || '');
      setPhone(data.phone || '');
      setCurrencyDefault(data.currency_default || 'USD');
    } else {
      setEmail(user.email || '');
    }

    setInitializing(false);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || user.email || null,
        currency_default: currencyDefault,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Profile updated');
  };

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 555 555 5555"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Default Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[styles.chip, currencyDefault === currency.code && styles.chipActive]}
                onPress={() => setCurrencyDefault(currency.code)}
              >
                <Text style={[styles.chipText, currencyDefault === currency.code && styles.chipTextActive]}>
                  {currency.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        <TouchableOpacity
          disabled={loading || initializing}
          onPress={handleSave}
          style={[styles.saveButton, (loading || initializing) && styles.disabled]}
        >
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
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
  },
  card: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
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
  },
  chips: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
});
