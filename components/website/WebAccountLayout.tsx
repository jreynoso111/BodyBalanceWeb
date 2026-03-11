import React from 'react';
import { Link, usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Bell } from 'lucide-react-native';

import { AppLegalFooter } from '@/components/AppLegalFooter';
import { Text } from '@/components/Themed';
import { clearPersistedAuthState, supabase } from '@/services/supabase';
import { getDeviceLanguage } from '@/constants/i18n';
import { getPlanLabel } from '@/services/subscriptionPlan';
import { useAuthStore } from '@/store/authStore';

type AccountNavItem = {
  href: Href;
  label: string;
  matches: string[];
};

const BASE_ACCOUNT_NAV: AccountNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', matches: ['/dashboard'] },
  { href: '/settings', label: 'Account', matches: ['/settings'] },
  { href: '/profile', label: 'Profile', matches: ['/profile'] },
  { href: '/subscription', label: 'Membership', matches: ['/subscription'] },
  { href: '/notifications', label: 'Notifications', matches: ['/notifications'] },
  { href: '/security', label: 'Security', matches: ['/security'] },
];
const ADMIN_NAV_ITEM: AccountNavItem = {
  href: '/admin' as Href,
  label: 'Admin Analytics',
  matches: ['/admin'],
};

function matchesPath(pathname: string, patterns: string[]) {
  return patterns.some((pattern) => pathname === pattern || pathname.startsWith(`${pattern}/`));
}

