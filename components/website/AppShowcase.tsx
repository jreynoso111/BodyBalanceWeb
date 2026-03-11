import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Check, CirclePlus, Clock3, Crown, Send, Shield, UserRoundPlus, X } from 'lucide-react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { Text } from '@/components/Themed';

type AppShowcaseProps = {
  compact?: boolean;
};

const INSIDE_APP_PREVIEWS: Array<{
  eyebrow: string;
  title: string;
  copy: string;
  variant: PhoneVariant;
}> = [
  {
    eyebrow: 'Dashboard',
    title: 'Home, summaries, and quick actions',
    copy: 'The first screen gives people a simple overview of their shared activity, reminders, and main shortcuts.',
    variant: 'home',
  },
  {
    eyebrow: 'Contacts',
    title: 'People, notes, and linked history',
    copy: 'Contacts are where people review shared history, open details, and keep their connections organized.',
    variant: 'contacts',
  },
  {
    eyebrow: 'Requests',
    title: 'Approve shared updates only when needed',
    copy: 'Confirmation requests sit in their own flow, which makes pending work visible without mixing it with informational events.',
    variant: 'requests',
  },
  {
    eyebrow: 'Settings',
    title: 'Settings, exports, and account controls',
    copy: 'Notifications, security, and account tools live in the same organized settings area users see on mobile.',
    variant: 'premium',
  },
];

export function AppShowcase({ compact = false }: AppShowcaseProps) {
  const { width } = useWindowDimensions();
  const medium = compact || width < 980;
  const stacked = compact || width < 760;
  const mobile = width < 560;
  const primaryFloat = useRef(new Animated.Value(0)).current;
  const secondaryFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const primaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(primaryFloat, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(primaryFloat, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const secondaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(secondaryFloat, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(secondaryFloat, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
    };
  }, [primaryFloat, secondaryFloat]);

  const primaryShift = primaryFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  const secondaryShift = secondaryFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <View style={[styles.stage, medium && styles.stageCompact, stacked && styles.stageStacked, mobile && styles.stageMobile]}>
      {stacked ? (
        <View style={[styles.phoneRail, styles.phoneRailStacked, mobile && styles.phoneRailMobile]}>
          <Animated.View
            style={[
              styles.phoneRailItem,
              styles.phoneRailItemLead,
              {
                transform: [{ translateY: primaryShift }, { rotate: mobile ? '-2deg' : '-4deg' }, { scale: mobile ? 0.72 : 0.8 }],
              },
            ]}
          >
            <PhoneFrame variant="contacts" />
          </Animated.View>

          <Animated.View
            style={[
              styles.phoneRailItem,
              styles.phoneRailItemCenter,
              {
                transform: [{ translateY: primaryShift }, { scale: mobile ? 0.86 : 0.94 }],
              },
            ]}
          >
            <PhoneFrame variant="home" />
          </Animated.View>

          <Animated.View
            style={[
              styles.phoneRailItem,
              styles.phoneRailItemTrail,
              {
                transform: [{ translateY: secondaryShift }, { rotate: mobile ? '2deg' : '4deg' }, { scale: mobile ? 0.72 : 0.8 }],
              },
            ]}
          >
            <PhoneFrame variant="premium" />
          </Animated.View>
        </View>
      ) : (
        <>
          <Animated.View
            style={[
              styles.primaryPhoneWrap,
              medium && styles.primaryPhoneWrapCompact,
              mobile && styles.primaryPhoneWrapMobile,
              {
                transform: [{ translateY: primaryShift }, { scale: mobile ? 0.82 : medium ? 0.9 : 1 }],
              },
            ]}
          >
            <PhoneFrame variant="home" />
          </Animated.View>

          <Animated.View
            style={[
              styles.secondaryPhoneWrap,
              medium && styles.secondaryPhoneWrapCompact,
              mobile && styles.secondaryPhoneWrapMobile,
              {
                transform: [
                  { translateY: secondaryShift },
                  { rotate: mobile ? '-4deg' : '-7deg' },
                  { scale: mobile ? 0.7 : medium ? 0.82 : 1 },
                ],
              },
            ]}
          >
            <PhoneFrame variant="contacts" />
          </Animated.View>

          <Animated.View
            style={[
              styles.tertiaryPhoneWrap,
              medium && styles.tertiaryPhoneWrapCompact,
              mobile && styles.tertiaryPhoneWrapMobile,
              {
                transform: [
                  { translateY: secondaryShift },
                  { rotate: mobile ? '5deg' : '8deg' },
                  { scale: mobile ? 0.7 : medium ? 0.82 : 1 },
                ],
              },
            ]}
          >
            <PhoneFrame variant="premium" />
          </Animated.View>
        </>
      )}
    </View>
  );
}

