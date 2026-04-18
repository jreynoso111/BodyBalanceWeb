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
  Wallet,
} from 'lucide-react-native';

import { Card, Screen, Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
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
  const colorScheme = useColorScheme();
  const { initialized, user } = useAuthStore();
  const [stats, setStats] = React.useState<DashboardStats>(INITIAL_STATS);
  const [allRecords, setAllRecords] = React.useState<LoanRecord[]>([]);
  const [recentRecords, setRecentRecords] = React.useState<LoanRecord[]>([]);
  const [recordFilter, setRecordFilter] = React.useState<DashboardRecordFilter | null>('open');
  const [openExpanded, setOpenExpanded] = React.useState(false);
  const [recentExpanded, setRecentExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const compactWeb = Platform.OS === 'web' && width < 820;
  const narrowPanels = Platform.OS === 'web' && width < 1080;
  const isDark = colorScheme === 'dark';
  const quickLinks = [
    { label: 'Contacts', href: '/contacts' },
    { label: 'Profile', href: '/profile' },
    { label: 'Membership', href: '/subscription' },
    { label: 'Notifications', href: '/notifications' },
  ] as const;

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
    if (!user?.id) {
      setStats(INITIAL_STATS);
      setAllRecords([]);
      setRecentRecords([]);
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [loadDashboard, user?.id]);

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

      <RNView style={[styles.dashboardActionsRow, compactWeb && styles.stackGridTight]}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.dashboardActionButton,
            styles.dashboardActionButtonPrimary,
            isDark && styles.dashboardActionButtonPrimaryDark,
            styles.interactiveSurface,
            compactWeb && styles.dashboardActionButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
          onPress={() => router.push('/new-loan')}
        >
          <RNView style={styles.dashboardActionIconPrimary}>
            <Plus size={16} color="#FFFFFF" />
          </RNView>
          <Text style={styles.dashboardActionPrimaryText}>New record</Text>
        </Pressable>

        <Pressable
          style={({ hovered, pressed }) => [
            styles.dashboardActionButton,
            isDark && styles.dashboardActionButtonDark,
            styles.interactiveSurface,
            compactWeb && styles.dashboardActionButtonCompact,
            hovered && styles.interactiveSurfaceHovered,
            pressed && styles.interactiveSurfacePressed,
          ]}
          onPress={() => router.push('/new-contact?mode=friend')}
        >
          <RNView style={[styles.dashboardActionIconSecondary, isDark && styles.dashboardActionIconSecondaryDark]}>
            <UserPlus size={16} color={isDark ? '#E2E8F0' : '#4F46E5'} />
          </RNView>
          <Text style={[styles.dashboardActionSecondaryText, isDark && styles.dashboardActionSecondaryTextDark]}>Add friend</Text>
        </Pressable>

        {quickLinks.map((item) => (
          <Pressable
            key={item.href}
            style={({ hovered, pressed }) => [
              styles.dashboardQuickButton,
              isDark && styles.dashboardQuickButtonDark,
              styles.interactiveSurface,
              compactWeb && styles.dashboardActionButtonCompact,
              hovered && styles.interactiveSurfaceHovered,
              pressed && styles.interactiveSurfacePressed,
            ]}
            onPress={() => router.push(item.href)}
          >
            <Text style={[styles.dashboardQuickButtonText, isDark && styles.dashboardQuickButtonTextDark]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
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
              <RNView style={[styles.statIconWrap, styles.statIconDark, isDark && styles.statIconWrapDark]}>
                <Wallet size={18} color={isDark ? '#E2E8F0' : '#0F172A'} />
              </RNView>
              <Text style={[styles.statEyebrow, isDark && styles.statEyebrowDark]}>Open balance</Text>
            </RNView>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{formatCurrency(stats.openBalance)}</Text>
            <Text style={[styles.statMeta, isDark && styles.statMetaDark]}>Net across your open money records</Text>
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
              <RNView style={[styles.statIconWrap, styles.statIconBlue, isDark && styles.statIconWrapDark]}>
                <Sparkles size={18} color={isDark ? '#E2E8F0' : '#1D4ED8'} />
              </RNView>
              <Text style={[styles.statEyebrow, isDark && styles.statEyebrowDark]}>Active records</Text>
            </RNView>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.activeRecords}</Text>
            <Text style={[styles.statMeta, isDark && styles.statMetaDark]}>Live records still in progress</Text>
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
              <RNView style={[styles.statIconWrap, styles.statIconAmber, isDark && styles.statIconWrapDark]}>
                <Bell size={18} color={isDark ? '#E2E8F0' : '#B45309'} />
              </RNView>
              <Text style={[styles.statEyebrow, isDark && styles.statEyebrowDark]}>Pending requests</Text>
            </RNView>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.pendingRequests}</Text>
            <Text style={[styles.statMeta, isDark && styles.statMetaDark]}>Items waiting for your confirmation</Text>
          </Card>
        </Pressable>
      </RNView>

      <RNView style={[styles.splitGrid, compactWeb && styles.stackGrid]}>
        <Card style={[styles.panelCard, compactWeb && styles.panelCardCompact]}>
          <Text style={[styles.panelTitle, isDark && styles.panelTitleDark]}>Balance snapshot</Text>
          <RNView style={[styles.balanceRow, compactWeb && styles.stackGridTight]}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.balanceMetric,
                isDark && styles.balanceMetricDark,
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
              <Text style={[styles.balanceLabel, isDark && styles.balanceLabelDark]}>They owe you</Text>
              <Text style={[styles.balanceValue, isDark && styles.balanceValueDark]}>{formatCurrency(stats.lent)}</Text>
            </Pressable>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.balanceMetric,
                isDark && styles.balanceMetricDark,
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
              <Text style={[styles.balanceLabel, isDark && styles.balanceLabelDark]}>You owe</Text>
              <Text style={[styles.balanceValue, isDark && styles.balanceValueDark]}>{formatCurrency(stats.borrowed)}</Text>
            </Pressable>
          </RNView>
        </Card>
      </RNView>

      <RNView style={[styles.statsGrid, compactWeb && styles.stackGrid]}>
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
              <RNView style={[styles.statIconWrap, styles.statIconGreen, isDark && styles.statIconWrapDark]}>
                <Clock3 size={18} color={isDark ? '#E2E8F0' : '#047857'} />
              </RNView>
              <Text style={[styles.statEyebrow, isDark && styles.statEyebrowDark]}>Due soon</Text>
            </RNView>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.dueSoon}</Text>
            <Text style={[styles.statMeta, isDark && styles.statMetaDark]}>Next 7 days</Text>
          </Card>
        </Pressable>
      </RNView>

      <RNView style={styles.recordPanelsStack}>
        <RNView style={styles.recordPanelBlock}>
          <Card
            style={[
              styles.panelCard,
              styles.stackedPanelCard,
              compactWeb && styles.panelCardCompact,
            ]}
          >
          <RNView style={[styles.recentHeader, narrowPanels && styles.recentHeaderCompact]}>
            <RNView>
              <Text style={[styles.panelTitle, isDark && styles.panelTitleDark]}>Open records</Text>
              <Text style={[styles.panelBody, isDark && styles.panelBodyDark]}>
                {getFilterLabel(recordFilter)}: {filteredRecords.length}
              </Text>
            </RNView>
            <RNView style={[styles.panelActions, compactWeb && styles.panelActionsCompact]}>
              <Pressable
                onPress={() => setRecordFilter('open')}
                style={({ hovered, pressed }) => [
                  styles.inlineActionButton,
                  hovered && (isDark ? styles.inlineActionButtonHoveredDark : styles.inlineActionButtonHovered),
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Text style={[styles.refreshText, isDark && styles.refreshTextDark]}>Show all</Text>
              </Pressable>
              <Pressable
                onPress={() => setOpenExpanded((current) => !current)}
                style={({ hovered, pressed }) => [
                  styles.sectionActionButton,
                  isDark && styles.sectionActionButtonDark,
                  hovered && (isDark ? styles.sectionActionButtonHoveredDark : styles.sectionActionButtonHovered),
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Text style={styles.sectionActionButtonText}>{openExpanded ? 'Collapse' : 'Expand'}</Text>
              </Pressable>
            </RNView>
          </RNView>

          {loading ? (
            <RNView style={styles.loadingState}>
              <ActivityIndicator size="small" color={isDark ? '#E2E8F0' : '#4F46E5'} />
              <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>Loading records...</Text>
            </RNView>
          ) : !openExpanded ? (
            <RNView style={[styles.emptyState, isDark && styles.emptyStateDark]}>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>Open records are minimized.</Text>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                Expand this section when you want to review the records that are still active in this view.
              </Text>
            </RNView>
          ) : filteredRecords.length === 0 ? (
            <RNView style={[styles.emptyState, isDark && styles.emptyStateDark]}>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>No records match this view.</Text>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                Choose another metric or create a new record to populate this section.
              </Text>
            </RNView>
          ) : (
            filteredRecords.map((record) => (
              <Pressable
                key={record.id}
                style={({ hovered, pressed }) => [
                  styles.recordRow,
                  isDark && styles.recordRowDark,
                  styles.interactiveSurface,
                  compactWeb && styles.recordRowCompact,
                  hovered && styles.interactiveSurfaceHovered,
                  pressed && styles.interactiveSurfacePressed,
                ]}
                onPress={() => router.push(`/loan/${record.id}`)}
              >
                <RNView style={styles.recordCopy}>
                  <Text style={[styles.recordName, isDark && styles.recordNameDark]}>{record.contacts?.name || 'Unknown contact'}</Text>
                  <Text style={[styles.recordMeta, isDark && styles.recordMetaDark]}>
                    {record.category === 'item'
                      ? 'Item record'
                      : record.type === 'lent'
                        ? 'Lent record'
                        : 'Borrowed record'}
                  </Text>
                  <Text style={[styles.recordSubmeta, isDark && styles.recordSubmetaDark]}>{getDueLabel(record.due_date)}</Text>
                </RNView>
                <RNView style={[styles.recordValueBlock, compactWeb && styles.recordValueBlockCompact]}>
                  <Text style={[styles.recordValue, isDark && styles.recordValueDark]}>{getRecordValue(record)}</Text>
                  <Text style={[styles.recordStatus, isDark && styles.recordStatusDark]}>{record.status}</Text>
                </RNView>
              </Pressable>
            ))
          )}
          </Card>
        </RNView>

        <RNView style={styles.recordPanelBlockLast}>
          <Card
            style={[
              styles.panelCard,
              styles.stackedPanelCard,
              compactWeb && styles.panelCardCompact,
            ]}
          >
          <RNView style={[styles.recentHeader, narrowPanels && styles.recentHeaderCompact]}>
            <Text style={[styles.panelTitle, isDark && styles.panelTitleDark]}>Recent records</Text>
            <Pressable
              onPress={() => setRecentExpanded((current) => !current)}
              style={({ hovered, pressed }) => [
                styles.sectionActionButton,
                styles.interactiveButtonInline,
                isDark && styles.sectionActionButtonDark,
                hovered && (isDark ? styles.sectionActionButtonHoveredDark : styles.sectionActionButtonHovered),
                pressed && styles.inlineActionButtonPressed,
              ]}
            >
              <Text style={styles.sectionActionButtonText}>{recentExpanded ? 'Collapse' : 'Expand'}</Text>
              {recentExpanded ? <ChevronUp size={16} color="#FFFFFF" /> : <ChevronDown size={16} color="#FFFFFF" />}
            </Pressable>
          </RNView>

          {loading ? (
            <RNView style={styles.loadingState}>
              <ActivityIndicator size="small" color={isDark ? '#E2E8F0' : '#4F46E5'} />
              <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>Loading your web workspace...</Text>
            </RNView>
          ) : !recentExpanded ? (
            <RNView style={[styles.emptyState, isDark && styles.emptyStateDark]}>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>Recent records are minimized.</Text>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                Expand this section when you want to review the latest activity across your records.
              </Text>
            </RNView>
          ) : (
            <>
              {recentRecords.length === 0 ? (
                <RNView style={[styles.emptyState, isDark && styles.emptyStateDark]}>
                  <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>No records yet.</Text>
                  <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                    Create your first shared record here and this dashboard will start behaving like the online version of the app.
                  </Text>
                </RNView>
              ) : (
                recentRecords.map((record) => (
                  <Pressable
                    key={record.id}
                    style={({ hovered, pressed }) => [
                      styles.recordRow,
                      isDark && styles.recordRowDark,
                      styles.interactiveSurface,
                      compactWeb && styles.recordRowCompact,
                      hovered && styles.interactiveSurfaceHovered,
                      pressed && styles.interactiveSurfacePressed,
                    ]}
                    onPress={() => router.push(`/loan/${record.id}`)}
                  >
                    <RNView style={styles.recordCopy}>
                      <Text style={[styles.recordName, isDark && styles.recordNameDark]}>{record.contacts?.name || 'Unknown contact'}</Text>
                      <Text style={[styles.recordMeta, isDark && styles.recordMetaDark]}>
                        {record.category === 'item' ? 'Item record' : record.type === 'lent' ? 'Lent record' : 'Borrowed record'}
                      </Text>
                      <Text style={[styles.recordSubmeta, isDark && styles.recordSubmetaDark]}>{getDueLabel(record.due_date)}</Text>
                    </RNView>
                    <RNView style={[styles.recordValueBlock, compactWeb && styles.recordValueBlockCompact]}>
                      <Text style={[styles.recordValue, isDark && styles.recordValueDark]}>{getRecordValue(record)}</Text>
                      <Text style={[styles.recordStatus, isDark && styles.recordStatusDark]}>{record.status}</Text>
                    </RNView>
                  </Pressable>
                ))
              )}
            </>
          )}
          </Card>
        </RNView>
      </RNView>
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
  statIconWrapDark: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statEyebrowDark: {
    color: '#CBD5E1',
  },
  statValue: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  statValueDark: {
    color: '#F8FAFC',
  },
  statMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  statMetaDark: {
    color: '#CBD5E1',
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  panelActionsCompact: {
    width: '100%',
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
  inlineActionButtonHoveredDark: {
    backgroundColor: '#1E293B',
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
  dashboardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dashboardActionButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E1FF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashboardActionButtonCompact: {
    width: '100%',
    justifyContent: 'center',
  },
  dashboardActionButtonDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  dashboardActionButtonPrimary: {
    backgroundColor: '#101A3A',
    borderColor: '#101A3A',
  },
  dashboardActionButtonPrimaryDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  dashboardActionIconPrimary: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dashboardActionIconSecondary: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  dashboardActionIconSecondaryDark: {
    backgroundColor: '#1E293B',
  },
  dashboardActionPrimaryText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dashboardActionSecondaryText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4338CA',
  },
  dashboardActionSecondaryTextDark: {
    color: '#E2E8F0',
  },
  dashboardQuickButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E1FF',
    backgroundColor: '#F8FAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardQuickButtonDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  dashboardQuickButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  dashboardQuickButtonTextDark: {
    color: '#E2E8F0',
  },
  recordPanelsStack: {
    position: 'relative',
  },
  recordPanelBlock: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
    zIndex: 0,
  },
  recordPanelBlockLast: {
    width: '100%',
    position: 'relative',
    zIndex: 0,
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
  stackedPanelCard: {
    flex: 0,
    width: '100%',
    minWidth: 0,
    position: 'relative',
    zIndex: 0,
    overflow: 'hidden',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  panelTitleDark: {
    color: '#F8FAFC',
  },
  panelBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  panelBodyDark: {
    color: '#CBD5E1',
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
  balanceMetricDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
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
  balanceLabelDark: {
    color: '#CBD5E1',
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  balanceValueDark: {
    color: '#F8FAFC',
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
    width: '100%',
  },
  sectionActionButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionActionButtonDark: {
    backgroundColor: '#1D4ED8',
  },
  sectionActionButtonHovered: {
    backgroundColor: '#1D4ED8',
    transform: [{ translateY: -1 }],
  },
  sectionActionButtonHoveredDark: {
    backgroundColor: '#2563EB',
    transform: [{ translateY: -1 }],
  },
  sectionActionButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  refreshTextDark: {
    color: '#E2E8F0',
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
  loadingTextDark: {
    color: '#CBD5E1',
  },
  emptyState: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 18,
  },
  emptyStateDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyTitleDark: {
    color: '#F8FAFC',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  emptyTextDark: {
    color: '#CBD5E1',
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
  recordRowDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
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
  recordNameDark: {
    color: '#F8FAFC',
  },
  recordMeta: {
    fontSize: 13,
    color: '#475569',
  },
  recordMetaDark: {
    color: '#CBD5E1',
  },
  recordSubmeta: {
    fontSize: 12,
    color: '#64748B',
  },
  recordSubmetaDark: {
    color: '#94A3B8',
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
  recordValueDark: {
    color: '#F8FAFC',
  },
  recordStatus: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#6366F1',
  },
  recordStatusDark: {
    color: '#CBD5E1',
  },
});
