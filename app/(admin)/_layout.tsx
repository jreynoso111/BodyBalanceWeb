import React from 'react';
import { Redirect, Slot, Stack, usePathname } from 'expo-router';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';
import { WebAccountLayout } from '@/components/website/WebAccountLayout';

const ADMIN_WEB_COPY: Array<{
    match: string;
    title: string;
    description: string;
}> = [
    {
        match: '/admin/users',
        title: 'User Administration',
        description: 'Review users, reset access, inspect history, and manage account-level admin actions.',
    },
    {
        match: '/admin/loans',
        title: 'Records Administration',
        description: 'Review platform-wide records, items, and shared activity from one place.',
    },
    {
        match: '/admin/requests',
        title: 'Admin Requests',
        description: 'Work through confirmations, friend requests, and other pending operational items.',
    },
    {
        match: '/admin',
        title: 'Admin Analytics',
        description: 'Compact overview of accounts, memberships, usage, and operational load.',
    },
];

export default function AdminLayout() {
    const { role, initialized } = useAuthStore();
    const { t } = useI18n();
    const pathname = usePathname() || '/admin';
    const normalizedRole = (role || '').toLowerCase().trim();
    const hasAdminAccess = normalizedRole === 'admin' || normalizedRole === 'administrator';
    const currentCopy =
        ADMIN_WEB_COPY.find((entry) => pathname === entry.match || pathname.startsWith(`${entry.match}/`)) ||
        ADMIN_WEB_COPY[ADMIN_WEB_COPY.length - 1];

    if (!initialized) {
        return null; // Wait for auth store to load
    }

    if (!hasAdminAccess) {
        // Redirect standard users back to home
        return <Redirect href={Platform.OS === 'web' ? '/dashboard' : '/(tabs)'} />;
    }

    if (Platform.OS === 'web') {
        return (
            <WebAccountLayout
                eyebrow="Admin"
                title={currentCopy.title}
                description={currentCopy.description}
                hideHeader={pathname === '/admin'}
            >
                <Slot />
            </WebAccountLayout>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                },
                headerTitleStyle: {
                    fontWeight: '800',
                },
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen name="index" options={{ title: t('Admin Dashboard') }} />
            <Stack.Screen name="users" options={{ title: t('Platform Users') }} />
            <Stack.Screen name="loans" options={{ title: t('Platform Lend/Borrow') }} />
            <Stack.Screen name="requests" options={{ title: t('Admin Requests') }} />
        </Stack>
    );
}
