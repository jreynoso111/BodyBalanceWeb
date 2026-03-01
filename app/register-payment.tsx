import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { X, Check, Wallet, Info, Box } from 'lucide-react-native';
import { Screen, Card, View as ThemedView, Text as ThemedText } from '@/components/Themed';
import { getCurrencySymbol } from '@/constants/Currencies';

export default function RegisterPaymentScreen() {
    const { loanId, remaining, category: loanCategory, currency, paymentId } = useLocalSearchParams();
    const normalizedLoanId = Array.isArray(loanId) ? loanId[0] : loanId;
    const normalizedPaymentId = Array.isArray(paymentId) ? paymentId[0] : paymentId;
    const normalizedLoanCategory = Array.isArray(loanCategory) ? loanCategory[0] : loanCategory;
    const normalizedCurrency = Array.isArray(currency) ? currency[0] : currency;
    const normalizedRemaining = Array.isArray(remaining) ? remaining[0] : remaining;
    const { user } = useAuthStore();
    const router = useRouter();

    const [paymentMethod, setPaymentMethod] = useState<'money' | 'item'>(normalizedLoanCategory === 'item' ? 'item' : 'money');
    const [amount, setAmount] = useState(normalizedRemaining?.toString() || '');
    const [returnedItem, setReturnedItem] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [originalPayment, setOriginalPayment] = useState<any>(null);

    useEffect(() => {
        if (normalizedPaymentId) {
            fetchPayment();
        }
    }, [normalizedPaymentId, user]);

    const fetchPayment = async () => {
        if (!normalizedPaymentId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', normalizedPaymentId)
            .single();

        if (error) {
            Alert.alert('Error', 'Could not fetch payment data');
            router.back();
        } else {
            setOriginalPayment(data);
            setPaymentMethod(data.payment_method);
            setAmount(data.amount?.toString() || '');
            setReturnedItem(data.returned_item_name || '');
            setNote(data.note || '');
        }
        setLoading(false);
    };

    const onSave = async () => {
        if (!normalizedLoanId || !user?.id) {
            Alert.alert('Error', 'Loan not found');
            return;
        }

        if (paymentMethod === 'money' && (!amount || parseFloat(amount) <= 0)) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (paymentMethod === 'item' && !returnedItem) {
            Alert.alert('Error', 'Please describe the item being returned/exchanged');
            return;
        }

        Alert.alert(
            normalizedPaymentId ? 'Update Payment' : 'Confirm Payment',
            `Are you sure you want to ${normalizedPaymentId ? 'update' : 'register'} this ${paymentMethod === 'money' ? 'payment' : 'item return'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        await performSave();
                    }
                }
            ]
        );
    };

    const performSave = async () => {
        if (!normalizedLoanId || !user?.id) {
            Alert.alert('Error', 'Loan not found');
            return;
        }

        setLoading(true);

        // Fetch target_user_id from loan
        const { data: loanData } = await supabase
            .from('loans')
            .select('target_user_id')
            .eq('id', normalizedLoanId)
            .single();

        const targetUserId = loanData?.target_user_id;

        if (normalizedPaymentId) {
            // 1. Update Payment
            const { error: updateError } = await supabase
                .from('payments')
                .update({
                    amount: paymentMethod === 'money' ? parseFloat(amount) : null,
                    payment_method: paymentMethod,
                    returned_item_name: paymentMethod === 'item' ? returnedItem.trim() : null,
                    note: note.trim() || null,
                    validation_status: targetUserId ? 'pending' : 'none',
                })
                .eq('id', normalizedPaymentId);

            if (updateError) {
                Alert.alert('Error', updateError.message);
                setLoading(false);
                return;
            }

            // 2. Log History
            await supabase.from('payment_history').insert([
                {
                    payment_id: normalizedPaymentId,
                    changed_by: user?.id,
                    old_amount: originalPayment.amount,
                    new_amount: paymentMethod === 'money' ? parseFloat(amount) : null,
                    old_note: originalPayment.note,
                    new_note: note.trim() || null,
                    old_item_name: originalPayment.returned_item_name,
                    new_item_name: paymentMethod === 'item' ? returnedItem.trim() : null,
                    change_reason: 'User update',
                }
            ]);

            if (targetUserId) {
                // Update or Create P2P request for edit
                await supabase.from('p2p_requests').insert([
                    {
                        type: 'payment_validation',
                        loan_id: normalizedLoanId,
                        payment_id: normalizedPaymentId,
                        from_user_id: user?.id,
                        to_user_id: targetUserId,
                        message: `A payment has been modified. Please review.`,
                        status: 'pending',
                    },
                ]);
            }
        } else {
            // 1. Insert Payment
            const { data: newPayment, error: paymentError } = await supabase.from('payments').insert([
                {
                    loan_id: normalizedLoanId,
                    user_id: user?.id,
                    target_user_id: targetUserId,
                    amount: paymentMethod === 'money' ? parseFloat(amount) : null,
                    payment_method: paymentMethod,
                    returned_item_name: paymentMethod === 'item' ? returnedItem.trim() : null,
                    note: note.trim() || null,
                    payment_date: new Date().toISOString(),
                    validation_status: targetUserId ? 'pending' : 'none',
                },
            ]).select().single();

            if (paymentError) {
                Alert.alert('Error', paymentError.message);
                setLoading(false);
                return;
            }

            if (targetUserId && newPayment) {
                // Create P2P request for payment validation
                await supabase.from('p2p_requests').insert([
                    {
                        type: 'payment_validation',
                        loan_id: normalizedLoanId,
                        payment_id: newPayment.id,
                        from_user_id: user?.id,
                        to_user_id: targetUserId,
                        message: `New payment registered for your transaction.`,
                        status: 'pending',
                    },
                ]);
            }
        }

        // 2. Calculate new status
        // For items, if it's an item loan and an item is returned, we can mark as paid.
        // For money, we check totals.
        if (paymentMethod === 'item') {
            const { error: updateError } = await supabase
                .from('loans')
                .update({ status: 'paid' })
                .eq('id', normalizedLoanId);

            if (updateError) console.error(updateError);
        } else {
            const { data: allPayments } = await supabase
                .from('payments')
                .select('amount')
                .eq('loan_id', normalizedLoanId)
                .eq('payment_method', 'money');

            const { data: loan } = await supabase
                .from('loans')
                .select('amount')
                .eq('id', normalizedLoanId)
                .single();

            if (loan) {
                const totalPaid = (allPayments || []).reduce((acc, p) => acc + Number(p.amount), 0);
                const newStatus = totalPaid >= Number(loan.amount) ? 'paid' : 'partial';

                await supabase
                    .from('loans')
                    .update({ status: newStatus })
                    .eq('id', normalizedLoanId);
            }
        }

        router.back();
        setLoading(false);
    };

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{
                title: normalizedPaymentId ? 'Edit Payment' : 'Register Payment',
                headerTransparent: true,
                headerTintColor: '#0F172A',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <X size={24} color="#0F172A" />
                    </TouchableOpacity>
                ),
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.form}>
                    <View style={styles.methodToggle}>
                        <TouchableOpacity
                            style={[styles.methodTab, paymentMethod === 'money' && styles.methodTabActive]}
                            onPress={() => setPaymentMethod('money')}
                        >
                            <Wallet size={18} color={paymentMethod === 'money' ? '#fff' : '#64748B'} />
                            <Text style={[styles.methodText, paymentMethod === 'money' && styles.methodTextActive]}>Money</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.methodTab, paymentMethod === 'item' && styles.methodTabActive]}
                            onPress={() => setPaymentMethod('item')}
                        >
                            <Box size={18} color={paymentMethod === 'item' ? '#fff' : '#64748B'} />
                            <Text style={[styles.methodText, paymentMethod === 'item' && styles.methodTextActive]}>Item</Text>
                        </TouchableOpacity>
                    </View>

                    {paymentMethod === 'money' ? (
                        <Card style={styles.mainCard}>
                            <ThemedView style={styles.inputHeader}>
                                <Wallet size={20} color="#6366F1" />
                                <Text style={styles.label}>Amount Paid</Text>
                            </ThemedView>
                            <ThemedView style={styles.amountInputContainer}>
                                <Text style={styles.currencySymbol}>{getCurrencySymbol(normalizedCurrency as string)}</Text>
                                <TextInput
                                    placeholder="0.00"
                                    placeholderTextColor="#CBD5E1"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                    style={styles.amountInput}
                                    autoFocus
                                />
                            </ThemedView>
                            <ThemedView style={styles.helperRow}>
                                <Info size={14} color="#64748B" />
                                <Text style={styles.helperText}>Remaining balance: {getCurrencySymbol(normalizedCurrency as string)}{Number(normalizedRemaining).toLocaleString()}</Text>
                            </ThemedView>
                        </Card>
                    ) : (
                        <Card style={styles.mainCard}>
                            <ThemedView style={styles.inputHeader}>
                                <Box size={20} color="#6366F1" />
                                <Text style={styles.label}>Item Returned/Exchanged</Text>
                            </ThemedView>
                            <TextInput
                                placeholder="Describe the item (e.g. Returned Drill)..."
                                placeholderTextColor="#CBD5E1"
                                value={returnedItem}
                                onChangeText={setReturnedItem}
                                style={styles.input}
                                autoFocus
                            />
                            <ThemedView style={styles.helperRow}>
                                <Info size={14} color="#64748B" />
                                <Text style={styles.helperText}>Closing this {normalizedLoanCategory === 'item' ? 'item lending' : 'money loan'} with an item exchange.</Text>
                            </ThemedView>
                        </Card>
                    )}

                    <Card style={styles.noteCard}>
                        <Text style={styles.label}>Note (Optional)</Text>
                        <TextInput
                            placeholder="e.g. Bank transfer, Cash, etc."
                            placeholderTextColor="#94A3B8"
                            value={note}
                            onChangeText={setNote}
                            style={styles.input}
                        />
                    </Card>

                    <TouchableOpacity
                        onPress={onSave}
                        disabled={loading}
                        style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    >
                        <Text style={styles.saveButtonText}>{loading ? 'PROCESSING...' : (normalizedPaymentId ? 'Update Payment' : 'Confirm Payment')}</Text>
                    </TouchableOpacity>

                    <Text style={styles.copyright}>© 2026 jreynoso — I GOT YOU</Text>
                </View>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    form: {
        flex: 1,
        padding: 20,
        paddingTop: 120,
    },
    mainCard: {
        padding: 24,
        marginBottom: 16,
    },
    helperText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    noteCard: {
        padding: 24,
        marginBottom: 24,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        borderBottomWidth: 2,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: '700',
        color: '#64748B',
        marginRight: 8,
    },
    amountInput: {
        fontSize: 56,
        fontWeight: '900',
        color: '#0F172A',
        flex: 1,
    },
    helperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        backgroundColor: 'transparent',
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    methodTab: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        gap: 8,
    },
    methodTabActive: {
        backgroundColor: '#0F172A',
    },
    methodText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    methodTextActive: {
        color: '#fff',
    },
    input: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 14,
        fontSize: 16,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
    },
    saveButton: {
        backgroundColor: '#6366F1',
        padding: 20,
        borderRadius: 18,
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    copyright: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 32,
    },
});
