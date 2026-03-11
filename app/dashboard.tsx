import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View as RNView,
  useWindowDimensions,
} from 'react-native';
import { Redirect, Stack, useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock3,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';

import { Card, Screen, Text } from '@/components/Themed';
import { WebAccountLayout } from '@/components/website/WebAccountLayout';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

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

type PaymentRecord = {
  amount: number | null;
  loan_id: string;
  payment_method: 'money' | 'item' | null;
};

type DashboardStats = {
  openBalance: number;
  lent: number;
  borrowed: number;
  activeRecords: number;
  pendingRequests: number;
  dueSoon: number;
};

type DashboardRecordFilter = 'lent' | 'borrowed' | 'open' | 'active' | 'dueSoon';

const INITIAL_STATS: DashboardStats = {
  openBalance: 0,
  lent: 0,
  borrowed: 0,
  activeRecords: 0,
  pendingRequests: 0,
  dueSoon: 0,
};

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toFixed(2)}`;
  }
}

function getRecordValue(record: LoanRecord) {
  if (record.category === 'item') {
    return record.item_name || 'Item';
  }

  const baseAmount =
    record.status === 'paid' ? Number(record.amount || 0) : Number(record.remaining_amount ?? record.amount ?? 0);
  return formatCurrency(baseAmount, record.currency || 'USD');
}

function getDueLabel(dueDate?: string | null) {
  if (!dueDate) return 'No due date';

  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 'No due date';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

function WorkspaceAction({
  label,
  description,
  onPress,
  tone = 'default',
  icon,
  compact = false,
}: {
  label: string;
  description: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={({ hovered, pressed }) => [
        styles.actionCard,
        styles.interactiveSurface,
        compact && styles.actionCardCompact,
        tone === 'primary' ? styles.actionCardPrimary : null,
        hovered && styles.interactiveSurfaceHovered,
        pressed && styles.interactiveSurfacePressed,
      ]}
      onPress={onPress}
    >
      <RNView style={[styles.actionIcon, tone === 'primary' ? styles.actionIconPrimary : null]}>{icon}</RNView>
      <Text style={[styles.actionLabel, tone === 'primary' ? styles.actionLabelPrimary : null]}>{label}</Text>
      <Text style={[styles.actionDescription, tone === 'primary' ? styles.actionDescriptionPrimary : null]}>
        {description}
      </Text>
    </Pressable>
  );
}

function getFilterLabel(filter: DashboardRecordFilter | null) {
  if (filter === 'lent') return 'They owe you';
  if (filter === 'borrowed') return 'You owe';
  if (filter === 'open') return 'Open balance';
  if (filter === 'active') return 'Active records';
  if (filter === 'dueSoon') return 'Due soon';
  return 'All open records';
}

export default function AccountDashboardScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { initialized, user } = useAuthStore();
  const [stats, setStats] = React.useState<DashboardStats>(INITIAL_STATS);
  const [allRecords, setAllRecords] = React.useState<LoanRecord[]>([]);
  const [recentRecords, setRecentRecords] = React.useState<LoanRecord[]>([]);
  const [recordFilter, setRecordFilter] = React.useState<DashboardRecordFilter | null>('open');
  const [recentExpanded, setRecentExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const compactWeb = Platform.OS === 'web' && width < 820;

  const loadDashboard = React.useCallback(
    async () => {
      if (!user?.id) return;

      setLoading(true);

      try {
        const [loansResult, paymentsResult, requestsResult] = await Promise.all([
          supabase
            .from('loans')
            .select('id, amount, type, status, category, created_at, due_date, item_name, currency, contacts(name)')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('amount, loan_id, payment_method')
            .eq('user_id', user.id),
          supabase
            .from('p2p_requests')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', user.id)
            .eq('status', 'pending'),
        ]);

        if (loansResult.error) {
          throw loansResult.error;
        }
        if (paymentsResult.error) {
          throw paymentsResult.error;
        }
        if (requestsResult.error) {
          throw requestsResult.error;
        }

        const paymentTotals = new Map<string, number>();
        (paymentsResult.data as PaymentRecord[] | null)?.forEach((payment) => {
          if (payment.payment_method !== 'money') return;
          const current = paymentTotals.get(payment.loan_id) || 0;
          paymentTotals.set(payment.loan_id, current + Number(payment.amount || 0));
        });

        const enrichedLoans = ((loansResult.data || []) as LoanRecord[]).map((loan) => {
          const paid = paymentTotals.get(loan.id) || 0;
          const remainingAmount =
            loan.category === 'money' ? Math.max(Number(loan.amount || 0) - paid, 0) : Number(loan.amount || 0);
          return {
            ...loan,
            remaining_amount: remainingAmount,
          };
        });

        const openLoans = enrichedLoans.filter((loan) => loan.status !== 'paid');
        const moneyOpenLoans = openLoans.filter((loan) => loan.category === 'money');
        const lent = moneyOpenLoans
          .filter((loan) => loan.type === 'lent')
          .reduce((acc, loan) => acc + Number(loan.remaining_amount || 0), 0);
        const borrowed = moneyOpenLoans
          .filter((loan) => loan.type === 'borrowed')
          .reduce((acc, loan) => acc + Number(loan.remaining_amount || 0), 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

        const dueSoon = openLoans.filter((loan) => {
          if (loan.status !== 'active' || !loan.due_date) return false;
          const due = new Date(`${loan.due_date}T12:00:00`);
          return due.getTime() >= now.getTime() && due.getTime() <= nextWeek.getTime();
        }).length;

        setStats({
          openBalance: lent - borrowed,
          lent,
          borrowed,
          activeRecords: openLoans.length,
          pendingRequests: requestsResult.count || 0,
          dueSoon,
        });

        setRecentRecords(
          [...enrichedLoans]
            .sort((a, b) => getTimestamp(b.created_at) - getTimestamp(a.created_at))
            .slice(0, 5)
        );
        setAllRecords(
          [...openLoans].sort((a, b) => getTimestamp(b.created_at) - getTimestamp(a.created_at))
        );
      } catch (error: any) {
        console.error('web dashboard load failed:', error?.message || error);
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`web-dashboard:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard, user?.id]);

  if (Platform.OS === 'web' && initialized && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (Platform.OS !== 'web') {
    return (
      <Screen>
        <Text style={styles.mobileTitle}>Dashboard is available on web.</Text>
      </Screen>
    );
  }

  const filteredRecords = allRecords.filter((record) => {
    if (recordFilter === 'lent') {
      return record.category === 'money' && record.type === 'lent' && record.status !== 'paid';
    }
    if (recordFilter === 'borrowed') {
      return record.category === 'money' && record.type === 'borrowed' && record.status !== 'paid';
    }
    if (recordFilter === 'active') {
      return ['active', 'partial', 'overdue'].includes(String(record.status || '').toLowerCase());
    }
    if (recordFilter === 'dueSoon') {
      if (record.status !== 'active' || !record.due_date) return false;
      const due = new Date(`${record.due_date}T12:00:00`);
      if (Number.isNaN(due.getTime())) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return due.getTime() >= now.getTime() && due.getTime() <= nextWeek.getTime();
    }

    return record.category === 'money' ? record.status !== 'paid' : true;
  });

  return (
    <WebAccountLayout
      eyebrow="Dashboard"
      title="Your Buddy Balance web workspace."
      description="This dashboard is the online version of your app. The mobile flows stay here, and the extra desktop tools will grow from this workspace."
    >
      <Stack.Screen options={{ headerShown: false }} />

      <RNView style={[styles.splitGrid, compactWeb && styles.stackGrid]}>
        <Card style={[styles.panelCard, compactWeb && styles.panelCardCompact]}>
          <Text style={styles.panelTitle}>Balance snapshot</Text>
          <RNView style={[styles.balanceRow, compactWeb && styles.stackGridTight]}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.balanceMetric,
                styles.interactiveSurface,
                compactWeb && styles.metricCompact,
                hovered && styles.interactiveSurfaceHovered,
                pressed && styles.interactiveSurfacePressed,
              ]}
              onPress={() => setRecordFilter('lent')}
            >
              <RNView style={[styles.balanceIcon, styles.balanceIconGreen]}>
                <ArrowUpRight size={16} color="#047857" />
              </RNView>
              <Text style={styles.balanceLabel}>They owe you</Text>
              <Text style={styles.balanceValue}>{formatCurrency(stats.lent)}</Text>
            </Pressable>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.balanceMetric,
                styles.interactiveSurface,
                compactWeb && styles.metricCompact,
                hovered && styles.interactiveSurfaceHovered,
                pressed && styles.interactiveSurfacePressed,
              ]}
              onPress={() => setRecordFilter('borrowed')}
            >
              <RNView style={[styles.balanceIcon, styles.balanceIconRed]}>
                <ArrowDownLeft size={16} color="#B91C1C" />
              </RNView>
              <Text style={styles.balanceLabel}>You owe</Text>
              <Text style={styles.balanceValue}>{formatCurrency(stats.borrowed)}</Text>
            </Pressable>
          </RNView>
        </Card>

      </RNView>

      <RNView style={[styles.statsGrid, compactWeb && styles.stackGrid]}>
        <Pressable
          onPress={() => setRecordFilter('open')}
          style={({ hovered, pressed }) => [
            styles.statCardButton,
            styles.interactiveSurface,
            compactWeb && styles.statCardButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
        >
          <Card style={[styles.statCard, compactWeb && styles.statCardCompact]}>
            <RNView style={styles.statTopRow}>
              <RNView style={[styles.statIconWrap, styles.statIconDark]}>
                <Wallet size={18} color="#0F172A" />
              </RNView>
              <Text style={styles.statEyebrow}>Open balance</Text>
            </RNView>
            <Text style={styles.statValue}>{formatCurrency(stats.openBalance)}</Text>
            <Text style={styles.statMeta}>Net across your open money records</Text>
          </Card>
        </Pressable>

        <Pressable
          onPress={() => setRecordFilter('active')}
          style={({ hovered, pressed }) => [
            styles.statCardButton,
            styles.interactiveSurface,
            compactWeb && styles.statCardButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
        >
          <Card style={[styles.statCard, compactWeb && styles.statCardCompact]}>
            <RNView style={styles.statTopRow}>
              <RNView style={[styles.statIconWrap, styles.statIconBlue]}>
                <Sparkles size={18} color="#1D4ED8" />
              </RNView>
              <Text style={styles.statEyebrow}>Active records</Text>
            </RNView>
            <Text style={styles.statValue}>{stats.activeRecords}</Text>
            <Text style={styles.statMeta}>Live records still in progress</Text>
          </Card>
        </Pressable>

        <Pressable
          onPress={() => router.push('/requests')}
          style={({ hovered, pressed }) => [
            styles.statCardButton,
            styles.interactiveSurface,
            compactWeb && styles.statCardButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
        >
          <Card style={[styles.statCard, compactWeb && styles.statCardCompact]}>
            <RNView style={styles.statTopRow}>
              <RNView style={[styles.statIconWrap, styles.statIconAmber]}>
                <Bell size={18} color="#B45309" />
              </RNView>
              <Text style={styles.statEyebrow}>Pending requests</Text>
            </RNView>
            <Text style={styles.statValue}>{stats.pendingRequests}</Text>
            <Text style={styles.statMeta}>Items waiting for your confirmation</Text>
          </Card>
        </Pressable>

        <Pressable
          onPress={() => setRecordFilter('dueSoon')}
          style={({ hovered, pressed }) => [
            styles.statCardButton,
            styles.interactiveSurface,
            compactWeb && styles.statCardButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
        >
          <Card style={[styles.statCard, compactWeb && styles.statCardCompact]}>
            <RNView style={styles.statTopRow}>
              <RNView style={[styles.statIconWrap, styles.statIconGreen]}>
                <Clock3 size={18} color="#047857" />
              </RNView>
              <Text style={styles.statEyebrow}>Due soon</Text>
            </RNView>
            <Text style={styles.statValue}>{stats.dueSoon}</Text>
            <Text style={styles.statMeta}>Next 7 days</Text>
          </Card>
        </Pressable>
      </RNView>

      <Card style={[styles.panelCard, compactWeb && styles.panelCardCompact]}>
        <RNView style={[styles.recentHeader, compactWeb && styles.recentHeaderCompact]}>
          <RNView>
            <Text style={styles.panelTitle}>Open records</Text>
            <Text style={styles.panelBody}>
              {getFilterLabel(recordFilter)}: {filteredRecords.length}
            </Text>
          </RNView>
          <Pressable
            onPress={() => setRecordFilter('open')}
            style={({ hovered, pressed }) => [
              styles.inlineActionButton,
              hovered && styles.inlineActionButtonHovered,
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={styles.refreshText}>Show all</Text>
          </Pressable>
        </RNView>

        {loading ? (
          <RNView style={styles.loadingState}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading records...</Text>
          </RNView>
        ) : filteredRecords.length === 0 ? (
          <RNView style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No records match this view.</Text>
            <Text style={styles.emptyText}>
              Choose another metric or create a new record to populate this section.
            </Text>
          </RNView>
        ) : (
          filteredRecords.map((record) => (
            <Pressable
              key={record.id}
              style={({ hovered, pressed }) => [
                styles.recordRow,
                styles.interactiveSurface,
                compactWeb && styles.recordRowCompact,
                hovered && styles.interactiveSurfaceHovered,
                pressed && styles.interactiveSurfacePressed,
              ]}
              onPress={() => router.push(`/loan/${record.id}`)}
            >
              <RNView style={styles.recordCopy}>
                <Text style={styles.recordName}>{record.contacts?.name || 'Unknown contact'}</Text>
                <Text style={styles.recordMeta}>
                  {record.category === 'item'
                    ? 'Item record'
                    : record.type === 'lent'
                      ? 'Lent record'
                      : 'Borrowed record'}
                </Text>
                <Text style={styles.recordSubmeta}>{getDueLabel(record.due_date)}</Text>
              </RNView>
              <RNView style={[styles.recordValueBlock, compactWeb && styles.recordValueBlockCompact]}>
                <Text style={styles.recordValue}>{getRecordValue(record)}</Text>
                <Text style={styles.recordStatus}>{record.status}</Text>
              </RNView>
            </Pressable>
          ))
        )}
      </Card>

      <Card style={[styles.panelCard, compactWeb && styles.panelCardCompact]}>
        <Text style={styles.panelTitle}>Run the app from here</Text>
        <Text style={styles.panelBody}>
          Start the same core flows you already use on mobile. Account and admin navigation stay in the sidebar so the workspace does not repeat itself.
        </Text>
        <RNView style={[styles.actionGrid, compactWeb && styles.stackGridTight]}>
          <WorkspaceAction
            label="New record"
            description="Create a new lend, borrow, or shared item record."
            tone="primary"
            icon={<Plus size={18} color="#FFFFFF" />}
            compact={compactWeb}
            onPress={() => router.push('/new-loan')}
          />
          <WorkspaceAction
            label="Add friend"
            description="Create a new contact or send a friend-linked invite."
            icon={<UserPlus size={18} color="#4F46E5" />}
            compact={compactWeb}
            onPress={() => router.push('/new-contact?mode=friend')}
          />
          <WorkspaceAction
            label="Requests"
            description="Review confirmations, invites, and pending actions."
            icon={<Bell size={18} color="#4F46E5" />}
            compact={compactWeb}
            onPress={() => router.push('/requests')}
          />
          <WorkspaceAction
            label="Contacts"
            description="Open the shared contact list and relationship timeline."
            icon={<Users size={18} color="#4F46E5" />}
            compact={compactWeb}
            onPress={() => router.push('/(tabs)/contacts' as any)}
          />
        </RNView>
      </Card>

      <Card style={[styles.panelCard, compactWeb && styles.panelCardCompact]}>
        <RNView style={[styles.recentHeader, compactWeb && styles.recentHeaderCompact]}>
          <Text style={styles.panelTitle}>Recent records</Text>
          <Pressable
            onPress={() => setRecentExpanded((current) => !current)}
            style={({ hovered, pressed }) => [
              styles.sectionToggle,
              styles.interactiveButtonInline,
              hovered && styles.inlineActionButtonHovered,
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={styles.refreshText}>{recentExpanded ? 'Hide' : `${recentRecords.length} records`}</Text>
            {recentExpanded ? <ChevronUp size={16} color="#4F46E5" /> : <ChevronDown size={16} color="#4F46E5" />}
          </Pressable>
        </RNView>

        {loading ? (
          <RNView style={styles.loadingState}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading your web workspace...</Text>
          </RNView>
        ) : !recentExpanded ? (
          <RNView style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Recent records are minimized.</Text>
            <Text style={styles.emptyText}>
              Expand this section when you want to review the latest activity across your records.
            </Text>
          </RNView>
        ) : (
          <>
            {recentRecords.length === 0 ? (
              <RNView style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No records yet.</Text>
                <Text style={styles.emptyText}>
                  Create your first shared record here and this dashboard will start behaving like the online version of the app.
                </Text>
              </RNView>
            ) : (
              recentRecords.map((record) => (
                <Pressable
                  key={record.id}
                  style={({ hovered, pressed }) => [
                    styles.recordRow,
                    styles.interactiveSurface,
                    compactWeb && styles.recordRowCompact,
                    hovered && styles.interactiveSurfaceHovered,
                    pressed && styles.interactiveSurfacePressed,
                  ]}
                  onPress={() => router.push(`/loan/${record.id}`)}
                >
                  <RNView style={styles.recordCopy}>
                    <Text style={styles.recordName}>{record.contacts?.name || 'Unknown contact'}</Text>
                    <Text style={styles.recordMeta}>
                      {record.category === 'item' ? 'Item record' : record.type === 'lent' ? 'Lent record' : 'Borrowed record'}
                    </Text>
                    <Text style={styles.recordSubmeta}>{getDueLabel(record.due_date)}</Text>
                  </RNView>
                  <RNView style={[styles.recordValueBlock, compactWeb && styles.recordValueBlockCompact]}>
                    <Text style={styles.recordValue}>{getRecordValue(record)}</Text>
                    <Text style={styles.recordStatus}>{record.status}</Text>
                  </RNView>
                </Pressable>
              ))
            )}
          </>
        )}
      </Card>
    </WebAccountLayout>
  );
}

const styles = StyleSheet.create({
  mobileTitle: {
    padding: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  interactiveSurface: {
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
          transitionDuration: '150ms',
          transitionTimingFunction: 'ease',
          transitionProperty: 'transform, opacity, background-color, border-color, box-shadow',
        } as any)
      : null),
  },
  interactiveSurfaceHovered: {
    transform: [{ translateY: -2 }, { scale: 1.01 }],
    opacity: 0.99,
  },
  interactiveSurfacePressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  interactiveButtonInline: {
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
          transitionDuration: '140ms',
          transitionTimingFunction: 'ease',
          transitionProperty: 'transform, opacity, background-color',
        } as any)
      : null),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stackGrid: {
    flexDirection: 'column',
  },
  stackGridTight: {
    flexDirection: 'column',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    padding: 20,
  },
  statCardButton: {
    flex: 1,
    minWidth: 220,
  },
  statCardButtonCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  statCardCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconDark: {
    backgroundColor: '#E2E8F0',
  },
  statIconBlue: {
    backgroundColor: '#DBEAFE',
  },
  statIconAmber: {
    backgroundColor: '#FEF3C7',
  },
  statIconGreen: {
    backgroundColor: '#D1FAE5',
  },
  statEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  statMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineActionButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineActionButtonHovered: {
    backgroundColor: '#EEF2FF',
    transform: [{ translateY: -1 }],
  },
  inlineActionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  splitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  panelCard: {
    flex: 1,
    minWidth: 320,
    padding: 22,
  },
  panelCardCompact: {
    width: '100%',
    minWidth: 0,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  panelBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  actionGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionCardCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  actionCardPrimary: {
    backgroundColor: '#101A3A',
    borderColor: '#101A3A',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionLabel: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  actionLabelPrimary: {
    color: '#FFFFFF',
  },
  actionDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  actionDescriptionPrimary: {
    color: 'rgba(255,255,255,0.82)',
  },
  linkStack: {
    marginTop: 18,
    gap: 10,
  },
  inlineLinkRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  inlineLinkTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inlineLinkMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  balanceRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  balanceMetric: {
    flex: 1,
    minWidth: 220,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  metricCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  balanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceIconGreen: {
    backgroundColor: '#D1FAE5',
  },
  balanceIconRed: {
    backgroundColor: '#FEE2E2',
  },
  balanceLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  adminCard: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  loadingState: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  recordRow: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  recordCopy: {
    flex: 1,
    gap: 4,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  recordMeta: {
    fontSize: 13,
    color: '#475569',
  },
  recordSubmeta: {
    fontSize: 12,
    color: '#64748B',
  },
  recordValueBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recordValueBlockCompact: {
    alignItems: 'flex-start',
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  recordStatus: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#6366F1',
  },
});
