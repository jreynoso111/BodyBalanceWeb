import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, View as RNView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Mail, ArrowLeft } from 'lucide-react-native';

import { Text, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const onSendResetEmail = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            Alert.alert('Error', 'Please enter your email.');
            return;
        }

        try {
            setLoading(true);
            const redirectTo = Linking.createURL('/reset-password');
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

            if (error) {
                Alert.alert('Error', 'Could not send the recovery email.');
                return;
            }

            Alert.alert(
                'Email sent',
                'Check your inbox and open the link to reset your password.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <RNView style={styles.content}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={20} color="#0F172A" />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Card style={styles.card}>
                        <Text style={styles.title}>Reset password</Text>
                        <Text style={styles.subtitle}>
                            We will send a link to reset your password.
                        </Text>

                        <RNView style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <RNView style={styles.inputWrapper}>
                                <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="name@email.com"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    style={styles.input}
                                />
                            </RNView>
                        </RNView>

                        <TouchableOpacity
                            onPress={onSendResetEmail}
                            disabled={loading}
                            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                        >
                            <Text style={styles.buttonText}>{loading ? 'SENDING...' : 'Send link'}</Text>
                        </TouchableOpacity>
                    </Card>
                </RNView>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    backText: {
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 14,
    },
    card: {
        padding: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#0F172A',
    },
    primaryButton: {
        backgroundColor: '#0F172A',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