export function InsideAppGallery() {
  const { width } = useWindowDimensions();
  const previewGap = 18;
  const cardsPerView = Math.min(
    INSIDE_APP_PREVIEWS.length,
    width >= 1540 ? 4 : width >= 1220 ? 3 : width >= 920 ? 2 : 1
  );
  const shouldRotate = cardsPerView < INSIDE_APP_PREVIEWS.length;
  const [currentPreview, setCurrentPreview] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const currentPreviewRef = useRef(0);
  const transitionInFlightRef = useRef(false);
  const trackTranslate = useRef(new Animated.Value(0)).current;
  const cardWidth =
    shouldRotate && viewportWidth > 0
      ? (viewportWidth - previewGap * (cardsPerView - 1)) / cardsPerView
      : 0;

  const resetCarouselPosition = () => {
    trackTranslate.stopAnimation();
    trackTranslate.setValue(0);
    transitionInFlightRef.current = false;
  };

  const advanceCarousel = () => {
    if (!shouldRotate || cardWidth <= 0 || transitionInFlightRef.current) {
      return;
    }

    const nextPreview = (currentPreviewRef.current + 1) % INSIDE_APP_PREVIEWS.length;
    transitionInFlightRef.current = true;
    Animated.timing(trackTranslate, {
      toValue: -(cardWidth + previewGap),
      duration: 980,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentPreviewRef.current = nextPreview;
      setCurrentPreview(nextPreview);
      resetCarouselPosition();
    });
  };

  useEffect(() => {
    if (!shouldRotate) {
      currentPreviewRef.current = 0;
      setCurrentPreview(0);
      resetCarouselPosition();
      return;
    }

    const rotation = setInterval(() => {
      advanceCarousel();
    }, 4200);

    return () => {
      clearInterval(rotation);
    };
  }, [cardWidth, shouldRotate]);

  const visiblePreviews = shouldRotate
    ? Array.from({ length: cardsPerView + 1 }, (_, offset) => INSIDE_APP_PREVIEWS[(currentPreview + offset) % INSIDE_APP_PREVIEWS.length])
    : INSIDE_APP_PREVIEWS;

  const handleSelectPreview = (index: number) => {
    if (!shouldRotate) return;
    currentPreviewRef.current = index;
    setCurrentPreview(index);
    resetCarouselPosition();
  };

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== viewportWidth) {
      setViewportWidth(nextWidth);
      resetCarouselPosition();
    }
  };

  return (
    <View style={styles.previewCarousel}>
      <View style={styles.previewViewport} onLayout={handleViewportLayout}>
        <Animated.View
          style={[
            styles.previewGrid,
            shouldRotate && styles.previewGridSliding,
            {
              transform: [{ translateX: trackTranslate }],
            },
          ]}
        >
          {visiblePreviews.map((preview) => (
            <LinearGradient
              key={`${preview.title}-${currentPreview}`}
              colors={['rgba(255,255,255,0.96)', 'rgba(241,245,249,0.96)']}
              style={[
                styles.previewCard,
                shouldRotate && cardWidth > 0
                  ? {
                      width: cardWidth,
                      flexBasis: cardWidth,
                      flexGrow: 0,
                      flexShrink: 0,
                    }
                  : null,
              ]}
            >
              <View style={styles.previewPhoneWrap}>
                <PhoneFrame variant={preview.variant} />
              </View>
              <View style={styles.previewCopy}>
                <Text style={styles.previewEyebrow}>{preview.eyebrow}</Text>
                <Text style={styles.previewTitle}>{preview.title}</Text>
                <Text style={styles.previewText}>{preview.copy}</Text>
              </View>
            </LinearGradient>
          ))}
        </Animated.View>
      </View>

      {shouldRotate ? (
        <View style={styles.previewDots}>
          {INSIDE_APP_PREVIEWS.map((item, index) => {
            const active = index === currentPreview;
            return (
              <Pressable
                key={item.title}
                onPress={() => handleSelectPreview(index)}
                style={[styles.previewDot, active && styles.previewDotActive]}
              >
                <Text style={[styles.previewDotLabel, active && styles.previewDotLabelActive]}>{item.eyebrow}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

type PhoneVariant = 'home' | 'contacts' | 'premium' | 'requests';

function PhoneFrame({ variant }: { variant: PhoneVariant }) {
  return (
    <LinearGradient colors={['#202447', '#090E23']} style={styles.phoneShell}>
      <View style={styles.phoneNotch} />
      <View style={styles.phoneScreen}>
        {variant === 'home' ? <HomeScreen /> : null}
        {variant === 'contacts' ? <ContactsScreen /> : null}
        {variant === 'requests' ? <RequestsScreen /> : null}
        {variant === 'premium' ? <PremiumScreen /> : null}
      </View>
    </LinearGradient>
  );
}

function ScreenHeader({ title, pill }: { title: string; pill?: string }) {
  return (
    <View style={styles.screenHeader}>
      <BrandLogo size={24} showWordmark={false} />
      <View style={styles.screenHeaderCopy}>
        <Text style={styles.screenTitle}>{title}</Text>
        {pill ? (
          <View style={styles.screenPill}>
            <Text style={styles.screenPillLabel}>{pill}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HomeScreen() {
  return (
    <View style={styles.screenBody}>
      <ScreenHeader title="Home" pill="PREMIUM" />
      <Text style={styles.heroName}>Hi, Joe!</Text>
      <Text style={styles.heroSubline}>Focus on what needs attention first.</Text>

      <View style={styles.inlineAction}>
        <UserRoundPlus size={14} color="#5B63FF" />
        <Text style={styles.inlineActionText}>Add friend</Text>
      </View>

      <LinearGradient colors={['#CCFCE0', '#C5F0D6']} style={styles.balancePanel}>
        <View style={styles.balanceTag}>
          <Text style={styles.balanceTagText}>YOU LENT MORE</Text>
        </View>
        <Text style={styles.balanceLabel}>OPEN BALANCE</Text>
        <Text style={styles.balanceValue}>+$3,650</Text>
        <Text style={styles.balanceCopy}>Friends owe you more than you owe them.</Text>

        <View style={styles.balanceSplit}>
          <View style={styles.balanceStatCard}>
            <Text style={styles.balanceStatLabel}>THEY OWE YOU</Text>
            <Text style={styles.balanceStatValue} numberOfLines={1} adjustsFontSizeToFit>
              $3,650
            </Text>
          </View>
          <View style={styles.balanceStatCard}>
            <Text style={styles.balanceStatLabel}>YOU OWE</Text>
            <Text style={styles.balanceStatValue} numberOfLines={1} adjustsFontSizeToFit>
              $0
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.queueRow}>
        <QueueMiniCard label="Needs attention" value="0" />
        <QueueMiniCard label="Next 7 days" value="0" />
        <QueueMiniCard label="Shared records" value="11" highlight />
      </View>

      <View style={styles.fab}>
        <CirclePlus size={28} color="#FFFFFF" />
      </View>
    </View>
  );
}

function ContactsScreen() {
  return (
    <View style={styles.screenBody}>
      <ScreenHeader title="Contacts" />
      <View style={styles.searchBar}>
        <Text style={styles.searchBarText}>Find a person or friend code</Text>
      </View>

      <ContactCard
        name="Mia Chen"
        status="Updated"
        subline="Reminder in 2 days"
        detail="Open record • Recent note added"
      />
      <ContactCard
        name="Diego Ruiz"
        status="Friend linked"
        subline="Shared account"
        detail="Events sync both sides"
      />
      <ContactCard
        name="Nina Park"
        status="Clear"
        subline="No pending reminders"
        detail="Everything up to date"
      />
    </View>
  );
}

function PremiumScreen() {
  return (
    <View style={styles.screenBody}>
      <ScreenHeader title="Settings" pill="TOOLS" />
      <LinearGradient colors={['#FFF4CB', '#FFE39C']} style={styles.premiumHero}>
        <View style={styles.premiumBadge}>
          <Crown size={18} color="#8A5A00" />
        </View>
        <Text style={styles.premiumTitle}>Account Tools</Text>
        <Text style={styles.premiumText}>
          Export your history, manage notifications, and keep your account organized without clutter.
        </Text>
      </LinearGradient>

      <SettingsRow
        icon={<Shield size={16} color="#5B63FF" />}
        title="Security"
        subline="Biometric lock and account protection"
      />
      <SettingsRow
        icon={<Bell size={16} color="#0EA5E9" />}
        title="Notifications"
        subline="Confirmation events and account activity"
      />
      <SettingsRow
        icon={<Crown size={16} color="#F59E0B" />}
        title="Export Data (CSV)"
        subline="Unlimited CSV exports"
      />
    </View>
  );
}

function RequestsScreen() {
  return (
    <View style={styles.screenBody}>
      <ScreenHeader title="Requests" />
      <View style={styles.requestsHero}>
        <View>
          <Text style={styles.requestsHeroTitle}>2 pending</Text>
          <Text style={styles.requestsHeroText}>Shared confirmations that need your answer.</Text>
        </View>
        <View style={styles.requestsHeroBadge}>
          <Clock3 size={16} color="#7C3AED" />
        </View>
      </View>

      <RequestCard
        name="Diego Ruiz"
        detail="Friend request"
        note="Wants to connect accounts using your friend code."
      />
      <RequestCard
        name="Mia Chen"
        detail="Shared update"
        note="A new note was added to the shared record."
      />
    </View>
  );
}

function QueueMiniCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.queueMiniCard, highlight && styles.queueMiniCardHighlight]}>
      <Text style={[styles.queueMiniValue, highlight && styles.queueMiniValueHighlight]}>{value}</Text>
      <Text style={[styles.queueMiniLabel, highlight && styles.queueMiniLabelHighlight]}>{label}</Text>
    </View>
  );
}

function ContactCard({
  name,
  status,
  subline,
  detail,
}: {
  name: string;
  status: string;
  subline: string;
  detail: string;
}) {
  return (
    <View style={styles.contactCard}>
      <View style={styles.contactTopRow}>
        <Text style={styles.contactName}>{name}</Text>
        <Text style={styles.contactStatus}>{status}</Text>
      </View>
      <Text style={styles.contactSubline}>{subline}</Text>
      <Text style={styles.contactDetail}>{detail}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subline,
}: {
  icon: React.ReactNode;
  title: string;
  subline: string;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}>{icon}</View>
      <View style={styles.settingsCopy}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsSubline}>{subline}</Text>
      </View>
    </View>
  );
}

function RequestCard({
  name,
  detail,
  note,
}: {
  name: string;
  detail: string;
  note: string;
}) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestAvatar}>
          <Send size={14} color="#4F46E5" />
        </View>
        <View style={styles.requestCopy}>
          <Text style={styles.requestName}>{name}</Text>
          <Text style={styles.requestDetail}>{detail}</Text>
        </View>
      </View>
      <Text style={styles.requestNote}>{note}</Text>
      <View style={styles.requestActions}>
        <View style={[styles.requestAction, styles.requestActionApprove]}>
          <Check size={14} color="#166534" />
          <Text style={styles.requestActionApproveText}>Approve</Text>
        </View>
        <View style={[styles.requestAction, styles.requestActionReject]}>
          <X size={14} color="#B91C1C" />
          <Text style={styles.requestActionRejectText}>Decline</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    minHeight: 520,
    justifyContent: 'center',
    paddingTop: 24,
  },
  stageCompact: {
    minHeight: 460,
  },
  stageStacked: {
    minHeight: 0,
    justifyContent: 'flex-start',
  },
  stageMobile: {
    minHeight: 0,
    paddingTop: 8,
  },
  primaryPhoneWrap: {
    alignSelf: 'center',
    zIndex: 4,
  },
  primaryPhoneWrapCompact: {
    marginTop: 12,
  },
  primaryPhoneWrapMobile: {
    marginTop: 0,
  },
  phoneRail: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  phoneRailStacked: {
    marginTop: 28,
  },
  phoneRailMobile: {
    marginTop: 12,
    paddingHorizontal: 0,
  },
  phoneRailItem: {
    marginHorizontal: -38,
  },
  phoneRailItemLead: {
    zIndex: 1,
  },
  phoneRailItemCenter: {
    zIndex: 3,
  },
  phoneRailItemTrail: {
    zIndex: 2,
  },
  secondaryPhoneWrap: {
    position: 'absolute',
    left: 0,
    bottom: 28,
    zIndex: 2,
  },
  secondaryPhoneWrapCompact: {
    left: 10,
    bottom: 8,
  },
  secondaryPhoneWrapMobile: {
    left: -8,
    bottom: -4,
  },
  tertiaryPhoneWrap: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    zIndex: 1,
  },
  tertiaryPhoneWrapCompact: {
    right: 10,
    bottom: -8,
  },
  tertiaryPhoneWrapMobile: {
    right: -10,
    bottom: -16,
  },
  previewCarousel: {
    gap: 16,
  },
  previewViewport: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  previewGridSliding: {
    alignItems: 'stretch',
  },
  previewCard: {
    flex: 1,
    minWidth: 0,
    padding: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.92)',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 8,
  },
  previewPhoneWrap: {
    alignItems: 'center',
  },
  previewCopy: {
    marginTop: 18,
    gap: 8,
  },
  previewEyebrow: {
    color: '#5B63FF',
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  previewText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  previewDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewDot: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  previewDotActive: {
    backgroundColor: '#5B63FF',
  },
  previewDotLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  previewDotLabelActive: {
    color: '#FFFFFF',
  },
  phoneShell: {
    width: 255,
    height: 522,
    borderRadius: 38,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 16,
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 110,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#050816',
    marginBottom: 12,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F8FAFF',
  },
  screenBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#F8FAFF',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  screenHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  screenPillLabel: {
    color: '#A16207',
    fontFamily: 'SpaceMono',
    fontSize: 10,
  },
  heroName: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroSubline: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  inlineAction: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9DFFF',
    backgroundColor: '#F4F6FF',
  },
  inlineActionText: {
    color: '#5B63FF',
    fontSize: 12,
    fontWeight: '800',
  },
  balancePanel: {
    marginTop: 16,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  balanceTag: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  balanceTagText: {
    color: '#15803D',
    fontFamily: 'SpaceMono',
    fontSize: 10,
  },
  balanceLabel: {
    color: '#476257',
    fontFamily: 'SpaceMono',
    fontSize: 10,
    marginTop: 8,
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  balanceCopy: {
    marginTop: 8,
    color: '#4C6257',
    fontSize: 11,
    lineHeight: 16,
  },
  balanceSplit: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  balanceStatCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.48)',
    minWidth: 0,
  },
  balanceStatLabel: {
    color: '#476257',
    fontFamily: 'SpaceMono',
    fontSize: 9,
  },
  balanceStatValue: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },
  queueRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  queueMiniCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  queueMiniCardHighlight: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  queueMiniValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  queueMiniValueHighlight: {
    color: '#4F46E5',
  },
  queueMiniLabel: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 13,
  },
  queueMiniLabelHighlight: {
    color: '#4F46E5',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#5B63FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B63FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  searchBar: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8DFF9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchBarText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  contactCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  contactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  contactName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  contactStatus: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  contactSubline: {
    marginTop: 8,
    color: '#475569',
    fontSize: 11,
  },
  contactDetail: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 10,
  },
  premiumHero: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.32)',
  },
  premiumBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  premiumTitle: {
    marginTop: 12,
    color: '#7C5200',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
  },
  premiumText: {
    marginTop: 10,
    color: '#8A6A18',
    fontSize: 11,
    lineHeight: 16,
  },
  requestsHero: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestsHeroTitle: {
    color: '#312E81',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
  },
  requestsHeroText: {
    marginTop: 8,
    color: '#4C1D95',
    fontSize: 11,
    lineHeight: 16,
  },
  requestsHeroBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  requestCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  requestCopy: {
    flex: 1,
  },
  requestName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  requestDetail: {
    marginTop: 3,
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '700',
  },
  requestNote: {
    marginTop: 10,
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
  },
  requestActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  requestAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  requestActionApprove: {
    backgroundColor: '#DCFCE7',
  },
  requestActionReject: {
    backgroundColor: '#FEE2E2',
  },
  requestActionApproveText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  requestActionRejectText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
  },
  settingsRow: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCopy: {
    flex: 1,
  },
  settingsTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  settingsSubline: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
  },
});
