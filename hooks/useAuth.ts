import { useEffect } from 'react';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeLanguage } from '@/constants/i18n';

const LAST_PROTECTED_PATH_KEY = 'last_protected_path';
const isMissingDefaultLanguageColumn = (message?: string) =>
    String(message || '').toLowerCase().includes('default_language');
const normalizeRole = (role?: string | null) => {
    const normalized = String(role || '').toLowerCase().trim();
    if (normalized === 'administrator') return 'admin';
    if (normalized) return normalized;
    return 'user';
};

export const useAuth = () => {
    const { setSession, setUser, setRole, setLanguage, setInitialized, session, initialized } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const segments = useSegments();

    const fetchProfileMeta = async (userId: string) => {
        let { data, error } = await supabase
            .from('profiles')
            .select('role, default_language')
            .eq('id', userId)
            .single();

        if (error && isMissingDefaultLanguageColumn(error.message)) {
            const fallback = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
            data = fallback.data as any;
            error = fallback.error as any;
        }

        const normalizedRole = normalizeRole((data as any)?.role);

        const language = normalizeLanguage((data as any)?.default_language);

        return { normalizedRole, language };
    };

    useEffect(() => {
        // 1. Initial session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user?.id) {
                const { normalizedRole, language } = await fetchProfileMeta(session.user.id);
                setRole(normalizedRole);
                setLanguage(language);
            } else {
                setRole(null);
                setLanguage('en');
            }

            setInitialized(true);
        };

        checkSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user?.id) {
                    const { normalizedRole, language } = await fetchProfileMeta(session.user.id);
                    setRole(normalizedRole);
                    setLanguage(language);
                } else {
                    setRole(null);
                    setLanguage('en');
                    // Prevent stale protected-route recovery after a sign-out.
                    await AsyncStorage.removeItem(LAST_PROTECTED_PATH_KEY);
                }

                if (event === 'SIGNED_OUT') {
                    router.replace('/');
                }
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
        const inAdminRoute = topSegment === '(admin)' || topSegment === 'admin';
        const inAuthRoute =
            topSegment === '(auth)' ||
            normalizedPath.startsWith('/auth/callback') ||
            normalizedPath.startsWith('/login') ||
            normalizedPath.startsWith('/register') ||
            normalizedPath.startsWith('/forgot-password') ||
            normalizedPath.startsWith('/reset-password');
        const isLandingPage = normalizedPath === '/' && !inTabsRoute && !inAdminRoute;
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
                    !lastPath.startsWith('/admin') &&
                    !lastPath.startsWith('/(admin)') &&
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

            if (!session && !inAuthRoute && !isLandingPage && !isEphemeralFormRoute) {
                // User is not signed in and not in the auth group or landing page, redirect to landing page
                router.replace('/');
            } else if (session && inAuthRoute && !isResetPassword) {
                // User is signed in and in the auth group, redirect to home
                router.replace('/(tabs)');
            }
        };

        void handleRouting();
    }, [session, pathname, initialized, segments]);
};
