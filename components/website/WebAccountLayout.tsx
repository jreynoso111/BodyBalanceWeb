import React from 'react';
import { Link, Redirect, usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Bell } from 'lucide-react-native';

import { AppLegalFooter } from '@/components/AppLegalFooter';
import { ThemeToggleButton } from '@/components/ThemeControls';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { redirectAfterSignOut, signOutAndResetAuthState } from '@/services/authState';
import { getPlanLabel } from '@/services/subscriptionPlan';
import { useAuthStore } from '@/store/authStore';

type AccountNavItem = {
  href: Href;
  label: string;
  matches: string[];
};

const BASE_ACCOUNT_NAV: AccountNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', matches: ['/dashboard'] },
  { href: '/contacts' as Href, label: 'Contacts', matches: ['/contacts'] },
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
  const colorScheme = useColorScheme();
  const { user, role, planTier, initialized } = useAuthStore();
  const displayName =
    String(user?.user_metadata?.full_name || '').trim() ||
    String(user?.email || '').split('@')[0] ||
    'Account';
  const normalizedRole = String(role || '').toLowerCase().trim();
  const hasAdminAccess = normalizedRole === 'admin' || normalizedRole === 'administrator';
  const isDark = colorScheme === 'dark';
  const compact = width < 980;
  const mobile = width < 720;
  const accountNav: AccountNavItem[] = hasAdminAccess
    ? [...BASE_ACCOUNT_NAV, ADMIN_NAV_ITEM]
    : BASE_ACCOUNT_NAV;

  const signOut = async () => {
    await signOutAndResetAuthState();
    if (Platform.OS === 'web') {
      redirectAfterSignOut('/');
      return;
    }
    router.replace('/');
  };

  if (Platform.OS === 'web' && !initialized) {
    return (
      <View style={[styles.loadingPage, isDark && styles.pageDark]}>
        <View style={styles.shellFrame}>
          <View style={[styles.loadingCard, isDark && styles.loadingCardDark]}>
            <Text style={[styles.loadingTitle, isDark && styles.loadingTitleDark]}>Loading your dashboard...</Text>
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
              Restoring your account session and workspace.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web' && initialized && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ScrollView
      style={[styles.page, isDark && styles.pageDark]}
      contentContainerStyle={[styles.scrollContent, mobile && styles.scrollContentMobile]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topbarSticky, compact && styles.topbarStatic, isDark && styles.topbarStickyDark]}>
        <View style={styles.shellFrame}>
          <View style={[styles.topbar, mobile && styles.topbarMobile, isDark && styles.topbarDark]}>
            <View>
              <Text style={[styles.productLabel, mobile && styles.productLabelMobile, isDark && styles.productLabelDark]}>
                Buddy Balance dashboard
              </Text>
              <Text style={[styles.productSubcopy, isDark && styles.productSubcopyDark]}>
                The web workspace for the same Supabase account you use in the app.
              </Text>
            </View>
            <View style={[styles.topbarActions, mobile && styles.topbarActionsMobile]}>
              <Link href="/notifications" asChild>
                <Pressable
                  style={({ hovered, pressed }) =>
                    StyleSheet.flatten([
                      styles.iconButton,
                      styles.interactiveButton,
                      mobile && styles.topbarActionButtonMobile,
                      isDark && styles.iconButtonDark,
                      hovered && styles.interactiveButtonHovered,
                      pressed && styles.interactiveButtonPressed,
                    ])
                  }
                >
                  <Bell size={18} color={isDark ? '#E2E8F0' : '#1E293B'} />
                </Pressable>
              </Link>
              <ThemeToggleButton compact={mobile} />
              <Link href="/" asChild>
                <Pressable
                  style={({ hovered, pressed }) =>
                    StyleSheet.flatten([
                      styles.siteButton,
                      styles.interactiveButton,
                      mobile && styles.topbarActionButtonMobile,
                      isDark && styles.siteButtonDark,
                      hovered && styles.interactiveButtonHovered,
                      pressed && styles.interactiveButtonPressed,
                    ])
                  }
                >
                  <Text style={[styles.siteButtonText, isDark && styles.siteButtonTextDark]}>Public site</Text>
                </Pressable>
              </Link>
              <Pressable
                style={({ hovered, pressed }) =>
                  StyleSheet.flatten([
                    styles.signOutButton,
                      styles.interactiveButton,
                      mobile && styles.topbarActionButtonMobile,
                      isDark && styles.signOutButtonDark,
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

      <View style={[styles.subbarSticky, compact && styles.subbarStatic, isDark && styles.subbarStickyDark]}>
        <View style={styles.shellFrame}>
          <View style={[styles.subbar, mobile && styles.subbarMobile, isDark && styles.subbarDark]}>
            <View style={[styles.subbarIdentity, mobile && styles.subbarIdentityMobile]}>
              <View style={[styles.avatar, styles.subbarAvatar, isDark && styles.avatarDark]}>
                <Text style={[styles.avatarText, isDark && styles.avatarTextDark]}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.subbarIdentityCopy}>
                <Text style={[styles.subbarName, isDark && styles.subbarNameDark]}>{displayName}</Text>
                <Text style={[styles.subbarEmail, isDark && styles.subbarEmailDark]}>{user?.email}</Text>
                <Text style={[styles.subbarMeta, isDark && styles.subbarMetaDark]}>
                  {getPlanLabel(planTier)} plan{hasAdminAccess ? ' • Admin' : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.subbarNav, mobile && styles.subbarNavMobile]}>
              {accountNav.map((item) => {
                const active = matchesPath(pathname, item.matches);
                return (
                  <Link key={item.label} href={item.href} asChild>
                    <Pressable
                      style={({ hovered, pressed }) =>
                        StyleSheet.flatten([
                          styles.subbarNavLink,
                          styles.interactiveButton,
                          isDark && styles.subbarNavLinkDark,
                          active && styles.subbarNavLinkActive,
                          active && isDark && styles.subbarNavLinkActiveDark,
                          hovered && (isDark ? styles.subbarNavLinkHoveredDark : styles.subbarNavLinkHovered),
                          pressed && styles.interactiveButtonPressed,
                        ])
                      }
                    >
                      <Text
                        style={[
                          styles.subbarNavText,
                          isDark && styles.subbarNavTextDark,
                          active && styles.subbarNavTextActive,
                          active && isDark && styles.subbarNavTextActiveDark,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.shellFrame}>
        <View style={styles.contentFull}>
          {hideHeader ? null : (
            <View style={[styles.headerCard, mobile && styles.headerCardMobile, isDark && styles.headerCardDark]}>
              {eyebrow ? <Text style={[styles.eyebrow, isDark && styles.eyebrowDark]}>{eyebrow}</Text> : null}
              <Text style={[styles.title, mobile && styles.titleMobile, isDark && styles.titleDark]}>{title}</Text>
              <Text style={[styles.description, mobile && styles.descriptionMobile, isDark && styles.descriptionDark]}>
                {description}
              </Text>
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </View>

        <AppLegalFooter style={styles.footer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    backgroundColor: '#F6F8FF',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  loadingCard: {
    marginTop: 24,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  loadingTitleDark: {
    color: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  loadingTextDark: {
    color: '#CBD5E1',
  },
  page: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },
  pageDark: {
    backgroundColor: '#020617',
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
  topbarStickyDark: {
    backgroundColor: 'rgba(2,6,23,0.92)',
  },
  topbarStatic: {
    position: 'relative',
    top: 'auto',
  },
  subbarSticky: {
    zIndex: 18,
    backgroundColor: 'rgba(246,248,255,0.9)',
    paddingBottom: 10,
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as const,
          top: 104,
        }
      : null),
  },
  subbarStickyDark: {
    backgroundColor: 'rgba(2,6,23,0.88)',
  },
  subbarStatic: {
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
  topbarDark: {
    backgroundColor: 'rgba(15,23,42,0.86)',
    borderColor: '#334155',
  },
  productLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  productLabelMobile: {
    fontSize: 16,
  },
  productLabelDark: {
    color: '#F8FAFC',
  },
  productSubcopy: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  productSubcopyDark: {
    color: '#94A3B8',
  },
  topbarActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
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
  siteButtonDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
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
  iconButtonDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
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
  siteButtonTextDark: {
    color: '#E2E8F0',
  },
  signOutButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#101A3A',
  },
  signOutButtonDark: {
    backgroundColor: '#334155',
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subbar: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  subbarMobile: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
  },
  subbarDark: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderColor: '#334155',
  },
  subbarIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 280,
    flexShrink: 1,
  },
  subbarIdentityMobile: {
    width: '100%',
  },
  subbarAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  subbarIdentityCopy: {
    gap: 2,
    flexShrink: 1,
  },
  subbarName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subbarNameDark: {
    color: '#F8FAFC',
  },
  subbarEmail: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  subbarEmailDark: {
    color: '#CBD5E1',
  },
  subbarMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6366F1',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subbarMetaDark: {
    color: '#CBD5E1',
  },
  subbarNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subbarNavMobile: {
    width: '100%',
    justifyContent: 'flex-start',
    flex: 0,
  },
  subbarNavLink: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subbarNavLinkDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  subbarNavLinkHovered: {
    backgroundColor: '#F8FAFF',
    borderColor: '#C7D2FE',
    transform: [{ translateY: -1 }],
  },
  subbarNavLinkHoveredDark: {
    backgroundColor: '#111827',
    borderColor: '#475569',
    transform: [{ translateY: -1 }],
  },
  subbarNavLinkActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  subbarNavLinkActiveDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  subbarNavText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  subbarNavTextDark: {
    color: '#CBD5E1',
  },
  subbarNavTextActive: {
    color: '#4338CA',
  },
  subbarNavTextActiveDark: {
    color: '#F8FAFC',
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
    width: 320,
    gap: 16,
  },
  sidebarSticky: {
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web'
      ? ({
          position: 'sticky',
          top: 104,
        } as any)
      : null),
  },
  sidebarCompact: {
    width: '100%',
  },
  profileCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5FF',
  },
  profileCardMobile: {
    padding: 18,
    borderRadius: 22,
  },
  profileCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  avatarDark: {
    backgroundColor: '#1E293B',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  avatarTextDark: {
    color: '#E2E8F0',
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
  profileNameDark: {
    color: '#F8FAFC',
  },
  profileEmailDark: {
    color: '#CBD5E1',
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
  profileMetaDark: {
    color: '#CBD5E1',
  },
  navCard: {
    borderRadius: 28,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  navCardMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  navLink: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  navLinkMobile: {
    flexBasis: '48%',
  },
  navLinkDark: {
    backgroundColor: 'transparent',
  },
  navLinkHovered: {
    backgroundColor: '#F8FAFF',
    borderColor: '#D6DAFF',
    borderWidth: 1,
  },
  navLinkHoveredDark: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
  },
  navLinkActive: {
    backgroundColor: '#EEF2FF',
  },
  navLinkActiveDark: {
    backgroundColor: '#334155',
  },
  navText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  navTextDark: {
    color: '#CBD5E1',
  },
  navTextActive: {
    color: '#4338CA',
  },
  navTextActiveDark: {
    color: '#F8FAFC',
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
  contentFull: {
    width: '100%',
    gap: 16,
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
  headerCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  eyebrowDark: {
    color: '#CBD5E1',
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
  titleDark: {
    color: '#F8FAFC',
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
  descriptionDark: {
    color: '#CBD5E1',
  },
  body: {
    gap: 16,
  },
  footer: {
    marginTop: 6,
  },
});
