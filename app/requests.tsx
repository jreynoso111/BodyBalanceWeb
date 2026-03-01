import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View as RNView, Alert, RefreshControl } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter, Stack } from 'expo-router';
import { Check, X, Bell, Info, ArrowUpRight, ArrowDownLeft, Wallet, Box } from 'lucide-react-native';

export default function RequestsScreen() {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('p2p_requests')
            .select('*, from_profile:profiles!from_user_id(full_name, email)')
            .eq('to_user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        setRequests(data || []);
        setLoading(false);
        setRefreshing(false);
    };

    const handleAction = async (request: any, action: 'approved' | 'rejected') => {
        setLoading(true);

        // 1. Update the request status
        const { error: requestError } = await supabase
            .from('p2p_requests')
            .update({ status: action, updated_at: new Date().toISOString() })
            .eq('id', request.id);

        if (requestError) {
            Alert.alert('Error', requestError.message);
            setLoading(false);
            return;
        }

        // 2. Perform based on type
        if (action === 'approved') {
            if (request.type === 'loan_validation') {
                await supabase.from('loans').update({ validation_status: 'approved' }).eq('id', request.loan_id);
            } else if (request.type === 'payment_validation') {
                await supabase.from('payments').update({ validation_status: 'approved' }).eq('id', request.payment_id);
            } else if (request.type === 'debt_reduction') {
                // Logic for debt reduction would go here (e.g. updating loan amount)
                // request.data might contain the reduction amount
            }
        } else {
            if (request.type === 'loan_validation') {
                await supabase.from('loans').update({ validation_status: 'rejected' }).eq('id', request.loan_id);
            } else if (request.type === 'payment_validation') {
                await supabase.from('payments').update({ validation_status: 'rejected' }).eq('id', request.payment_id);
            }
        }

        Alert.alert('Success', `Request ${action} successfully`);
        fetchRequests();
    };

    const renderRequestItem = ({ item }: { item: any }) => (
        <Card style={styles.requestCard}>
            <RNView style={styles.requestHeader}>
                <RNView style={styles.iconContainer}>
                    {item.type === 'loan_validation' ? <Wallet size={20} color="#6366F1" /> :
                        item.type === 'payment_validation' ? <Check size={20} color="#10B981" /> :
                            <ArrowDownLeft size={20} color="#F59E0B" />}
                </RNView>
                <RNView style={styles.headerInfo}>
                    <Text style={styles.requestType}>
                        {item.type === 'loan_validation' ? 'Loan Validation' :
                            item.type === 'payment_validation' ? 'Payment Validation' :
                                'Debt Reduction Request'}
                    </Text>
                    <Text style={styles.requestFrom}>from {item.from_profile?.full_name || item.from_profile?.email}</Text>
                </RNView>
            </RNView>

            <Text style={styles.requestMessage}>{item.message}</Text>

            <RNView style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleAction(item, 'rejected')}
                    disabled={loading}
                >
                    <X size={18} color="#EF4444" />
                    <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleAction(item, 'approved')}
                    disabled={loading}
                >
                    <Check size={18} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
            </RNView>
        </Card>
    );

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{
                title: 'Pending Requests',
                headerTransparent: true,
                headerTintColor: '#0F172A',
            }} />

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Bell size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No pending requests</Text>
                        <Text style={styles.emptyDesc}>When someone links a transaction with you, it will appear here.</Text>
                    </View>
                }
                ListFooterComponent={<Text style={styles.copyright}>© 2026 jreynoso — I GOT U</Text>}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingTop: 120,
    },
    requestCard: {
        padding: 20,
        marginBottom: 16,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: 'transparent',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    requestType: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    requestFrom: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    requestMessage: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'transparent',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    approveBtn: {
        backgroundColor: '#0F172A',
    },
    rejectBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    approveText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    rejectText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        backgroundColor: 'transparent',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 20,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
        lineHeight: 20,
    },
    copyright: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 32,
        marginBottom: 32,
    },
});
