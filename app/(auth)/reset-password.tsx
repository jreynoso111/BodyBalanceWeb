import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, View as RNView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Lock, ArrowLeft } from 'lucide-react-native';

import { Text, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';

type RecoveryTokens = {
    accessToken: string | null;
    refreshToken: string | null;
};

const parseRecoveryTokens = (url: string): RecoveryTokens => {
    try {
        const parsed = new URL(url);
        const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
        const hashParams = new URLSearchParams(hash);

        return {
            accessToken: parsed.searchParams.get('access_token') || hashParams.get('access_token'),
            refreshToken: parsed.searchParams.get('refresh_token') || hashParams.get('refresh_token'),
        };
    } catch {
        return { accessToken: null, refreshToken: null };
    }
};

export default function ResetPasswordScreen() {
    const router = useRouter();
    const urlFromLinking = Linking.useURL();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const initializeRecoverySession = useCallback(async () => {
        try {
            let sourceUrl = urlFromLinking || await Linking.getInitialURL();
            if (!sourceUrl && Platform.OS === 'web' && typeof window !== 'undefined') {
                sourceUrl = window.location.href;
            }

            if (!sourceUrl) {
                setInitializing(false);
                return;
            }

            const { accessToken, refreshToken } = parseRecoveryTokens(sourceUrl);
            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) throw error;
            }
        } catch {
            Alert.alert('Error', 'The recovery link is invalid or expired.');
        } finally {
            setInitializing(false);
        }
    }, [urlFromLinking]);

    useEffect(() => {
        initializeRecoverySession();
    }, [initializeRecoverySession]);

    const onUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please complete both fields.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            Alert.alert('Error', 'Could not update password. Request a new reset link.');
            return;
        }

        await supabase.auth.signOut();
        Alert.alert('Done', 'Password updated. Sign in with your new password.');
        router.replace('/(auth)/login');
    };

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <RNView style={styles.content}>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backButton}>
                        <ArrowLeft size={20} color="#0F172A" />
                        <Text style={styles.backText}>Back to login</Text>
                    </TouchableOpacity>

                    <Card style={styles.card}>
                        <Text style={styles.title}>New password</Text>
                        <Text style={styles.subtitle}>Set a new password for your account.</Text>

                        {initializing ? (
                            <RNView style={styles.loadingBox}>
                                <ActivityIndicator size="small" color="#6366F1" />
                                <Text style={styles.loadingText}>Validating link...</Text>
                            </RNView>
                        ) : (
                            <>
                                <RNView style={styles.inputGroup}>
                                    <Text style={styles.label}>New password</Text>
                                    <RNView style={styles.inputWrapper}>
                                        <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Minimum 6 characters"
                                            placeholderTextColor="#94A3B8"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            style={styles.input}
                                        />
                                    </RNView>
                                </RNView>

                                <RNView style={styles.inputGroup}>
                                    <Text style={styles.label}>Confirm password</Text>
                                    <RNView style={styles.inputWrapper}>
                                        <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Repeat your password"
                                            placeholderTextColor="#94A3B8"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry
                                            style={styles.input}
                                        />
                                    </RNView>
                                </RNView>

                                <TouchableOpacity
                                    onPress={onUpdatePassword}
                                    disabled={loading}
                                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                                >
                                    <Text style={styles.buttonText}>{loading ? 'UPDATING...' : 'Update password'}</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    loadingText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
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
