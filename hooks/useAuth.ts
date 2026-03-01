import { useEffect } from 'react';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PROTECTED_PATH_KEY = 'last_protected_path';

export const useAuth = () => {
    const { setSession, setUser, setInitialized, session, initialized } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        // 1. Initial session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setInitialized(true);
        };

        checkSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!initialized) return;
        if (!pathname) return;

        const normalizedPath = pathname.toLowerCase();
        const topSegment = segments[0];
        const inTabsRoute = topSegment === '(tabs)';
        const inAuthRoute =
            topSegment === '(auth)' ||
            normalizedPath.startsWith('/auth/callback') ||
            normalizedPath.startsWith('/login') ||
            normalizedPath.startsWith('/register') ||
            normalizedPath.startsWith('/forgot-password') ||
            normalizedPath.startsWith('/reset-password');
        const isLandingPage = normalizedPath === '/' && !inTabsRoute;
        const isResetPassword = normalizedPath.startsWith('/reset-password');
        const isEphemeralFormRoute =
            normalizedPath.startsWith('/new-contact') ||
            normalizedPath.startsWith('/new-loan') ||
            normalizedPath.startsWith('/register-payment');

        const handleRouting = async () => {
            if (session && !inAuthRoute && !isLandingPage && !isEphemeralFormRoute) {
                // Keep track of last protected route for refresh/reload recovery.
                await AsyncStorage.setItem(LAST_PROTECTED_PATH_KEY, pathname);
            }

            if (session && isLandingPage) {
                const lastPath = await AsyncStorage.getItem(LAST_PROTECTED_PATH_KEY);
                const hasSafeRecoverPath =
                    !!lastPath &&
                    lastPath !== pathname &&
                    !lastPath.startsWith('/new-contact') &&
                    !lastPath.startsWith('/new-loan') &&
                    !lastPath.startsWith('/register-payment');

                if (hasSafeRecoverPath) {
                    router.replace(lastPath as any);
                    return;
                }

                await AsyncStorage.removeItem(LAST_PROTECTED_PATH_KEY);
                // Fallback to authenticated home when there is no recoverable path.
                router.replace('/(tabs)');
                return;
            }

            if (!session && !inAuthRoute && !isLandingPage) {
                // User is not signed in and not in the auth group or landing page, redirect to login
                router.replace('/(auth)/login');
            } else if (session && inAuthRoute && !isResetPassword) {
                // User is signed in and in the auth group, redirect to home
                router.replace('/(tabs)');
            }
        };

        void handleRouting();
    }, [session, pathname, initialized, segments]);
};
