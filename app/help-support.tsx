import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';
import { Mail, MessageCircle, FileText, Shield, CircleHelp, ChevronRight } from 'lucide-react-native';

export default function HelpSupportScreen() {
  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Error', 'Could not open this link');
      return;
    }
    await Linking.openURL(url);
  };

  const items = [
    {
      icon: Mail,
      label: 'Email Support',
      sub: 'support@igotyou.app',
      onPress: () => void openLink('mailto:support@igotyou.app?subject=I%20GOT%20YOU%20Support'),
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp Support',
      sub: 'Open chat',
      onPress: () => void openLink('https://wa.me/17265550100'),
    },
    {
      icon: FileText,
      label: 'Terms of Service',
      sub: 'Read in app',
      onPress: () =>
        Alert.alert(
          'Terms of Service',
          'You agree to use this app responsibly and provide accurate financial records. Do not use this app for unlawful activities.'
        ),
    },
    {
      icon: Shield,
      label: 'Privacy Policy',
      sub: 'Read in app',
      onPress: () =>
        Alert.alert(
          'Privacy Policy',
          'We store account, contacts, loans and payment activity to provide the service. You can request account deletion from support.'
        ),
    },
    {
      icon: CircleHelp,
      label: 'FAQ',
      sub: 'Most common questions',
      onPress: () =>
        Alert.alert(
          'FAQ',
          '1) Add contacts first.\n2) Create money or item loans.\n3) Register payments from each loan detail.\n4) Export data from Settings.'
        ),
    },
  ];

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.menuCard}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.item, index === items.length - 1 && styles.lastItem]}
              onPress={item.onPress}
            >
              <RNView style={styles.itemLeft}>
                <RNView style={styles.iconCircle}>
                  <item.icon size={18} color="#6366F1" />
                </RNView>
                <RNView style={styles.textContainer}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.subLabel}>{item.sub}</Text>
                </RNView>
              </RNView>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </Card>
        <Text style={styles.footer}>I GOT U v1.0.0</Text>
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
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  textContainer: {
    marginLeft: 14,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    marginTop: 18,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
