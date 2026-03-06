import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View as RNView, RefreshControl } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, Box, Bell, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getCurrencySymbol } from '@/constants/Currencies';
import { useGreetingStore } from '@/store/greetingStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LoanRecord = {
  id: string;
  amount: number | null;
  type: 'lent' | 'borrowed';
  status: string;
  category: 'money' | 'item';
  created_at: string;
  due_date: string | null;
  item_name: string | null;
  currency: string | null;
  contacts?: { name?: string | null } | null;
  remaining_amount?: number;
};

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const greeting = useGreetingStore((state) => state.greetings[state.currentIndex]);
  const [accountName, setAccountName] = useState('');
  const [summary, setSummary] = useState({ lent: 0, borrowed: 0, overdue: 0, dueSoon: 0 });
  const [recentLoans, setRecentLoans] = useState<LoanRecord[]>([]);
  const [dueItems, setDueItems] = useState<LoanRecord[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() || 'light';
  const bottomInset = Math.max(insets.bottom, 12);
  const fabBottomOffset = bottomInset + 16;
  const scrollBottomPadding = fabBottomOffset + 84;

  useFocusEffect(
    React.useCallback(() => {
      void fetchData();
    }, [user?.id])
  );

  const fetchData = async () => {
    if (!user) return;
    setRefreshing(true);

    try {
      const profileNameFromMetadata =
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';

      if (profileNameFromMetadata) {
        setAccountName(profileNameFromMetadata);
      }

      const [profileResult, loansResult, paymentsResult, requestsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('loans')
          .select('id, amount, type, status, category, created_at, due_date, item_name, currency, contacts(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .neq('status', 'paid')
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('amount, loan_id, created_at')
          .eq('user_id', user.id),
        supabase
          .from('p2p_requests')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', user.id)
          .eq('status', 'pending'),
      ]);

      const profileName = typeof profileResult.data?.full_name === 'string' ? profileResult.data.full_name.trim() : '';
      if (profileName) {
        setAccountName(profileName);
      } else if (!profileNameFromMetadata) {
        setAccountName('there');
      }

      const allLoans = (loansResult.data || []) as LoanRecord[];
      const allPayments = paymentsResult.data || [];
      const paymentTotals = new Map<string, number>();

      allPayments.forEach((payment: any) => {
        const current = paymentTotals.get(payment.loan_id) || 0;
        paymentTotals.set(payment.loan_id, current + Number(payment.amount || 0));
      });

      const enrichedLoans = allLoans.map((loan) => {
        const paid = paymentTotals.get(loan.id) || 0;
        const remaining = loan.category === 'money' ? Math.max(Number(loan.amount || 0) - paid, 0) : 0;
        return {
          ...loan,
          remaining_amount: remaining,
        };
      });

      const moneyLoans = enrichedLoans.filter((loan) => loan.category === 'money');
      const lent = moneyLoans
        .filter((loan) => loan.type === 'lent')
        .reduce((acc, loan) => acc + Number(loan.remaining_amount || 0), 0);
      const borrowed = moneyLoans
        .filter((loan) => loan.type === 'borrowed')
        .reduce((acc, loan) => acc + Number(loan.remaining_amount || 0), 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const soon = new Date(now);
      soon.setDate(now.getDate() + 7);

      const actionableDueItems = enrichedLoans
        .filter((loan) => loan.status === 'active' && loan.due_date)
        .map((loan) => ({
          ...loan,
          due_date: loan.due_date,
        }))
        .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());

      const overdueCount = actionableDueItems.filter((loan) => {
        const due = new Date(`${loan.due_date}T12:00:00`);
        return due.getTime() < now.getTime();
      }).length;

      const dueSoonCount = actionableDueItems.filter((loan) => {
        const due = new Date(`${loan.due_date}T12:00:00`);
        return due.getTime() >= now.getTime() && due.getTime() <= soon.getTime();
      }).length;

      setSummary({ lent, borrowed, overdue: overdueCount, dueSoon: dueSoonCount });
      setDueItems(actionableDueItems.slice(0, 5));
      setRecentLoans(enrichedLoans.slice(0, 8));
      setRequestCount(requestsResult.count || 0);
    } finally {
      setRefreshing(false);
    }
  };

  const balance = summary.lent - summary.borrowed;

  return (
    <Screen style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={Colors[colorScheme].tint} />}
      >
        <View style={styles.header}>
          <RNView style={styles.greetingRow}>
            <View>
              <Text style={styles.greeting}>{greeting}, {accountName}!</Text>
              <Text style={styles.subtitle}>Focus on what needs attention first.</Text>
            </View>
            <TouchableOpacity style={styles.requestIcon} onPress={() => router.push('/requests')}>
              <Bell size={24} color="#0F172A" />
              {requestCount > 0 && (
                <RNView style={styles.badge}>
                  <Text style={styles.badgeText}>{requestCount}</Text>
                </RNView>
              )}
            </TouchableOpacity>
          </RNView>
        </View>

        <Card style={styles.balanceCard}>
          <RNView style={styles.balanceCardHeader}>
            <View>
              <Text style={styles.balanceLabel}>Net position</Text>
              <Text style={styles.balanceValue}>{formatSignedCurrency(balance)}</Text>
            </View>
            <RNView style={[styles.netBadge, balance >= 0 ? styles.netBadgePositive : styles.netBadgeNegative]}>
              <Text style={[styles.netBadgeText, balance >= 0 ? styles.netBadgeTextPositive : styles.netBadgeTextNegative]}>
                {balance >= 0 ? 'Ahead' : 'Behind'}
              </Text>
            </RNView>
          </RNView>
          <Text style={styles.balanceHint}>
            {balance >= 0 ? 'You are owed more than you owe.' : 'You owe more than you are owed.'}
          </Text>

          <RNView style={styles.balanceBreakdownRow}>
            <RNView style={styles.balanceBreakdownCard}>
              <RNView style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <ArrowUpRight size={18} color="#10B981" />
              </RNView>
              <Text style={styles.breakdownLabel}>To collect</Text>
              <Text style={[styles.breakdownValue, { color: '#047857' }]}>{formatCurrency(summary.lent)}</Text>
            </RNView>
            <RNView style={styles.balanceBreakdownCard}>
              <RNView style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <ArrowDownLeft size={18} color="#EF4444" />
              </RNView>
              <Text style={styles.breakdownLabel}>To pay</Text>
              <Text style={[styles.breakdownValue, { color: '#B91C1C' }]}>{formatCurrency(summary.borrowed)}</Text>
            </RNView>
          </RNView>

          <View style={styles.distributionSection}>
            <RNView style={styles.distributionLabels}>
              <Text style={styles.distributionTitle}>Balance mix</Text>
              <Text style={styles.distributionPercent}>
                {getCollectShare(summary.lent, summary.borrowed)}% collect
              </Text>
            </RNView>
            <RNView style={styles.distributionBar}>
              <RNView
                style={[
                  styles.distributionCollect,
                  { flex: Math.max(summary.lent, 0.0001) },
                ]}
              />
              <RNView
                style={[
                  styles.distributionPay,
                  { flex: Math.max(summary.borrowed, 0.0001) },
                ]}
              />
            </RNView>
            <RNView style={styles.distributionLegend}>
              <RNView style={styles.legendItem}>
                <RNView style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>{getCollectShare(summary.lent, summary.borrowed)}% to collect</Text>
              </RNView>
              <RNView style={styles.legendItem}>
                <RNView style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>{100 - getCollectShare(summary.lent, summary.borrowed)}% to pay</Text>
              </RNView>
            </RNView>
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Due next</Text>
            <TouchableOpacity onPress={() => router.push('/requests')}>
              <Text style={styles.sectionLink}>Requests</Text>
            </TouchableOpacity>
          </View>

          <RNView style={styles.insightRow}>
            <Card style={styles.insightCard}>
              <RNView style={[styles.insightIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <AlertTriangle size={18} color="#F59E0B" />
              </RNView>
              <Text style={styles.insightValue}>{summary.overdue}</Text>
              <Text style={styles.insightLabel}>Overdue</Text>
            </Card>
            <Card style={styles.insightCard}>
              <RNView style={[styles.insightIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Clock3 size={18} color="#3B82F6" />
              </RNView>
              <Text style={styles.insightValue}>{summary.dueSoon}</Text>
              <Text style={styles.insightLabel}>Due in 7 days</Text>
            </Card>
            <Card style={styles.insightCard}>
              <RNView style={[styles.insightIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <CheckCircle2 size={18} color="#10B981" />
              </RNView>
              <Text style={styles.insightValue}>{recentLoans.length}</Text>
              <Text style={styles.insightLabel}>Open records</Text>
            </Card>
          </RNView>

          {dueItems.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing due soon.</Text>
              <Text style={styles.emptyText}>Your active records are clear for now. Add a new one when something happens.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/new-loan')}>
                <Text style={styles.emptyButtonText}>Record transaction</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            dueItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listItemWrapper} onPress={() => router.push(`/loan/${item.id}`)}>
                <Card style={styles.listCard}>
                  <RNView style={styles.listLeft}>
                    <RNView style={[styles.iconBox, { backgroundColor: item.category === 'item' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(148, 163, 184, 0.08)' }]}>
                      {item.category === 'item' ? (
                        <Box size={20} color="#6366F1" />
                      ) : (
                        <Wallet size={20} color={item.type === 'lent' ? '#10B981' : '#EF4444'} />
                      )}
                    </RNView>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{item.contacts?.name || 'Unknown contact'}</Text>
                      <Text style={styles.listMeta}>{getDueDescriptor(item.due_date)}</Text>
                      <Text style={styles.listSub}>{getRecordDescriptor(item)}</Text>
                    </View>
                  </RNView>
                  <RNView style={styles.listRight}>
                    <Text style={[styles.amountText, { color: item.type === 'lent' ? '#10B981' : '#EF4444' }]}>{getRecordValue(item)}</Text>
                  </RNView>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => router.push('/contacts')}>
              <Text style={styles.sectionLink}>Contacts</Text>
            </TouchableOpacity>
          </View>

          {recentLoans.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No activity recorded yet.</Text>
              <Text style={styles.emptyText}>Start with one record so the overview can show who owes what and when.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/new-loan')}>
                <Text style={styles.emptyButtonText}>New transaction</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            recentLoans.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listItemWrapper} onPress={() => router.push(`/loan/${item.id}`)}>
                <Card style={styles.listCard}>
                  <RNView style={styles.listLeft}>
                    <RNView style={[styles.iconBox, { backgroundColor: item.category === 'item' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(148, 163, 184, 0.08)' }]}>
                      {item.category === 'item' ? (
                        <Box size={20} color="#6366F1" />
                      ) : (
                        <Wallet size={20} color={item.type === 'lent' ? '#10B981' : '#EF4444'} />
                      )}
                    </RNView>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{item.contacts?.name || 'Unknown contact'}</Text>
                      <Text style={styles.listSub}>{getRecordDescriptor(item)}</Text>
                    </View>
                  </RNView>
                  <RNView style={styles.listRight}>
                    <Text style={[styles.amountText, { color: item.category === 'money' ? (item.type === 'lent' ? '#10B981' : '#EF4444') : '#6366F1' }]}>{getRecordValue(item)}</Text>
                    <Text style={styles.statusBadge}>{item.status}</Text>
                  </RNView>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: fabBottomOffset }]} onPress={() => router.push('/new-loan')}>
        <Plus color="#fff" size={30} />
      </TouchableOpacity>
    </Screen>
  );
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatSignedCurrency(value: number) {
  if (value === 0) return '$0';
  return value > 0 ? `+$${Math.round(value).toLocaleString()}` : `-$${Math.round(Math.abs(value)).toLocaleString()}`;
}

function getCollectShare(lent: number, borrowed: number) {
  const total = lent + borrowed;
  if (total <= 0) return 50;
  return Math.round((lent / total) * 100);
}

function getDueDescriptor(dueDate: string | null) {
  if (!dueDate) return 'No due date';
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return dueDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays > 1) return `Due in ${diffDays} days`;
  if (diffDays === -1) return '1 day overdue';
  return `${Math.abs(diffDays)} days overdue`;
}

function getRecordDescriptor(item: LoanRecord) {
  if (item.category === 'item') {
    return item.type === 'lent'
      ? `Needs to return ${item.item_name || 'item'}`
      : `You need to return ${item.item_name || 'item'}`;
  }

  return item.type === 'lent' ? 'Money you should collect' : 'Money you should pay back';
}

function getRecordValue(item: LoanRecord) {
  if (item.category === 'item') {
    return 'ITEM';
  }

  const symbol = getCurrencySymbol(item.currency || 'USD');
  const amount = Math.round(Number(item.remaining_amount || item.amount || 0)).toLocaleString();
  return `${item.type === 'lent' ? '+' : '-'}${symbol}${amount}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 36,
  },
  header: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  requestIcon: {
    padding: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  balanceCard: {
    padding: 22,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  balanceLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#0F172A',
    fontSize: 38,
    fontWeight: '900',
    marginTop: 8,
  },
  balanceHint: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  netBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  netBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  netBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  netBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  netBadgeTextPositive: {
    color: '#047857',
  },
  netBadgeTextNegative: {
    color: '#B91C1C',
  },
  balanceBreakdownRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  balanceBreakdownCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  distributionSection: {
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  distributionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  distributionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distributionPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  distributionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  distributionCollect: {
    backgroundColor: '#10B981',
  },
  distributionPay: {
    backgroundColor: '#EF4444',
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  section: {
    marginBottom: 28,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  insightCard: {
    flex: 1,
    padding: 14,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 22,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 14,
  },
  emptyButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listItemWrapper: {
    marginBottom: 12,
  },
  listCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  listMeta: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 2,
  },
  listSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  listRight: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    marginLeft: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
});
