import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View as RNView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Shield,
  Users,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { AppLegalFooter } from '@/components/AppLegalFooter';

type QuickGuideItem = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  sub: string;
  path: string;
};

const QUICK_GUIDES: QuickGuideItem[] = [
  {
    icon: CircleHelp,
    label: 'FAQ',
    sub: 'Updated answers for the current product behavior',
    path: '/faq',
  },
  {
    icon: Bell,
    label: 'Notifications and confirmations',
    sub: 'What requires approval and what shows as an event only',
    path: '/help/notifications-confirmations',
  },
  {
    icon: Users,
    label: 'Contacts and shared history',
    sub: 'Expand a contact card for shortcuts and recent activity',
    path: '/help/contacts-shared-history',
  },
  {
    icon: FileText,
    label: 'Terms of Service',
    sub: 'Read the current usage terms in app',
    path: '/terms',
  },
  {
    icon: Shield,
    label: 'Privacy Policy',
    sub: 'Read how account and record data is handled',
    path: '/privacy',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submitSupportMessage = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to contact support.');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      Alert.alert('Message required', 'Write a short message so support knows what you need.');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('support_messages').insert([
      {
        user_id: user.id,
        channel: 'in_app',
        subject: subject.trim() || null,
        message: trimmedMessage,
        status: 'open',
      },
    ]);
    setSending(false);

    if (error) {
      Alert.alert('Could not send', error.message);
      return;
    }

    setSubject('');
    setMessage('');
    Alert.alert('Message sent', 'Your support message was saved for admin review.');
  };

  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Support center</Text>
          <Text style={styles.heroTitle}>Help aligned with the current app</Text>
          <Text style={styles.heroText}>
            This section reflects the current product flows for contacts, shared records, and notifications
            so the guidance matches what you see on screen today.
          </Text>
        </Card>

        <Card style={styles.menuCard}>
          {QUICK_GUIDES.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.item, index === QUICK_GUIDES.length - 1 && styles.lastItem]}
              onPress={() => router.push(item.path as never)}
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

        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact support</Text>
          <Text style={styles.contactText}>
            Use this form to report account issues, record mismatches, confirmation problems, or general product
            questions. The message is stored in-app for administrator follow-up.
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject (optional)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe what happened, what account or contact was involved, and what you expected..."
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => void submitSupportMessage()} disabled={sending}>
            <Text style={styles.sendButtonText}>{sending ? 'Sending...' : 'Send to support'}</Text>
          </TouchableOpacity>
        </Card>

        <AppLegalFooter style={styles.footer} />
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
  heroCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4338CA',
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  contactCard: {
    marginTop: 16,
    padding: 18,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  textarea: {
    minHeight: 120,
  },
  sendButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    flex: 1,
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  subLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 18,
  },
});
