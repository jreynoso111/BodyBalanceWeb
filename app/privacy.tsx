import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';

const SECTIONS = [
  {
    title: '1. Information we collect',
    body:
      'Buddy Balance stores the information you intentionally provide to operate the service, including account details, contacts, records, payment history, item return history, support messages, preferences, and related metadata needed to show balances and shared activity.',
  },
  {
    title: '2. Shared account activity',
    body:
      'When you interact with another connected account, the app can create shared events, confirmations, notifications, or activity records so both sides can see what changed. This shared data is part of the product experience and may be visible to the people involved in that record or request.',
  },
  {
    title: '3. How we use your data',
    body:
      'We use account and record data to authenticate you, render balances, keep contact history accurate, power notifications, support Premium and admin experiences, respond to support requests, and improve reliability of the product.',
  },
  {
    title: '4. Premium, admin, and support handling',
    body:
      'If your account has Premium access, the app may enable additional features such as exports and Premium labeling in the interface. If your account has admin privileges, admin tools can expose broader operational data required to review users, requests, and support communications.',
  },
  {
    title: '5. Storage and security',
    body:
      'We apply reasonable technical and organizational measures to protect data in the app. No internet-connected system is perfectly secure, so we cannot promise absolute security, but we do design the product to limit accidental loss, corruption, and unauthorized access where practical.',
  },
  {
    title: '6. Third-party services',
    body:
      'The app relies on infrastructure providers to authenticate users, store application data, and deliver connected product behavior. Those providers process data only as needed to operate the service on our behalf.',
  },
  {
    title: '7. Data retention and deletion',
    body:
      'We retain data for as long as it is needed to operate the service, satisfy support or audit needs, and maintain shared record history. If you need your account reviewed for deletion, use the in-app support form so the request can be verified and processed.',
  },
  {
    title: '8. Policy updates',
    body:
      'We may update this Privacy Policy as the product evolves. Continued use of Buddy Balance after an update means the revised policy applies from that point forward.',
  },
] as const;

export default function PrivacyPolicyScreen() {
  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>Privacy overview</Text>
          <Text style={styles.introText}>
            Buddy Balance is built around shared record tracking, so privacy depends both on your own account data
            and on the events you intentionally create with connected people.
          </Text>
        </Card>

        {SECTIONS.map((section) => (
          <Card key={section.title} style={styles.sectionCard}>
            <Text style={styles.heading}>{section.title}</Text>
            <Text style={styles.content}>{section.body}</Text>
          </Card>
        ))}
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
  introCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1E3A8A',
  },
  sectionCard: {
    padding: 18,
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
});
