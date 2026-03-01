import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { X, Check, Trash2 } from 'lucide-react-native';

export default function NewContactScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const contactId = Array.isArray(id) ? id[0] : id;
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (contactId) {
            fetchContact();
        }
    }, [contactId, user]);

    const confirmAction = (title: string, message: string, onConfirm: () => Promise<void> | void) => {
        if (Platform.OS === 'web') {
            const browserConfirm = typeof globalThis.confirm === 'function' ? globalThis.confirm : null;
            const accepted = browserConfirm ? browserConfirm(`${title}\n\n${message}`) : true;
            if (accepted) {
                void onConfirm();
            }
            return;
        }

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        void onConfirm();
                    },
                },
            ]
        );
    };

    const fetchContact = async () => {
        if (!contactId || !user?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .eq('user_id', user.id)
            .single();

        if (error) {
            Alert.alert('Error', error.message);
        }

        if (data) {
            setName(data.name);
            setEmail(data.email || '');
            setPhone(data.phone || '');
        }
        setLoading(false);
    };

    const onSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setLoading(true);

        // 1. Discover target_user_id via RPC (avoids exposing full profiles table)
        let targetUserId = null;
        if (email.trim() || phone.trim()) {
            const { data, error: lookupError } = await supabase.rpc('find_profile_match', {
                p_email: email.trim() || null,
                p_phone: phone.trim() || null,
            });
            if (!lookupError && data) {
                targetUserId = data;
            }
        }

        if (contactId) {
            if (!user?.id) {
                Alert.alert('Error', 'User not found');
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('contacts')
                .update({
                    name: name.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    target_user_id: targetUserId,
                })
                .eq('id', contactId)
                .eq('user_id', user.id);

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Success', 'Contact updated successfully');
                router.back();
            }
        } else {
            const { error } = await supabase.from('contacts').insert([
                {
                    user_id: user?.id,
                    name: name.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    target_user_id: targetUserId,
                },
            ]);

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Success', 'Contact created successfully');
                router.back();
            }
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!contactId || !user?.id) {
            Alert.alert('Error', 'Contact not found');
            return;
        }

        confirmAction(
            'Delete Contact',
            'Are you sure you want to delete this contact? This will not affect existing loans.',
            async () => {
                await confirmDelete();
            }
        );
    };

    const confirmDelete = async () => {
        if (!contactId || !user?.id) {
            Alert.alert('Error', 'Contact not found');
            return;
        }

        try {
            setLoading(true);

            // Try hard delete first.
            const { data: hardDeletedRows, error: hardDeleteError } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId)
                .eq('user_id', user.id)
                .select('id');

            if (!hardDeleteError && hardDeletedRows && hardDeletedRows.length > 0) {
                Alert.alert('Success', 'Contact deleted');
                router.replace('/(tabs)/contacts');
                return;
            }

            // If hard delete fails because of FK references, soft delete the contact.
            if (hardDeleteError && hardDeleteError.code !== '23503') {
                Alert.alert('Error', hardDeleteError.message);
                return;
            }

            const { data: softData, error: softDeleteError } = await supabase
                .from('contacts')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', contactId)
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .select('id');

            if (softDeleteError) {
                Alert.alert('Error', softDeleteError.message);
                return;
            }

            if (!softData || softData.length === 0) {
                Alert.alert('Error', 'Contact could not be deleted');
                return;
            }

            Alert.alert('Success', 'Contact deleted');
            router.replace('/(tabs)/contacts');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Unexpected error deleting contact');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Stack.Screen options={{
                title: contactId ? 'Edit Contact' : 'New Contact',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={onSave} disabled={loading}>
                        {loading ? <Text>...</Text> : <Check size={24} color="#059669" />}
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        placeholder="e.g. John Doe"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email (Optional)</Text>
                    <TextInput
                        placeholder="john@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone (Optional)</Text>
                    <TextInput
                        placeholder="+1 234 567 890"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                </View>

                <TouchableOpacity
                    onPress={onSave}
                    disabled={loading}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>{loading ? 'Saving...' : (contactId ? 'Update Contact' : 'Save Contact')}</Text>
                </TouchableOpacity>

                {contactId && (
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={loading}
                        style={styles.deleteButton}
                    >
                        <Trash2 size={20} color="#EF4444" />
                        <Text style={styles.deleteButtonText}>Delete Contact</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.copyright}>© 2026 jreynoso — I GOT U</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    form: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#eee',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    saveButton: {
        backgroundColor: '#000',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 14,
        marginTop: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        gap: 8,
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
    copyright: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 32,
    },
});
