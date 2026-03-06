import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { Users, Banknote, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface DashboardStats {
    total_users: number;
    total_loans: number;
    active_loans: number;
    money_in_transit: number;
}

export default function AdminDashboardIndex() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
            if (error) throw error;
            setStats(data as DashboardStats);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch admin stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Screen style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </Screen>
        );
    }

    if (error) {
        return (
            <Screen style={[styles.container, styles.center]}>
                <AlertCircle size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchStats} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </Screen>
        );
    }

    return (
        <Screen style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <TouchableOpacity style={styles.backToAppButton} onPress={() => router.replace('/(tabs)' as any)}>
                    <Text style={styles.backToAppText}>Back to app</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Platform Overview</Text>

                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <Users size={24} color="#6366F1" />
                        </View>
                        <Text style={styles.statTitle}>Total Users</Text>
                        <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Banknote size={24} color="#10B981" />
                        </View>
                        <Text style={styles.statTitle}>Total Lend/Borrow</Text>
                        <Text style={styles.statValue}>{stats?.total_loans || 0}</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <AlertCircle size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.statTitle}>Active Lend/Borrow</Text>
                        <Text style={styles.statValue}>{stats?.active_loans || 0}</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                            <Banknote size={24} color="#38BDF8" />
                        </View>
                        <Text style={styles.statTitle}>In Transit</Text>
                        <Text style={styles.statValue}>${(stats?.money_in_transit || 0).toLocaleString()}</Text>
                    </Card>
                </View>

                <Text style={styles.title}>Management</Text>
                <Card style={styles.menuCard}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/users' as any)}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconWrapperSmall, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                <Users size={20} color="#6366F1" />
                            </View>
                            <View style={styles.menuTextWrap}>
                                <Text style={styles.menuLabel}>Users</Text>
                                <Text style={styles.menuSub}>View and manage all platform users</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/admin/loans' as any)}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconWrapperSmall, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Banknote size={20} color="#10B981" />
                            </View>
                            <View style={styles.menuTextWrap}>
                                <Text style={styles.menuLabel}>Lend/Borrow</Text>
                                <Text style={styles.menuSub}>Monitor platform-wide lending and borrowing</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </Card>
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
    },
    scroll: {
        padding: 24,
    },
    backToAppButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#EEF2FF',
        marginBottom: 12,
    },
    backToAppText: {
        color: '#4338CA',
        fontWeight: '800',
        fontSize: 13,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        width: '48%',
        marginBottom: 16,
        padding: 16,
        alignItems: 'flex-start',
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statTitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
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
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontWeight: '700',
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
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapperSmall: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextWrap: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    menuSub: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
});
