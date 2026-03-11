import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowDownToLine, BellRing, ChevronDown, ChevronRight, ChevronUp, Crown, RefreshCcw, Search, TrendingUp, UserMinus, Users, Wallet } from 'lucide-react-native';
import { Card, Screen } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { getPlanLabel, normalizePlanTier, PlanTier } from '@/services/subscriptionPlan';

interface DashboardStats {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  active_users_7d: number;
  active_users_30d: number;
  premium_users: number;
  free_users: number;
  premium_new_7d: number;
  total_loans: number;
  active_loans: number;
  money_in_transit: number;
  records_created_7d: number;
  payments_logged_7d: number;
  pending_confirmations: number;
  pending_friend_requests: number;
  push_enabled_users: number;
}

interface AdminPlanUser {
  id: string;
  full_name: string | null;
  email: string | null;
  plan_tier: string | null;
  premium_referral_expires_at: string | null;
  last_premium_granted_at: string | null;
  updated_at: string | null;
}

type StatsLoadMode = 'full' | 'fallback';
const ADMIN_RPC_TIMEOUT_MS = 4000;

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

export default function AdminDashboardIndex() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [planUsers, setPlanUsers] = useState<AdminPlanUser[]>([]);
  const [planSearch, setPlanSearch] = useState('');
  const [planUsersExpanded, setPlanUsersExpanded] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statsLoadMode, setStatsLoadMode] = useState<StatsLoadMode>('full');
  const compactWeb = Platform.OS === 'web' && width < 860;
  const condensedWeb = Platform.OS === 'web' && width < 1240;
  const wideWeb = Platform.OS === 'web' && width >= 1360;

  useEffect(() => {
    void fetchStats();
  }, []);

  const withTimeout = async <T,>(promise: PromiseLike<T>, label: string, timeoutMs = 8000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out.`));
        }, timeoutMs);
      });

      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const buildFallbackStats = async (): Promise<DashboardStats> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsersResult,
      premiumProfilesResult,
      totalLoansResult,
      activeLoansResult,
      openMoneyLoansResult,
      recordsCreated7dResult,
      paymentsLogged7dResult,
      pendingConfirmationsResult,
      pendingFriendRequestsResult,
      pushEnabledUsersResult,
      profileCreates7dResult,
      profileCreates30dResult,
      auditLogs7dResult,
      auditLogs30dResult,
    ] = await Promise.all([
      withTimeout(
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        'profiles total count'
      ),
      withTimeout(
        supabase.from('profiles').select('plan_tier, premium_referral_expires_at, last_premium_granted_at'),
        'profiles premium state'
      ),
      withTimeout(
        supabase.from('loans').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        'loans total count'
      ),
      withTimeout(
        supabase.from('loans').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['active', 'partial', 'overdue']),
        'loans active count'
      ),
      withTimeout(
        supabase.from('loans').select('amount').is('deleted_at', null).eq('category', 'money').in('status', ['active', 'partial', 'overdue']),
        'loans open money'
      ),
      withTimeout(
        supabase.from('loans').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', sevenDaysAgo),
        'loans created 7d'
      ),
      withTimeout(
        supabase.from('payments').select('id', { count: 'exact', head: true }).gte('payment_date', sevenDaysAgo),
        'payments 7d'
      ),
      withTimeout(
        supabase.from('p2p_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        'pending confirmations'
      ),
      withTimeout(
        supabase.from('p2p_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('type', 'friend_request'),
        'pending friend requests'
      ),
      withTimeout(
        supabase.from('user_preferences').select('user_id', { count: 'exact', head: true }).eq('push_enabled', true),
        'push enabled count'
      ),
      withTimeout(
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('table_name', 'profiles').eq('operation', 'INSERT').gte('created_at', sevenDaysAgo),
        'profile creates 7d'
      ),
      withTimeout(
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('table_name', 'profiles').eq('operation', 'INSERT').gte('created_at', thirtyDaysAgo),
        'profile creates 30d'
      ),
      withTimeout(
        supabase.from('audit_logs').select('actor_user_id').gte('created_at', sevenDaysAgo),
        'audit logs 7d'
      ),
      withTimeout(
        supabase.from('audit_logs').select('actor_user_id').gte('created_at', thirtyDaysAgo),
        'audit logs 30d'
      ),
    ]);

    const queryErrors = [
      totalUsersResult.error,
      premiumProfilesResult.error,
      totalLoansResult.error,
      activeLoansResult.error,
      openMoneyLoansResult.error,
      recordsCreated7dResult.error,
      paymentsLogged7dResult.error,
      pendingConfirmationsResult.error,
      pendingFriendRequestsResult.error,
      pushEnabledUsersResult.error,
      profileCreates7dResult.error,
      profileCreates30dResult.error,
      auditLogs7dResult.error,
      auditLogs30dResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      throw queryErrors[0];
    }

    const moneyInTransit = ((openMoneyLoansResult.data || []) as Array<{ amount: number | null }>).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const premiumProfiles = (premiumProfilesResult.data || []) as Array<{
      plan_tier?: string | null;
      premium_referral_expires_at?: string | null;
      last_premium_granted_at?: string | null;
    }>;
    const premiumUsers = premiumProfiles.filter((entry) =>
      normalizePlanTier(entry.plan_tier, entry.premium_referral_expires_at) === 'premium'
    ).length;
    const premiumNew7d = premiumProfiles.filter((entry) => {
      if (!entry.last_premium_granted_at) return false;
      const grantedAt = new Date(entry.last_premium_granted_at).getTime();
      if (Number.isNaN(grantedAt)) return false;
      return grantedAt >= new Date(sevenDaysAgo).getTime();
    }).length;

    return {
      total_users: totalUsersResult.count || 0,
      new_users_7d: profileCreates7dResult.count || 0,
      new_users_30d: profileCreates30dResult.count || 0,
      active_users_7d: uniqueCount(((auditLogs7dResult.data || []) as Array<{ actor_user_id?: string | null }>).map((entry) => entry.actor_user_id)),
      active_users_30d: uniqueCount(((auditLogs30dResult.data || []) as Array<{ actor_user_id?: string | null }>).map((entry) => entry.actor_user_id)),
      premium_users: premiumUsers,
      free_users: Math.max((totalUsersResult.count || 0) - premiumUsers, 0),
      premium_new_7d: premiumNew7d,
      total_loans: totalLoansResult.count || 0,
      active_loans: activeLoansResult.count || 0,
      money_in_transit: moneyInTransit,
      records_created_7d: recordsCreated7dResult.count || 0,
      payments_logged_7d: paymentsLogged7dResult.count || 0,
      pending_confirmations: pendingConfirmationsResult.count || 0,
      pending_friend_requests: pendingFriendRequestsResult.count || 0,
      push_enabled_users: pushEnabledUsersResult.count || 0,
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    setStatsLoadMode('full');
    try {
      const usersPromise = withTimeout(
        supabase
          .from('profiles')
          .select('id, full_name, email, plan_tier, premium_referral_expires_at, last_premium_granted_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(40),
        'admin users list'
      );
      const premiumProfilesPromise = withTimeout(
        supabase
          .from('profiles')
          .select('plan_tier, premium_referral_expires_at, last_premium_granted_at'),
        'profiles premium snapshot'
      );
      const fallbackStatsPromise = buildFallbackStats();

      let nextStats: DashboardStats | null = null;
      try {
        const statsResult = await withTimeout(
          supabase.rpc('get_admin_dashboard_stats'),
          'admin dashboard stats',
          ADMIN_RPC_TIMEOUT_MS
        );

        if (statsResult.error) throw statsResult.error;
        nextStats = statsResult.data as DashboardStats;
      } catch (statsError: any) {
        console.warn('admin dashboard stats RPC failed, using fallback:', statsError?.message || statsError);
        nextStats = await fallbackStatsPromise;
        setStatsLoadMode('fallback');
      }

      const usersResult = await usersPromise;
      const premiumProfilesResult = await premiumProfilesPromise;
      if (usersResult.error) throw usersResult.error;
      if (premiumProfilesResult.error) throw premiumProfilesResult.error;

      const premiumProfiles = (premiumProfilesResult.data || []) as Array<{
        plan_tier?: string | null;
        premium_referral_expires_at?: string | null;
        last_premium_granted_at?: string | null;
      }>;
      const premiumUsers = premiumProfiles.filter((entry) =>
        normalizePlanTier(entry.plan_tier, entry.premium_referral_expires_at) === 'premium'
      ).length;
      const premiumNew7d = premiumProfiles.filter((entry) => {
        if (!entry.last_premium_granted_at) return false;
        const grantedAt = new Date(entry.last_premium_granted_at).getTime();
        if (Number.isNaN(grantedAt)) return false;
        return grantedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
      }).length;

      if (nextStats) {
        nextStats = {
          ...nextStats,
          premium_users: premiumUsers,
          free_users: Math.max((nextStats.total_users || 0) - premiumUsers, 0),
          premium_new_7d: premiumNew7d,
        };
      }

      setStats(nextStats);
      setPlanUsers((usersResult.data || []) as AdminPlanUser[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const adoption = useMemo(() => {
    if (!stats) return { premiumShare: '0%', pushShare: '0%' };
    return {
      premiumShare: formatPercent(stats.premium_users, stats.total_users),
      pushShare: formatPercent(stats.push_enabled_users, stats.total_users),
    };
  }, [stats]);

  const pendingAdminConfirmations = Math.max(
    (stats?.pending_confirmations || 0) - (stats?.pending_friend_requests || 0),
    0
  );

  const overviewMetrics = [
    {
      key: 'users',
      label: 'Users',
      value: stats?.total_users || 0,
      meta: `${stats?.new_users_7d || 0} new in 7 days`,
      icon: Users,
      iconColor: '#6366F1',
      iconBg: 'rgba(99,102,241,0.12)',
    },
    {
      key: 'premium',
      label: 'Premium',
      value: stats?.premium_users || 0,
      meta: `${adoption.premiumShare} of all users`,
      icon: Crown,
      iconColor: '#CA8A04',
      iconBg: 'rgba(234,179,8,0.14)',
    },
    {
      key: 'active-users',
      label: 'Active Users',
      value: stats?.active_users_7d || 0,
      meta: 'active in last 7 days',
      icon: TrendingUp,
      iconColor: '#10B981',
      iconBg: 'rgba(16,185,129,0.12)',
    },
    {
      key: 'records',
      label: 'Shared Records',
      value: stats?.total_loans || 0,
      meta: `${stats?.active_loans || 0} active right now`,
      icon: Wallet,
      iconColor: '#0284C7',
      iconBg: 'rgba(56,189,248,0.14)',
    },
  ];

  const growthUsageMetrics = [
    { key: 'new-users', label: 'New users', value: stats?.new_users_30d || 0, meta: 'Last 30 days' },
    { key: 'premium-upgrades', label: 'Premium upgrades', value: stats?.premium_new_7d || 0, meta: 'Last 7 days' },
    { key: 'active-30d', label: 'Active users', value: stats?.active_users_30d || 0, meta: 'Last 30 days' },
    { key: 'records-created', label: 'Records created', value: stats?.records_created_7d || 0, meta: 'Last 7 days' },
    { key: 'payments-logged', label: 'Payments logged', value: stats?.payments_logged_7d || 0, meta: 'Last 7 days' },
    { key: 'push-opt-in', label: 'Push opt-in', value: stats?.push_enabled_users || 0, meta: `${adoption.pushShare} of users` },
  ];

  const queueMetrics = [
    {
      key: 'confirmations',
      label: 'Pending confirmations',
      value: pendingAdminConfirmations,
      meta: 'Pending shared-record actions',
      route: '/admin/requests?filter=confirmations',
      icon: BellRing,
      iconColor: '#6366F1',
    },
    {
      key: 'friend-requests',
      label: 'Friend requests',
      value: stats?.pending_friend_requests || 0,
      meta: 'Still waiting for approval',
      route: '/admin/requests?filter=friend_requests',
      icon: Users,
      iconColor: '#CA8A04',
    },
    {
      key: 'total-records',
      label: 'Total records',
      value: stats?.total_loans || 0,
      meta: 'Open full records admin',
      route: '/admin/loans',
      icon: Wallet,
      iconColor: '#10B981',
    },
  ];

  const filteredPlanUsers = useMemo(() => {
    const query = planSearch.trim().toLowerCase();
    if (!query) return planUsers.slice(0, 8);

    return planUsers
      .filter((user) =>
        `${user.full_name || ''} ${user.email || ''}`.toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [planSearch, planUsers]);

  const updatePlanTier = async (userId: string, nextPlan: PlanTier) => {
    setSavingUserId(userId);
    setError('');
    try {
      const { error } = await supabase.rpc('admin_set_profile_plan_tier', {
        p_user_id: userId,
        p_plan_tier: nextPlan,
      });

      if (error) throw error;

      setPlanUsers((current) =>
        current.map((item) => (
          item.id === userId
            ? {
                ...item,
                plan_tier: nextPlan,
                premium_referral_expires_at: nextPlan === 'free' ? null : item.premium_referral_expires_at,
                last_premium_granted_at: nextPlan === 'premium' ? new Date().toISOString() : item.last_premium_granted_at,
              }
            : item
        ))
      );
      setStats((current) => {
        if (!current) return current;
        const currentUser = planUsers.find((item) => item.id === userId);
        const currentPlan = normalizePlanTier(currentUser?.plan_tier, currentUser?.premium_referral_expires_at);
        if (currentPlan === nextPlan) return current;

        if (nextPlan === 'premium') {
          return {
            ...current,
            premium_users: current.premium_users + 1,
            free_users: Math.max(current.free_users - 1, 0),
          };
        }

        return {
          ...current,
          premium_users: Math.max(current.premium_users - 1, 0),
          free_users: current.free_users + 1,
        };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update plan');
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading && !refreshing) {
    if (isWeb) {
      return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      );
    }
    return (
      <Screen style={[styles.container, styles.center]} safeAreaEdges={['left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color="#6366F1" />
      </Screen>
    );
  }

  if (error) {
    if (isWeb) {
      return (
        <View style={[styles.container, styles.center]}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void fetchStats()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <Screen style={[styles.container, styles.center]} safeAreaEdges={['left', 'right', 'bottom']}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => void fetchStats()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const content = (
    <>
        <View style={[styles.topRow, compactWeb && styles.topRowCompact]}>
          <TouchableOpacity
            style={styles.backToAppButton}
            onPress={() => router.replace((Platform.OS === 'web' ? '/dashboard' : '/(tabs)') as any)}
          >
            <Text style={styles.backToAppText}>Back to app</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={() => { setRefreshing(true); void fetchStats(); }}>
            <RefreshCcw size={16} color="#475569" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {statsLoadMode === 'fallback' ? (
          <Card style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Some aggregate metrics are using a slower fallback because the main admin stats query did not respond in time.
            </Text>
          </Card>
        ) : null}

        <View style={styles.heroGrid}>
          {overviewMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.key} style={[styles.heroCard, condensedWeb && styles.heroCardCondensed, compactWeb && styles.heroCardCompact]}>
                <View style={[styles.heroIcon, { backgroundColor: metric.iconBg }]}>
                  <Icon size={20} color={metric.iconColor} />
                </View>
                <Text style={styles.heroLabel}>{metric.label}</Text>
                <Text style={styles.heroValue}>{metric.value}</Text>
                <Text style={styles.heroMeta}>{metric.meta}</Text>
              </Card>
            );
          })}
        </View>

        <View style={[styles.dashboardGrid, wideWeb && styles.dashboardGridWide]}>
          <View style={styles.mainColumn}>
            <View style={[styles.analyticsRow, condensedWeb && styles.analyticsRowCompact]}>
              <Card style={[styles.panelCard, styles.analyticsPanel]}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Growth & Usage</Text>
                  <Text style={styles.panelCaption}>Key account activity without personal balance data.</Text>
                </View>
                <View style={[styles.compactMetricsGrid, compactWeb && styles.compactMetricsGridCompact]}>
                  {growthUsageMetrics.map((metric) => (
                    <View key={metric.key} style={[styles.compactMetric, compactWeb && styles.compactMetricCompact]}>
                      <Text style={styles.compactMetricLabel}>{metric.label}</Text>
                      <Text style={styles.compactMetricValue}>{metric.value}</Text>
                      <Text style={styles.compactMetricMeta}>{metric.meta}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              <Card style={[styles.panelCard, styles.analyticsPanel]}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Notifications & Queue</Text>
                  <Text style={styles.panelCaption}>Shortcuts into the operational backlog.</Text>
                </View>
                <View style={[styles.compactInteractiveGrid, compactWeb && styles.compactInteractiveGridCompact]}>
                  {queueMetrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <TouchableOpacity
                        key={metric.key}
                        activeOpacity={0.85}
                        style={[styles.compactInteractiveCard, compactWeb && styles.compactInteractiveCardCompact]}
                        onPress={() => router.push(metric.route as any)}
                      >
                        <View style={styles.compactInteractiveHeader}>
                          <Icon size={15} color={metric.iconColor} />
                          <Text style={styles.compactInteractiveLabel}>{metric.label}</Text>
                        </View>
                        <Text style={styles.compactInteractiveValue}>{metric.value}</Text>
                        <View style={styles.compactInteractiveFooter}>
                          <Text style={styles.compactInteractiveMeta}>{metric.meta}</Text>
                          <ChevronRight size={15} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            </View>

            <Card style={styles.panelCard}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Management</Text>
                <Text style={styles.panelCaption}>Fast access to the admin tools you actually use.</Text>
              </View>
              <View style={[styles.managementGrid, compactWeb && styles.managementGridCompact]}>
                <TouchableOpacity style={styles.managementTile} onPress={() => router.push('/admin/users' as any)}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                      <Users size={20} color="#6366F1" />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuLabel}>Users</Text>
                      <Text style={styles.menuSub}>Advanced user admin: history, password reset, and deletes</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.managementTile} onPress={() => router.push('/admin/loans' as any)}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <Wallet size={20} color="#10B981" />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuLabel}>Records</Text>
                      <Text style={styles.menuSub}>Review platform-wide records, items, and activity</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          <View style={styles.sideColumn}>
            <Card style={styles.planCardCompact}>
              <View style={[styles.planRow, compactWeb && styles.planRowCompact]}>
                <View>
                  <Text style={styles.planTitle}>Membership mix</Text>
                  <Text style={styles.planCaption}>{adoption.premiumShare} conversion from total users</Text>
                </View>
                <Text style={styles.planValue}>{stats?.premium_users || 0}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: adoption.premiumShare as any }]} />
              </View>
              <View style={[styles.planBreakdownRow, compactWeb && styles.planBreakdownRowCompact]}>
                <Text style={styles.planBreakdownText}>Free: {stats?.free_users || 0}</Text>
                <Text style={styles.planBreakdownText}>Premium: {stats?.premium_users || 0}</Text>
              </View>
            </Card>

            <Card style={styles.externalCardCompact}>
              <Text style={styles.panelTitle}>Store Metrics</Text>
              <View style={styles.externalMiniList}>
                <View style={styles.externalMiniItem}>
                  <ArrowDownToLine size={16} color="#475569" />
                  <Text style={styles.externalMiniText}>Downloads need App Store / Play Console analytics.</Text>
                </View>
                <View style={styles.externalMiniItem}>
                  <UserMinus size={16} color="#475569" />
                  <Text style={styles.externalMiniText}>Uninstalls require external attribution or analytics SDKs.</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.managedPlanCard}>
              <View style={[styles.managedPlanHeader, compactWeb && styles.managedPlanHeaderCompact]}>
                <View style={styles.managedPlanCopy}>
                  <Text style={styles.managedPlanTitle}>Managed Premium</Text>
                  <Text style={styles.managedPlanText}>Search a user and switch their tier without leaving this page.</Text>
                </View>
                <View style={[styles.managedPlanSummary, compactWeb && styles.managedPlanSummaryCompact]}>
                  <Text style={styles.managedPlanSummaryValue}>{stats?.premium_users || 0}</Text>
                  <Text style={styles.managedPlanSummaryLabel}>premium</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.managedPlanToggle, compactWeb && styles.managedPlanToggleCompact]}
                activeOpacity={0.85}
                onPress={() => setPlanUsersExpanded((current) => !current)}
              >
                <View style={styles.managedPlanToggleCopy}>
                  <Text style={styles.managedPlanToggleTitle}>
                    {planUsersExpanded ? 'Hide managed users' : 'Show managed users'}
                  </Text>
                  <Text style={styles.managedPlanToggleText}>
                    {planUsersExpanded
                      ? 'Collapse the list to keep the dashboard compact.'
                      : `${filteredPlanUsers.length} users ready to review without filling the screen.`}
                  </Text>
                </View>
                {planUsersExpanded ? <ChevronUp size={18} color="#475569" /> : <ChevronDown size={18} color="#475569" />}
              </TouchableOpacity>

              {planUsersExpanded ? (
                <>
                  <View style={styles.planSearchBar}>
                    <Search size={16} color="#94A3B8" />
                    <TextInput
                      value={planSearch}
                      onChangeText={setPlanSearch}
                      placeholder="Search by name or email..."
                      placeholderTextColor="#94A3B8"
                      style={styles.planSearchInput}
                    />
                  </View>

                  <View style={styles.planUsersList}>
                    {filteredPlanUsers.map((user) => {
                      const normalizedPlan = normalizePlanTier(user.plan_tier, user.premium_referral_expires_at);
                      const isSaving = savingUserId === user.id;
                      const displayName = user.full_name?.trim() || user.email || 'Unknown user';

                      return (
                        <View key={user.id} style={[styles.planUserRow, compactWeb && styles.planUserRowCompact]}>
                          <View style={styles.planUserLeft}>
                            <View style={[styles.planUserAvatar, normalizedPlan === 'premium' ? styles.planUserAvatarPremium : null]}>
                              <Text style={[styles.planUserAvatarText, normalizedPlan === 'premium' ? styles.planUserAvatarTextPremium : null]}>
                                {displayName[0]?.toUpperCase() || '?'}
                              </Text>
                            </View>
                            <View style={styles.planUserInfo}>
                              <Text style={styles.planUserName}>{displayName}</Text>
                              <Text style={styles.planUserEmail}>{user.email || 'No email'}</Text>
                            </View>
                          </View>

                          <View style={[styles.planUserRight, compactWeb && styles.planUserRightCompact]}>
                            <Text style={[styles.inlinePlanBadge, normalizedPlan === 'premium' ? styles.inlinePlanBadgePremium : styles.inlinePlanBadgeFree]}>
                              {getPlanLabel(normalizedPlan)}
                            </Text>
                            <View style={[styles.inlinePlanActions, compactWeb && styles.inlinePlanActionsCompact]}>
                              <TouchableOpacity
                                style={[styles.inlinePlanButton, normalizedPlan === 'free' ? styles.inlinePlanButtonActive : null]}
                                disabled={isSaving || normalizedPlan === 'free'}
                                onPress={() => void updatePlanTier(user.id, 'free')}
                              >
                                <Text style={[styles.inlinePlanButtonText, normalizedPlan === 'free' ? styles.inlinePlanButtonTextActive : null]}>Free</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.inlinePlanButton, normalizedPlan === 'premium' ? styles.inlinePlanButtonPremiumActive : null]}
                                disabled={isSaving || normalizedPlan === 'premium'}
                                onPress={() => void updatePlanTier(user.id, 'premium')}
                              >
                                <Text style={[styles.inlinePlanButtonText, normalizedPlan === 'premium' ? styles.inlinePlanButtonTextPremiumActive : null]}>
                                  {isSaving ? 'Saving...' : 'Premium'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {filteredPlanUsers.length === 0 ? (
                      <View style={styles.planUsersEmpty}>
                        <Text style={styles.planUsersEmptyText}>No users match that search.</Text>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                <View style={styles.managedPlanCollapsed}>
                  <Text style={styles.managedPlanCollapsedText}>
                    The membership list stays collapsed by default so the analytics view remains compact.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        </View>
    </>
  );

  if (isWeb) {
    return <View style={styles.scroll}>{content}</View>;
  }

  return (
    <Screen style={styles.container} safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {content}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  topRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  backToAppButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  backToAppText: {
    color: '#4338CA',
    fontWeight: '800',
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  headerCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  headerRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },
  headerBadgesCompact: {
    width: '100%',
  },
  headerBadge: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerBadgeValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
  noticeCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#92400E',
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
  },
  heroCard: {
    flexBasis: '23.8%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 22,
  },
  heroCardCondensed: {
    flexBasis: '48%',
  },
  heroCardCompact: {
    flexBasis: '100%',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroValueSmall: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  dashboardGrid: {
    gap: 16,
    backgroundColor: 'transparent',
  },
  dashboardGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1.35,
    gap: 16,
    backgroundColor: 'transparent',
  },
  sideColumn: {
    flex: 0.9,
    gap: 16,
    backgroundColor: 'transparent',
  },
  panelCard: {
    padding: 18,
    gap: 14,
    borderRadius: 22,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: 'transparent',
  },
  analyticsRowCompact: {
    flexDirection: 'column',
  },
  analyticsPanel: {
    flex: 1,
  },
  panelHeader: {
    gap: 4,
    backgroundColor: 'transparent',
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  panelCaption: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  compactMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'transparent',
  },
  compactMetricsGridCompact: {
    flexDirection: 'column',
  },
  compactMetric: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactMetricCompact: {
    width: '100%',
  },
  compactMetricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  compactMetricValue: {
    marginTop: 6,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
  },
  compactMetricMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#94A3B8',
  },
  compactInteractiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'transparent',
  },
  compactInteractiveGridCompact: {
    flexDirection: 'column',
  },
  compactInteractiveCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  compactInteractiveCardCompact: {
    width: '100%',
  },
  compactInteractiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  compactInteractiveLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  compactInteractiveValue: {
    marginTop: 8,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
  },
  compactInteractiveFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  compactInteractiveMeta: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  metricsRow: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  metricCard: {
    padding: 16,
  },
  metricCardInteractive: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  metricActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  metricActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  planCard: {
    padding: 18,
  },
  planCardCompact: {
    padding: 18,
    borderRadius: 22,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  planRowCompact: {
    flexDirection: 'column',
    gap: 10,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  planCaption: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  planValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#6366F1',
  },
  planBreakdownRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  planBreakdownRowCompact: {
    flexDirection: 'column',
    gap: 6,
  },
  planBreakdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  managedPlanCard: {
    padding: 18,
    gap: 14,
  },
  managedPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
  },
  managedPlanHeaderCompact: {
    flexDirection: 'column',
  },
  managedPlanCopy: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  managedPlanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  managedPlanText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  managedPlanSummary: {
    minWidth: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
  },
  managedPlanSummaryCompact: {
    alignSelf: 'flex-start',
  },
  managedPlanSummaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#047857',
  },
  managedPlanSummaryLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
  },
  managedPlanToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  managedPlanToggleCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  managedPlanToggleCopy: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  managedPlanToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  managedPlanToggleText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  managedPlanCollapsed: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  managedPlanCollapsedText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  planSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  planSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  planUsersList: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  planUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planUserRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  planUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  planUserAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planUserAvatarPremium: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  planUserAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
  planUserAvatarTextPremium: {
    color: '#047857',
  },
  planUserInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  planUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  planUserEmail: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  planUserRight: {
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'transparent',
  },
  planUserRightCompact: {
    width: '100%',
    alignItems: 'flex-start',
  },
  inlinePlanBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  inlinePlanBadgeFree: {
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    color: '#475569',
  },
  inlinePlanBadgePremium: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    color: '#047857',
  },
  inlinePlanActions: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  inlinePlanActionsCompact: {
    flexWrap: 'wrap',
  },
  inlinePlanButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  inlinePlanButtonActive: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
  },
  inlinePlanButtonPremiumActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  inlinePlanButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  inlinePlanButtonTextActive: {
    color: '#334155',
  },
  inlinePlanButtonTextPremiumActive: {
    color: '#FFFFFF',
  },
  planUsersEmpty: {
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  planUsersEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  externalCard: {
    padding: 16,
    gap: 14,
  },
  externalCardCompact: {
    padding: 18,
    gap: 12,
    borderRadius: 22,
  },
  externalMiniList: {
    gap: 10,
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  externalMiniItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'transparent',
  },
  externalMiniText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  managementGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  managementGridCompact: {
    flexDirection: 'column',
  },
  managementTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  externalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
  },
  externalRowCompact: {
    flexDirection: 'column',
  },
  externalCopy: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  externalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  externalText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  errorText: {
    marginTop: 16,
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
