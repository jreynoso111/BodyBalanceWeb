import React from 'react';
import { StyleSheet, TouchableOpacity, Alert, View as RNView, ScrollView } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { LogOut, User, Bell, Shield, CircleHelp, FileOutput, ChevronRight } from 'lucide-react-native';
import { exportLoansToCSV } from '@/services/exportService';
import { useFocusEffect, useRouter } from 'expo-router';
import { DEFAULT_USER_PREFERENCES, getOrCreateUserPreferences } from '@/services/userPreferences';

export default function SettingsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [prefs, setPrefs] = React.useState(DEFAULT_USER_PREFERENCES);

    useFocusEffect(
        React.useCallback(() => {
            if (!user?.id) return;
            void loadPreferences();
        }, [user?.id])
    );

    const loadPreferences = async () => {
        if (!user?.id) return;
        const { data } = await getOrCreateUserPreferences(user.id);
        if (data) {
            setPrefs({
                push_enabled: data.push_enabled,
                email_enabled: data.email_enabled,
                reminder_enabled: data.reminder_enabled,
                biometric_enabled: data.biometric_enabled,
                marketing_enabled: data.marketing_enabled,
                preferred_currencies: data.preferred_currencies,
            });
        }
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    const handleExport = async () => {
        if (user) {
            await exportLoansToCSV(user.id);
        }
    };

    const menuItems = [
        { icon: User, label: 'Profile', sub: user?.email, onPress: () => router.push('/profile') },
        { icon: Bell, label: 'Notifications', sub: prefs.push_enabled ? 'Enabled' : 'Disabled', onPress: () => router.push('/notifications') },
        { icon: Shield, label: 'Security', sub: prefs.biometric_enabled ? 'Biometric On' : 'Biometric Off', onPress: () => router.push('/security') },
        { icon: FileOutput, label: 'Export Data (CSV)', sub: 'Share report', onPress: handleExport },
        { icon: CircleHelp, label: 'Help & Support', sub: 'FAQ & contact', onPress: () => router.push('/help-support') },
    ];

    return (
        <Screen style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileSection}>
                    <RNView style={styles.avatarLarge}>
                        <Text style={styles.avatarLargeText}>{user?.email?.[0].toUpperCase()}</Text>
                    </RNView>
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                    <Text style={styles.profileSub}>Standard Plan • User</Text>
                </View>

                <Card style={styles.menuCard}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.item,
                                index === menuItems.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={item.onPress}
                        >
                            <RNView style={styles.itemLeft}>
                                <RNView style={styles.iconCircle}>
                                    <item.icon size={20} color="#6366F1" />
                                </RNView>
                                <RNView style={styles.textContainer}>
                                    <Text style={styles.label}>{item.label}</Text>
                                    {item.sub ? <Text style={styles.subLabel}>{item.sub}</Text> : null}
                                </RNView>
                            </RNView>
                            <ChevronRight size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    ))}
                </Card>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>I GOT U v1.0.0 • jreynoso</Text>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
        backgroundColor: 'transparent',
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    avatarLargeText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#6366F1',
    },
    profileEmail: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    profileSub: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    menuCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: 24,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    textContainer: {
        marginLeft: 16,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    subLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    signOutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
    version: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 40,
        marginBottom: 20,
    },
});