export function WebAccountLayout({
  eyebrow,
  title,
  description,
  hideHeader = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  hideHeader?: boolean;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const { user, role, planTier, setSession, setUser, setRole, setPlanTier, setLanguage } = useAuthStore();
  const displayName =
    String(user?.user_metadata?.full_name || '').trim() ||
    String(user?.email || '').split('@')[0] ||
    'Account';
  const normalizedRole = String(role || '').toLowerCase().trim();
  const hasAdminAccess = normalizedRole === 'admin' || normalizedRole === 'administrator';
  const compact = width < 980;
  const mobile = width < 720;
  const accountNav: AccountNavItem[] = hasAdminAccess
    ? [...BASE_ACCOUNT_NAV, ADMIN_NAV_ITEM]
    : BASE_ACCOUNT_NAV;

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => null);
    await clearPersistedAuthState().catch(() => null);
    setSession(null);
    setUser(null);
    setRole(null);
    setPlanTier('free');
    setLanguage(getDeviceLanguage());
    router.replace('/');
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.scrollContent, mobile && styles.scrollContentMobile]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topbarSticky, compact && styles.topbarStatic]}>
        <View style={styles.shellFrame}>
          <View style={[styles.topbar, mobile && styles.topbarMobile]}>
            <View>
              <Text style={[styles.productLabel, mobile && styles.productLabelMobile]}>Buddy Balance dashboard</Text>
              <Text style={styles.productSubcopy}>The web workspace for the same Supabase account you use in the app.</Text>
            </View>
            <View style={[styles.topbarActions, mobile && styles.topbarActionsMobile]}>
              <Link href="/notifications" asChild>
                <Pressable
                  style={({ hovered, pressed }) =>
                    StyleSheet.flatten([
                      styles.iconButton,
                      styles.interactiveButton,
                      mobile && styles.topbarActionButtonMobile,
                      hovered && styles.interactiveButtonHovered,
                      pressed && styles.interactiveButtonPressed,
                    ])
                  }
                >
                  <Bell size={18} color="#1E293B" />
                </Pressable>
              </Link>
              <Link href="/" asChild>
                <Pressable
                  style={({ hovered, pressed }) =>
                    StyleSheet.flatten([
                      styles.siteButton,
                      styles.interactiveButton,
                      mobile && styles.topbarActionButtonMobile,
                      hovered && styles.interactiveButtonHovered,
                      pressed && styles.interactiveButtonPressed,
                    ])
                  }
                >
                  <Text style={styles.siteButtonText}>Public site</Text>
                </Pressable>
              </Link>
              <Pressable
                style={({ hovered, pressed }) =>
                  StyleSheet.flatten([
                    styles.signOutButton,
                    styles.interactiveButton,
                    mobile && styles.topbarActionButtonMobile,
                    hovered && styles.interactiveButtonHovered,
                    pressed && styles.interactiveButtonPressed,
                  ])
                }
                onPress={() => void signOut()}
              >
                <Text style={styles.signOutButtonText}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.shellFrame}>
        <View style={[styles.main, compact && styles.mainCompact]}>
          <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
            <View style={[styles.profileCard, mobile && styles.profileCardMobile]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileMeta}>
                {getPlanLabel(planTier)} plan{hasAdminAccess ? ' • Admin' : ''}
              </Text>
            </View>

            <View style={[styles.navCard, mobile && styles.navCardMobile]}>
              {accountNav.map((item) => {
                const active = matchesPath(pathname, item.matches);
                return (
                  <Link key={item.label} href={item.href} asChild>
                    <Pressable
                      style={({ hovered, pressed }) =>
                        StyleSheet.flatten([
                          styles.navLink,
                          styles.interactiveButton,
                          mobile && styles.navLinkMobile,
                          active && styles.navLinkActive,
                          hovered && styles.navLinkHovered,
                          pressed && styles.interactiveButtonPressed,
                        ])
                      }
                    >
                      <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>

          <View style={[styles.content, compact && styles.contentCompact]}>
            {hideHeader ? null : (
              <View style={[styles.headerCard, mobile && styles.headerCardMobile]}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={[styles.title, mobile && styles.titleMobile]}>{title}</Text>
                <Text style={[styles.description, mobile && styles.descriptionMobile]}>{description}</Text>
              </View>
            )}
            <View style={styles.body}>{children}</View>
          </View>
        </View>

        <AppLegalFooter style={styles.footer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
  },
  scrollContentMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  shellFrame: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  topbarSticky: {
    zIndex: 20,
    backgroundColor: 'rgba(246,248,255,0.94)',
    paddingBottom: 10,
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as const,
          top: 0,
        }
      : null),
  },
  topbarStatic: {
    position: 'relative',
    top: 'auto',
  },
  topbar: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  topbarMobile: {
    padding: 16,
    borderRadius: 18,
  },
  productLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  productLabelMobile: {
    fontSize: 16,
  },
  productSubcopy: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  topbarActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  topbarActionsMobile: {
    width: '100%',
  },
  topbarActionButtonMobile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6DAFF',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    minHeight: 42,
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6DAFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactiveButton: {
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
          transitionDuration: '140ms',
          transitionTimingFunction: 'ease',
          transitionProperty: 'transform, opacity, background-color, border-color, box-shadow',
        } as any)
      : null),
  },
  interactiveButtonHovered: {
    transform: [{ translateY: -1.5 }, { scale: 1.01 }],
    opacity: 0.98,
  },
  interactiveButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  siteButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  signOutButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#101A3A',
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  main: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  mainCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 290,
    gap: 14,
  },
  sidebarCompact: {
    width: '100%',
  },
  profileCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5FF',
  },
  profileCardMobile: {
    padding: 18,
    borderRadius: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  profileName: {
    marginTop: 14,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  profileMeta: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#6366F1',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  navCard: {
    borderRadius: 28,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  navCardMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navLink: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  navLinkMobile: {
    flexBasis: '48%',
  },
  navLinkHovered: {
    backgroundColor: '#F8FAFF',
    borderColor: '#D6DAFF',
    borderWidth: 1,
  },
  navLinkActive: {
    backgroundColor: '#EEF2FF',
  },
  navText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  navTextActive: {
    color: '#4338CA',
  },
  content: {
    flex: 1,
    minWidth: 320,
    gap: 16,
  },
  contentCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  headerCard: {
    borderRadius: 32,
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5FF',
  },
  headerCardMobile: {
    borderRadius: 22,
    padding: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: '#0F172A',
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 32,
  },
  description: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 28,
    color: '#475569',
  },
  descriptionMobile: {
    fontSize: 15,
    lineHeight: 24,
  },
  body: {
    gap: 16,
  },
  footer: {
    marginTop: 6,
  },
});
