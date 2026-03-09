import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Shield,
  Users,
} from 'lucide-react-native';
import { AppLegalFooter } from '@/components/AppLegalFooter';
import { SupportMessageCard } from '@/components/support/SupportMessageCard';
import { PublicSiteLayout } from '@/components/website/PublicSiteLayout';

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
    icon: FileText,
    label: 'Contact support',
    sub: 'Account issues, launch questions, and where to send the right request',
    path: '/contact',
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

const SUPPORT_DESTINATIONS = [
  {
    href: '/faq' as const,
    eyebrow: 'ANSWERS',
    title: 'FAQ',
    body: 'Short, product-facing explanations for balances, shared records, notifications, contacts, and Premium behavior.',
  },
  {
    href: '/contact' as const,
    eyebrow: 'CONTACT',
    title: 'Contact support',
    body: 'The right place for account-specific issues, launch questions, and guidance on what should be handled in-app.',
  },
  {
    href: '/privacy' as const,
    eyebrow: 'POLICY',
    title: 'Privacy',
    body: 'How Buddy Balance handles account data, shared history, and the information that becomes visible across linked activity.',
  },
  {
    href: '/terms' as const,
    eyebrow: 'LEGAL',
    title: 'Terms',
    body: 'The usage rules, product limits, and responsibilities around a ledger app that does not move money itself.',
  },
] as const;

export default function HelpSupportScreen() {
  const router = useRouter();

  if (Platform.OS === 'web') {
    return (
      <PublicSiteLayout
        eyebrow="Support"
        title="Support is the public home for help, policy, and account guidance."
        description="This section is the public support desk for Buddy Balance. Start here, then branch into FAQ, contact flow, privacy, or terms depending on whether the question is product, account, or policy-related."
        actions={[
          { href: '/faq', label: 'Browse FAQ' },
          { href: '/contact', label: 'Contact support', variant: 'secondary' },
        ]}
      >
        <LinearGradient colors={['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.74)']} style={styles.webSupportPanel}>
          <Text style={styles.webSupportLabel}>START HERE</Text>
          <RNView style={styles.webSupportGrid}>
            <RNView style={styles.webSupportItem}>
              <Text style={styles.webSupportTitle}>Support is the primary section</Text>
              <Text style={styles.webSupportBody}>
                FAQ, Contact, Privacy, and Terms all live under the same support area so store links, public web links, and user guidance stay consistent.
              </Text>
            </RNView>
            <RNView style={styles.webSupportItem}>
              <Text style={styles.webSupportTitle}>Use the right lane</Text>
              <Text style={styles.webSupportBody}>
                Use FAQ for product behavior, Contact for account or launch questions, Privacy for data handling, and Terms for usage rules and product limits.
              </Text>
            </RNView>
            <RNView style={styles.webSupportItem}>
              <Text style={styles.webSupportTitle}>Account issues stay attached to the account</Text>
              <Text style={styles.webSupportBody}>
                If the issue depends on your records, contacts, or notifications, sign in and use the tracked in-app support flow instead of a loose public email thread.
              </Text>
            </RNView>
          </RNView>
        </LinearGradient>

        <RNView style={styles.supportDestinationGrid}>
          {SUPPORT_DESTINATIONS.map((item) => (
            <Link key={item.href} href={item.href} style={styles.supportDestinationLink}>
              <LinearGradient colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.74)']} style={styles.supportDestinationCard}>
                <Text style={styles.supportDestinationEyebrow}>{item.eyebrow}</Text>
                <Text style={styles.supportDestinationTitle}>{item.title}</Text>
                <Text style={styles.supportDestinationBody}>{item.body}</Text>
              </LinearGradient>
            </Link>
          ))}
        </RNView>

        <SupportMessageCard
          title="Send a tracked support message"
          description="Use this when the issue depends on your account, a linked contact, a shared record, or a notification you actually received."
          signedOutTitle="Tracked support starts after sign-in"
          signedOutDescription="Public pages explain the product, but account-specific support should stay attached to the right user history."
        />
      </PublicSiteLayout>
    );
  }

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

        <SupportMessageCard
          title="Contact support"
          description="Use this form to report account issues, record mismatches, confirmation problems, or general product questions. The message is stored in-app for administrator follow-up."
        />

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
  webSupportPanel: {
    padding: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  webSupportLabel: {
    color: '#5B63FF',
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 1.6,
  },
  webSupportGrid: {
    marginTop: 16,
    gap: 14,
  },
  supportDestinationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  supportDestinationLink: {
    width: '100%',
    maxWidth: 370,
    flexGrow: 1,
  },
  supportDestinationCard: {
    minHeight: 210,
    padding: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  supportDestinationEyebrow: {
    color: '#5B63FF',
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  supportDestinationTitle: {
    marginTop: 12,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0F172A',
  },
  supportDestinationBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  webSupportItem: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.18)',
  },
  webSupportTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  webSupportBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
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
