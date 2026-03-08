import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body:
      'By creating an account, signing in, or using Buddy Balance, you agree to these Terms of Service. If you do not agree, do not use the application.',
  },
  {
    title: '2. Service description',
    body:
      'Buddy Balance is a record-keeping and coordination tool for money loans, item loans, payments, returns, friend connections, and related shared activity. The app does not transfer funds, enforce debts, or act as a bank, escrow service, or legal collection platform.',
  },
  {
    title: '3. User responsibility',
    body:
      'You are responsible for the accuracy of the information you enter, the people you connect with, and any actions you take based on the records shown in the app. You remain solely responsible for real-world agreements, collections, returns, and disputes outside the product.',
  },
  {
    title: '4. Shared records and confirmations',
    body:
      'Some actions can create shared events, notifications, requests, or confirmations for another user. You agree to use those flows honestly and not to misrepresent balances, payments, item returns, or record ownership.',
  },
  {
    title: '5. Premium and admin features',
    body:
      'Certain capabilities may be limited to Premium users or administrator accounts. Premium access can enable additional management features, while admin access is intended only for platform operations, review, and support handling.',
  },
  {
    title: '6. Acceptable use',
    body:
      'You may not use the app for unlawful activity, fraud, harassment, abuse of other users, or tracking illicit transactions. We may restrict or remove access if the service is used in ways that threaten the platform or other users.',
  },
  {
    title: '7. Availability and changes',
    body:
      'We may update, improve, limit, suspend, or remove parts of the service at any time. Features, interfaces, notifications, and plan benefits can change as the product evolves.',
  },
  {
    title: '8. Limitation of liability',
    body:
      'Buddy Balance is provided as a tool to help users track shared obligations and history. We are not liable for personal, financial, or legal consequences arising from off-platform arrangements, incorrect entries, or reliance on information entered by users.',
  },
  {
    title: '9. Termination',
    body:
      'We may suspend or terminate accounts that violate these terms, create risk for the service, or misuse shared workflows. You may also stop using the app at any time.',
  },
  {
    title: '10. Updates to these terms',
    body:
      'We may revise these terms from time to time. Continued use of the app after an update means you accept the revised terms.',
  },
] as const;

export default function TermsOfServiceScreen() {
  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Terms of Service' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>Terms overview</Text>
          <Text style={styles.introText}>
            Buddy Balance is a tracking and coordination product. It records what users say happened; it does not
            replace the real-world responsibility between the people involved.
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
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C2410C',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9A3412',
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
